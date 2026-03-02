'use client';

import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Download, Type, Check, Loader2, Sparkles, Maximize2, Minimize2, Save } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { useUserStorage } from '@/hooks/useUserStorage';
import { useAuth } from '@/context/auth-context';

type BrandType = 'cj' | 'coupang' | 'logen' | 'lotte' | 'hanjin' | 'etc';

interface BrandConfig {
    name: string;
    logo: string;
    primaryColor: string;
    secondaryColor?: string;
    accentColor?: string;
    textColor: string;
}

interface RecruitData {
    courier: string;
    delivery_address: string;
    terminal_address: string;
    delivery_ratio: string;
    income: string;
    sorting_helper: string;
    working_hours: string;
    agency: string;
    license: string;
    deadline: string;
    contact: string;
    description: string;
}

const FIELD_LABELS: Record<keyof RecruitData, string> = {
    courier: '택배사명',
    delivery_address: '배송지 주소',
    terminal_address: '터미널 주소',
    delivery_ratio: '배송 비율',
    income: '매출 / 수익',
    sorting_helper: '분류도우미',
    working_hours: '근무시간',
    agency: '대리점명',
    license: '화물운송자격증',
    deadline: '모집마감',
    contact: '연락처',
    description: '상세설명'
};

const BRANDS: Record<BrandType, BrandConfig> = {
    cj: {
        name: 'CJ',
        logo: '/cj.png',
        primaryColor: '#F8F9FA',
        secondaryColor: '#004191',
        accentColor: '#E6192E',
        textColor: '#1a1a1a'
    },
    coupang: {
        name: '쿠팡',
        logo: '/cou.png',
        primaryColor: '#F8F9FA',
        secondaryColor: '#E6192E',
        accentColor: '#2E3192',
        textColor: '#1a1a1a'
    },
    logen: {
        name: '로젠',
        logo: '/log.png',
        primaryColor: '#F8F9FA',
        secondaryColor: '#FFD500',
        accentColor: '#000000',
        textColor: '#1a1a1a'
    },
    lotte: {
        name: '롯데',
        logo: '/lot.png',
        primaryColor: '#F8F9FA',
        secondaryColor: '#E6192E',
        accentColor: '#000000',
        textColor: '#1a1a1a'
    },
    hanjin: {
        name: '한진',
        logo: '/hanjin.png',
        primaryColor: '#F0F7FF', // Light blue tint for "blue-focused" background
        secondaryColor: '#004191',
        accentColor: '#FFD500',
        textColor: '#1a1a1a'
    },
    etc: {
        name: '기타',
        logo: '/logo512.png',
        primaryColor: '#F8F9FA',
        secondaryColor: '#3B82F6',
        accentColor: '#1a1a1a',
        textColor: '#1a1a1a'
    }
};

interface SimpleImageModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SimpleImageModal({ isOpen, onClose }: SimpleImageModalProps) {
    const [selectedBrand, setSelectedBrand] = useState<BrandType>('cj');
    const [inputText, setInputText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [recruitData, setRecruitData] = useState<RecruitData | null>(null);
    const [isSavingToStorage, setIsSavingToStorage] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const { uploadImage } = useUserStorage();
    const { isLoggedIn } = useAuth();

    const activeBrand = BRANDS[selectedBrand];

    const handleAIAnalyze = async () => {
        if (!inputText.trim()) {
            alert('분석할 공고 내용을 입력해주세요.');
            return;
        }

        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/ai/recruit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: inputText }),
            });

            if (!response.ok) throw new Error('AI analysis failed');

            const data = await response.json();
            setRecruitData(data);

            const courier = data.courier || '';
            if (courier.includes('CJ') || courier.includes('대한통운')) setSelectedBrand('cj');
            else if (courier.includes('쿠팡')) setSelectedBrand('coupang');
            else if (courier.includes('로젠')) setSelectedBrand('logen');
            else if (courier.includes('롯데')) setSelectedBrand('lotte');
            else if (courier.includes('한진')) setSelectedBrand('hanjin');
            else setSelectedBrand('etc');

        } catch (error) {
            console.error(error);
            alert('AI 분석 중 오류가 발생했습니다.');
        } finally {
            setTimeout(() => setIsAnalyzing(false), 1000);
        }
    };

    const handleDownload = async () => {
        if (!previewRef.current) return;

        setIsDownloading(true);
        try {
            const dataUrl = await domToPng(previewRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
            });

            const link = document.createElement('a');
            link.download = `구인광고이미지_${activeBrand.name}_${new Date().getTime()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Download error:', error);
            alert('이미지 생성 중 오류가 발생했습니다.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSaveToStorage = async () => {
        if (!previewRef.current || !isLoggedIn) return;

        setIsSavingToStorage(true);
        try {
            const dataUrl = await domToPng(previewRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
            });

            // Data URL to Blob
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], `구인광고_${activeBrand.name}_${Date.now()}.png`, { type: 'image/png' });

            await uploadImage(file);
            alert('저장파일 탭에 성공적으로 저장되었습니다!');
        } catch (error) {
            console.error('Save to storage error:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSavingToStorage(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>

            <div className={`relative transition-all duration-300 ease-in-out bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-200 ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-7xl h-[95vh] rounded-3xl'
                }`}>
                {/* Left: Editor */}
                <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 bg-gray-50/50 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                <ImageIcon className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg">AI 이미지 메이커</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                                title={isFullscreen ? "축소" : "전체화면"}
                            >
                                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Text Input & AI Button */}
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-gray-400 flex items-center justify-between">
                                <div className="flex items-center gap-2"><Type className="w-4 h-4" /> 공고 내용 입력</div>
                                <button
                                    onClick={handleAIAnalyze}
                                    disabled={isAnalyzing || !inputText.trim()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                                >
                                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    AI 분석 및 자동 채우기
                                </button>
                            </label>
                            <textarea
                                className="w-full h-40 p-5 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none text-gray-700 font-medium"
                                placeholder="카톡이나 카페의 구인글을 붙여넣으세요..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                            ></textarea>
                        </div>

                        {/* Brand Selection */}
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" /> 회사 스타일 선택
                            </label>
                            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                                {(Object.keys(BRANDS) as BrandType[]).map((brandKey) => (
                                    <button
                                        key={brandKey}
                                        onClick={() => setSelectedBrand(brandKey)}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${selectedBrand === brandKey
                                            ? 'border-blue-500 bg-blue-50/50'
                                            : 'border-white bg-white hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg">
                                            <img src={BRANDS[brandKey].logo} alt={BRANDS[brandKey].name} className="w-full h-full object-contain" />
                                        </div>
                                        <span className={`text-[10px] font-bold ${selectedBrand === brandKey ? 'text-blue-600' : 'text-gray-500'}`}>
                                            {BRANDS[brandKey].name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Manual Edit Fields */}
                        {recruitData && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                    <Check className="w-4 h-4" /> 내용 수정
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {Object.entries(recruitData).map(([key, value]) => (
                                        key !== 'description' && (
                                            <div key={key} className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-bold ml-1 mb-1">
                                                    {FIELD_LABELS[key as keyof RecruitData]}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={value}
                                                    onChange={(e) => setRecruitData({ ...recruitData, [key]: e.target.value })}
                                                    className="px-3 py-2 bg-white border border-gray-100 rounded-lg text-xs font-medium outline-none focus:border-blue-400"
                                                />
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-white shadow-lg flex gap-3">
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading || isSavingToStorage || !recruitData}
                            className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            {isDownloading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Download className="w-5 h-5" />
                            )}
                            <span>이미지 다운로드</span>
                        </button>

                        {isLoggedIn && (
                            <button
                                onClick={handleSaveToStorage}
                                disabled={isDownloading || isSavingToStorage || !recruitData}
                                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-blue-100"
                            >
                                {isSavingToStorage ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>저장 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        <span>내 저장공간에 저장하기</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: Preview (Fixed 650px Wide, Dynamic Height) */}
                <div className="w-full md:w-1/2 bg-[#f0f2f5] flex items-center justify-center p-4 md:p-10 overflow-auto border-l border-gray-100 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md hover:bg-white rounded-full transition-colors text-gray-500 z-50">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="scale-[0.4] sm:scale-[0.5] md:scale-[0.6] lg:scale-[0.7] xl:scale-90 origin-center transition-transform">
                        <div
                            ref={previewRef}
                            className="w-[650px] min-h-[850px] max-h-[1200px] flex flex-col bg-white overflow-hidden shadow-2xl relative"
                        >
                            {/* Image Header */}
                            <div
                                className="w-full h-28 flex items-center justify-between px-10 relative overflow-hidden"
                                style={{ backgroundColor: activeBrand.secondaryColor }}
                            >
                                <div className="absolute top-0 right-0 w-48 h-full bg-white/10 -skew-x-12 translate-x-12"></div>
                                <div className="z-10 bg-white p-4 rounded-3xl shadow-xl w-28 h-28 flex items-center justify-center translate-y-6">
                                    <img src={activeBrand.logo} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                                <div className="z-10 flex flex-col items-end">
                                    <span className="text-white text-3xl font-black uppercase tracking-tighter">대리점 구인</span>
                                    <div
                                        className="w-20 h-1.5 rounded-full mt-2"
                                        style={{ backgroundColor: activeBrand.accentColor || '#FFF' }}
                                    ></div>
                                </div>
                            </div>

                            {/* Main Body */}
                            <div className="px-10 pt-20 pb-16 flex-1 flex flex-col">
                                <div className="mb-12 text-center">
                                    <h2
                                        className="text-5xl font-black tracking-tighter mb-3"
                                        style={{ color: activeBrand.secondaryColor }}
                                    >
                                        구인 모집 공고
                                    </h2>
                                    <p className="text-gray-400 font-bold text-base tracking-widest uppercase">Official Recruitment Notice</p>
                                </div>

                                {recruitData ? (
                                    <div className="space-y-5 bg-gray-50/80 p-10 rounded-[40px] border border-gray-100 shadow-sm">
                                        {[
                                            { key: 'courier' },
                                            { key: 'delivery_address' },
                                            { key: 'terminal_address' },
                                            { key: 'delivery_ratio' },
                                            { key: 'income' },
                                            { key: 'sorting_helper' },
                                            { key: 'working_hours' },
                                            { key: 'agency' },
                                            { key: 'license' },
                                            { key: 'deadline' },
                                            { key: 'contact' },
                                        ].map((item, i) => {
                                            const value = recruitData[item.key as keyof RecruitData];
                                            return value && (
                                                <div key={i} className="flex items-start gap-4">
                                                    <span className="text-base font-black text-gray-400 w-28 pt-0.5 whitespace-nowrap">
                                                        □ {FIELD_LABELS[item.key as keyof RecruitData]} :
                                                    </span>
                                                    <span className="text-base font-extrabold text-[#1a1a1a] flex-1">
                                                        {value}
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {recruitData.description && (
                                            <div className="mt-10 pt-8 border-t border-gray-200">
                                                <span className="text-base font-black text-gray-400 block mb-4">□ 상세설명</span>
                                                <p className="text-base font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                    {recruitData.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-[40px] p-16">
                                        <Sparkles className="w-16 h-16 mb-6 opacity-30" />
                                        <p className="text-xl font-bold">분석된 내용이 없습니다.</p>
                                        <p className="text-base">내용을 입력하고 AI 분석을 눌러주세요.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div
                                className="px-10 py-2 flex items-center justify-center"
                                style={{ backgroundColor: '#f8fafc' }}
                            >
                                <div className="flex gap-4">
                                    <div className="w-16 h-1 rounded-full bg-gray-200"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
