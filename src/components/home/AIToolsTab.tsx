'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import {
    Sparkles, Map, Upload, Download, FileCode, Trash2, ImagePlus,
    CalendarRange, MessageSquare, Link as LinkIcon, X, ExternalLink,
    Pencil, MoreVertical, ClipboardCheck, Send, ChevronDown, Lightbulb,
    Package, PlusCircle, ArrowRight, Check, ChevronLeft, ChevronRight,
    DownloadIcon, Maximize2, MessageCircle
} from 'lucide-react';
import { useAITools } from '@/hooks/useAITools';
import { useAuth } from '@/context/auth-context';
import { useAIBoard, BoardPost, useBoardReplies, useBoardApplications, BoardApplication } from '@/hooks/useAIBoard';

interface AIToolsTabProps {
    setIsRouteMapModalOpen: (open: boolean) => void;
    setIsRecruitModalOpen: (open: boolean) => void;
    setIsSimpleImageModalOpen: (open: boolean) => void;
    setActiveTab: (tab: string) => void;
}

export default function AIToolsTab({
    setIsRouteMapModalOpen,
    setIsRecruitModalOpen,
    setIsSimpleImageModalOpen,
    setActiveTab
}: AIToolsTabProps) {
    const { isLoggedIn } = useAuth();
    const [boardTab, setBoardTab] = React.useState<'intro' | 'suggestion' | 'kakao'>('intro');

    const checkAuthAndRun = (fn: () => void) => {
        if (!isLoggedIn) {
            alert('로그인이 필요한 서비스입니다.');
            return;
        }
        fn();
    };

    return (
        <div className="flex flex-col gap-10 max-w-[1000px] mx-auto pb-20">

            <div className="text-center pt-5">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    용카 AI 툴
                </h2>
            </div>

            {/* AI 서비스 그리드 */}
            <div>
                <h4 className="font-bold text-gray-700 flex items-center gap-2 mb-8">
                    <ImagePlus className="w-5 h-5 text-blue-500" />
                    웹 서비스 (.web)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Map className="w-5 h-5 text-orange-600" />
                            </div>
                            <h5 className="font-bold text-gray-800">라우트 지도 만들기 (Map)</h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">라우트가 어떻게 되요? 라는 질문 전 먼저 간단하게 만들어 공개 하세요. </p>
                        <button
                            onClick={() => checkAuthAndRun(() => setIsRouteMapModalOpen(true))}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                            사용하기
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-blue-600" />
                            </div>
                            <h5 className="font-bold text-gray-800">구인 공고 AI로 정리하기</h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">머리 아픈 구인공고 그만, AI가 정리하면 채용도 빠르고 정확합니다.</p>
                        <button
                            onClick={() => checkAuthAndRun(() => setIsRecruitModalOpen(true))}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                            사용하기
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <ImagePlus className="w-5 h-5 text-green-600" />
                            </div>
                            <h5 className="font-bold text-gray-800">심플한 이미지 만들기</h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">구인 정보 복사 입력 끝, 간단한 이미지 업로드로 구인광고 끝</p>
                        <button
                            onClick={() => checkAuthAndRun(() => setIsSimpleImageModalOpen(true))}
                            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                            사용하기
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <CalendarRange className="w-5 h-5 text-purple-600" />
                            </div>
                            <h5 className="font-bold text-gray-800">팀 공유일정표</h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">버튼 누르면 휴무, 엑셀 입력 정산 끝, 간단 공유 일정표웹</p>
                        <button
                            onClick={() => checkAuthAndRun(() => setActiveTab('schedule'))}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                            사용하기
                        </button>
                    </div>
                </div>
            </div>


            {/* ── 게시판 섹션 (리디자인) ── */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">

                {/* 탭 헤더 */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setBoardTab('intro')}
                        className={`relative flex items-center gap-2 px-7 py-4 text-sm font-bold transition-all
                            ${boardTab === 'intro'
                                ? 'text-gray-900'
                                : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Package className={`w-4 h-4 ${boardTab === 'intro' ? 'text-[#42A5F5]' : ''}`} />
                        용카 EXE 파일
                        {boardTab === 'intro' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#42A5F5] rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setBoardTab('suggestion')}
                        className={`relative flex items-center gap-2 px-7 py-4 text-sm font-bold transition-all
                            ${boardTab === 'suggestion'
                                ? 'text-gray-900'
                                : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Lightbulb className={`w-4 h-4 ${boardTab === 'suggestion' ? 'text-green-500' : ''}`} />
                        개발 제안 문의
                        {boardTab === 'suggestion' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setBoardTab('kakao')}
                        className={`relative flex items-center gap-2 px-7 py-4 text-sm font-bold transition-all
                            ${boardTab === 'kakao'
                                ? 'text-gray-900'
                                : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <MessageCircle className={`w-4 h-4 ${boardTab === 'kakao' ? 'text-yellow-500' : ''}`} />
                        용카 카톡 문의
                        {boardTab === 'kakao' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500 rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* 탭 컨텐츠 */}
                <div className="p-6 min-h-[500px]">
                    {boardTab === 'suggestion' ? (
                        <SuggestionBoard />
                    ) : boardTab === 'kakao' ? (
                        <KakaoInquiryContent />
                    ) : (
                        <BoardContent type="intro" />
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── 개발 제안 문의 전용 컴포넌트 ─────────────────────────────────────────────

function SuggestionBoard() {
    const { posts, loading, isAdmin, addPost } = useAIBoard('suggestion');
    const { isLoggedIn } = useAuth();
    const [isWriting, setIsWriting] = React.useState(false);
    const [newTitle, setNewTitle] = React.useState('');
    const [newContent, setNewContent] = React.useState('');
    const [newLink, setNewLink] = React.useState('');
    const [selectedImages, setSelectedImages] = React.useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const maxImages = 5;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (selectedImages.length + files.length > maxImages) {
            alert(`최대 ${maxImages}장까지 첨부 가능합니다.`);
            return;
        }
        setSelectedImages([...selectedImages, ...files]);
        setImagePreviews([...imagePreviews, ...files.map(f => URL.createObjectURL(f))]);
    };

    const removeImage = (index: number) => {
        const imgs = [...selectedImages];
        const prevs = [...imagePreviews];
        imgs.splice(index, 1);
        URL.revokeObjectURL(prevs[index]);
        prevs.splice(index, 1);
        setSelectedImages(imgs);
        setImagePreviews(prevs);
    };

    const handleRegister = async () => {
        if (!newTitle.trim() || !newContent.trim()) return;
        setIsSubmitting(true);
        try {
            await addPost(newTitle, newContent, selectedImages, newLink);
            setNewTitle(''); setNewContent(''); setNewLink('');
            setSelectedImages([]); setImagePreviews([]);
            setIsWriting(false);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="flex flex-col gap-5">

            {/* 안내 배너 */}
            {!isWriting && (
                <div className="flex items-start gap-4 bg-green-50 border border-green-100 rounded-2xl px-5 py-4">
                    <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                        <Lightbulb className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-green-800 mb-0.5">희망 기능 제안해 주세요</p>
                        <p className="text-xs text-green-600 leading-relaxed">
                            좋은 제안은 개발 착수합니다.
                        </p>
                    </div>
                    {isLoggedIn && (
                        <button
                            onClick={() => setIsWriting(true)}
                            className="shrink-0 flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                        >
                            <PlusCircle className="w-3.5 h-3.5" />
                            제안하기
                        </button>
                    )}
                </div>
            )}

            {/* 작성 폼 */}
            {isWriting && (
                <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="bg-green-500 px-5 py-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-white flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" /> 새 제안 작성
                        </span>
                        <button onClick={() => setIsWriting(false)} className="text-white/70 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-5 flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder="제목을 입력하세요"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-green-500 text-sm transition-colors"
                        />
                        <textarea
                            placeholder="어떤 기능이 필요하신가요? 구체적으로 설명해 주시면 더욱 도움이 됩니다."
                            value={newContent}
                            onChange={e => setNewContent(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-green-500 text-sm resize-none transition-colors"
                        />

                        {/* 링크 & 이미지 */}
                        <div className="flex flex-col gap-2 px-1">
                            <div className="flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="참고 링크 (선택사항)"
                                    value={newLink}
                                    onChange={e => setNewLink(e.target.value)}
                                    className="flex-1 text-sm bg-transparent outline-none border-b border-gray-200 focus:border-green-500 py-1 transition-colors"
                                />
                            </div>
                            <label className="flex items-center gap-2 w-fit cursor-pointer text-gray-400 hover:text-green-500 transition-colors">
                                <ImagePlus className="w-4 h-4" />
                                <span className="text-xs font-bold">사진 첨부 ({selectedImages.length}/{maxImages})</span>
                                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                            </label>
                            {imagePreviews.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {imagePreviews.map((url, i) => (
                                        <div key={i} className="relative w-16 h-16 shrink-0">
                                            <img src={url} alt="preview" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                            <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow">
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                onClick={() => setIsWriting(false)}
                                disabled={isSubmitting}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleRegister}
                                disabled={isSubmitting || !newTitle.trim() || !newContent.trim()}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {isSubmitting
                                    ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> 등록 중...</>
                                    : <><Send className="w-3.5 h-3.5" /> 제안 등록</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 포스트 목록 */}
            {posts.length === 0 ? (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Lightbulb className="w-8 h-8 text-green-300" />
                    </div>
                    <p className="font-bold text-gray-400 text-sm">아직 제안이 없습니다.</p>
                    <p className="text-xs text-gray-300 mt-1">첫 번째 아이디어를 남겨보세요!</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {posts.map((post, idx) => (
                        <SuggestionPostItem key={post.id} post={post} index={idx} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── 제안 포스트 아이템 ──────────────────────────────────────────────────────

function SuggestionPostItem({ post, index }: { post: BoardPost; index: number }) {
    const { replies, loading: repliesLoading } = useBoardReplies(post.id);
    const { addReply, updatePost, deletePost, updateReply, deleteReply, isAdmin } = useAIBoard(post.type);
    const { isLoggedIn, firebaseUser } = useAuth();

    const [isExpanded, setIsExpanded] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [editTitle, setEditTitle] = React.useState(post.title);
    const [editContent, setEditContent] = React.useState(post.content);
    const [editLink, setEditLink] = React.useState(post.link || '');
    const [existingImages, setExistingImages] = React.useState<string[]>(post.images || []);
    const [newImages, setNewImages] = React.useState<File[]>([]);
    const [newImagePreviews, setNewImagePreviews] = React.useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [isReplying, setIsReplying] = React.useState(false);
    const [replyContent, setReplyContent] = React.useState('');
    const [editingReplyId, setEditingReplyId] = React.useState<string | null>(null);
    const [editReplyContent, setEditReplyContent] = React.useState('');

    const isAuthor = firebaseUser?.uid === post.authorId;
    const canManage = isAuthor || isAdmin;
    const maxImages = 5;

    const handleUpdatePost = async () => {
        if (!editTitle.trim() || !editContent.trim()) return;
        setIsSubmitting(true);
        try {
            await updatePost(post.id, editTitle, editContent, newImages, existingImages, editLink);
            setIsEditing(false);
            setNewImages([]); setNewImagePreviews([]);
        } catch (err: any) { alert(err.message); }
        finally { setIsSubmitting(false); }
    };

    const handleDeletePost = async () => {
        if (!confirm('정말로 삭제하시겠습니까?')) return;
        try { await deletePost(post.id); } catch (err: any) { alert(err.message); }
    };

    const handleAddReply = async () => {
        if (!replyContent.trim()) return;
        try { await addReply(post.id, replyContent); setReplyContent(''); setIsReplying(false); }
        catch (err: any) { alert(err.message); }
    };

    const handleUpdateReply = async (replyId: string) => {
        if (!editReplyContent.trim()) return;
        try { await updateReply(post.id, replyId, editReplyContent); setEditingReplyId(null); setEditReplyContent(''); }
        catch (err: any) { alert(err.message); }
    };

    const handleDeleteReply = async (replyId: string) => {
        if (!confirm('답글을 삭제하시겠습니까?')) return;
        try { await deleteReply(post.id, replyId); } catch (err: any) { alert(err.message); }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (existingImages.length + newImages.length + files.length > maxImages) {
            alert(`최대 ${maxImages}장까지 첨부 가능합니다.`); return;
        }
        setNewImages([...newImages, ...files]);
        setNewImagePreviews([...newImagePreviews, ...files.map(f => URL.createObjectURL(f))]);
    };

    // 수정 모드
    if (isEditing) {
        return (
            <div className="bg-white rounded-2xl border border-green-300 p-5 shadow-sm flex flex-col gap-3">
                <input
                    type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-green-500 text-sm"
                    placeholder="제목"
                />
                <textarea
                    value={editContent} onChange={e => setEditContent(e.target.value)} rows={5}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-green-500 text-sm resize-none"
                    placeholder="내용"
                />
                <div className="flex items-center gap-2 px-1">
                    <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                        type="text" placeholder="참고 링크" value={editLink} onChange={e => setEditLink(e.target.value)}
                        className="flex-1 text-sm bg-transparent outline-none border-b border-gray-200 focus:border-green-500 py-1"
                    />
                </div>
                <label className="flex items-center gap-2 w-fit cursor-pointer text-gray-400 hover:text-green-500 text-xs font-bold px-1">
                    <ImagePlus className="w-4 h-4" />
                    사진 추가 ({existingImages.length + newImages.length}/{maxImages})
                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                <div className="flex gap-2 overflow-x-auto">
                    {existingImages.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 shrink-0">
                            <img src={url} className="w-full h-full object-cover rounded-lg border border-gray-100" />
                            <button onClick={() => setExistingImages(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                        </div>
                    ))}
                    {newImagePreviews.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 shrink-0">
                            <img src={url} className="w-full h-full object-cover rounded-lg border border-green-200" />
                            <button onClick={() => { setNewImages(p => p.filter((_, idx) => idx !== i)); URL.revokeObjectURL(newImagePreviews[i]); setNewImagePreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => { setIsEditing(false); setEditTitle(post.title); setEditContent(post.content); setExistingImages(post.images || []); setNewImages([]); setNewImagePreviews([]); }} disabled={isSubmitting} className="px-5 py-2 rounded-xl text-xs font-bold text-gray-500 bg-white border border-gray-200">취소</button>
                    <button onClick={handleUpdatePost} disabled={isSubmitting || !editTitle.trim() || !editContent.trim()} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-green-500 hover:bg-green-600 disabled:bg-gray-200 flex items-center gap-1.5">
                        {isSubmitting ? '수정 중...' : <><Check className="w-3.5 h-3.5" /> 수정 완료</>}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-gray-200 transition-all overflow-hidden">
            {/* 포스트 헤더 + 본문 */}
            <div
                className="p-5 cursor-pointer"
                onClick={() => setIsExpanded(prev => !prev)}
            >
                <div className="flex items-start gap-3">
                    {/* 인덱스 번호 */}
                    <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[11px] font-black text-green-500">{String(index + 1).padStart(2, '0')}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <h5 className="font-bold text-gray-800 text-sm leading-snug truncate">{post.title}</h5>
                            <div className="flex items-center gap-1 shrink-0">
                                {canManage && (
                                    <>
                                        <button
                                            onClick={e => { e.stopPropagation(); setIsEditing(true); }}
                                            className="p-1.5 text-gray-300 hover:text-green-500 rounded-lg transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDeletePost(); }}
                                            className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                )}
                                <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{post.author}</span>
                            <span className="text-[10px] text-gray-300">{post.createdAt instanceof Date ? post.createdAt.toLocaleDateString('ko-KR') : '-'}</span>
                            {replies.length > 0 && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                    <MessageSquare className="w-3 h-3" /> {replies.length}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 펼침 영역 */}
            {isExpanded && (
                <div className="border-t border-gray-50">
                    <div className="px-5 py-4">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed mb-4">{post.content}</p>

                        {post.images && post.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-3">
                                {post.images.map((url, i) => (
                                    <img key={i} src={url} alt="" onClick={() => window.open(url, '_blank')}
                                        className="w-28 h-28 object-cover rounded-xl border border-gray-100 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" />
                                ))}
                            </div>
                        )}

                        {post.link && (
                            <a href={post.link.startsWith('http') ? post.link : `https://${post.link}`}
                                target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg mb-4 transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> 참고 링크 보기
                            </a>
                        )}

                        {/* 답글 버튼 */}
                        <button
                            onClick={() => setIsReplying(!isReplying)}
                            className={`text-xs font-bold flex items-center gap-1.5 transition-colors ${isReplying ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {isReplying ? '답글 닫기' : `답글 달기${replies.length > 0 ? ` (${replies.length})` : ''}`}
                        </button>
                    </div>

                    {/* 답글 섹션 */}
                    {(isReplying || replies.length > 0) && (
                        <div className="bg-gray-50/60 px-5 py-4 border-t border-gray-50 space-y-3">
                            {replies.map(reply => (
                                <div key={reply.id} className="flex gap-3 group">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[9px] font-black text-green-600 shrink-0 mt-0.5">
                                        {reply.author[0]}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-bold text-gray-700">{reply.author}</span>
                                                <span className="text-[9px] text-gray-300">{reply.createdAt instanceof Date ? reply.createdAt.toLocaleString('ko-KR') : '-'}</span>
                                            </div>
                                            {(reply.authorId === firebaseUser?.uid || isAdmin) && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingReplyId(reply.id); setEditReplyContent(reply.content); }} className="text-[10px] text-gray-400 hover:text-green-500 font-bold">수정</button>
                                                    <button onClick={() => handleDeleteReply(reply.id)} className="text-[10px] text-gray-400 hover:text-red-400 font-bold">삭제</button>
                                                </div>
                                            )}
                                        </div>
                                        {editingReplyId === reply.id ? (
                                            <div className="flex gap-2 mt-1">
                                                <input
                                                    type="text" value={editReplyContent} onChange={e => setEditReplyContent(e.target.value)} autoFocus
                                                    className="flex-1 bg-white px-3 py-1.5 rounded-lg border border-green-300 text-xs outline-none"
                                                />
                                                <button onClick={() => handleUpdateReply(reply.id)} className="text-[10px] font-bold text-green-500">저장</button>
                                                <button onClick={() => setEditingReplyId(null)} className="text-[10px] font-bold text-gray-400">취소</button>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 leading-normal">{reply.content}</p>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isLoggedIn && isReplying && (
                                <div className="flex gap-2 pt-1">
                                    <input
                                        type="text" placeholder="답글을 입력하세요..."
                                        value={replyContent} onChange={e => setReplyContent(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddReply()}
                                        className="flex-1 bg-white px-4 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-green-500 transition-colors"
                                    />
                                    <button
                                        onClick={handleAddReply}
                                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                        <Send className="w-3 h-3" /> 등록
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── EXE 파일 보드 (기존 유지) ────────────────────────────────────────────────

function BoardContent({ type }: { type: 'intro' | 'suggestion' }) {
    const { posts, loading, isAdmin, addPost } = useAIBoard(type);
    const { isLoggedIn } = useAuth();
    const [isWriting, setIsWriting] = React.useState(false);
    const [newTitle, setNewTitle] = React.useState('');
    const [newContent, setNewContent] = React.useState('');
    const [newLink, setNewLink] = React.useState('');
    const [selectedImages, setSelectedImages] = React.useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const canWrite = isAdmin;
    const maxImages = 30;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (selectedImages.length + files.length > maxImages) { alert(`최대 ${maxImages}장까지 첨부 가능합니다.`); return; }
        setSelectedImages([...selectedImages, ...files]);
        setImagePreviews([...imagePreviews, ...files.map(f => URL.createObjectURL(f))]);
    };

    const removeImage = (index: number) => {
        const imgs = [...selectedImages]; const prevs = [...imagePreviews];
        imgs.splice(index, 1); URL.revokeObjectURL(prevs[index]); prevs.splice(index, 1);
        setSelectedImages(imgs); setImagePreviews(prevs);
    };

    const handleRegister = async () => {
        if (!newTitle.trim() || !newContent.trim()) return;
        setIsSubmitting(true);
        try {
            await addPost(newTitle, newContent, selectedImages, newLink);
            setNewTitle(''); setNewContent(''); setNewLink('');
            setSelectedImages([]); setImagePreviews([]);
            setIsWriting(false);
        } catch (err: any) { alert(err.message); }
        finally { setIsSubmitting(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-3 border-[#42A5F5] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="flex flex-col gap-5">
            {canWrite && (
                !isWriting ? (
                    <button onClick={() => setIsWriting(true)} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4" /> 새 파일 등록하기
                    </button>
                ) : (
                    <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="bg-[#42A5F5] px-5 py-3 flex items-center justify-between">
                            <span className="text-sm font-bold text-white flex items-center gap-2"><Package className="w-4 h-4" /> 새 EXE 파일 등록</span>
                            <button onClick={() => setIsWriting(false)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 flex flex-col gap-3">
                            <input type="text" placeholder="파일명 / 제목" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#42A5F5] text-sm" />
                            <textarea placeholder="설명을 입력하세요" value={newContent} onChange={e => setNewContent(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-[#42A5F5] text-sm resize-none" />
                            <div className="flex items-center gap-2 px-1">
                                <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                <input type="text" placeholder="다운로드 링크 (선택사항)" value={newLink} onChange={e => setNewLink(e.target.value)} className="flex-1 text-sm bg-transparent outline-none border-b border-gray-200 focus:border-[#42A5F5] py-1" />
                            </div>
                            <label className="flex items-center gap-2 w-fit cursor-pointer text-gray-400 hover:text-[#42A5F5] text-xs font-bold px-1">
                                <ImagePlus className="w-4 h-4" /> 사진 첨부 ({selectedImages.length}/{maxImages})
                                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                            </label>
                            {imagePreviews.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {imagePreviews.map((url, i) => (
                                        <div key={i} className="relative w-16 h-16 shrink-0">
                                            <img src={url} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                            <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow"><X className="w-2.5 h-2.5" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-end gap-2 pt-1">
                                <button onClick={() => setIsWriting(false)} disabled={isSubmitting} className="px-5 py-2 rounded-xl text-xs font-bold text-gray-500 bg-white border border-gray-200">취소</button>
                                <button onClick={handleRegister} disabled={isSubmitting || !newTitle.trim() || !newContent.trim()} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#42A5F5] hover:bg-blue-600 disabled:bg-gray-200 flex items-center gap-2">
                                    {isSubmitting ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> 등록 중...</> : '등록하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {posts.length === 0 ? (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-blue-200" />
                    </div>
                    <p className="font-bold text-gray-400 text-sm">아직 등록된 파일이 없습니다.</p>
                </div>
            ) : (
                posts.map(post => <PostItem key={post.id} post={post} />)
            )}
        </div>
    );
}

function PostItem({ post }: { post: BoardPost }) {
    const { replies, loading: repliesLoading } = useBoardReplies(post.id);
    const { applications, loading: appsLoading } = useBoardApplications(post.id);
    const { addReply, updatePost, deletePost, updateReply, deleteReply, addApplication, updateApplication, deleteApplication, isAdmin } = useAIBoard(post.type);
    const { isLoggedIn, firebaseUser } = useAuth();

    const [isEditing, setIsEditing] = React.useState(false);
    const [editTitle, setEditTitle] = React.useState(post.title);
    const [editContent, setEditContent] = React.useState(post.content);
    const [editLink, setEditLink] = React.useState(post.link || '');
    const [existingImages, setExistingImages] = React.useState<string[]>(post.images || []);
    const [newImages, setNewImages] = React.useState<File[]>([]);
    const [newImagePreviews, setNewImagePreviews] = React.useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [isReplying, setIsReplying] = React.useState(false);
    const [replyContent, setReplyContent] = React.useState('');
    const [editingReplyId, setEditingReplyId] = React.useState<string | null>(null);
    const [editReplyContent, setEditReplyContent] = React.useState('');

    const [isApplying, setIsApplying] = React.useState(false);
    const [appContent, setAppContent] = React.useState('');
    const [appImages, setAppImages] = React.useState<File[]>([]);
    const [appImagePreviews, setAppImagePreviews] = React.useState<string[]>([]);
    const [isAppSubmitting, setIsAppSubmitting] = React.useState(false);
    const [editingAppId, setEditingAppId] = React.useState<string | null>(null);
    const [editAppContent, setEditAppContent] = React.useState('');
    const [editAppExistingImages, setEditAppExistingImages] = React.useState<string[]>([]);
    const [editAppNewImages, setEditAppNewImages] = React.useState<File[]>([]);
    const [editAppNewPreviews, setEditAppNewPreviews] = React.useState<string[]>([]);

    // Image gallery modal states
    const [showImageGallery, setShowImageGallery] = React.useState(false);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const [galleryImages, setGalleryImages] = React.useState<string[]>([]);

    const isAuthor = firebaseUser?.uid === post.authorId;
    const canManage = isAuthor || isAdmin;
    const maxImages = 30;

    // Open image gallery
    const openImageGallery = (images: string[], startIndex: number = 0) => {
        setGalleryImages(images);
        setCurrentImageIndex(startIndex);
        setShowImageGallery(true);
    };

    // Navigate gallery
    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
    };

    // Download current image
    const downloadCurrentImage = () => {
        if (galleryImages[currentImageIndex]) {
            const link = document.createElement('a');
            link.href = galleryImages[currentImageIndex];
            link.download = `image_${currentImageIndex + 1}.jpg`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Keyboard navigation
    React.useEffect(() => {
        if (!showImageGallery) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    prevImage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    nextImage();
                    break;
                case 'Escape':
                    e.preventDefault();
                    setShowImageGallery(false);
                    break;
                case 'd':
                case 'D':
                    e.preventDefault();
                    downloadCurrentImage();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showImageGallery, currentImageIndex, galleryImages]);
    const appMaxImages = 5;

    const handleAppImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
        const files = Array.from(e.target.files || []);
        if (isEdit) {
            if (editAppExistingImages.length + editAppNewImages.length + files.length > appMaxImages) { alert(`최대 ${appMaxImages}장까지 첨부 가능합니다.`); return; }
            setEditAppNewImages([...editAppNewImages, ...files]);
            setEditAppNewPreviews([...editAppNewPreviews, ...files.map(f => URL.createObjectURL(f))]);
        } else {
            if (appImages.length + files.length > appMaxImages) { alert(`최대 ${appMaxImages}장까지 첨부 가능합니다.`); return; }
            setAppImages([...appImages, ...files]);
            setAppImagePreviews([...appImagePreviews, ...files.map(f => URL.createObjectURL(f))]);
        }
    };

    const handleAddApplication = async () => {
        if (!appContent.trim()) return;
        setIsAppSubmitting(true);
        try { await addApplication(post.id, appContent, appImages); setAppContent(''); setAppImages([]); setAppImagePreviews([]); setIsApplying(false); }
        catch (err: any) { alert(err.message); }
        finally { setIsAppSubmitting(false); }
    };

    const handleUpdateApplication = async (appId: string) => {
        if (!editAppContent.trim()) return;
        setIsAppSubmitting(true);
        try { await updateApplication(post.id, appId, editAppContent, editAppNewImages, editAppExistingImages); setEditingAppId(null); setEditAppContent(''); setEditAppNewImages([]); setEditAppNewPreviews([]); }
        catch (err: any) { alert(err.message); }
        finally { setIsAppSubmitting(false); }
    };

    const handleDeleteApplication = async (appId: string) => {
        if (!confirm('신청 내역을 삭제하시겠습니까?')) return;
        try { await deleteApplication(post.id, appId); } catch (err: any) { alert(err.message); }
    };

    const handleUpdatePost = async () => {
        if (!editTitle.trim() || !editContent.trim()) return;
        setIsSubmitting(true);
        try { await updatePost(post.id, editTitle, editContent, newImages, existingImages, editLink); setIsEditing(false); setNewImages([]); setNewImagePreviews([]); }
        catch (err: any) { alert(err.message); }
        finally { setIsSubmitting(false); }
    };

    const handleDeletePost = async () => {
        if (!confirm('정말로 삭제하시겠습니까?')) return;
        try { await deletePost(post.id); } catch (err: any) { alert(err.message); }
    };

    const handleAddReply = async () => {
        if (!replyContent.trim()) return;
        try { await addReply(post.id, replyContent); setReplyContent(''); setIsReplying(false); }
        catch (err: any) { alert(err.message); }
    };

    const handleUpdateReply = async (replyId: string) => {
        if (!editReplyContent.trim()) return;
        try { await updateReply(post.id, replyId, editReplyContent); setEditingReplyId(null); setEditReplyContent(''); }
        catch (err: any) { alert(err.message); }
    };

    const handleDeleteReply = async (replyId: string) => {
        if (!confirm('답글을 삭제하시겠습니까?')) return;
        try { await deleteReply(post.id, replyId); } catch (err: any) { alert(err.message); }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (existingImages.length + newImages.length + files.length > maxImages) { alert(`최대 ${maxImages}장까지 첨부 가능합니다.`); return; }
        setNewImages([...newImages, ...files]);
        setNewImagePreviews([...newImagePreviews, ...files.map(f => URL.createObjectURL(f))]);
    };

    if (isEditing) {
        return (
            <div className="bg-white border border-[#42A5F5] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#42A5F5]" placeholder="제목" />
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={6} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#42A5F5] resize-none" placeholder="내용" />
                <div className="flex items-center gap-2 px-1">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="관련 링크 (선택사항)" value={editLink} onChange={e => setEditLink(e.target.value)} className="flex-1 text-sm bg-transparent outline-none border-b border-gray-200 focus:border-[#42A5F5] py-1" />
                </div>
                <label className="flex items-center gap-2 w-fit cursor-pointer text-gray-400 hover:text-[#42A5F5] text-xs font-bold px-1">
                    <ImagePlus className="w-4 h-4" /> 사진 추가 ({existingImages.length + newImages.length}/{maxImages})
                    <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {existingImages.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 shrink-0">
                            <img src={url} className="w-full h-full object-cover rounded-lg border border-gray-100" />
                            <button onClick={() => setExistingImages(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                        </div>
                    ))}
                    {newImagePreviews.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 shrink-0">
                            <img src={url} className="w-full h-full object-cover rounded-lg border border-blue-200" />
                            <button onClick={() => { setNewImages(p => p.filter((_, idx) => idx !== i)); URL.revokeObjectURL(newImagePreviews[i]); setNewImagePreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => { setIsEditing(false); setEditTitle(post.title); setEditContent(post.content); setExistingImages(post.images || []); setNewImages([]); setNewImagePreviews([]); }} disabled={isSubmitting} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 bg-white border border-gray-200">취소</button>
                    <button onClick={handleUpdatePost} disabled={isSubmitting || !editTitle.trim() || !editContent.trim()} className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-[#42A5F5] hover:bg-blue-600 disabled:bg-gray-300 flex items-center gap-2">
                        {isSubmitting ? '수정 중...' : '수정완료'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-50">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#42A5F5] bg-blue-50 px-2 py-0.5 rounded-full">{post.author}</span>
                        <span className="text-[11px] text-gray-400">{post.createdAt instanceof Date ? post.createdAt.toLocaleString('ko-KR') : '-'}</span>
                    </div>
                    {canManage && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsEditing(true)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                            <button onClick={handleDeletePost} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    )}
                </div>
                <h5 className="font-bold text-gray-800 text-lg mb-2">{post.title}</h5>
                <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed mb-4">{post.content}</p>
                {post.images && post.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-4">
                        {post.images.map((url, i) => (
                            <img key={i} src={url} onClick={() => openImageGallery(post.images!, i)} className="w-40 h-40 object-cover rounded-xl border border-gray-100 shrink-0 cursor-pointer hover:opacity-90 transition-opacity" />
                        ))}
                    </div>
                )}
                {post.link && (
                    <a href={post.link.startsWith('http') ? post.link : `https://${post.link}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors mb-4 border border-gray-100">
                        <ExternalLink className="w-4 h-4 text-[#42A5F5]" /> 관련 링크 바로가기
                    </a>
                )}
                <div className="flex items-center gap-4 mt-2">
                    <button onClick={() => { setIsReplying(!isReplying); setIsApplying(false); }} className={`text-xs font-bold flex items-center gap-1.5 transition-colors ${isReplying ? 'text-[#42A5F5]' : 'text-gray-400 hover:text-[#42A5F5]'}`}>
                        <MessageSquare className="w-4 h-4" /> 답글 {replies.length > 0 ? replies.length : ''}
                    </button>
                    <button onClick={() => { setIsApplying(!isApplying); setIsReplying(false); }} className={`text-xs font-bold flex items-center gap-1.5 transition-colors ${isApplying ? 'text-[#42A5F5]' : 'text-gray-400 hover:text-[#42A5F5]'}`}>
                        <ClipboardCheck className="w-4 h-4" /> 신청하기 {applications.length > 0 ? applications.length : ''}
                    </button>
                </div>
            </div>

            {isApplying && (
                <div className="bg-blue-50/30 p-5 space-y-6 border-b border-gray-50">
                    <h6 className="text-sm font-bold text-gray-700 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-[#42A5F5]" /> 프로그램 사용 신청</h6>
                    <div className="space-y-4">
                        {applications.map(app => (
                            <div key={app.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-full">{app.author}</span>
                                        <span className="text-[10px] text-gray-400">{app.createdAt instanceof Date ? app.createdAt.toLocaleString('ko-KR') : '-'}</span>
                                    </div>
                                    {(app.authorId === firebaseUser?.uid || isAdmin) && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingAppId(app.id); setEditAppContent(app.content); setEditAppExistingImages(app.images || []); }} className="text-[10px] text-gray-400 hover:text-blue-500 font-bold">수정</button>
                                            <button onClick={() => handleDeleteApplication(app.id)} className="text-[10px] text-gray-400 hover:text-red-500 font-bold">삭제</button>
                                        </div>
                                    )}
                                </div>
                                {editingAppId === app.id ? (
                                    <div className="space-y-3">
                                        <textarea value={editAppContent} onChange={e => setEditAppContent(e.target.value)} className="w-full bg-white p-3 rounded-lg border border-[#42A5F5] text-xs outline-none resize-none" autoFocus />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingAppId(null)} className="text-[10px] font-bold text-gray-400">취소</button>
                                            <button onClick={() => handleUpdateApplication(app.id)} disabled={isAppSubmitting} className="text-[10px] font-bold text-blue-500">{isAppSubmitting ? '저장 중...' : '저장'}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs text-gray-600 leading-normal mb-3">{app.content}</p>
                                        {app.images && app.images.length > 0 && (
                                            <div className="flex gap-2 overflow-x-auto pb-2">
                                                {app.images.map((url, i) => <img key={i} src={url} className="w-24 h-24 object-cover rounded-lg border border-gray-50 cursor-pointer" onClick={() => openImageGallery(app.images!, i)} />)}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                    {isLoggedIn && (
                        <div className="bg-white p-5 rounded-2xl border-2 border-dashed border-blue-100 space-y-4">
                            <textarea placeholder="프로그램 신청 내용을 입력해 주세요" value={appContent} onChange={e => setAppContent(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-100 outline-none focus:border-[#42A5F5] text-sm resize-none" />
                            <label className="flex items-center gap-2 w-fit cursor-pointer text-gray-400 hover:text-[#42A5F5] text-xs font-bold">
                                <ImagePlus className="w-4 h-4" /> 사진 첨부 ({appImages.length}/{appMaxImages})
                                <input type="file" multiple accept="image/*" onChange={e => handleAppImageChange(e)} className="hidden" />
                            </label>
                            {appImagePreviews.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {appImagePreviews.map((url, i) => (
                                        <div key={i} className="relative w-16 h-16 shrink-0">
                                            <img src={url} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                                            <button onClick={() => { setAppImages(p => p.filter((_, idx) => idx !== i)); URL.revokeObjectURL(appImagePreviews[i]); setAppImagePreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-end">
                                <button onClick={handleAddApplication} disabled={isAppSubmitting || !appContent.trim()} className="px-6 py-2 bg-[#42A5F5] text-white rounded-xl text-xs font-bold hover:bg-blue-600 disabled:bg-gray-200 flex items-center gap-2">
                                    {isAppSubmitting ? '신청 중...' : '신청하기'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {(isReplying || replies.length > 0) && (
                <div className="bg-gray-50/50 p-5 space-y-4">
                    {replies.map(reply => (
                        <div key={reply.id} className="flex gap-3 group">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-[#42A5F5] shrink-0">{reply.author[0]}</div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-700">{reply.author}</span>
                                        <span className="text-[9px] text-gray-400">{reply.createdAt instanceof Date ? reply.createdAt.toLocaleString('ko-KR') : '-'}</span>
                                    </div>
                                    {(reply.authorId === firebaseUser?.uid || isAdmin) && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingReplyId(reply.id); setEditReplyContent(reply.content); }} className="text-[10px] text-gray-400 hover:text-blue-500 font-bold">수정</button>
                                            <button onClick={() => handleDeleteReply(reply.id)} className="text-[10px] text-gray-400 hover:text-red-500 font-bold">삭제</button>
                                        </div>
                                    )}
                                </div>
                                {editingReplyId === reply.id ? (
                                    <div className="flex gap-2">
                                        <input type="text" value={editReplyContent} onChange={e => setEditReplyContent(e.target.value)} className="flex-1 bg-white px-3 py-1.5 rounded-lg border border-[#42A5F5] text-xs outline-none" autoFocus />
                                        <button onClick={() => handleUpdateReply(reply.id)} className="text-[10px] font-bold text-blue-500">저장</button>
                                        <button onClick={() => setEditingReplyId(null)} className="text-[10px] font-bold text-gray-400">취소</button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-600 leading-normal">{reply.content}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoggedIn && isReplying && (
                        <div className="flex gap-2 pt-2">
                            <input type="text" placeholder="답글을 입력하세요..." value={replyContent} onChange={e => setReplyContent(e.target.value)} className="flex-1 bg-white px-4 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-[#42A5F5]" onKeyDown={e => e.key === 'Enter' && handleAddReply()} />
                            <button onClick={handleAddReply} className="px-4 py-2 bg-[#42A5F5] text-white rounded-xl text-xs font-bold">등록</button>
                        </div>
                    )}
                </div>
            )}

            {/* Image Gallery Modal */}
            {showImageGallery && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
                    <div className="relative w-full h-full max-w-6xl max-h-full flex items-center justify-center">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowImageGallery(false)}
                            className="absolute top-4 right-4 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>

                        {/* Download Button */}
                        <button
                            onClick={downloadCurrentImage}
                            className="absolute top-4 right-20 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                            title="다운로드"
                        >
                            <Download className="w-6 h-6 text-white" />
                        </button>

                        {/* Image Counter */}
                        <div className="absolute top-4 left-4 z-10 px-4 py-2 bg-black/50 rounded-full">
                            <span className="text-white text-sm font-medium">
                                {currentImageIndex + 1} / {galleryImages.length}
                            </span>
                        </div>

                        {/* Previous Button */}
                        {galleryImages.length > 1 && (
                            <button
                                onClick={prevImage}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                            >
                                <ChevronLeft className="w-8 h-8 text-white" />
                            </button>
                        )}

                        {/* Next Button */}
                        {galleryImages.length > 1 && (
                            <button
                                onClick={nextImage}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                            >
                                <ChevronRight className="w-8 h-8 text-white" />
                            </button>
                        )}

                        {/* Main Image */}
                        <img
                            src={galleryImages[currentImageIndex]}
                            alt={`Image ${currentImageIndex + 1}`}
                            className="max-w-full max-h-full object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Thumbnail Strip (if more than 1 image) */}
                        {galleryImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                                <div className="flex gap-2 bg-black/50 p-3 rounded-2xl max-w-md overflow-x-auto">
                                    {galleryImages.map((url, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentImageIndex(index)}
                                            className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === currentImageIndex
                                                ? 'border-white scale-110'
                                                : 'border-transparent opacity-60 hover:opacity-80'
                                                }`}
                                        >
                                            <img
                                                src={url}
                                                alt={`Thumbnail ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Click outside to close */}
                    <div
                        className="absolute inset-0 -z-10"
                        onClick={() => setShowImageGallery(false)}
                    />
                </div>,
                document.body
            )}
        </div>
    );
}

// ─── 카카오톡 문의 컴포넌트 ────────────────────────────────────────────────
function KakaoInquiryContent() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-12">



            <p className="text-gray-500 text-sm mb-8 text-center max-w-md leading-relaxed">
                카카오톡으로 빠르고 편리하게 문의하세요.<br />
                실시간 상담을 통해 궁금한 점을 해결해드립니다.
            </p>

            {/* 카카오톡 문의 버튼 */}
            <a
                href="http://pf.kakao.com/_XxixizX"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
            >
                용카 카톡 문의하기
                <ExternalLink className="w-4 h-4 ml-1" />
            </a>


        </div>
    );
}
