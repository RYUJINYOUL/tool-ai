import { NextRequest, NextResponse } from 'next/server';
import iconv from 'iconv-lite';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch metadata: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || '';

        let htmlSnippet = iconv.decode(Buffer.from(buffer.slice(0, 5000)), 'utf-8');
        let charset = 'utf-8';

        // Detect charset if not in header
        if (contentType.includes('charset=')) {
            charset = contentType.split('charset=')[1].toLowerCase();
        } else {
            const metaCharset = htmlSnippet.match(/<meta[^>]+charset=["']?([^"'>\s]+)["']?/i)?.[1];
            if (metaCharset) {
                charset = metaCharset.toLowerCase();
            }
        }

        // Use iconv-lite for decoding to support EUC-KR and others
        const html = iconv.decode(Buffer.from(buffer), charset);

        // Extract metadata
        let ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1] ||
            html.match(/<title>([^<]+)<\/title>/i)?.[1];

        const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

        if (ogTitle) {
            ogTitle = ogTitle.trim();
            if (ogTitle.length > 7) {
                ogTitle = ogTitle.substring(0, 7);
            }
        }

        const result = {
            title: ogTitle || new URL(targetUrl).hostname,
            image: ogImage || `https://www.google.com/s2/favicons?sz=128&domain=${new URL(targetUrl).hostname}`,
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('Metadata fetch error:', error);
        const fallbackTitle = targetUrl ? new URL(targetUrl).hostname.substring(0, 7) : 'SITE';
        return NextResponse.json({
            title: fallbackTitle,
            image: targetUrl ? `https://www.google.com/s2/favicons?sz=128&domain=${new URL(targetUrl).hostname}` : ''
        });
    }
}
