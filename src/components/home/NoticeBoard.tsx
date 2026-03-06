import React, { useState } from 'react';
import { CircleChevronUp, StickyNote, ChevronDown, Link as LinkIcon, X, ZoomIn, Search, Sparkles, Loader2, Phone, Briefcase, UserSearch, MapPin, CreditCard, Box, Award, PieChart, Plus, Smartphone, Play, Apple, Globe, ExternalLink, Camera } from 'lucide-react';
import { useNotices } from '@/hooks/useNotices';
import { useProApply } from '@/hooks/useProApply';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function NoticeBoard() {
    const [isNoticeOpen, setIsNoticeOpen] = useState(false);
    const [expandedNoticeIds, setExpandedNoticeIds] = useState<Set<string>>(new Set());
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('택배구인');
    const [showAppInstall, setShowAppInstall] = useState(false);
    const { notices, isNoticesLoading } = useNotices();
    const { posts: proApplyPosts, loading: isProApplyLoading } = useProApply();
    const { isLoggedIn } = useAuth();
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
            // Refined Context: Prioritize items that match query keywords
            const queryKeywords = queryText.split(' ').filter(k => k.length > 1);

            const findMatches = (list: any[]) => {
                // Prioritize company/title matches, then address/content. Added null checks to avoid toLowerCase errors.
                return list.sort((a, b) => {
                    const aText = `${a.title || ''} ${a.company || ''}`.toLowerCase();
                    const bText = `${b.title || ''} ${b.company || ''}`.toLowerCase();

                    const aMatch = queryKeywords.some(k => aText.includes(k.toLowerCase()));
                    const bMatch = queryKeywords.some(k => bText.includes(k.toLowerCase()));

                    if (aMatch && !bMatch) return -1;
                    if (!aMatch && bMatch) return 1;
                    return 0;
                }).filter(item => {
                    const searchStr = `${item.title || ''} ${item.company || ''} ${item.content || ''} ${item.deliverAddress || ''} ${item.address || ''} ${item.category || ''}`.toLowerCase();
                    return queryKeywords.some(k => searchStr.includes(k.toLowerCase()));
                });
            };

            const matchedProApply = findMatches(proApplyPosts);

            // Combine keyword matches and recent items for proApply collection only
            // Increased to 100 to cover more geographical areas, deduplicated by ID
            const contextProApply = Array.from(
                new Map([...matchedProApply, ...proApplyPosts].map(item => [item.id, item])).values()
            ).slice(0, 100);

            const context = [
                ...contextProApply.map(p => ({
                    id: p.id,
                    type: '[택배구인]',
                    title: p.title,
                    company: p.company || p.category,
                    location: p.deliverAddress || p.address,
                    income_manwon: p.monthlyIncome,
                    workTime: p.workTime,
                    volume: p.totalVolume,
                    date: p.createdAt instanceof Date ? p.createdAt.toISOString().split('T')[0] : 'N/A',
                    details: p.content // Add full content for deeper analysis
                }))
            ];

            console.log("보내는 쿼리:", queryText);
            console.log("AI Search Context Size:", context.length, "Matched:", matchedProApply.length);
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
                if (matches) {
                    const extractedIds = Array.from(new Set(matches.map((m: string) => {
                        const innerMatch = m.match(/[a-zA-Z0-9_-]{20,}/);
                        return innerMatch ? innerMatch[0] : null;
                    }).filter(Boolean))) as string[];

                    if (extractedIds.length > 0) {
                        setFilteredIds(extractedIds);
                        setIsFilterActive(true);
                    }
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

                    {/* Sub-tabs for Job Search */}
                    {activeTab === '택배구인' && (
                        <div className="px-5 py-3 bg-gray-50/50 flex flex-col gap-2">
                            <div className="flex gap-2">
                                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm border border-gray-100 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                    <Search className="w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="지역 검색 (예: 강남구, 도곡동)"
                                        value={regionSearch}
                                        onChange={(e) => setRegionSearch(e.target.value)}
                                        className="flex-1 bg-transparent outline-none text-sm font-bold placeholder:text-gray-300"
                                    />
                                </div>
                                <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-50 text-blue-600 border border-blue-100 whitespace-nowrap">
                                    <Briefcase className="w-4 h-4 text-blue-500" />
                                    {isFilterActive || regionSearch ? '검색된' : '현재'} 택배 일자리 {
                                        (() => {
                                            let allJobs = Array.from(new Map([...proApplyPosts, ...notices.filter(n => n.categoryName === '택배구인' || n.categoryName === '구인구직')].map(item => [item.id, item])).values());

                                            // Apply AI filter
                                            if (isFilterActive && filteredIds) {
                                                allJobs = allJobs.filter(j => filteredIds.includes(j.id));
                                            }

                                            // Apply Region filter
                                            if (regionSearch.trim()) {
                                                const searchLower = regionSearch.toLowerCase();
                                                allJobs = allJobs.filter(j =>
                                                    ((j as any).deliverAddress || (j as any).address || '').toLowerCase().includes(searchLower) ||
                                                    (j.title || '').toLowerCase().includes(searchLower) ||
                                                    ((j as any).company || '').toLowerCase().includes(searchLower)
                                                );
                                            }

                                            return allJobs.length;
                                        })()
                                    }건
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
                                    className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    전체 필터 해제
                                </button>
                            )}
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="p-4 space-y-4 bg-gray-50/50 pb-24">
                        {((activeTab === '택배구인' && isProApplyLoading) || (activeTab !== '택배구인' && isNoticesLoading)) ? (
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
                            } else {
                                displayData = notices.filter(notice => notice.categoryName === activeTab);
                            }

                            // Apply AI search filter if active
                            if (isFilterActive && filteredIds) {
                                displayData = displayData.filter(item => filteredIds.includes(item.id));
                            }

                            // Apply manual region filter if active
                            if (regionSearch.trim()) {
                                const searchLower = regionSearch.toLowerCase();
                                displayData = displayData.filter(item =>
                                    ((item as any).deliverAddress || (item as any).address || '').toLowerCase().includes(searchLower) ||
                                    (item.title || '').toLowerCase().includes(searchLower) ||
                                    ((item as any).company || '').toLowerCase().includes(searchLower)
                                );
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

                                return (
                                    <div
                                        key={notice.id}
                                        className={`p-5 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all overflow-hidden ${isHiring ? 'cursor-pointer hover:border-blue-200' : 'cursor-default border-gray-100 hover:border-gray-100'}`}
                                        onClick={() => isHiring && router.push(`/pro-apply/${notice.id}`)}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 mr-3">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === '택배구인' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-500'}`}>
                                                        {notice.categoryName || (activeTab === '택배구인' ? '택배일자리' : activeTab)}
                                                        {(notice.imageUrls || notice.images || notice.imageDownloadUrls)?.length > 0 && (
                                                            <Camera className="w-3 h-3" />
                                                        )}
                                                    </span>
                                                    {notice.SubCategories && (
                                                        <span className="text-[11px] font-black text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">
                                                            {notice.SubCategories}
                                                        </span>
                                                    )}
                                                    {notice.author && !notice.company && (
                                                        <span className="text-[10px] font-bold text-gray-400">
                                                            {notice.author}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-black text-gray-900 text-lg leading-tight tracking-tight">{notice.title || notice.username}</h4>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap bg-gray-50 px-2 py-1 rounded-lg">
                                                {notice.createdAt instanceof Date
                                                    ? notice.createdAt.toLocaleDateString('ko-KR')
                                                    : '정보 없음'
                                                }
                                            </span>
                                        </div>

                                        {isHiring && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {notice.monthlyIncome && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 text-green-700 rounded-xl border border-green-100 shadow-sm">
                                                        <CreditCard className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-black">수익: {notice.monthlyIncome}</span>
                                                    </div>
                                                )}
                                                {notice.totalVolume && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shadow-sm">
                                                        <Box className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-black">수량: {notice.totalVolume}</span>
                                                    </div>
                                                )}
                                                {notice.license && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 text-orange-700 rounded-xl border border-orange-100 shadow-sm">
                                                        <Award className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-black">자격: {notice.license}</span>
                                                    </div>
                                                )}
                                                {notice.deliverAddress && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-xl border border-gray-200">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-black">{notice.deliverAddress}</span>
                                                    </div>
                                                )}
                                                {notice.ratio && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
                                                        <PieChart className="w-3.5 h-3.5" />
                                                        <span className="text-[11px] font-black">{notice.ratio}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Notice Images - Show only for Gongji (Notice) tab */}
                                        {activeTab === '공지사항' && (notice.imageUrls || notice.images || notice.imageDownloadUrls) && (
                                            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
                                                {(notice.imageUrls || notice.images || notice.imageDownloadUrls).map((url: string, idx: number) => (
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
                                                {notice.content}
                                            </p>
                                            {!isExpanded && notice.content && (notice.content.split('\n').length > 3 || notice.content.length > 100) && (
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
                                        </div>

                                        {/* SMS and redundant links removed from list as requested */}
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

                    {activeTab === '택배구인' && (
                        <div className="absolute bottom-10 left-0 right-0 flex justify-center z-[130] pointer-events-none">
                            <button
                                onClick={() => setShowAppInstall(true)}
                                className="flex items-center gap-2 px-8 py-4 bg-[#4CAF50] text-white rounded-full font-black text-[15px] shadow-2xl hover:bg-[#45a049] transition-all transform hover:scale-105 active:scale-95 pointer-events-auto"
                            >
                                <Smartphone className="w-5 h-5" />
                                용카앱 설치
                            </button>
                        </div>
                    )}
                </div>
            )}

            <AppInstallDialog isOpen={showAppInstall} onClose={() => setShowAppInstall(false)} />

            {selectedImage && (
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
            )}
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
            <div className="absolute left-4 text-blue-500">
                <Sparkles className="w-5 h-5" />
            </div>
            <input
                type="text"
                placeholder="AI검색 예) 일산 500만원 수익 택배 일자리 있어"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] outline-none focus:border-blue-400 focus:bg-white transition-all shadow-inner"
            />
            <button
                type="submit"
                disabled={isSearching || !localQuery.trim()}
                className="absolute right-3 p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-gray-200 transition-colors shadow-sm"
            >
                {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Search className="w-5 h-5" />
                )}
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

