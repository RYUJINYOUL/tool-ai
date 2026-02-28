'use client';

import Script from "next/script";

export default function KakaoScript() {
    return (
        <>
            <Script
                src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js"
                integrity="sha384-l+xbElFSnPZ2rOaPrU//2FF5B4LB8FiX5q4fXYTlfcG4PGpMkE1vcL7kNXI6Cci0"
                crossOrigin="anonymous"
                strategy="afterInteractive"
                onLoad={() => {
                    if (window.Kakao && !window.Kakao.isInitialized()) {
                        window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY);
                        console.log('Kakao SDK Initialized');
                    }
                }}
            />
        </>
    );
}
