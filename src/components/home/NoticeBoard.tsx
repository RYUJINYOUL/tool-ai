'use client';

import React, { useState } from 'react';
import { CircleChevronUp, StickyNote, ChevronDown, Link as LinkIcon } from 'lucide-react';
import { useNotices } from '@/hooks/useNotices';

export default function NoticeBoard() {
    const [isNoticeOpen, setIsNoticeOpen] = useState(false);
    const [expandedNoticeIds, setExpandedNoticeIds] = useState<Set<string>>(new Set());
    const { notices, isNoticesLoading } = useNotices();

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
                className="w-full max-w-[900px] mx-auto py-5 text-center text-gray-500 text-sm font-bold border-t border-gray-100 bg-white mt-auto cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 group"
                onClick={() => setIsNoticeOpen(true)}
            >
                <CircleChevronUp className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                용카 AI 공지사항
            </footer>

            {/* Notice Bottom Sheet */}
            {isNoticeOpen && (
                <div
                    className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsNoticeOpen(false)}
                >
                    <div
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl max-h-[80vh] flex flex-col animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle Bar */}
                        <div className="flex justify-center py-4">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                        </div>

                        {/* Header */}
                        <div className="px-6 pb-4 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <StickyNote className="w-6 h-6 text-blue-500" />
                                공지사항
                            </h3>
                            <button
                                onClick={() => setIsNoticeOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <ChevronDown className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {isNoticesLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="animate-pulse flex flex-col gap-3">
                                            <div className="h-6 w-3/4 bg-gray-100 rounded"></div>
                                            <div className="h-4 w-1/4 bg-gray-50 rounded"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : notices.length > 0 ? (
                                notices.map((notice) => {
                                    const isExpanded = expandedNoticeIds.has(notice.id);
                                    return (
                                        <div key={notice.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-gray-900 text-lg">{notice.title}</h4>
                                                <span className="text-xs text-gray-400 font-medium whitespace-nowrap ml-4">
                                                    {notice.createdAt?.seconds
                                                        ? new Date(notice.createdAt.seconds * 1000).toLocaleDateString('ko-KR')
                                                        : '정보 없음'
                                                    }
                                                </span>
                                            </div>

                                            {/* Notice Images */}
                                            {notice.imageUrls && notice.imageUrls.length > 0 && (
                                                <div className="mb-4 flex flex-wrap gap-2 justify-start">
                                                    {notice.imageUrls.map((url, idx) => (
                                                        <img
                                                            key={idx}
                                                            src={url}
                                                            alt={`공지 이미지 ${idx + 1}`}
                                                            className="h-32 w-auto max-w-[200px] object-contain rounded-xl border border-gray-100 bg-white"
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            <div className="relative">
                                                <p className={`text-gray-600 text-sm whitespace-pre-wrap leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                                    {notice.content}
                                                </p>
                                                {!isExpanded && notice.content.split('\n').length > 2 && (
                                                    <button
                                                        onClick={(e) => toggleExpand(notice.id, e)}
                                                        className="mt-2 text-blue-500 text-xs font-bold hover:underline"
                                                    >
                                                        더보기
                                                    </button>
                                                )}
                                                {isExpanded && (
                                                    <button
                                                        onClick={(e) => toggleExpand(notice.id, e)}
                                                        className="mt-2 text-gray-400 text-xs font-bold hover:underline"
                                                    >
                                                        접기
                                                    </button>
                                                )}
                                            </div>

                                            {/* Notice Links */}
                                            {(notice.link || (notice.links && notice.links.length > 0)) && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                                    {notice.link && (
                                                        <a
                                                            href={notice.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-3 w-full p-3 bg-blue-50 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors font-bold text-sm"
                                                        >
                                                            <LinkIcon className="w-4 h-4" />
                                                            링크
                                                        </a>
                                                    )}
                                                    {notice.links && notice.links.map((link, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={link.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium px-1"
                                                        >
                                                            <LinkIcon className="w-3.5 h-3.5" />
                                                            {link.title}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <StickyNote className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-medium">등록된 공지사항이 없습니다.</p>
                                </div>
                            )}
                        </div>

                        {/* Bottom Safe Area */}
                        <div className="h-8 bg-white"></div>
                    </div>
                </div>
            )}
        </>
    );
}
