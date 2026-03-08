import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { address } = await req.json();
    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const kakaoKey = process.env.KAKAO_REST_API_KEY;
    if (!kakaoKey) {
        return NextResponse.json({ error: 'Kakao API key not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(
            `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
            {
                headers: {
                    Authorization: `KakaoAK ${kakaoKey}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error('Kakao API request failed');
        }

        const data = await response.json();

        if (data.documents && data.documents.length > 0) {
            const doc = data.documents[0];
            const lat = parseFloat(doc.y);
            const lng = parseFloat(doc.x);
            return NextResponse.json({ lat, lng });
        }

        return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    } catch (error) {
        console.error('Geocoding error:', error);
        return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
    }
}
