import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CircleChevronUp, StickyNote, ChevronDown, Link as LinkIcon, X, ZoomIn, Search, Sparkles, Loader2, Phone, Briefcase, UserSearch, MapPin, CreditCard, Box, Award, PieChart, Plus, Smartphone, Play, Apple, Globe, ExternalLink, Camera, MessageSquare, Truck } from 'lucide-react';
import { useNotices } from '@/hooks/useNotices';
import { useProApply } from '@/hooks/useProApply';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useEquipment } from '@/hooks/useEquipment';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, Timestamp, deleteDoc, doc, getCountFromServer } from 'firebase/firestore';

/** Smart Region Mapping: City -> Province */
const CITY_TO_PROVINCE_MAP: Record<string, string> = {
    // Gyeonggi
    '수원': '경기', '성남': '경기', '안양': '경기', '부천': '경기', '광명': '경기', '평택': '경기', '안산': '경기',
    '고양': '경기', '과천': '경기', '구리': '경기', '남양주': '경기', '오산': '경기', '시흥': '경기', '군포': '경기',
    '의왕': '경기', '하남': '경기', '파주': '경기', '이천': '경기', '안성': '경기', '김포': '경기', '화성': '경기',
    '광주': '경기', '양주': '경기', '포천': '경기', '여주': '경기', '연천': '경기', '가평': '경기', '양평': '경기',
    // Gangwon
    '춘천': '강원', '원주': '강원', '강릉': '강원', '동해': '강원', '태백': '강원', '속초': '강원', '삼척': '강원',
    '홍천': '강원', '횡성': '강원', '영월': '강원', '평창': '강원', '정선': '강원', '철원': '강원', '화천': '강원',
    '양구': '강원', '인제': '강원', '양양': '강원',
    // Chungbuk
    '청주': '충북', '충주': '충북', '제천': '충북', '보은': '충북', '옥천': '충북', '영동': '충북', '증평': '충북',
    '진천': '충북', '괴산': '충북', '음성': '충북', '단양': '충북',
    // Chungnam
    '천안': '충남', '공주': '충남', '보령': '충남', '아산': '충남', '서산': '충남', '논산': '충남', '계룡': '충남',
    '당진': '충남', '금산': '충남', '부여': '충남', '서천': '충남', '청양': '충남', '홍성': '충남', '예산': '충남', '태안': '충남',
    // Jeonbuk
    '전주': '전북', '군산': '전북', '익산': '전북', '정읍': '전북', '남원': '전북', '김제': '전북', '완주': '전북',
    '진안': '전북', '무주': '전북', '장수': '전북', '임실': '전북', '순창': '전북', '고창': '전북', '부안': '전북',
    // Jeonnam
    '목포': '전남', '여수': '전남', '순천': '전남', '나주': '전남', '광양': '전남', '담양': '전남', '곡성': '전남',
    '구례': '전남', '고흥': '전남', '보성': '전남', '화순': '전남', '장흥': '전남', '강진': '전남', '해남': '전남',
    '영암': '전남', '무안': '전남', '함평': '전남', '영광': '전남', '장성': '전남', '완도': '전남', '진도': '전남', '신안': '전남',
    // Gyeongbuk
    '포항': '경북', '경주': '경북', '김천': '경북', '안동': '경북', '구미': '경북', '영주': '경북', '영천': '경북',
    '상주': '경북', '문경': '경북', '경산': '경북', '칠곡': '경북', '예천': '경북', '봉화': '경북', '울진': '경북',
    // Gyeongnam
    '창원': '경남', '진주': '경남', '통영': '경남', '사천': '경남', '김해': '경남', '밀양': '경남', '거제': '경남',
    '양산': '경남', '거창': '경남', '함안': '경남', '창녕': '경남', '고성': '경남',
    '남해': '경남', '하동': '경남', '산청': '경남', '함양': '경남', '합천': '경남'
};

const SEOUL_DISTRICTS = [
    '강남', '강동', '강북', '강서', '관악', '광진', '구로', '금천', '노원', '도봉',
    '동대문', '동작', '마포', '서대문', '서초', '성동', '성북', '송파', '양천', '영등포',
    '용산', '은평', '종로', '중구', '중랑'
];

export default function NoticeBoard() {
    const [isNoticeOpen, setIsNoticeOpen] = useState(false);
    const [expandedNoticeIds, setExpandedNoticeIds] = useState<Set<string>>(new Set());
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('택배구인');
    const [showAppInstall, setShowAppInstall] = useState(false);
    const [showDispatchDialog, setShowDispatchDialog] = useState(false);
    const { notices, isNoticesLoading } = useNotices(isNoticeOpen);
    const { posts: proApplyPosts, loading: isProApplyLoading } = useProApply(isNoticeOpen);
    const { equipment, loading: isEquipmentLoading } = useEquipment(isNoticeOpen);
    const { firebaseUser, isLoggedIn } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Deep Linking: open notice overlay if tab=NoticeBoard in URL
    React.useEffect(() => {
        const tabParam = searchParams.get('tab');
        const noticeTabParam = searchParams.get('noticeTab');

        if (tabParam === 'NoticeBoard') {
            setIsNoticeOpen(true);
            if (noticeTabParam === '구인구직' || !noticeTabParam) {
                setActiveTab('택배구인');
            } else if (noticeTabParam) {
                setActiveTab(noticeTabParam);
            }
        }
    }, [searchParams]);

    // AI Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [isAiSearching, setIsAiSearching] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const [filteredIds, setFilteredIds] = useState<string[] | null>(null);
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [regionSearch, setRegionSearch] = useState('');
    const [aiTimeline, setAiTimeline] = useState<any[]>([]);
    const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
    const [totalProCount, setTotalProCount] = useState(0);
    const [totalEquipCount, setTotalEquipCount] = useState(0);
    const noticeScrollRef = useRef<HTMLDivElement | null>(null);

    /** Fetch Total Counts for UI Header (Lazy Load when open) */
    useEffect(() => {
        if (!isNoticeOpen) return;

        const fetchCounts = async () => {
            try {
                // Efficiently get counts without loading all documents
                const proSnap = await getCountFromServer(collection(db, 'proApply'));
                setTotalProCount(proSnap.data().count);
                const equipSnap = await getCountFromServer(collection(db, 'equipment'));
                setTotalEquipCount(equipSnap.data().count);
            } catch (error) {
                console.error('Error fetching total counts:', error);
            }
        };
        fetchCounts();
    }, [isNoticeOpen]);

    const NOTICE_SCROLL_KEY = 'noticeBoardScrollTop';
    const NOTICE_STATE_KEY = 'noticeBoardRestoreState';

    /** 뒤로 가기 시 검색/필터 상태 복원 후 공지 패널 열고 스크롤 복원 */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stateJson = sessionStorage.getItem(NOTICE_STATE_KEY);
        if (stateJson) {
            try {
                const s = JSON.parse(stateJson) as {
                    regionSearch?: string;
                    isFilterActive?: boolean;
                    filteredIds?: string[] | null;
                    searchQuery?: string;
                    activeTab?: string;
                };
                if (s.regionSearch != null) setRegionSearch(s.regionSearch);
                if (s.isFilterActive != null) setIsFilterActive(s.isFilterActive);
                if (s.filteredIds != null) setFilteredIds(s.filteredIds);
                if (s.searchQuery != null) setSearchQuery(s.searchQuery);
                if (s.activeTab != null) setActiveTab(s.activeTab);
            } catch (_) { }
            sessionStorage.removeItem(NOTICE_STATE_KEY);
        }
        const saved = sessionStorage.getItem(NOTICE_SCROLL_KEY);
        if (saved !== null) setIsNoticeOpen(true);
    }, []);

    /** Fetch AI Timeline from Firebase */
    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                const q = query(collection(db, 'aitimeline'), orderBy('createdAt', 'desc'), limit(20));
                const snapshot = await getDocs(q);
                const history = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAiTimeline(history);
            } catch (error) {
                console.error('Error fetching AI timeline:', error);
            }
        };

        if (isNoticeOpen) {
            fetchTimeline();
        }
    }, [isNoticeOpen]);

    /** 패널 열림 시 저장된 스크롤 위치 복원 */
    useEffect(() => {
        if (!isNoticeOpen) return;
        const saved = sessionStorage.getItem(NOTICE_SCROLL_KEY);
        if (saved === null) return;
        const top = parseInt(saved, 10);
        if (Number.isNaN(top)) {
            sessionStorage.removeItem(NOTICE_SCROLL_KEY);
            return;
        }
        const t = setTimeout(() => {
            if (noticeScrollRef.current) noticeScrollRef.current.scrollTop = top;
            sessionStorage.removeItem(NOTICE_SCROLL_KEY);
        }, 150);
        return () => clearTimeout(t);
    }, [isNoticeOpen]);

    /** 지역 + SubCategories 검색. 공백/쉼표로 여러 키워드 가능(AND). cj ↔ 씨제이 통합 매칭 */
    const matchesRegionAndCategorySearch = (item: any, searchInput: string): boolean => {
        const keywords = searchInput
            .split(/[\s,]+/)
            .map((k) => k.trim().toLowerCase())
            .filter((k) => k.length > 0);
        if (keywords.length === 0) return true;

        const regionText = [
            item.deliverAddress,
            item.address,
            item.title,
            item.company,
            item.equipment_name,
            item.equipment_career,
            (Array.isArray(item.SubCategories) ? item.SubCategories.join(' ') : (item.SubCategories || '')),
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return keywords.every((kw) => {
            if (kw === 'cj' || kw === '씨제이') {
                return regionText.includes('cj') || regionText.includes('씨제이');
            }

            // Smart Search for Equipment
            if (activeTab === '용차출동') {
                const province = CITY_TO_PROVINCE_MAP[kw];
                if (province) {
                    return regionText.includes(kw) || regionText.includes(province);
                }
            }

            return regionText.includes(kw);
        });
    };

    const handleDelete = async (id: string, collectionName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('정말 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, collectionName, id));
            alert('삭제되었습니다.');
            // list will refresh automatically due to onSnapshot in hooks
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const handleAISearch = async (queryText: string) => {
        if (!isLoggedIn) {
            alert('AI 검색은 로그인 후 이용 가능합니다.');
            return;
        }
        if (!queryText.trim()) return;

        setSearchQuery(queryText);
        setIsAiSearching(true);
        setAiResult(null);
        setShowAiModal(true); // Open modal immediately when search starts

        try {
            // Intelligent Data Router Logic
            const queryKeywords = queryText.split(' ').filter(k => k.length > 0);

            // 1. 지역 추출 (시/군/구 + 사전 기반 매칭)
            const regionRegex = /([가-힣]+(?:시|군|구))/g;
            let extractedRegions: string[] = queryText.match(regionRegex) || [];

            // 사전 기반 추가 추출 (구가 빠진 경우 대비: 예: '강남', '수원')
            const regionDict = [...SEOUL_DISTRICTS, ...Object.keys(CITY_TO_PROVINCE_MAP)];
            regionDict.forEach(region => {
                if (queryText.includes(region)) {
                    // 이미 정규식으로 '강남구' 등이 잡혔으면 중복 추가 방지
                    const isAlreadyCaptured = extractedRegions.some(er => er.includes(region));
                    if (!isAlreadyCaptured) {
                        extractedRegions.push(region);
                    }
                }
            });

            // 2. 키워드별 가중치 설정
            const hasIncomeQuery = queryText.includes('수익') || queryText.includes('원 이상') || queryText.includes('급여');
            const keywordList = ["백업", "야간", "오네", "지게차"];
            const conditionList = ["주말", "편한", "출퇴근"];

            const scoredData = proApplyPosts.map(item => {
                let score = 0;
                const itemText = `${item.title || ''} ${item.company || ''} ${item.content || ''} ${item.deliverAddress || ''} ${item.address || ''}`.toLowerCase();

                // 지역 일치 가중치 (매우 높음)
                if (extractedRegions.length > 0) {
                    const matchRegion = extractedRegions.some(r => itemText.includes(r.toLowerCase()));
                    if (matchRegion) score += 100;
                }

                // 키워드 일치 가중치
                queryKeywords.forEach(k => {
                    if (itemText.includes(k.toLowerCase())) score += 10;
                });

                // 특정 조건 가중치 (수익)
                if (hasIncomeQuery && item.monthlyIncome) score += 20;

                // 상세 키워드 검색 (백업, 야간 등)
                keywordList.forEach(k => {
                    if (queryText.includes(k) && (item.content || '').includes(k)) score += 15;
                });

                // 근무 조건 검색 (주말, 편한 등)
                conditionList.forEach(k => {
                    if (queryText.includes(k) && ((item.workTime || '').includes(k) || (item.holiday || '').includes(k))) score += 15;
                });

                return { ...item, _score: score };
            });

            // 3. 점수 순으로 정렬 후 상위 10개 추출
            const contextProApply = scoredData
                .filter(item => item._score > 0 || extractedRegions.length === 0) // 지역이 특정되었을 때는 점수 있는 것만, 아니면 전체에서 상위
                .sort((a, b) => b._score - a._score)
                .slice(0, 10);

            const context = contextProApply.map(p => ({
                id: p.id,
                type: '[택배구인]',
                title: p.title,
                company: p.company || p.category,
                location: p.deliverAddress || p.address,
                income_manwon: p.monthlyIncome,
                workTime: p.workTime,
                volume: p.totalVolume,
                date: p.createdAt instanceof Date ? p.createdAt.toISOString().split('T')[0] : 'N/A',
                details: p.content // 상세 분석을 위해 내용 유지
            }));

            console.log("보내는 쿼리:", queryText);
            console.log("AI Search Context Size:", context.length);
            if (context.length > 0) {
                console.log("첫 번째 컨텍스트 샘플:", context[0]);
            }

            const response = await fetch('/api/ai/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: queryText, context })
            });

            const data = await response.json();
            if (data.answer) {
                setAiResult(data.answer);

                // Extract IDs for filtering the main list
                const idRegex = /(?:\[ID:|ID:|\(ID:)\s*([a-zA-Z0-9_-]{20,})[\]\)]?/g;
                const matches = data.answer.match(idRegex);
                let extractedIds: string[] = [];
                if (matches) {
                    extractedIds = Array.from(new Set(matches.map((m: string) => {
                        const innerMatch = m.match(/[a-zA-Z0-9_-]{20,}/);
                        return innerMatch ? innerMatch[0] : null;
                    }).filter(Boolean))) as string[];

                    if (extractedIds.length > 0) {
                        setFilteredIds(extractedIds);
                        setIsFilterActive(true);
                    }
                }

                // Save to Firebase AI Timeline
                try {
                    await addDoc(collection(db, 'aitimeline'), {
                        query: queryText,
                        answer: data.answer,
                        filteredIds: extractedIds,
                        createdAt: serverTimestamp()
                    });

                    // Refresh local timeline state
                    const q = query(collection(db, 'aitimeline'), orderBy('createdAt', 'desc'), limit(20));
                    const snapshot = await getDocs(q);
                    setAiTimeline(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } catch (saveError) {
                    console.error('Error saving to AI timeline:', saveError);
                }
            } else {
                setAiResult('검색 결과를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('AI Search Error:', error);
            setAiResult('AI 검색 중 오류가 발생했습니다.');
        } finally {
            setIsAiSearching(false);
        }
    };

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(expandedNoticeIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedNoticeIds(newSet);
    };

    return (
        <>
            <footer
                className="w-full py-4 text-center text-gray-500 text-sm font-bold border-t border-gray-100 bg-white mt-auto cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 group sticky bottom-0 z-40"
                onClick={() => setIsNoticeOpen(true)}
            >
                <CircleChevronUp className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                용카 택배일자리 · 용차출동 · 공지사항
            </footer>

            {/* Notice Full Screen Overlay */}
            {isNoticeOpen && (
                <div
                    ref={noticeScrollRef}
                    className="fixed inset-0 z-[110] bg-white animate-fade-in overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <StickyNote className="w-6 h-6 text-blue-500" />
                            택배구인 · 용차호출 · 공지사항
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setAiResult(null);
                                    setIsNoticeOpen(false);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* AI Search Bar */}
                    <div className="px-5 py-4 bg-white border-b border-gray-100">
                        <AISearchBar
                            onSearch={handleAISearch}
                            isSearching={isAiSearching}
                            initialValue={searchQuery}
                        />

                        {/* AI Search Timeline */}
                        <div className="mt-4">
                            <button
                                onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                                className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold border w-full transition-colors bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 shadow-sm active:scale-[0.98]"
                            >
                                <Sparkles className={`w-3.5 h-3.5 ${isTimelineExpanded ? 'text-blue-500' : 'text-blue-400'}`} />
                                AI 검색 타임라인 {aiTimeline.length > 0 && `(${aiTimeline.length})`}
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isTimelineExpanded ? 'rotate-180 text-blue-500' : ''}`} />
                            </button>

                            {isTimelineExpanded && (
                                <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {aiTimeline.length > 0 ? (
                                        aiTimeline.map((item, idx) => (
                                            <div
                                                key={item.id || idx}
                                                onClick={() => {
                                                    setSearchQuery(item.query);
                                                    setAiResult(item.answer);
                                                    if (item.filteredIds && item.filteredIds.length > 0) {
                                                        setFilteredIds(item.filteredIds);
                                                        setIsFilterActive(true);
                                                    } else {
                                                        setFilteredIds(null);
                                                        setIsFilterActive(false);
                                                    }
                                                    setShowAiModal(true);
                                                }}
                                                className="group flex flex-col p-3 bg-gray-50 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[13px] font-black text-gray-800 group-hover:text-blue-700 line-clamp-1">
                                                        {item.query}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-bold shrink-0 ml-2">
                                                        {item.createdAt instanceof Timestamp
                                                            ? item.createdAt.toDate().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                            : item.createdAt?.seconds
                                                                ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                                : '방금 전'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 line-clamp-1 group-hover:text-blue-600/70">
                                                    {item.answer?.replace(/\[ID:[^\]]+\]/g, '').trim()}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center py-4 text-xs font-bold text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            최근 검색 내역이 없습니다.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-100 bg-white overflow-x-auto no-scrollbar">
                        {['택배구인', '용차출동', '공지사항'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 min-w-[100px] py-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab
                                    ? 'border-blue-500 text-blue-600 bg-blue-50/30'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Sub-tabs for Job / Equipment Search */}
                    {(activeTab === '택배구인' || activeTab === '용차출동') && (
                        <div className="px-4 sm:px-5 py-3 bg-gray-50/50 flex flex-col gap-2 min-w-0 overflow-hidden">
                            <div className="flex flex-col sm:flex-row gap-2 min-w-0 w-full">
                                <div className={`flex-1 flex items-center gap-2 min-w-0 px-3 py-2 bg-white rounded-xl shadow-sm border border-gray-100 transition-all focus-within:ring-2 ${activeTab === '택배구인'
                                    ? 'focus-within:border-green-400 focus-within:ring-green-100'
                                    : 'focus-within:border-blue-400 focus-within:ring-blue-100'
                                    }`}>
                                    <Search className={`w-4 h-4 shrink-0 ${activeTab === '택배구인' ? 'text-green-400' : 'text-blue-400'}`} />
                                    <input
                                        type="text"
                                        placeholder={activeTab === '택배구인' ? "강남구 쿠팡 / 씨제이 / 강남구 " : "지역 + 택배 또는 냉장 냉동 (예: 광주 택배, 광주 1톤냉동 )"}
                                        value={regionSearch}
                                        onChange={(e) => setRegionSearch(e.target.value)}
                                        className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold placeholder:text-gray-300"
                                    />
                                </div>
                                <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border shrink-0 sm:shrink-0 w-full sm:w-auto transition-colors ${activeTab === '택배구인'
                                    ? 'bg-green-50 text-green-600 border-green-100'
                                    : 'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                    {activeTab === '택배구인'
                                        ? <Briefcase className="w-4 h-4 text-green-500 shrink-0" />
                                        : <Truck className="w-4 h-4 text-blue-500 shrink-0" />
                                    }
                                    <span className="truncate">
                                        {isFilterActive || regionSearch ? '검색된' : '전체'} {activeTab === '택배구인' ? '택배 일자리' : '용차 정보'} {
                                            (() => {
                                                // If no filters are active, show the real total count from server
                                                if (!isFilterActive && !regionSearch.trim()) {
                                                    return activeTab === '택배구인' ? totalProCount : totalEquipCount;
                                                }

                                                // If filtering is active, calculate from current dataSet
                                                let dataSet = [];
                                                if (activeTab === '택배구인') {
                                                    dataSet = Array.from(new Map([...proApplyPosts, ...notices.filter(n => n.categoryName === '택배구인' || n.categoryName === '구인구직')].map(item => [item.id, item])).values());
                                                } else {
                                                    dataSet = equipment;
                                                }

                                                if (isFilterActive && filteredIds) {
                                                    dataSet = dataSet.filter(j => filteredIds.includes(j.id));
                                                }

                                                if (regionSearch.trim()) {
                                                    const searchLower = regionSearch.trim().toLowerCase();
                                                    dataSet = dataSet.filter(j => matchesRegionAndCategorySearch(j, searchLower));
                                                }

                                                return dataSet.length;
                                            })()
                                        }건
                                    </span>
                                </div>
                            </div>

                            {(isFilterActive || regionSearch) && (
                                <button
                                    onClick={() => {
                                        setIsFilterActive(false);
                                        setFilteredIds(null);
                                        setSearchQuery('');
                                        setRegionSearch('');
                                    }}
                                    className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors w-full sm:w-auto"
                                >
                                    <X className="w-3.5 h-3.5 shrink-0" />
                                    전체 필터 해제
                                </button>
                            )}
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="p-4 space-y-4 bg-gray-50/50 pb-24">
                        {((activeTab === '택배구인' && isProApplyLoading) || (activeTab === '용차출동' && isEquipmentLoading) || (activeTab !== '택배구인' && activeTab !== '용차출동' && isNoticesLoading)) ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="animate-pulse flex flex-col gap-3 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                        <div className="flex gap-4">
                                            <div className="w-20 h-20 bg-gray-100 rounded-xl shrink-0"></div>
                                            <div className="flex-1 space-y-3 py-1">
                                                <div className="h-5 bg-gray-100 rounded w-3/4"></div>
                                                <div className="h-4 bg-gray-50 rounded w-1/2"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (() => {
                            // Merge and filter logic
                            let displayData: any[] = [];
                            if (activeTab === '택배구인') {
                                const noticeJobs = notices.filter(n => n.categoryName === '택배구인' || n.categoryName === '구인구직');
                                displayData = [...proApplyPosts, ...noticeJobs];
                                displayData = Array.from(new Map(displayData.map(item => [item.id, item])).values());
                                displayData.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
                            } else if (activeTab === '용차출동') {
                                displayData = equipment;
                                if (regionSearch.trim()) {
                                    const kw = regionSearch.trim().toLowerCase();
                                    displayData = [...equipment]
                                        .filter(item => matchesRegionAndCategorySearch(item, kw))
                                        .sort((a, b) => {
                                            const aAddr = ((a as any).address || (a as any).deliverAddress || '').toLowerCase();
                                            const bAddr = ((b as any).address || (b as any).deliverAddress || '').toLowerCase();
                                            const aMatch = aAddr.includes(kw);
                                            const bMatch = bAddr.includes(kw);
                                            if (aMatch && !bMatch) return -1;
                                            if (!aMatch && bMatch) return 1;
                                            return 0;
                                        });
                                }
                            } else {
                                displayData = notices.filter(notice => notice.categoryName === activeTab);
                            }

                            // Apply AI search filter if active
                            if (isFilterActive && filteredIds) {
                                displayData = displayData.filter(item => filteredIds.includes(item.id));
                            }

                            // Apply manual region + SubCategories filter if active
                            if (regionSearch.trim()) {
                                const searchLower = regionSearch.trim().toLowerCase();
                                displayData = displayData.filter(item => matchesRegionAndCategorySearch(item, searchLower));
                            }

                            if (displayData.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 opacity-50">
                                            <StickyNote className="w-10 h-10" />
                                        </div>
                                        <p className="font-bold text-gray-500 text-lg">
                                            {activeTab === '용차출동' ? '현재 준비 중입니다' : `'${activeTab}' 등록된 정보가 없습니다.`}
                                        </p>
                                    </div>
                                );
                            }

                            return displayData.map((notice) => {
                                const isExpanded = expandedNoticeIds.has(notice.id);
                                const isHiring = activeTab === '택배구인';
                                const isEquipment = activeTab === '용차출동';

                                // Type guards or safe access for different item types
                                const equipmentName = (notice as any).equipment_name;
                                const equipmentCareer = (notice as any).equipment_career;
                                const equipmentAddress = (notice as any).address || (notice as any).deliverAddress;

                                const selectedJobNamesText = Array.isArray((notice as any).selectedJobNames)
                                    ? ((notice as any).selectedJobNames as any[])
                                        .map((v) => (v ?? '').toString().trim())
                                        .filter(Boolean)
                                        .join(', ')
                                    : ((notice as any).selectedJobNames ?? '').toString().trim();
                                const addressText = ((notice as any).deliverAddress ?? (notice as any).address ?? '')
                                    .toString()
                                    .trim();

                                const fallbackTitle = isEquipment
                                    ? [equipmentName, equipmentAddress].filter(Boolean).join(' · ')
                                    : [selectedJobNamesText, addressText].filter(Boolean).join(' · ');

                                let displayTitle = notice.title;
                                if (isEquipment) {
                                    displayTitle = equipmentName || fallbackTitle;
                                } else if (!displayTitle) {
                                    displayTitle = fallbackTitle;
                                }

                                return (
                                    <div
                                        key={notice.id}
                                        className={`p-5 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all overflow-hidden ${(isHiring || isEquipment) ? 'cursor-pointer hover:border-blue-200' : 'cursor-default border-gray-100 hover:border-gray-100'}`}
                                        onClick={() => {
                                            if (!isHiring && !isEquipment) return;
                                            if (noticeScrollRef.current != null) {
                                                sessionStorage.setItem(NOTICE_SCROLL_KEY, String(noticeScrollRef.current.scrollTop));
                                            }
                                            sessionStorage.setItem(NOTICE_STATE_KEY, JSON.stringify({
                                                regionSearch,
                                                isFilterActive,
                                                filteredIds,
                                                searchQuery,
                                                activeTab,
                                            }));

                                            if (isEquipment) {
                                                router.push(`/equipment/${notice.id}`);
                                            } else {
                                                router.push(`/pro-apply/${notice.id}`);
                                            }
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 mr-3">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === '택배구인' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-500'}`}>
                                                        {notice.categoryName || (activeTab === '택배구인' ? '택배일자리' : (activeTab === '용차출동' ? '용차출동' : activeTab))}
                                                        {((notice as any).imageDownloadUrls || notice.imageUrls || notice.images)?.length > 0 && (
                                                            <Camera className="w-3 h-3" />
                                                        )}
                                                    </span>
                                                    {(notice.SubCategories || (notice as any).SubCategories) && (
                                                        <span className="text-[11px] font-black text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">
                                                            {Array.isArray(notice.SubCategories || (notice as any).SubCategories)
                                                                ? (notice.SubCategories || (notice as any).SubCategories).join(', ')
                                                                : (notice.SubCategories || (notice as any).SubCategories)}
                                                        </span>
                                                    )}
                                                    {notice.author && !notice.company && (
                                                        <span className="text-[10px] font-black text-gray-400">
                                                            {notice.author}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-black text-gray-900 text-lg leading-tight tracking-tight">
                                                    {(() => {
                                                        const full = displayTitle || '';
                                                        return full.length > 35 ? `${full.slice(0, 35)}…` : full;
                                                    })()}
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap bg-gray-50 px-2 py-1 rounded-lg">
                                                    {notice.createdAt instanceof Date
                                                        ? notice.createdAt.toLocaleDateString('ko-KR')
                                                        : '정보 없음'
                                                    }
                                                </span>
                                                {firebaseUser?.uid === 'cYjFpXKkvhe4vt4FU26XtMHwm1j2' && (
                                                    <button
                                                        onClick={(e) => {
                                                            const isProApply = proApplyPosts.some(p => p.id === notice.id);
                                                            const collectionName = isProApply ? 'proApply' : 'community';
                                                            handleDelete(notice.id, collectionName, e);
                                                        }}
                                                        className="p-1 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                                        title="삭제"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {(isHiring || isEquipment) && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {/* Hiring specific fields */}
                                                {isHiring && notice.monthlyIncome && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 text-green-700 rounded-xl border border-green-100 shadow-sm">
                                                        <CreditCard className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-black">수익: {notice.monthlyIncome}</span>
                                                    </div>
                                                )}
                                                {/* Equipment specific fields */}
                                                {isEquipment && (notice as any).equipment_rentalRates && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 text-green-700 rounded-xl border border-green-100 shadow-sm">
                                                        <CreditCard className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-black">비용: {(notice as any).equipment_rentalRates}</span>
                                                    </div>
                                                )}
                                                {isHiring && notice.totalVolume && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shadow-sm">
                                                        <Box className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-black">수량: {notice.totalVolume}</span>
                                                    </div>
                                                )}
                                                {(notice.license || (notice as any).equipment_businessLicense) && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 shadow-sm">
                                                        <Award className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-black">{isEquipment ? '경력: ' : '자격: '}{notice.license || (notice as any).equipment_businessLicense}</span>
                                                    </div>
                                                )}
                                                {(notice.deliverAddress || (notice as any).address) && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-xl border border-gray-200">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-black">{notice.deliverAddress || (notice as any).address}</span>
                                                    </div>
                                                )}
                                                {isHiring && notice.ratio && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
                                                        <PieChart className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-black">{notice.ratio}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Notice Images - Show for Gongji (Notice) tab only */}
                                        {activeTab === '공지사항' && ((notice as any).imageDownloadUrls || notice.imageUrls || notice.images) && (
                                            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
                                                {((notice as any).imageDownloadUrls || notice.imageUrls || notice.images).map((url: string, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setSelectedImage(url);
                                                        }}
                                                    >
                                                        <img src={url} alt="공지 이미지" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="relative">
                                            <p className={`text-gray-600 text-[15px] whitespace-pre-wrap leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                                                {notice.content || (notice as any).equipment_career}
                                            </p>
                                        </div>

                                        {isEquipment && (
                                            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.location.href = `tel:${(notice as any).equipment_phoneNumber}`;
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-black hover:bg-blue-100 transition-colors"
                                                >
                                                    <Phone className="w-4 h-4" />
                                                    전화문의
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.location.href = `sms:${(notice as any).equipment_phoneNumber}?body=${encodeURIComponent('안녕하세요. 용카에서 보고 연락드립니다.')}`;
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-600 rounded-xl text-sm font-black hover:bg-green-100 transition-colors"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    문자문의
                                                </button>
                                            </div>
                                        )}

                                        {!isExpanded && (notice.content || (notice as any).equipment_career) && ((notice.content || (notice as any).equipment_career).split('\n').length > 3 || (notice.content || (notice as any).equipment_career).length > 100) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExpand(notice.id, e);
                                                }}
                                                className="mt-3 text-blue-500 text-sm font-bold hover:underline"
                                            >
                                                ... 더보기
                                            </button>
                                        )}
                                        {isExpanded && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExpand(notice.id, e);
                                                }}
                                                className="mt-3 text-gray-400 text-sm font-bold hover:underline"
                                            >
                                                접기
                                            </button>
                                        )}

                                        {notice.link && (
                                            <a
                                                href={notice.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center gap-2 w-full p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-black text-sm justify-center mt-4"
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                                자세히 보기
                                            </a>
                                        )}
                                        {notice.links && notice.links.map((link: any, idx: number) => (
                                            <a
                                                key={idx}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center gap-2 p-3 text-sm text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors font-bold justify-center mt-2"
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                                {link.title}
                                            </a>
                                        ))}
                                    </div>
                                );
                            });
                        })()}
                        <div className="h-10"></div>
                    </div>
                </div>
            )
            }

            {/* 용카앱 설치 버튼: body에 포털로 렌더링해 스크롤과 무관하게 화면 하단 고정 */}
            {
                typeof document !== 'undefined' && isNoticeOpen && activeTab === '공지사항' && ReactDOM.createPortal(
                    <div className="fixed bottom-10 left-0 right-0 flex justify-center z-[130] pointer-events-none">
                        <a
                            href="http://pf.kakao.com/_XxixizX"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-8 py-4 bg-[#FEE500] text-[#3C1E1E] rounded-full font-black text-[15px] shadow-2xl hover:bg-[#F5DC00] transition-all transform hover:scale-105 active:scale-95 pointer-events-auto"
                        >
                            <MessageSquare className="w-5 h-5" />
                            용카채팅문의
                        </a>
                    </div>,
                    document.body
                )
            }

            {
                typeof document !== 'undefined' && isNoticeOpen && activeTab === '택배구인' && ReactDOM.createPortal(
                    <div className="fixed bottom-10 left-0 right-0 flex justify-center z-[130] pointer-events-none">
                        <button
                            onClick={() => setShowAppInstall(true)}
                            className="flex items-center gap-2 px-8 py-4 bg-[#4CAF50] text-white rounded-full font-black text-[15px] shadow-2xl hover:bg-[#45a049] transition-all transform hover:scale-105 active:scale-95 pointer-events-auto"
                        >
                            <Smartphone className="w-5 h-5" />
                            용카앱 설치
                        </button>
                    </div>,
                    document.body
                )
            }

            {
                typeof document !== 'undefined' && isNoticeOpen && activeTab === '용차출동' && ReactDOM.createPortal(
                    <div className="fixed bottom-10 left-0 right-0 flex justify-center z-[130] pointer-events-none">
                        <button
                            onClick={() => setShowDispatchDialog(true)}
                            className="flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-full font-black text-[15px] shadow-2xl hover:bg-orange-600 transition-all transform hover:scale-105 active:scale-95 pointer-events-auto"
                        >
                            <Truck className="w-5 h-5" />
                            용차 호출
                        </button>
                    </div>,
                    document.body
                )
            }

            <AppInstallDialog isOpen={showAppInstall} onClose={() => setShowAppInstall(false)} />
            <DispatchInfoDialog isOpen={showDispatchDialog} onClose={() => setShowDispatchDialog(false)} />

            {
                selectedImage && (
                    <div
                        className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        <div
                            className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>
                            <img
                                src={selectedImage}
                                alt="확대된 이미지"
                                className="w-full h-full object-contain"
                                style={{ maxWidth: '90vw', maxHeight: '90vh' }}
                            />
                        </div>
                    </div>
                )
            }
            <AISearchResultModal
                isOpen={showAiModal}
                onClose={() => {
                    setShowAiModal(false);
                    setAiResult(null);
                    setIsAiSearching(false);
                }}
                isSearching={isAiSearching}
                result={aiResult}
                totalCount={proApplyPosts.length}
            />
        </>
    );
}

function AppInstallDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-center text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        <Smartphone className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black mb-2 leading-tight">용카앱에서 더 많은 기능을<br />만나보세요!</h3>
                    <p className="text-blue-100 text-xs font-bold">위치기반 찜하기 기능을 만나보세요</p>
                </div>
                <div className="p-6 space-y-3">
                    <a href="https://play.google.com/store/apps/details?id=com.yongcar.app&pcampaignid=web_share" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-4 bg-[#F5F7FA] hover:bg-[#E4E9F0] rounded-2xl transition-all active:scale-[0.98] group">
                        <div className="bg-[#34A853] p-2 rounded-lg text-white">
                            <Play className="w-5 h-5 fill-current" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-[10px] text-gray-500 font-bold leading-none mb-1">Android</p>
                            <p className="text-sm font-black text-gray-900 leading-none">Google Play</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </a>
                    <a href="https://apps.apple.com/kr/app/%EC%9A%A9%EC%B9%B4/id6758199533" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-4 bg-[#F5F7FA] hover:bg-[#E4E9F0] rounded-2xl transition-all active:scale-[0.98] group">
                        <div className="bg-[#000000] p-2 rounded-lg text-white">
                            <Apple className="w-5 h-5 fill-current" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-[10px] text-gray-500 font-bold leading-none mb-1">iOS</p>
                            <p className="text-sm font-black text-gray-900 leading-none">App Store</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </a>
                    <a href="https://yongcar.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-all active:scale-[0.98] group">
                        <div className="bg-blue-600 p-2 rounded-lg text-white">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-[10px] text-blue-400 font-bold leading-none mb-1">Official</p>
                            <p className="text-sm font-black text-blue-900 leading-none">용카 웹사이트</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-blue-200 group-hover:text-blue-500 transition-colors" />
                    </a>
                </div>
            </div>
        </div>
    );
}

function AISearchBar({ onSearch, isSearching, initialValue }: { onSearch: (q: string) => void, isSearching: boolean, initialValue: string }) {
    const [localQuery, setLocalQuery] = useState(initialValue);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(localQuery);
    };

    return (
        <form onSubmit={handleSubmit} className="relative flex items-center">
            <div className="absolute left-4 text-gray-400">
                <Sparkles className="w-5 h-5" />
            </div>
            <input
                type="text"
                placeholder="**시 수익 높은 일자리 추천 (예: 강남구 야간 배송)"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                disabled={isSearching}
                className="w-full pl-12 pr-12 py-3.5 bg-gray-100 border border-gray-200 rounded-2xl text-[15px] outline-none transition-all focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            />
            <button
                type="submit"
                disabled={isSearching}
                className={`absolute right-3 p-2 rounded-xl transition-all ${localQuery.trim() ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-gray-200 text-gray-400'}`}
            >
                <Search className="w-5 h-5" />
            </button>
        </form>
    );
}

function AISearchResultModal({ isOpen, onClose, isSearching, result, totalCount }: {
    isOpen: boolean;
    onClose: () => void;
    isSearching: boolean;
    result: string | null;
    totalCount: number;
}) {
    if (!isOpen) return null;

    const idRegex = /(?:\[ID:|ID:|\(ID:)\s*([a-zA-Z0-9_-]{20,})[\]\)]?/g;
    const idMatches = result?.match(idRegex);

    const uniqueIds = Array.from(new Set(idMatches?.map(m => {
        const innerMatch = m.match(/[a-zA-Z0-9_-]{20,}/);
        return innerMatch ? innerMatch[0] : null;
    }).filter(Boolean)));

    const cleanResult = result ? result.replace(idRegex, '').replace(/\s+\(\s+\)/g, '').trim() : '';

    return (
        <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
            <div
                className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] overflow-hidden animate-in slide-in-from-bottom duration-300 shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white relative shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black leading-tight">용카 AI 질문</h3>
                            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">ai 검색 외 지역 검색으로 한번 더 일자리를 검색하세요</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto no-scrollbar flex-1">
                    {isSearching ? (
                        <div className="py-12 flex flex-col items-center text-center gap-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center animate-pulse">
                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-lg animate-bounce">
                                    <Search className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                            <div className="space-y-4 w-full px-4">
                                <p className="text-lg font-black text-gray-900 leading-tight">잠시만 기다려주세요...<br />최적의 일자리를 분석하고 있습니다.</p>
                                <div className="w-full h-2 bg-blue-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full animate-progress-flow" style={{ width: '40%' }}></div>
                                </div>
                                <p className="text-sm text-gray-400 font-medium">전체 {totalCount}건의 공고 중 적합한 매물을 선별 중입니다.</p>
                            </div>
                        </div>
                    ) : result ? (
                        <div className="space-y-6">
                            <div className="bg-blue-50/50 p-5 rounded-[24px] border border-blue-100/50">
                                <p className="text-[15px] text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                                    {cleanResult}
                                </p>
                            </div>

                            {uniqueIds && uniqueIds.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">추천 공고 바로가기</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {uniqueIds.map((id, idx) => (
                                            <Link
                                                key={idx}
                                                href={`/pro-apply/${id}`}
                                                onClick={onClose}
                                                className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 transition-all active:scale-[0.98] group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-600">
                                                        <Briefcase className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-sm font-black text-gray-900">추천 공고 {idx + 1} 상세 보기</span>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all active:scale-[0.98] mt-4 shadow-xl"
                            >
                                확인했습니다
                            </button>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-gray-400">
                            결과를 불러오지 못했습니다. 다시 시도해주세요.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DispatchInfoDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-8 text-center text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                        <Truck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black mb-2 leading-tight">용카 호출은<br />현재 앱에서만 지원합니다</h3>
                    <p className="text-orange-100 text-xs font-bold">카톡으로 보내는 호출 기능을
                        만나보세요</p>
                </div>
                <div className="p-6 space-y-3">
                    <a href="https://play.google.com/store/apps/details?id=com.yongcar.app&pcampaignid=web_share" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-4 bg-[#F5F7FA] hover:bg-[#E4E9F0] rounded-2xl transition-all active:scale-[0.98] group">
                        <div className="bg-[#34A853] p-2 rounded-lg text-white">
                            <Play className="w-5 h-5 fill-current" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-[10px] text-gray-500 font-bold leading-none mb-1">Android</p>
                            <p className="text-sm font-black text-gray-900 leading-none">Google Play</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </a>
                    <a href="https://apps.apple.com/kr/app/%EC%9A%A9%EC%B9%B4/id6758199533" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-4 bg-[#F5F7FA] hover:bg-[#E4E9F0] rounded-2xl transition-all active:scale-[0.98] group">
                        <div className="bg-[#000000] p-2 rounded-lg text-white">
                            <Apple className="w-5 h-5 fill-current" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-[10px] text-gray-500 font-bold leading-none mb-1">iOS</p>
                            <p className="text-sm font-black text-gray-900 leading-none">App Store</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </a>
                    <a href="https://yongcar.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-all active:scale-[0.98] group">
                        <div className="bg-blue-600 p-2 rounded-lg text-white">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-[10px] text-blue-400 font-bold leading-none mb-1">Official</p>
                            <p className="text-sm font-black text-blue-900 leading-none">용카 웹사이트</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-blue-200 group-hover:text-blue-500 transition-colors" />
                    </a>
                </div>
            </div>
        </div>
    );
}

