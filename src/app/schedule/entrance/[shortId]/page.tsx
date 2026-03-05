'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import QRCode from 'qrcode';
import { useAuth } from '@/context/auth-context';
import { ChevronLeft, ChevronRight, Upload, X } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const COMPANIES: Record<string, { name: string; image: string }> = {
    coupang: { name: '쿠팡', image: '/cou.png' },
    cj: { name: '씨제이', image: '/cj.png' },
    lotte: { name: '롯데', image: '/lot.png' },
    logen: { name: '로젠', image: '/log.png' },
    hanjin: { name: '한진', image: '/hanjin.png' },
    etc: { name: '기타', image: '/logo512.png' },
};

async function sha256(str: string) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ScheduleEntrancePage() {
    const { shortId } = useParams<{ shortId: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const isNewlyCreated = searchParams.get('new') === '1';

    const [schedule, setSchedule] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isEntering, setIsEntering] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [showQrModal, setShowQrModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showJobInfoModal, setShowJobInfoModal] = useState(false);
    const [showJobLinkModal, setShowJobLinkModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(isNewlyCreated);

    // Job info states
    const [jobLinks, setJobLinks] = useState<{ title: string, url: string }[]>([]);
    const [newJobTitle, setNewJobTitle] = useState('');
    const [newJobUrl, setNewJobUrl] = useState('');

    // Company intro states
    const [showCompanyIntroModal, setShowCompanyIntroModal] = useState(false);
    const [companyIntros, setCompanyIntros] = useState<{ id: string, title: string, content: string, date: string }[]>([]);
    const [showCompanyEditModal, setShowCompanyEditModal] = useState(false);
    const [selectedIntro, setSelectedIntro] = useState<{ id: string, title: string, content: string, date: string } | null>(null);
    const [showIntroDetailModal, setShowIntroDetailModal] = useState(false);
    const [newIntroTitle, setNewIntroTitle] = useState('');
    const [newIntroContent, setNewIntroContent] = useState('');

    // Gallery states
    const [gallery, setGallery] = useState<{ url: string, title: string }[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<{ url: string, title: string } | null>(null);
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [uploadingImages, setUploadingImages] = useState<File[]>([]);
    const [imageTitles, setImageTitles] = useState<string[]>([]);

    // Direct Firebase Auth state
    const [firebaseUser, setFirebaseUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Admin reset states
    const { user } = useAuth();
    const isAdmin = !!firebaseUser && !!schedule && (
        firebaseUser.uid === schedule.id || firebaseUser.uid === schedule.userId
    );
    const [showAdminResetModal, setShowAdminResetModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [newAdminError, setNewAdminError] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/schedule/entrance/${shortId}`
        : `https://yongcar.com/s/${shortId}`;

    // Monitor Firebase Auth state directly
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            setAuthLoading(false);
            console.log('Firebase Auth State:', user ? { uid: user.uid, email: user.email } : null);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        async function load() {
            try {
                const q = query(collection(db, 'schedules'), where('shortId', '==', shortId), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    setSchedule({ id: snap.docs[0].id, ...data });
                    setGallery(data.gallery || []);
                    setJobLinks(data.jobLinks || []);
                    setCompanyIntros(data.companyIntros || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [shortId]);

    useEffect(() => {
        QRCode.toDataURL(shareUrl, { width: 240, margin: 2 })
            .then(setQrDataUrl)
            .catch(console.error);
    }, [shareUrl]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadQR = () => {
        if (!qrDataUrl) return;

        const link = document.createElement('a');
        link.download = `${schedule?.name || '일정표'}_QR코드.png`;
        link.href = qrDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEnter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) { setError('비밀번호를 입력해주세요.'); return; }
        if (!schedule) { setError('일정표 정보를 불러올 수 없습니다.'); return; }
        setIsEntering(true);
        setError('');
        try {
            const hashed = await sha256(password.trim());
            if (hashed === schedule.password) {
                // Store auth flag in sessionStorage
                sessionStorage.setItem(`schedule_auth_${shortId}`, 'true');
                setShowPasswordModal(false);
                router.push(`/schedule/view/${shortId}?name=${encodeURIComponent(schedule.name)}`);
            } else {
                setError('비밀번호가 올바르지 않습니다.');
            }
        } finally {
            setIsEntering(false);
        }
    };

    const handleAdminReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 4) {
            setNewAdminError('새 비밀번호는 4자리 이상이어야 합니다.');
            return;
        }
        setIsResetting(true);
        setNewAdminError('');
        try {
            const hashed = await sha256(newPassword);
            await updateDoc(doc(db, 'schedules', schedule.id), { password: hashed });
            // Update local state temporarily so they can log in
            setSchedule((prev: any) => ({ ...prev, password: hashed }));
            setShowAdminResetModal(false);
            setNewPassword('');
            alert('비밀번호가 성공적으로 재설정되었습니다. 새 비밀번호로 입장해주세요.');
        } catch (err) {
            console.error(err);
            setNewAdminError('비밀번호 재설정 중 오류가 발생했습니다.');
        } finally {
            setIsResetting(false);
        }
    };

    // Gallery functions
    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !schedule || !firebaseUser || !isAdmin) return;

        const files = Array.from(event.target.files);
        const remainingSlots = 15 - gallery.length;

        if (files.length > remainingSlots) {
            alert(`최대 15장까지 업로드 가능합니다. (현재 ${gallery.length}장, ${remainingSlots}장 추가 가능)`);
            return;
        }

        setUploadingImages(files);
        setImageTitles(files.map(() => ''));
        setShowImageUploadModal(true);

        // Reset input
        event.target.value = '';
    };

    const handleImageUpload = async () => {
        if (!schedule || !firebaseUser || !isAdmin || uploadingImages.length === 0) return;

        setIsUploading(true);

        try {
            const uploadPromises = uploadingImages.map(async (file, index) => {
                const storageRef = ref(storage, `galleries/${schedule.id}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);
                return { url, title: imageTitles[index] || '' };
            });

            const uploadedImages = await Promise.all(uploadPromises);
            const updatedGallery = [...gallery, ...uploadedImages];

            await updateDoc(doc(db, 'schedules', schedule.id), { gallery: updatedGallery });
            setGallery(updatedGallery);
            setShowImageUploadModal(false);
            setUploadingImages([]);
            setImageTitles([]);
        } catch (error) {
            console.error('Image upload error:', error);
            alert('이미지 업로드 중 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleImageDelete = async (index: number) => {
        if (!schedule || !isAdmin) return;

        if (confirm('이 이미지를 삭제하시겠습니까?')) {
            try {
                const imageData = gallery[index];
                // Delete from storage
                const imageRef = ref(storage, imageData.url);
                await deleteObject(imageRef);

                // Update database
                const updatedGallery = gallery.filter((_, i) => i !== index);
                await updateDoc(doc(db, 'schedules', schedule.id), { gallery: updatedGallery });
                setGallery(updatedGallery);

                // Close modal if this was the selected image
                if (selectedImage?.url === imageData.url) {
                    setShowImageModal(false);
                    setSelectedImage(null);
                }
            } catch (error) {
                console.error('Image delete error:', error);
                alert('이미지 삭제 중 오류가 발생했습니다.');
            }
        }
    };


    // Job info functions
    const handleAddJobLink = async () => {
        if (!newJobTitle.trim() || !newJobUrl.trim() || !schedule || !isAdmin) return;

        const newLink = { title: newJobTitle.trim(), url: newJobUrl.trim() };
        const updatedJobLinks = [...jobLinks, newLink];

        try {
            await updateDoc(doc(db, 'schedules', schedule.id), { jobLinks: updatedJobLinks });
            setJobLinks(updatedJobLinks);
            setNewJobTitle('');
            setNewJobUrl('');
            setShowJobLinkModal(false);
        } catch (error) {
            console.error('Job link add error:', error);
            alert('링크 추가 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteJobLink = async (index: number) => {
        if (!schedule || !isAdmin) return;

        if (confirm('이 구직 정보를 삭제하시겠습니까?')) {
            try {
                const updatedJobLinks = jobLinks.filter((_, i) => i !== index);
                await updateDoc(doc(db, 'schedules', schedule.id), { jobLinks: updatedJobLinks });
                setJobLinks(updatedJobLinks);
            } catch (error) {
                console.error('Job link delete error:', error);
                alert('링크 삭제 중 오류가 발생했습니다.');
            }
        }
    };

    // Company intro functions
    const handleSaveCompanyIntro = async () => {
        if (!newIntroTitle.trim() || !newIntroContent.trim() || !schedule || !isAdmin) return;

        const introData = {
            id: Date.now().toString(),
            title: newIntroTitle.trim(),
            content: newIntroContent.trim(),
            date: new Date().toISOString().slice(0, 10)
        };

        try {
            const updatedIntros = [introData, ...companyIntros].slice(0, 5); // 최대 5개까지만
            await updateDoc(doc(db, 'schedules', schedule.id), { companyIntros: updatedIntros });
            setCompanyIntros(updatedIntros);
            setNewIntroTitle('');
            setNewIntroContent('');
            setShowCompanyEditModal(false);
        } catch (error) {
            console.error('Company intro save error:', error);
            alert('업체 소개글 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteCompanyIntro = async (introId: string) => {
        if (!schedule || !isAdmin) return;

        if (confirm('이 업체 소개글을 삭제하시겠습니까?')) {
            try {
                const updatedIntros = companyIntros.filter(intro => intro.id !== introId);
                await updateDoc(doc(db, 'schedules', schedule.id), { companyIntros: updatedIntros });
                setCompanyIntros(updatedIntros);
                setShowIntroDetailModal(false);
            } catch (error) {
                console.error('Company intro delete error:', error);
                alert('업체 소개글 삭제 중 오류가 발생했습니다.');
            }
        }
    };

    const company = COMPANIES[schedule?.company] ?? COMPANIES.etc;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#42A5F5] border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500">일정표 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                    .gallery-scroll::-webkit-scrollbar {
                        display: none;
                    }
                    .gallery-scroll {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `
            }} />
            <div className="min-h-screen bg-white">
                {/* Header gradient */}
                <div className="bg-[#42A5F5] pt-14 pb-10 px-1 text-white">
                    <div className="max-w-lg mx-auto">
                        <div className="flex items-center gap-4 mb-8 mx-3">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 overflow-hidden p-2 flex-shrink-0">
                                <img src={company.image} alt={company.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-xl font-bold">
                                    {schedule?.name ?? '일정표'}
                                </h1>
                                {schedule && (
                                    <p className="text-white/80 text-sm mt-1">{schedule.name} 공유일정표</p>
                                )}
                            </div>
                        </div>

                        {/* Gallery Section */}
                        <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/20 mx-3">
                            <div className="flex items-center justify-between mb-7 px-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-white/90 text-md font-bold tracking-tight">{schedule.name} 갤러리</span>
                                    <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full text-white/70 font-medium">
                                        {gallery.length}
                                    </span>
                                </div>

                            </div>

                            {gallery.length > 0 ? (
                                <div
                                    className="overflow-x-auto overflow-y-hidden"
                                    style={{
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: 'rgba(255,255,255,0.3) transparent'
                                    }}
                                >
                                    <div
                                        className="flex gap-3 pb-5"
                                        style={{
                                            scrollSnapType: 'x mandatory',
                                            width: `${gallery.length * 140}px`
                                        }}
                                    >
                                        {gallery.map((image, index) => (
                                            <div
                                                key={index}
                                                className="flex-shrink-0 w-32 h-32 snap-center cursor-pointer relative group"
                                                onClick={() => {
                                                    setSelectedImage(image);
                                                    setShowImageModal(true);
                                                }}
                                            >
                                                <img
                                                    src={image.url}
                                                    alt={image.title || `Gallery ${index + 1}`}
                                                    className="w-full h-full object-cover rounded-xl"
                                                />

                                                {/* Overlay on hover */}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                                    <span className="text-white text-xs font-medium text-center px-2">
                                                        {image.title || '제목 없음'}
                                                    </span>
                                                </div>

                                                {/* Delete button for admin */}
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleImageDelete(index);
                                                        }}
                                                        className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 text-white rounded-full flex items-center justify-center hover:bg-red-600/80 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                /* Empty gallery placeholder */
                                <div className="h-32 rounded-xl bg-white/5 border-2 border-dashed border-white/30 flex flex-col items-center justify-center text-white/70">
                                    <span className="text-2xl mb-2">📷</span>
                                    <p className="text-sm">아직 사진이 없습니다 ({gallery.length}/15)</p>
                                    {isAdmin && <p className="text-xs mt-1">아래 버튼으로 사진을 추가해보세요</p>}
                                </div>
                            )}
                        </div>

                        {/* Upload button for admin */}
                        {isAdmin && (
                            <div className="mt-5 px-3">
                                <label className="flex items-center justify-center gap-2 py-3 px-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 text-white font-semibold hover:bg-white/30 transition-colors cursor-pointer">
                                    <Upload className="w-4 h-4" />
                                    {isUploading ? '업로드 중...' : `사진 추가 (${gallery.length}/15)`}
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                        disabled={isUploading || gallery.length >= 15}
                                    />
                                </label>
                            </div>
                        )}

                    </div>
                </div>

                {/* Content card */}
                <div className="mt-[20px] px-4 pb-12 max-w-lg mx-auto space-y-5">


                    {/* Company intro list */}
                    {companyIntros.length > 0 && (
                        <div className="premium-card p-6 bg-white">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-800">{schedule.name} 소개</h3>
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowCompanyEditModal(true)}
                                        className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
                                    >
                                        + 글쓰기
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {companyIntros.map((intro, index) => (
                                    <div
                                        key={intro.id}
                                        className="p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => {
                                            setSelectedIntro(intro);
                                            setShowIntroDetailModal(true);
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-gray-800 text-sm truncate flex-1">
                                                {intro.title}
                                            </h4>
                                            <span className="text-xs text-gray-500 ml-2">{intro.date}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 line-clamp-2 overflow-hidden">
                                            {intro.content.length > 60 ? intro.content.substring(0, 60) + '...' : intro.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state when no intros */}
                    {companyIntros.length === 0 && (
                        <div className="premium-card p-6 bg-white">
                            <div className="text-center py-4">
                                <span className="text-4xl mb-3 block"></span>
                                <p className="bg-blue-300 mx-25 py-2 rounded-xl text-sm text-white mb-4">소개글이 아직 없습니다.</p>
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowCompanyEditModal(true)}
                                        className="px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors"
                                    >
                                        + 첫 번째 소개글 작성하기
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Job info and Enter buttons card */}
                    <div className="premium-card p-6 bg-white space-y-4">

                        <button
                            onClick={() => setShowJobInfoModal(true)}
                            className="w-full py-5 rounded-2xl font-bold text-lg text-white primary-button"
                            style={{ background: 'linear-gradient(135deg,rgb(31, 227, 162) 0%,rgb(55, 210, 161) 100%)' }}
                        >
                            구직 정보 안내
                        </button>

                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="w-full py-5 rounded-2xl font-bold text-lg text-white primary-button"
                            style={{ background: 'linear-gradient(135deg, #42A5F5 0%,rgb(84, 161, 220) 100%)' }}
                        >
                            팀원 일정표 입장
                        </button>

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => setShowAdminResetModal(true)}
                                className="w-full text-sm text-[#42A5F5] font-bold text-center mt-4 py-2 border-t border-gray-100 pt-4"
                            >
                                👨‍🔧 관리자 전용: 비밀번호 재설정
                            </button>
                        )}
                    </div>

                    {/* Share buttons card */}
                    <div className="premium-card p-6 bg-white">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowLinkModal(true)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#42A5F5] text-[#42A5F5] font-semibold text-sm hover:bg-blue-50 transition-colors"
                            >
                                📋 링크 공유
                            </button>
                            <button
                                onClick={() => setShowQrModal(true)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                            >
                                📱 QR 코드
                            </button>

                        </div>

                    </div>

                </div>

                {/* QR Modal */}
                {showQrModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQrModal(false)}>
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-center mb-2">일정표 QR 코드</h3>
                            <p className="text-sm text-gray-500 text-center mb-6">스캔하여 일정표에 접속하세요</p>
                            {qrDataUrl && (
                                <div className="flex justify-center mb-6">
                                    <img src={qrDataUrl} alt="QR Code" className="rounded-xl" width={200} height={200} />
                                </div>
                            )}
                            <p className="text-center font-semibold text-gray-700 mb-4">{schedule?.name}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownloadQR}
                                    className="flex-1 py-3 rounded-xl border-2 border-[#42A5F5] text-[#42A5F5] font-semibold hover:bg-blue-50 transition-colors"
                                >
                                    QR 저장
                                </button>
                                <button
                                    onClick={() => setShowQrModal(false)}
                                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Link Share Modal */}
                {showLinkModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLinkModal(false)}>
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-center mb-2">일정표 링크</h3>
                            <p className="text-sm text-gray-500 text-center mb-6">아래 링크를 팀원들에게 공유하세요</p>
                            <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-600 break-all mb-6 max-h-20 overflow-y-auto">
                                {shareUrl}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="flex-1 py-3 rounded-xl border-2 border-[#42A5F5] text-[#42A5F5] font-semibold hover:bg-blue-50 transition-colors"
                                >
                                    {copied ? '✅ 복사됨' : '링크 복사'}
                                </button>
                                <button
                                    onClick={() => setShowLinkModal(false)}
                                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Password Input Modal */}
                {showPasswordModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full">
                            <h3 className="text-lg font-bold text-center mb-2">비밀번호 입력</h3>
                            <p className="text-sm text-gray-500 text-center mb-6">일정표에 입장하려면 비밀번호를 입력하세요</p>

                            <form onSubmit={handleEnter} className="space-y-4">
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="비밀번호를 입력하세요"
                                        className="w-full input-field px-4 py-4 rounded-xl text-base outline-none pr-12"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>

                                {error && (
                                    <p className="text-red-500 text-sm flex items-center gap-2">
                                        <span>⚠️</span>{error}
                                    </p>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPasswordModal(false);
                                            setPassword('');
                                            setError('');
                                        }}
                                        className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isEntering}
                                        className="flex-1 py-3 rounded-xl bg-[#42A5F5] text-white font-bold disabled:opacity-50 hover:bg-blue-600 transition-colors"
                                    >
                                        {isEntering ? '확인 중...' : '입장하기'}
                                    </button>
                                </div>
                            </form>

                            <button
                                type="button"
                                onClick={() => alert('비밀번호를 분실하신 경우, 해당 일정표를 생성한 팀의 관리자에게 문의하여 비밀번호를 다시 확인해주세요.')}
                                className="w-full text-xs text-gray-500 hover:text-gray-800 text-center font-medium mt-4 py-2"
                            >
                                비밀번호를 잊으셨나요?
                            </button>
                        </div>
                    </div>
                )}

                {/* Company Intro Detail Modal */}
                {showIntroDetailModal && selectedIntro && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowIntroDetailModal(false)}>
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold">🏢 업체 소개</h3>
                                <button onClick={() => setShowIntroDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-gray-800">{selectedIntro.title}</h4>
                                        <span className="text-xs text-gray-500">{selectedIntro.date}</span>
                                    </div>
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {selectedIntro.content}
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDeleteCompanyIntro(selectedIntro.id)}
                                            className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setShowIntroDetailModal(false)}
                                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors mt-4"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                )}

                {/* Company Intro Edit Modal */}
                {showCompanyEditModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto">
                            <h3 className="text-lg font-bold text-center mb-6">🏢 업체 소개 작성</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">제목</label>
                                    <input
                                        type="text"
                                        placeholder="예: 우리 회사를 소개합니다"
                                        value={newIntroTitle}
                                        onChange={e => setNewIntroTitle(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">내용</label>
                                    <textarea
                                        placeholder="업체 소개 내용을 입력하세요..."
                                        value={newIntroContent}
                                        onChange={e => setNewIntroContent(e.target.value)}
                                        rows={6}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-purple-500 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={() => {
                                        setShowCompanyEditModal(false);
                                        setNewIntroTitle('');
                                        setNewIntroContent('');
                                    }}
                                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSaveCompanyIntro}
                                    disabled={!newIntroTitle.trim() || !newIntroContent.trim()}
                                    className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    작성
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Job Info Modal */}
                {showJobInfoModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowJobInfoModal(false)}>
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold">구직 정보</h3>
                                <button onClick={() => setShowJobInfoModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                            </div>

                            {jobLinks.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <span className="text-4xl mb-3 block">📋</span>
                                    <p className="text-sm">등록된 구직 정보가 없습니다.</p>
                                    {isAdmin && <p className="text-xs mt-2">아래 버튼으로 구직 정보를 추가해보세요.</p>}
                                </div>
                            ) : (
                                <div className="space-y-3 mb-6">
                                    {jobLinks.map((link, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800 text-sm">{link.title}</p>
                                                <p className="text-xs text-gray-500 truncate">{link.url}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => window.open(link.url, '_blank')}
                                                    className="px-1 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                                                >
                                                    열기
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleDeleteJobLink(index)}
                                                        className="px-2 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                                                    >
                                                        삭제
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isAdmin && (
                                <button
                                    onClick={() => setShowJobLinkModal(true)}
                                    className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors mb-4"
                                >
                                    + 구직 정보 추가
                                </button>
                            )}

                            <button
                                onClick={() => setShowJobInfoModal(false)}
                                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                )}

                {/* Job Link Add Modal */}
                {showJobLinkModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full">
                            <h3 className="text-lg font-bold text-center mb-6">💼 구직 정보 추가</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">제목</label>
                                    <input
                                        type="text"
                                        placeholder="예: 쿠팡 물류센터 채용"
                                        value={newJobTitle}
                                        onChange={e => setNewJobTitle(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">링크 주소</label>
                                    <input
                                        type="url"
                                        placeholder="https://example.com"
                                        value={newJobUrl}
                                        onChange={e => setNewJobUrl(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={() => {
                                        setShowJobLinkModal(false);
                                        setNewJobTitle('');
                                        setNewJobUrl('');
                                    }}
                                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleAddJobLink}
                                    disabled={!newJobTitle.trim() || !newJobUrl.trim()}
                                    className="flex-1 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    추가
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Upload Modal */}
                {showImageUploadModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                            <h3 className="text-lg font-bold text-center mb-4">📷 사진 업로드</h3>

                            <div className="space-y-4 mb-6">
                                {uploadingImages.map((file, index) => (
                                    <div key={index} className="border rounded-xl p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`Preview ${index + 1}`}
                                                className="w-16 h-16 object-cover rounded-lg"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-700">{file.name}</p>
                                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="사진 제목 (선택사항)"
                                            value={imageTitles[index]}
                                            onChange={(e) => {
                                                const newTitles = [...imageTitles];
                                                newTitles[index] = e.target.value;
                                                setImageTitles(newTitles);
                                            }}
                                            className="w-full px-1 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowImageUploadModal(false);
                                        setUploadingImages([]);
                                        setImageTitles([]);
                                    }}
                                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleImageUpload}
                                    disabled={isUploading}
                                    className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                                >
                                    {isUploading ? '업로드 중...' : '업로드'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Image Detail Modal */}
                {showImageModal && selectedImage && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(false)}>
                        <div className="max-w-4xl w-full max-h-full flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white text-lg font-bold">
                                    {selectedImage.title || '제목 없음'}
                                </h3>
                                <button
                                    onClick={() => setShowImageModal(false)}
                                    className="text-white hover:text-gray-300 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="flex-1 flex items-center justify-center">
                                <img
                                    src={selectedImage.url}
                                    alt={selectedImage.title || '이미지'}
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                />
                            </div>

                            {isAdmin && (
                                <div className="flex justify-center mt-4">
                                    <button
                                        onClick={() => {
                                            const index = gallery.findIndex(img => img.url === selectedImage.url);
                                            if (index !== -1) handleImageDelete(index);
                                        }}
                                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        삭제
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Success Modal (newly created) */}
                {showSuccessModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full">
                            <div className="flex flex-col items-center mb-6">
                                <span className="text-5xl mb-3">🎉</span>
                                <h3 className="text-xl font-bold text-gray-800">일정표 생성 완료!</h3>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600 mb-6">
                                <p>📋 위의 공유 링크를 팀원들에게 전달하세요</p>
                                <p>🔒 비밀번호를 입력하여 일정표에 입장할 수 있습니다</p>
                                <p>⚙️ 설정에서 언제든 수정할 수 있습니다</p>
                            </div>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-3 rounded-xl primary-button text-white font-bold"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                )}

                {/* Admin Reset Password Modal */}
                {showAdminResetModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">관리자 비밀번호 재설정</h3>
                            <p className="text-sm text-gray-500 mb-6">새로운 비밀번호를 설정해주세요.</p>

                            <form onSubmit={handleAdminReset} className="space-y-4">
                                <div>
                                    <input
                                        type="password"
                                        placeholder="새 비밀번호 (4자리 이상)"
                                        className="w-full input-field px-4 py-3 rounded-xl text-sm outline-none"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                    />
                                </div>
                                {newAdminError && <p className="text-red-500 text-xs">{newAdminError}</p>}

                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAdminResetModal(false)}
                                        className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isResetting}
                                        className="flex-1 py-3 rounded-xl bg-[#42A5F5] text-white font-bold disabled:opacity-50"
                                    >
                                        {isResetting ? '재설정 중...' : '확인'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
