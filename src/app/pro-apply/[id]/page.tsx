'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
    ChevronLeft,
    Share2,
    MapPin,
    Briefcase,
    CreditCard,
    Box,
    Award,
    PieChart,
    Clock,
    Calendar,
    Phone,
    MessageSquare,
    Send,
    CheckCircle2,
    AlertCircle,
    Warehouse,
    FileText,
    X,
    Truck,
    Tag
} from 'lucide-react';
import Link from 'next/link';
// Internal Application Dialog
export default function ProApplyDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [zoomIndex, setZoomIndex] = useState<number | null>(null);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [zoomTouchStartX, setZoomTouchStartX] = useState<number | null>(null);

    // Navigation helper to return to Job Search tab
    const handleBack = () => {
        router.push('/?tab=NoticeBoard&noticeTab=택배구인');
    };

    useEffect(() => {
        if (!id) return;

        const docRef = doc(db, 'proApply', id as string);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setItem({ id: docSnap.id, ...docSnap.data() });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
                <AlertCircle className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-gray-500 font-bold text-lg mb-6">존재하지 않는 공고입니다.</p>
                <button
                    onClick={handleBack}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold"
                >
                    돌아가기
                </button>
            </div>
        );
    }

    const images = item.imageDownloadUrls || item.imageUrls || item.images || [];
    const hasImages = images.length > 0;

    const renderInfoRow = (label: string, value: string, icon: React.ReactNode) => (
        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="mt-1 text-gray-400">{icon}</div>
            <div className="flex-1">
                <p className="text-[11px] font-bold text-gray-500 mb-0.5">{label}</p>
                <p className="text-[15px] font-black text-gray-900 leading-tight">{value}</p>
            </div>
        </div>
    );

    const formatDeadline = (deadline: any) => {
        if (!deadline || !deadline.endDate) return '채용시까지';
        try {
            const date = new Date(deadline.endDate);
            return `마감: ${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
        } catch {
            return '채용시까지';
        }
    };

    const tags = [
        ...(item.selectedJobNames || []),
        ...(item.SubCategories || []),
        ...(item.workType ? [item.workType] : []),
        ...(item.urgency ? [item.urgency] : [])
    ];

    return (
        <div className="min-h-screen bg-white pb-32">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4">
                <button
                    onClick={handleBack}
                    className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors">
                    <Share2 className="w-6 h-6" />
                </button>
            </header>

            {/* Image Section */}
            {hasImages && (
                <div className="w-full bg-gray-50 border-b border-gray-100 overflow-hidden">
                    {/* Mobile Slider: show 1 image with dots */}
                    <div
                        className="md:hidden relative aspect-square w-full bg-gray-100 overflow-hidden"
                        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                        onTouchEnd={(e) => {
                            if (touchStartX === null) return;
                            const diff = touchStartX - e.changedTouches[0].clientX;
                            if (diff > 50 && currentImageIndex < images.length - 1) {
                                setCurrentImageIndex(currentImageIndex + 1);
                            } else if (diff < -50 && currentImageIndex > 0) {
                                setCurrentImageIndex(currentImageIndex - 1);
                            }
                            setTouchStartX(null);
                        }}
                    >
                        <div
                            className="flex transition-transform duration-300 ease-out h-full"
                            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                        >
                            {images.map((url: string, idx: number) => (
                                <img
                                    key={idx}
                                    src={url}
                                    alt={`공고 이미지 ${idx + 1}`}
                                    className="w-full h-full object-cover flex-shrink-0 cursor-zoom-in"
                                    onClick={() => setZoomIndex(idx)}
                                />
                            ))}
                        </div>
                        {images.length > 1 && (
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                                {images.map((_: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all ${currentImageIndex === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* PC View: Show 3 images and scroll */}
                    <div className="hidden md:block max-w-[1200px] mx-auto p-8">
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-4 -mx-4">
                            {images.map((url: string, idx: number) => (
                                <div key={idx} className="flex-shrink-0 w-[400px] aspect-[4/3] rounded-3xl overflow-hidden shadow-xl border border-gray-200 cursor-zoom-in group" onClick={() => setZoomIndex(idx)}>
                                    <img
                                        src={url}
                                        alt={`공고 이미지 ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="px-5 pt-8 space-y-8">
                {/* Title & Status */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border ${item.confirmed
                            ? 'bg-green-50 text-green-600 border-green-100'
                            : 'bg-orange-50 text-orange-600 border-orange-100'
                            }`}>
                            {item.confirmed ? '확정' : '대기'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-blue-50 text-blue-600 border border-blue-100">
                            구인신청
                        </span>
                        {item.crawledDate && (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-gray-50 text-gray-500 border border-gray-100">
                                {item.crawledDate}
                            </span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-3">
                            {item.company || item.username || '구인 공고'}
                        </h1>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag: string, idx: number) => (
                                    <span key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] text-[#64748B] text-xs font-bold rounded-full border border-[#E2E8F0]">
                                        <Tag className="w-3 h-3" />
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Primary Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {item.company && renderInfoRow('대리점/회사', item.company, <Warehouse className="w-5 h-5" />)}
                    {item.category && renderInfoRow('택배사/업종', item.category, <Briefcase className="w-5 h-5" />)}
                    {item.workType && renderInfoRow('근무형태', item.workType, <Truck className="w-5 h-5" />)}
                    {item.license && renderInfoRow('화물운송자격증', item.license, <Award className="w-5 h-5" />)}
                    {item.monthlyIncome && renderInfoRow('급여/수익', `월 ${item.monthlyIncome}`, <CreditCard className="w-5 h-5" />)}
                    {item.workTime && renderInfoRow('근무시간', item.workTime, <Clock className="w-5 h-5" />)}
                    {item.holiday && renderInfoRow('휴무/로테이션', item.holiday, <Calendar className="w-5 h-5" />)}
                    {item.totalVolume && renderInfoRow('물량', item.totalVolume, <Box className="w-5 h-5" />)}
                    {item.sortingAssistant && renderInfoRow('분류도우미', item.sortingAssistant, <CheckCircle2 className="w-5 h-5" />)}
                    {item.deliverAddress && renderInfoRow('배송지', item.deliverAddress, <MapPin className="w-5 h-5" />)}
                    {item.ratio && renderInfoRow('아파트 비율', item.ratio, <PieChart className="w-5 h-5" />)}
                    {item.dropOff && renderInfoRow('하자/집하', item.dropOff, <Warehouse className="w-5 h-5" />)}
                    {item.terminalAddress && renderInfoRow('터미널주소', item.terminalAddress, <MapPin className="w-5 h-5" />)}
                    {item.phoneNumber && renderInfoRow('연락처', item.phoneNumber, <Phone className="w-5 h-5" />)}
                    {renderInfoRow('마감일', formatDeadline(item.deadline), <Calendar className="w-5 h-5" />)}
                </div>

                {/* Detailed Description */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-900">
                        <FileText className="w-5 h-5" />
                        <h3 className="font-black">상세 설명</h3>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-3xl text-gray-700 text-[15px] leading-relaxed whitespace-pre-wrap font-medium border border-gray-100 shadow-inner">
                        {item.content || item.detail || '상세 내용이 없습니다.'}
                    </div>
                </div>

                {/* Warning Card */}
                <div className="p-5 bg-red-50 rounded-2xl border border-red-100 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-xs font-black text-red-800 mb-1">주의사항</p>
                        <p className="text-[11px] font-bold text-red-600 leading-normal">
                            채용 담당자를 사칭하는 사기 등에 주의하시기 바랍니다. <br />
                            금전 요구 및 차량 강매는 100% 사기입니다.
                        </p>
                        <a
                            href="http://pf.kakao.com/_XxixizX"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-[11px] font-black rounded-lg transition-all shadow-sm"
                        >
                            <AlertCircle className="w-3.5 h-3.5" />
                            신고하기
                        </a>
                    </div>
                </div>
            </div>

            {/* Image Zoom Modal */}
            {zoomIndex !== null && (
                <div
                    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300"
                    onTouchStart={(e) => setZoomTouchStartX(e.touches[0].clientX)}
                    onTouchEnd={(e) => {
                        if (zoomTouchStartX === null) return;
                        const diff = zoomTouchStartX - e.changedTouches[0].clientX;
                        if (diff > 50 && zoomIndex < images.length - 1) setZoomIndex(zoomIndex + 1);
                        else if (diff < -50 && zoomIndex > 0) setZoomIndex(zoomIndex - 1);
                        setZoomTouchStartX(null);
                    }}
                >
                    {/* Close */}
                    <button
                        onClick={() => setZoomIndex(null)}
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    {/* Prev */}
                    {zoomIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setZoomIndex(zoomIndex - 1); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                        >
                            <ChevronLeft className="w-7 h-7" />
                        </button>
                    )}
                    {/* Next */}
                    {zoomIndex < images.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setZoomIndex(zoomIndex + 1); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                        >
                            <ChevronLeft className="w-7 h-7 rotate-180" />
                        </button>
                    )}
                    {/* Image */}
                    <img
                        key={zoomIndex}
                        src={images[zoomIndex]}
                        alt={`Zoom View ${zoomIndex + 1}`}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in duration-200 px-16"
                        onClick={(e) => e.stopPropagation()}
                    />
                    {/* Dots */}
                    {images.length > 1 && (
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
                            {images.map((_: any, idx: number) => (
                                <div
                                    key={idx}
                                    onClick={() => setZoomIndex(idx)}
                                    className={`h-1.5 rounded-full transition-all cursor-pointer ${zoomIndex === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50 flex gap-3">
                <a
                    href={`sms:${item.phoneNumber}?body=${encodeURIComponent('안녕하세요. 구인공고에 관심이 있어 연락드립니다. [용카] 앱')}`}
                    className="flex-1 flex items-center justify-center gap-3 bg-green-500 text-white rounded-2xl py-4 font-black text-base shadow-lg shadow-green-200 hover:bg-green-600 transition-all active:scale-95"
                >
                    <MessageSquare className="w-6 h-6" />
                    문자 문의하기
                </a>
            </div>
        </div>
    );
}
