'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Map as MapIcon, Save, Trash2, Undo2, MousePointer2, Maximize2, Minimize2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';

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
    const { user } = useAuth();
    const [mapLoaded, setMapLoaded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [routeName, setRouteName] = useState('');
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const polygonInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const [points, setPoints] = useState<{ lat: number; lng: number }[]>([]);

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
                    center: new window.kakao.maps.LatLng(37.5665, 126.9780), // Default to Seoul
                    level: 3
                };

                const map = new window.kakao.maps.Map(mapContainer.current, options);
                mapInstance.current = map;

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
            // Need a small timeout to let the DOM classes update
            setTimeout(() => {
                mapInstance.current.relayout();
            }, 50);
        }
    }, [isFullscreen, mapLoaded]);

    // Sync markers with points
    useEffect(() => {
        if (!mapInstance.current || !mapLoaded) return;

        // Clean up extra markers
        if (points.length === 0) {
            markersRef.current.forEach(m => m.setMap(null));
            markersRef.current = [];
            return;
        }

        while (markersRef.current.length > points.length) {
            const m = markersRef.current.pop();
            if (m) m.setMap(null);
        }

        // Add or Update markers
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

    const handleSave = async () => {
        if (!user) {
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
        try {
            await addDoc(collection(db, 'routeMaps'), {
                userId: user.uid,
                name: routeName.trim(),
                points: points,
                createdAt: serverTimestamp()
            });

            alert('라우트 지도가 저장되었습니다.');
            setPoints([]);
            setRouteName('');
            onClose();
        } catch (error) {
            console.error('Save error:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
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
                    <div ref={mapContainer} className="w-full h-full" />

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
                                    disabled={isSaving || points.length < 3}
                                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-100"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{isSaving ? '저장 중...' : '저장'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
