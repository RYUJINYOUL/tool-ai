'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Map as MapIcon, Save, Trash2, Undo2, MousePointer2, Maximize2, Minimize2, Download, Plus, Minus } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useUserStorage } from '@/hooks/useUserStorage';

declare global {
    interface Window {
        kakao: any;
    }
}

interface RouteMapModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RouteMapModal({ isOpen, onClose }: RouteMapModalProps) {
    const { firebaseUser, isLoggedIn } = useAuth();
    const [mapLoaded, setMapLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [routeName, setRouteName] = useState('');
    const [isCapturing, setIsCapturing] = useState(false);
    const { uploadImage } = useUserStorage();
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const polygonInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const [points, setPoints] = useState<{ lat: number; lng: number }[]>([]);

    // ── 줌 범위 상수: 카카오맵 level은 숫자가 작을수록 확대, 클수록 축소
    const ZOOM_MIN_LEVEL = 2; // 이 이하로 확대 불가 (너무 가까이)
    const ZOOM_MAX_LEVEL = 7; // 이 이상으로 축소 불가 (너무 멀리)

    // Load Kakao Map Script
    useEffect(() => {
        if (!isOpen) return;

        const scriptId = 'kakao-map-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY}&autoload=false`;
            script.async = true;
            document.head.appendChild(script);
        }

        const initMap = () => {
            window.kakao.maps.load(() => {
                if (!mapContainer.current) return;

                const options = {
                    center: new window.kakao.maps.LatLng(37.5665, 126.9780),
                    level: 3
                };

                const map = new window.kakao.maps.Map(mapContainer.current, options);
                mapInstance.current = map;

                // ── 줌 범위 제한 (지도 이동/드래그와 완전 독립적으로 동작)
                // zoom_changed 이벤트는 휠/더블클릭/줌버튼 모두에 반응하되
                // 드래그(패닝)에는 전혀 영향을 주지 않음
                window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
                    const currentLevel = map.getLevel();
                    if (currentLevel < ZOOM_MIN_LEVEL) {
                        map.setLevel(ZOOM_MIN_LEVEL);
                    } else if (currentLevel > ZOOM_MAX_LEVEL) {
                        map.setLevel(ZOOM_MAX_LEVEL);
                    }
                });

                // Try to get user location
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        map.setCenter(new window.kakao.maps.LatLng(lat, lng));
                    });
                }

                // Click event to add points
                window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
                    const latlng = mouseEvent.latLng;
                    setPoints(prev => [...prev, { lat: latlng.getLat(), lng: latlng.getLng() }]);
                });

                setMapLoaded(true);
            });
        };

        if (window.kakao && window.kakao.maps) {
            initMap();
        } else {
            script.onload = initMap;
        }

        return () => {
            if (polygonInstance.current) {
                polygonInstance.current.setMap(null);
                polygonInstance.current = null;
            }
            markersRef.current.forEach(m => m.setMap(null));
            markersRef.current = [];
            setPoints([]);
        };
    }, [isOpen]);

    // Handle map resizing when fullscreen toggles
    useEffect(() => {
        if (mapInstance.current && mapLoaded) {
            setTimeout(() => {
                mapInstance.current.relayout();
            }, 50);
        }
    }, [isFullscreen, mapLoaded]);

    // Sync markers with points
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded) return;

        if (points.length === 0) {
            markersRef.current.forEach(m => m.setMap(null));
            markersRef.current = [];
            return;
        }

        while (markersRef.current.length > points.length) {
            const m = markersRef.current.pop();
            if (m) m.setMap(null);
        }

        points.forEach((p, i) => {
            const latlng = new window.kakao.maps.LatLng(p.lat, p.lng);

            if (markersRef.current[i]) {
                const currentPos = markersRef.current[i].getPosition();
                if (Math.abs(currentPos.getLat() - p.lat) > 0.0000001 || Math.abs(currentPos.getLng() - p.lng) > 0.0000001) {
                    markersRef.current[i].setPosition(latlng);
                }
            } else {
                const marker = new window.kakao.maps.Marker({
                    position: latlng,
                    draggable: true,
                    map: mapInstance.current
                });

                window.kakao.maps.event.addListener(marker, 'dragend', () => {
                    const pos = marker.getPosition();
                    setPoints(prev => {
                        const next = [...prev];
                        next[i] = { lat: pos.getLat(), lng: pos.getLng() };
                        return next;
                    });
                });

                markersRef.current[i] = marker;
            }
        });
    }, [points, mapLoaded]);

    // Update Polygon on map when points change
    useEffect(() => {
        if (!mapInstance.current || points.length === 0) {
            if (polygonInstance.current) {
                polygonInstance.current.setMap(null);
                polygonInstance.current = null;
            }
            return;
        }

        if (polygonInstance.current) {
            polygonInstance.current.setMap(null);
        }

        const path = points.map(p => new window.kakao.maps.LatLng(p.lat, p.lng));

        const polygon = new window.kakao.maps.Polygon({
            path: path,
            strokeWeight: 3,
            strokeColor: '#FF6B00',
            strokeOpacity: 0.8,
            strokeStyle: 'solid',
            fillColor: '#FF6B00',
            fillOpacity: 0.2
        });

        polygon.setMap(mapInstance.current);
        polygonInstance.current = polygon;
    }, [points]);

    const handleUndo = () => {
        setPoints(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        if (confirm('그려진 내용을 모두 삭제하시겠습니까?')) {
            setPoints([]);
        }
    };

    const handleZoomIn = () => {
        if (mapInstance.current) {
            const level = mapInstance.current.getLevel();
            if (level > ZOOM_MIN_LEVEL) {
                mapInstance.current.setLevel(level - 1, { animate: true });
            }
        }
    };

    const handleZoomOut = () => {
        if (mapInstance.current) {
            const level = mapInstance.current.getLevel();
            if (level < ZOOM_MAX_LEVEL) {
                mapInstance.current.setLevel(level + 1, { animate: true });
            }
        }
    };

    const handleSave = async () => {
        if (!isLoggedIn || !firebaseUser) {
            alert('로그인이 필요한 기능입니다.');
            return;
        }

        if (points.length < 3) {
            alert('최소 3개 이상의 지점을 선택하여 영역을 만들어주세요.');
            return;
        }

        if (!routeName.trim()) {
            alert('라우트 이름을 입력해주세요.');
            return;
        }

        setIsSaving(true);
        setIsCapturing(true);

        try {
            // Wait for map to stabilize
            await new Promise(resolve => setTimeout(resolve, 1500));

            const captureArea = document.getElementById('map-capture-area');
            if (captureArea) {
                try {
                    const imgs = captureArea.querySelectorAll('img');
                    const originalSrcs = new Map<HTMLImageElement, string>();

                    const loadPromises = Array.from(imgs).map(img => {
                        return new Promise((resolve) => {
                            const src = img.src;
                            if (src.startsWith('http') && (src.includes('kakaocdn.net') || src.includes('daumcdn.net'))) {
                                originalSrcs.set(img, src);
                                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(src)}`;
                                const newImg = new Image();
                                newImg.crossOrigin = 'anonymous';
                                newImg.onload = () => { img.src = proxyUrl; resolve(null); };
                                newImg.onerror = () => resolve(null);
                                newImg.src = proxyUrl;
                            } else {
                                resolve(null);
                            }
                        });
                    });

                    await Promise.all(loadPromises);
                    await new Promise(r => setTimeout(r, 200));

                    const dataUrl = await domToPng(captureArea, {
                        scale: 1,
                        backgroundColor: '#ffffff',
                    });

                    const link = document.createElement('a');
                    link.download = `라우트지도_${routeName.trim()}_${Date.now()}.png`;
                    link.href = dataUrl;
                    link.click();

                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    const file = new File([blob], `route_map_${Date.now()}.png`, { type: 'image/png' });

                    await uploadImage(file);

                    originalSrcs.forEach((src, img) => { img.src = src; });
                } catch (captureErr) {
                    console.error("Map capture failed:", captureErr);
                    alert('지도를 이미지로 변환하는 데 실패했습니다. 데이터만 저장합니다.');
                }
            }

            await addDoc(collection(db, 'routeMaps'), {
                userId: firebaseUser.uid,
                name: routeName.trim(),
                points: points,
                createdAt: serverTimestamp()
            });

            alert('저장이 완료되었습니다! (저장파일 탭 확인)');
            setPoints([]);
            setRouteName('');
            onClose();
        } catch (error) {
            console.error('Save error:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
            setIsCapturing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>

            <div className={`relative transition-all duration-300 ease-in-out bg-white shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[85vh] rounded-3xl'
                }`}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white z-10 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                            <MapIcon className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">라우트 지도 만들기</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                            title={isFullscreen ? "축소" : "전체화면"}
                        >
                            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 relative bg-gray-50 overflow-hidden">
                    <div id="map-capture-area" className="w-full h-full relative">
                        <div ref={mapContainer} className="w-full h-full" />

                        {/* Watermark only visible in capture or subtle on UI */}
                        <div className="absolute bottom-2 right-2 z-[5] pointer-events-none">
                            <span className="text-[10px] font-black tracking-tighter text-gray-400 opacity-20 select-none">
                                tool-ai.kr
                            </span>
                        </div>
                    </div>

                    {!mapLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-gray-600">지도를 불러오는 중...</p>
                            </div>
                        </div>
                    )}

                    {/* Map Overlay Controls */}
                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                        {/* Zoom Controls */}
                        <div className="bg-white/90 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-white/50 flex flex-col gap-1">
                            <button
                                onClick={handleZoomIn}
                                className="p-2.5 hover:bg-orange-50 rounded-xl transition-all text-gray-600 hover:text-orange-600 active:scale-90"
                                title="확대"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <div className="h-px bg-gray-100 mx-2" />
                            <button
                                onClick={handleZoomOut}
                                className="p-2.5 hover:bg-orange-50 rounded-xl transition-all text-gray-600 hover:text-orange-600 active:scale-90"
                                title="축소"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/50 flex flex-col gap-1">
                            <button
                                onClick={handleUndo}
                                disabled={points.length === 0}
                                className="p-3 hover:bg-orange-50 rounded-xl transition-all text-gray-600 hover:text-orange-600 disabled:opacity-30 disabled:hover:bg-transparent"
                                title="실행 취소"
                            >
                                <Undo2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleClear}
                                disabled={points.length === 0}
                                className="p-3 hover:bg-red-50 rounded-xl transition-all text-gray-600 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                                title="전체 삭제"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ── 현재 줌 레벨 표시 */}
                        {mapLoaded && (
                            <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow text-[10px] font-bold text-gray-500 text-center tracking-tight">
                                LV.{mapInstance.current?.getLevel?.() || '3'}
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-lg px-4">
                        <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-white/50 space-y-4">
                            <div className="flex items-center gap-3 text-sm text-gray-500 font-bold px-1">
                                <MousePointer2 className="w-4 h-4 text-orange-500" />
                                <span>지도를 클릭하여 배송 구역의 꼭짓점을 표시하세요. (꼭짓점을 드래그하여 수정 가능)</span>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="라우트 이름 (예: 신천동 1호차)"
                                    value={routeName}
                                    onChange={(e) => setRouteName(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-gray-100 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || isCapturing || points.length < 3}
                                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-100"
                                >
                                    {isSaving || isCapturing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>처리 중...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>저장</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
