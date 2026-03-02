'use client';

import React from 'react';
import { Search, Sparkles, Plus, Image as ImageIcon, FileText, ChevronRight, Clock } from 'lucide-react';
import { useHomeData } from '@/hooks/useHomeData';
import { useUserStorage } from '@/hooks/useUserStorage';
import { useAuth } from '@/context/auth-context';

interface HomeTabProps {
    setActiveTab: (tab: string) => void;
}

export default function HomeTab({ setActiveTab }: HomeTabProps) {
    const {
        favorites,
        isSearchFocused,
        setIsSearchFocused,
        addFavorite,
        removeFavorite
    } = useHomeData();
    const { isLoggedIn } = useAuth();
    const { storageItems, isStorageLoading } = useUserStorage();

    // Display top 3 items + 1 "More" button slot
    const recentItems = storageItems.slice(0, 3);

    return (
        <div className="flex flex-col items-center justify-center pt-7 md:pt-20 pb-1">
            <div className="w-full max-w-[600px] text-center mb-8">
                <h2 className="text-2xl md:text-2xl font-bold mb-10 tracking-tight text-[#1a1a1a]">
                    용카로 업무를 50% 줄여 보세요.
                </h2>

                <div className="relative group mb-10">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                    <div className="relative flex items-center bg-white rounded-2xl p-2 shadow-xl border border-gray-100">
                        <div className="pl-5 text-indigo-500">
                            <Search className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="주요 업무를 선택 또는 입력 하세요"
                            className="w-full px-5 py-3 text-base outline-none text-gray-700 placeholder-gray-400 font-medium"
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        />
                        <button className="bg-indigo-600 text-white p-3.5 rounded-xl hover:bg-indigo-700 transition-all active:scale-95">
                            <Sparkles className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search Suggestions */}
                    {isSearchFocused && (
                        <div className="absolute top-full left-0 right-0 mt-3 animate-slide-up z-10">
                            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                                {[
                                    { text: "구인 공고를 더 쉽게 올려 보시겠어요", tab: 'ai' },
                                    { text: "팀원 근무일을 좀 더 편하게 관리하세요", tab: 'schedule' },
                                    { text: "팀원들과 정산은 아주 가볍게 매일매일", tab: 'schedule' },
                                    { text: "혹시 자동화 툴이 필요 하신가요?", tab: 'memo' }
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setActiveTab(item.tab)}
                                        className="px-6 py-4 text-left text-sm font-semibold text-gray-600 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 flex items-center gap-3"
                                    >
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                        {item.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Favorites Section */}
                <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
                    {favorites.map((fav, i) => (
                        <a
                            key={i}
                            href={fav.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-2 group relative"
                        >
                            <div className="w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 group-hover:shadow-lg group-hover:scale-105 transition-all overflow-hidden p-3">
                                <img src={fav.icon} alt={fav.name} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-[11px] font-bold text-gray-500 group-hover:text-gray-800 transition-colors uppercase tracking-wider">
                                {fav.name}
                            </span>
                            <button
                                onClick={(e) => removeFavorite(i, e)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] shadow-sm hover:bg-red-600"
                            >
                                ✕
                            </button>
                        </a>
                    ))}
                    <button
                        onClick={addFavorite}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-14 h-14 bg-gray-50 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:border-blue-300 group-hover:text-blue-500 transition-all">
                            <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 group-hover:text-blue-500 transition-colors uppercase tracking-wider">
                            추가
                        </span>
                    </button>
                </div>

                {/* Recent Storage Section */}
                {isLoggedIn && (
                    <div className="mt-15 w-full text-left">


                        {isStorageLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="aspect-square bg-gray-50 animate-pulse rounded-2xl border border-gray-100"></div>
                                ))}
                            </div>
                        ) : storageItems.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {recentItems.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setActiveTab('memo')}
                                        className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer overflow-hidden aspect-square flex flex-col"
                                    >
                                        {item.type === 'image' ? (
                                            <div className="relative flex-1 bg-gray-50 overflow-hidden">
                                                <img
                                                    src={item.content}
                                                    alt={item.fileName || 'Saved Image'}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                                <div className="absolute top-3 right-3 p-1.5 bg-black/30 backdrop-blur-md rounded-lg text-white">
                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 p-4 bg-blue-50/30 flex flex-col overflow-hidden relative text-left">
                                                <div className="text-[11px] font-bold text-blue-600 mb-2 flex items-center gap-1.5">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    <span>메모</span>
                                                </div>
                                                <p className="text-[13px] font-medium text-gray-700 leading-relaxed line-clamp-4">
                                                    {item.content}
                                                </p>
                                                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-blue-50/50 to-transparent"></div>
                                            </div>
                                        )}
                                        <div className="px-3 py-2.5 bg-white border-t border-gray-50 flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold shrink-0">
                                                <Clock className="w-3 h-3" />
                                                {item.createdAt?.toDate ?
                                                    item.createdAt.toDate().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) :
                                                    '방금 전'
                                                }
                                            </div>
                                            <span className="text-[10px] font-black text-gray-300 group-hover:text-blue-500 transition-colors">VIEW</span>
                                        </div>
                                    </div>
                                ))}

                                {/* More Button Slot */}
                                <div
                                    onClick={() => setActiveTab('memo')}
                                    className="group relative bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 shadow-sm hover:shadow-xl hover:scale-[1.02] hover:bg-white hover:border-blue-200 transition-all cursor-pointer overflow-hidden aspect-square flex flex-col items-center justify-center gap-3 text-center p-4"
                                >
                                    <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-all">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 group-hover:text-blue-600 transition-colors">
                                        저장파일<br />더보기
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => setActiveTab('ai')}
                                className="w-full py-10 bg-gray-100/30 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center gap-4 group cursor-pointer hover:bg-white hover:border-blue-100 transition-all text-center"
                            >
                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-300 group-hover:text-blue-500 transition-all">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-400 group-hover:text-gray-600 transition-colors">아직 저장된 파일이 없습니다.</p>
                                    <p className="text-xs font-bold text-gray-300 group-hover:text-blue-400 transition-colors mt-1">AI 툴을 사용하여 결과를 저장해 보세요!</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
