'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import QRCode from 'qrcode';
import { useAuth } from '@/context/auth-context';

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
    const [showSuccessModal, setShowSuccessModal] = useState(isNewlyCreated);

    // Admin reset states
    const { user } = useAuth();
    const isAdmin = !!user && !!schedule && user.uid === schedule.id;
    const [showAdminResetModal, setShowAdminResetModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [newAdminError, setNewAdminError] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/schedule/entrance/${shortId}`
        : `https://yongcar.com/s/${shortId}`;

    useEffect(() => {
        async function load() {
            try {
                const q = query(collection(db, 'schedules'), where('shortId', '==', shortId), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setSchedule({ id: snap.docs[0].id, ...snap.docs[0].data() });
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

    const handleEnter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) { setError('비밀번호를 입력해주세요.'); return; }
        if (!schedule) { setError('일정표 정보를 불러올 수 없습니다.'); return; }
        setIsEntering(true);
        setError('');
        try {
            const hashed = await sha256(password.trim());
            if (hashed === schedule.password) {
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
        <div className="min-h-screen bg-white">
            {/* Header gradient */}
            <div className="bg-[#42A5F5] pt-14 pb-24 px-6 flex flex-col items-center text-white">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-4 border border-white/30 overflow-hidden p-3">
                    <img src={company.image} alt={company.name} className="w-full h-full object-contain" />
                </div>
                <h1 className="text-2xl font-bold text-center">
                    {schedule?.name ?? '일정표'}
                </h1>
                {schedule && (
                    <p className="text-white/80 text-sm mt-1">{company.name} 팀 일정표</p>
                )}
            </div>

            {/* Content card */}
            <div className="mt-[-48px] px-4 pb-12 max-w-lg mx-auto space-y-5">

                {/* Share link card */}
                <div className="premium-card p-6 bg-white">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🔗</span>
                        <span className="font-semibold text-gray-700 text-sm">단톡방에 아래 링크를 공유하세요</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 font-mono text-xs text-gray-600 break-all mb-3">
                        {shareUrl}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#42A5F5] text-[#42A5F5] font-semibold text-sm hover:bg-blue-50 transition-colors"
                        >
                            {copied ? '✅ 복사됨' : '📋 링크 복사'}
                        </button>
                        <button
                            onClick={() => setShowQrModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                        >
                            📱 QR 코드
                        </button>
                    </div>
                </div>

                {/* Password entry card */}
                <div className="premium-card p-6 bg-white">

                    <form onSubmit={handleEnter} className="space-y-4">
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="비밀번호를 입력하세요"
                                className="w-full input-field px-5 py-4 rounded-xl text-base outline-none pr-12"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
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
                        <button
                            type="submit"
                            disabled={isEntering}
                            className="w-full py-5 rounded-2xl font-bold text-lg text-white primary-button disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #42A5F5 0%, #0076d3 100%)' }}
                        >
                            {isEntering ? '확인 중...' : '입장하기'}
                        </button>
                    </form>
                    <button
                        type="button"
                        onClick={() => alert('비밀번호를 분실하신 경우, 해당 일정표를 생성한 팀의 관리자에게 문의하여 비밀번호를 다시 확인해주세요.')}
                        className="w-full text-sm text-gray-500 hover:text-gray-800 text-center font-medium mt-4 py-2"
                    >
                        비밀번호를 잊으셨나요? (비밀번호 찾기)
                    </button>
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => setShowAdminResetModal(true)}
                            className="w-full text-sm text-[#42A5F5] font-bold text-center mt-2 py-2 border-t border-gray-100 pt-4"
                        >
                            👨‍🔧 관리자 전용: 비밀번호 재설정
                        </button>
                    )}
                </div>
            </div>

            {/* QR Modal */}
            {showQrModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQrModal(false)}>
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-center mb-2">📱 일정표 QR 코드</h3>
                        <p className="text-sm text-gray-500 text-center mb-6">스캔하여 일정표에 접속하세요</p>
                        {qrDataUrl && (
                            <div className="flex justify-center mb-6">
                                <img src={qrDataUrl} alt="QR Code" className="rounded-xl" width={200} height={200} />
                            </div>
                        )}
                        <p className="text-center font-semibold text-gray-700 mb-1">{schedule?.name}</p>
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="w-full mt-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                        >
                            닫기
                        </button>
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
    );
}
