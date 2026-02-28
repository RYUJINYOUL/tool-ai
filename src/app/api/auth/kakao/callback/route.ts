import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(new URL('/login?error=kakao_no_code', request.url));
    }

    try {
        // 1. Exchange code for Kakao access token
        const origin = new URL(request.url).origin;
        const redirectUri = `${origin}/api/auth/kakao/callback`;

        const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: process.env.KAKAO_REST_API_KEY || '',
                redirect_uri: redirectUri,
                code: code,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.error('Kakao token exchange failed:', tokenData);
            return NextResponse.redirect(new URL('/login?error=kakao_token_failed', request.url));
        }

        // 2. Exchange Kakao access token for Firebase custom token via Cloud Function
        const functionsUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL;
        if (!functionsUrl) {
            throw new Error('Firebase Functions URL not configured');
        }

        const firebaseResponse = await fetch(functionsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                accessToken: tokenData.access_token,
                token: tokenData.access_token,
                access_token: tokenData.access_token,
            }),
        });

        const firebaseData = await firebaseResponse.json();

        if (!firebaseData.customToken) {
            console.error('Firebase custom token generation failed:', firebaseData);
            return NextResponse.redirect(new URL('/login?error=firebase_token_failed', request.url));
        }

        // 3. Redirect to home page with the custom token
        const response = NextResponse.redirect(new URL(`/?token=${firebaseData.customToken}`, request.url));
        return response;

    } catch (error) {
        console.error('Kakao login callback error:', error);
        return NextResponse.redirect(new URL('/login?error=callback_internal_error', request.url));
    }
}
