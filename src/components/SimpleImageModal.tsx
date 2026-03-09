'use client';

import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Download, Type, Check, Loader2, Sparkles, ZoomIn, ZoomOut, Save, FileText, Plus } from 'lucide-react';
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
        primaryColor: '#F0F7FF',
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
    const [isSavingToStorage, setIsSavingToStorage] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(70);
    const [recruitData, setRecruitData] = useState<RecruitData | null>(null);
    const [isStoragePickerOpen, setIsStoragePickerOpen] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const { uploadImage, storageItems } = useUserStorage();
    const { isLoggedIn } = useAuth();

    const activeBrand = BRANDS[selectedBrand];

    const handleAIAnalyze = async () => {
        const text = inputText;
        if (!text.trim()) {
            alert('내용을 입력해주세요.');
            return;
        }
        setIsAnalyzing(true);

        // 로컬 파싱 로직 (AI 없이 텍스트에서 정보 추출)
        setTimeout(() => {
            const parsedData: RecruitData = {
                courier: text.match(/택배사[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                delivery_address: text.match(/(?:배송지|주소)[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                terminal_address: text.match(/터미널[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                delivery_ratio: text.match(/비율[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                income: text.match(/(?:수익|매출|급여)[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                sorting_helper: text.match(/분류[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                working_hours: text.match(/시간[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                agency: text.match(/대리점[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                license: text.match(/자격증[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                deadline: text.match(/마감[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                contact: text.match(/(?:연락처|번호)[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                description: text.replace(/\[구인등록 완료\].*|대리점:.*|연락처:.*|등록일:.*|링크:.*/g, '').trim()
            };

            setRecruitData(parsedData);

            const courier = parsedData.courier || '';
            if (courier.includes('CJ') || courier.includes('대한통운')) setSelectedBrand('cj');
            else if (courier.includes('쿠팡')) setSelectedBrand('coupang');
            else if (courier.includes('로젠')) setSelectedBrand('logen');
            else if (courier.includes('롯데')) setSelectedBrand('lotte');
            else if (courier.includes('한진')) setSelectedBrand('hanjin');
            else setSelectedBrand('etc');

            setIsAnalyzing(false);
        }, 800);
    };

    const importFromStorage = async (item: any) => {
        setInputText(item.content);
        setIsStoragePickerOpen(false);
    };

    // ✅ Fix: scrollWidth/scrollHeight 명시로 저장 시 잘림 방지
    const captureOptions = () => ({
        scale: 2,
        backgroundColor: '#ffffff',
        width: previewRef.current?.scrollWidth ?? 650,
        height: previewRef.current?.scrollHeight ?? 800,
    });

    const handleDownload = async () => {
        if (!previewRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await domToPng(previewRef.current, captureOptions());
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
            const dataUrl = await domToPng(previewRef.current, captureOptions());
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

    const scaleValue = zoomLevel / 100;

    // agency, description 제외하고 카드 표시
    const cardFields: (keyof RecruitData)[] = [
        'courier', 'delivery_address', 'terminal_address',
        'delivery_ratio', 'income', 'sorting_helper',
        'working_hours', 'license', 'deadline', 'contact'
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-7xl h-[95vh] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-200">

                {/* ───────── 왼쪽: 에디터 ───────── */}
                <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 bg-gray-50/50 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center bg-white shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                <ImageIcon className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg">AI 이미지 메이커</h3>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* 공고 입력 */}
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-gray-400 flex items-center justify-between">
                                <div className="flex items-center gap-2"><Type className="w-4 h-4" /> 공고 내용 입력</div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsStoragePickerOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-xs font-bold hover:bg-green-100 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> 저장파일에서 가져오기
                                    </button>
                                    <button
                                        onClick={() => handleAIAnalyze()}
                                        disabled={isAnalyzing || !inputText.trim()}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-50"
                                    >
                                        {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                        확인
                                    </button>
                                </div>
                            </label>
                            <textarea
                                className="w-full h-40 p-5 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none text-gray-700 font-medium"
                                placeholder="카톡이나 카페의 구인글을 붙여넣으세요..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                            />
                        </div>

                        {/* 브랜드 선택 */}
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

                        {/* ✅ Fix: description 포함 전체 필드 수정 가능 */}
                        {recruitData && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
                                    <Check className="w-4 h-4" /> 내용 수정
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {(Object.keys(recruitData) as (keyof RecruitData)[]).map((key) => (
                                        <div key={key} className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold ml-1 mb-1">
                                                {FIELD_LABELS[key]}
                                            </span>
                                            {key === 'description' ? (
                                                <textarea
                                                    rows={4}
                                                    value={recruitData[key]}
                                                    onChange={(e) => setRecruitData({ ...recruitData, [key]: e.target.value })}
                                                    className="px-3 py-2 bg-white border border-gray-100 rounded-lg text-xs font-medium outline-none focus:border-blue-400 resize-none"
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={recruitData[key]}
                                                    onChange={(e) => setRecruitData({ ...recruitData, [key]: e.target.value })}
                                                    className="px-3 py-2 bg-white border border-gray-100 rounded-lg text-xs font-medium outline-none focus:border-blue-400"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 액션 버튼 */}
                    <div className="p-6 border-t border-gray-100 bg-white shadow-lg flex gap-3">
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading || isSavingToStorage || !recruitData}
                            className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            <span>이미지 다운로드</span>
                        </button>
                        {isLoggedIn && (
                            <button
                                onClick={handleSaveToStorage}
                                disabled={isDownloading || isSavingToStorage || !recruitData}
                                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-blue-100"
                            >
                                {isSavingToStorage ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /><span>저장 중...</span></>
                                ) : (
                                    <><Save className="w-5 h-5" /><span>내 저장공간에 저장하기</span></>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* ───────── 오른쪽: 미리보기 ───────── */}
                <div className="w-full md:w-1/2 bg-[#f0f2f5] flex flex-col overflow-hidden border-l border-gray-100">

                    {/* 줌 컨트롤 바 */}
                    <div className="shrink-0 px-5 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between z-10">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setZoomLevel(z => Math.max(30, z - 10))}
                                disabled={zoomLevel <= 30}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-40"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-gray-500 w-12 text-center tabular-nums">{zoomLevel}%</span>
                            <button
                                onClick={() => setZoomLevel(z => Math.min(120, z + 10))}
                                disabled={zoomLevel >= 120}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-40"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setZoomLevel(70)}
                                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400 text-[10px] font-bold transition-colors"
                            >
                                초기화
                            </button>
                        </div>
                        <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* 스크롤 가능한 미리보기 */}
                    <div className="flex-1 overflow-auto flex items-start justify-center p-8">
                        <div
                            style={{ transform: `scale(${scaleValue})`, transformOrigin: 'top center' }}
                            className="transition-transform duration-150"
                        >
                            {/* ✅ 포스터: inline style로 작성해 domToPng 캡처 시 스타일 누락 방지 */}
                            <div
                                ref={previewRef}
                                style={{
                                    width: '650px',
                                    fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
                                    display: 'flex',
                                    flexDirection: 'column',
                                    backgroundColor: '#ffffff',
                                    overflow: 'visible',  // ✅ hidden → visible, 잘림 방지
                                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                }}
                            >
                                {/* ── 헤더: translate 제거, 순수 flex 중앙정렬 ── */}
                                <div style={{
                                    backgroundColor: activeBrand.secondaryColor,
                                    width: '100%',
                                    height: '120px',
                                    display: 'flex',
                                    alignItems: 'center',          // ✅ 수직 완전 중앙
                                    justifyContent: 'space-between',
                                    padding: '0 40px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxSizing: 'border-box',
                                }}>
                                    {/* 장식 사선 */}
                                    <div style={{
                                        position: 'absolute', top: 0, right: 0,
                                        width: '200px', height: '100%',
                                        backgroundColor: 'rgba(255,255,255,0.08)',
                                        transform: 'skewX(-12deg) translateX(48px)',
                                        pointerEvents: 'none',
                                    }} />

                                    {/* ✅ 로고: translate 없음, align-items center로 자연 중앙 */}
                                    <div style={{
                                        backgroundColor: '#ffffff',
                                        borderRadius: '18px',
                                        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                                        width: '84px',
                                        height: '84px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '10px',
                                        flexShrink: 0,
                                    }}>
                                        <img
                                            src={activeBrand.logo}
                                            alt="Logo"
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                        />
                                    </div>

                                    {/* 타이틀: 대리점명 구인, 밑줄/배경색 없음 */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{
                                            color: '#ffffff',
                                            fontSize: '28px',
                                            fontWeight: 900,
                                            letterSpacing: '-1px',
                                            lineHeight: 1,
                                        }}>
                                            {recruitData?.agency || '대리점'}
                                        </span>
                                        {/* ✅ "구인" 배지: 밑줄 없음, 배경만 accent 색상 */}
                                        <span style={{
                                            backgroundColor: activeBrand.accentColor || 'rgba(255,255,255,0.25)',
                                            color: '#ffffff',
                                            fontSize: '20px',
                                            fontWeight: 800,
                                            padding: '4px 14px',
                                            borderRadius: '10px',
                                            lineHeight: 1.4,
                                            flexShrink: 0,
                                        }}>
                                            구인
                                        </span>
                                    </div>
                                </div>

                                {/* ── 본문 ── */}
                                <div style={{ padding: '24px 32px 32px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {recruitData ? (
                                        <>
                                            {/* 카드 그리드 (아이콘 없음) */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                {cardFields.map((fieldKey) => {
                                                    const value = recruitData[fieldKey];
                                                    if (!value) return null;
                                                    const isContact = fieldKey === 'contact';
                                                    const isDeadline = fieldKey === 'deadline';
                                                    const isIncome = fieldKey === 'income';
                                                    const isFullWidth = isContact || isIncome;

                                                    return (
                                                        <div key={fieldKey} style={{
                                                            gridColumn: isFullWidth ? '1 / -1' : undefined,
                                                            backgroundColor: isContact
                                                                ? (activeBrand.secondaryColor ?? '#004191') + '14'
                                                                : isDeadline ? '#FFF7ED' : '#F9FAFB',
                                                            border: `1.5px solid ${isContact
                                                                ? (activeBrand.secondaryColor ?? '#004191') + '50'
                                                                : isDeadline ? '#FDBA74' : '#EFEFEF'
                                                                }`,
                                                            borderRadius: '14px',
                                                            padding: '12px 16px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '4px',
                                                        }}>
                                                            <span style={{
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                color: isContact ? (activeBrand.secondaryColor ?? '#004191') : '#9CA3AF',
                                                                letterSpacing: '0.04em',
                                                            }}>
                                                                {FIELD_LABELS[fieldKey]}
                                                            </span>
                                                            <span style={{
                                                                fontSize: isContact ? '17px' : '13px',
                                                                fontWeight: 800,
                                                                color: isContact ? (activeBrand.secondaryColor ?? '#004191') : '#1a1a1a',
                                                                lineHeight: 1.35,
                                                            }}>
                                                                {value}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* 상세설명 */}
                                            {recruitData.description && (
                                                <div style={{
                                                    backgroundColor: '#F9FAFB',
                                                    border: '1.5px solid #EFEFEF',
                                                    borderRadius: '14px',
                                                    padding: '14px 16px',
                                                }}>
                                                    <span style={{
                                                        display: 'block',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        color: '#9CA3AF',
                                                        letterSpacing: '0.04em',
                                                        marginBottom: '8px',
                                                    }}>
                                                        상세설명
                                                    </span>
                                                    <p style={{
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        color: '#374151',
                                                        lineHeight: 1.75,
                                                        whiteSpace: 'pre-wrap',
                                                        margin: 0,
                                                    }}>
                                                        {recruitData.description}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{
                                            minHeight: '380px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#D1D5DB',
                                            border: '2px dashed #F3F4F6',
                                            borderRadius: '24px',
                                            padding: '60px',
                                        }}>
                                            <p style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px' }}>분석된 내용이 없습니다.</p>
                                            <p style={{ fontSize: '13px', margin: 0 }}>내용을 입력하고 AI 분석을 눌러주세요.</p>
                                        </div>
                                    )}
                                </div>

                                {/* ── 푸터 ── */}
                                <div style={{
                                    padding: '10px 40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    backgroundColor: (activeBrand.secondaryColor ?? '#004191') + '0D',
                                }}>
                                    <div style={{ width: '40px', height: '3px', borderRadius: '999px', backgroundColor: (activeBrand.secondaryColor ?? '#004191') + '40' }} />
                                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#C9C9C9', letterSpacing: '0.15em' }}>tool-ai.kr</span>
                                    <div style={{ width: '40px', height: '3px', borderRadius: '999px', backgroundColor: (activeBrand.secondaryColor ?? '#004191') + '40' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Storage Content Picker Overlay */}
                {isStoragePickerOpen && (
                    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end">
                        <div className="w-full bg-white rounded-t-[40px] shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[70%]">
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                                <h4 className="font-black text-gray-900 text-xl flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    저장파일에서 불러오기
                                </h4>
                                <button onClick={() => setIsStoragePickerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                                <div className="grid grid-cols-1 gap-2">
                                    {storageItems.filter(item => item.type !== 'image' && !item.content?.startsWith('[구인등록 완료]')).length === 0 ? (
                                        <div className="py-20 text-center text-gray-400 font-bold">
                                            저장된 텍스트가 없습니다.
                                        </div>
                                    ) : (
                                        storageItems
                                            .filter(item => item.type !== 'image' && !item.content?.startsWith('[구인등록 완료]'))
                                            .map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => importFromStorage(item)}
                                                    className="w-full text-left p-4 hover:bg-blue-50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all group"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                                                            <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-gray-600 font-medium line-clamp-2 leading-relaxed">
                                                                {item.content}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">
                                                                {item.createdAt?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
