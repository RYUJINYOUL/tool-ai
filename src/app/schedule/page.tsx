'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Schedule } from '@/types/schedule';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';

const COMPANY_LOGOS: Record<string, string> = {
    'coupang': '/cou.png',
    'cj': '/cj.png',
    'lotte': '/lot.png',
    'logen': '/log.png',
    'etc': '/logo512.png'
};

// SHA-256 hashing utility
async function sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

type ModalType = 'settings' | 'changeName' | 'changePassword' | 'share' | 'settlement' | null;

export default function SchedulePage() {
    const { user, loading, isLoggedIn, logout } = useAuth();
    const router = useRouter();
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [checkingSchedule, setCheckingSchedule] = useState(true);

    // Modal state
    const [modal, setModal] = useState<ModalType>(null);

    // Settings – change name
    const [newName, setNewName] = useState('');

    // Settings – change password
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwError, setPwError] = useState('');

    // Settlement
    const [settlementMsg, setSettlementMsg] = useState('');

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    useEffect(() => {
        async function checkSchedule() {
            if (user) {
                try {
                    const scheduleDoc = await getDoc(doc(db, 'schedules', user.uid));
                    if (scheduleDoc.exists()) {
                        setSchedule({ id: scheduleDoc.id, ...scheduleDoc.data() } as Schedule);
                    }
                } catch (error) {
                    console.error('Error fetching schedule:', error);
                }
            }
            setCheckingSchedule(false);
        }

        if (!loading) {
            checkSchedule();
        }
    }, [user, loading]);

    // ── Admin helpers ────────────────────────────────────────────────────────────
    const handleChangeName = async () => {
        if (!newName.trim() || !user || !schedule) return;
        await updateDoc(doc(db, 'schedules', user.uid), { name: newName.trim() });
        setSchedule({ ...schedule, name: newName.trim() });
        setModal(null);
        setNewName('');
    };

    const handleChangePassword = async () => {
        if (!newPw) { setPwError('비밀번호를 입력해주세요.'); return; }
        if (newPw !== confirmPw) { setPwError('비밀번호가 일치하지 않습니다.'); return; }
        if (!user) return;
        const hashed = await sha256(newPw);
        await updateDoc(doc(db, 'schedules', user.uid), { password: hashed });
        setModal(null);
        setNewPw(''); setConfirmPw(''); setPwError('');
        alert('비밀번호가 변경되었습니다.');
    };

    const handleExcelUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file || !user || !schedule) return;

            if (window.confirm('엑셀 파일을 올리면 입력하시겠습니까?')) {
                try {
                    const data = await file.arrayBuffer();
                    const workbook = XLSX.read(data);
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

                    // Helper to normalize date to YYYY-MM-DD
                    const normalizeDate = (val: any): string | null => {
                        if (!val) return null;
                        let d: Date;
                        if (typeof val === 'number') {
                            d = new Date((val - 25569) * 86400 * 1000);
                        } else {
                            const s = String(val).trim().replace(/[\./]/g, '-');
                            d = new Date(s);
                        }
                        if (isNaN(d.getTime())) return null;
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        return `${y}-${m}-${dd}`;
                    };

                    const updatesByMonth: Record<string, any[]> = {};
                    rows.forEach((row, idx) => {
                        const dateKey = normalizeDate(row['날짜']);
                        if (!dateKey) {
                            console.warn(`Row ${idx + 1}: Missing or invalid date`, row['날짜']);
                            return;
                        }
                        const yearMonth = dateKey.substring(0, 7);
                        if (!updatesByMonth[yearMonth]) updatesByMonth[yearMonth] = [];
                        updatesByMonth[yearMonth].push({
                            dateKey,
                            memberName: String(row['기사'] || '').trim(),
                            del: Number(row['배송']) || 0,
                            err: Number(row['배송2']) || 0,
                            ret: Number(row['반품']) || 0,
                            ret2: Number(row['반품2']) || 0,
                            cvs: Number(row['편의점']) || 0,
                            pick: Number(row['집하']) || 0,
                        });
                    });

                    console.log('Grouped updates:', updatesByMonth);

                    if (Object.keys(updatesByMonth).length === 0) {
                        alert('가져올 데이터가 없거나 날짜 형식이 올바르지 않습니다.');
                        return;
                    }

                    for (const [ym, monthUpdates] of Object.entries(updatesByMonth)) {
                        const perfDocId = `${schedule.shortId}_${ym}`;
                        console.log(`Updating Firestore document: performance/${perfDocId}`);

                        const ref = doc(db, 'performance', perfDocId);
                        const snap = await getDoc(ref);
                        let performanceData = snap.exists() ? snap.data() : {
                            shortId: schedule.shortId,
                            creatorUid: user.uid,
                            yearMonth: ym,
                            dailyData: {},
                            monthlyTotal: {}
                        };
                        const dailyData = { ...(performanceData.dailyData || {}) };
                        const monthlyTotal = { ...(performanceData.monthlyTotal || {}) };

                        monthUpdates.forEach(upd => {
                            const { dateKey, memberName, ...metrics } = upd;
                            if (!memberName) return;
                            if (!dailyData[dateKey]) dailyData[dateKey] = {};
                            dailyData[dateKey][memberName] = metrics;
                        });

                        const affectedMembers = new Set(monthUpdates.map(u => u.memberName));
                        affectedMembers.forEach(m => {
                            if (!m) return;
                            const total = { del: 0, err: 0, ret: 0, ret2: 0, cvs: 0, pick: 0 };
                            Object.entries(dailyData).forEach(([dKey, membersMap]: [string, any]) => {
                                if (dKey.startsWith(ym) && membersMap[m]) {
                                    const mData = membersMap[m];
                                    total.del += Number(mData.del || 0);
                                    total.err += Number(mData.err || 0);
                                    total.ret += Number(mData.ret || 0);
                                    total.ret2 += Number(mData.ret2 || 0);
                                    total.cvs += Number(mData.cvs || 0);
                                    total.pick += Number(mData.pick || 0);
                                }
                            });
                            monthlyTotal[m] = total;
                        });

                        await setDoc(ref, { ...performanceData, dailyData, monthlyTotal }, { merge: true });
                        console.log(`Firestore update successful for ${perfDocId}`);
                    }
                    setSettlementMsg('입력 되었습니다.');
                } catch (err) {
                    console.error('Excel upload error:', err);
                    setSettlementMsg('업로드 중 오류가 발생했습니다.');
                }
            }
        };
        input.click();
    };

    const handleDownloadFormat = () => {
        const a = document.createElement('a');
        a.href = '/data/yongca_format.xlsx';
        a.download = 'yongca_format.xlsx';
        a.click();
    };

    const shareUrl = schedule ? `${typeof window !== 'undefined' ? window.location.origin : ''}/schedule/entrance/${schedule.shortId}` : '';

    // ── Loading guard ─────────────────────────────────────────────────────────────
    if (loading || checkingSchedule) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Premium Header/Banner */}
            <div className="bg-[#42A5F5] pt-16 pb-10 px-6 flex flex-col items-center text-white relative">
                {isLoggedIn && (
                    <button
                        onClick={handleLogout}
                        className="absolute top-6 right-6 text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-colors"
                    >
                        로그아웃
                    </button>
                )}
                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-6 border border-white/30">
                    <img
                        src="/logo512.png"
                        alt="용카 로고"
                        className="w-full h-full object-cover p-4"
                    />
                </div>
                <h1 className="text-3xl font-bold mb-2">
                    {user ? `${user.username || user.email?.split('@')[0] || '사용자'}님의 일정표` : '용카 무료 일정표'}
                </h1>
                <p className="opacity-90 text-center max-w-[280px]">
                    팀원들과 웹일정표로 카톡 공유하세요
                </p>
            </div>

            {/* Main Content Area */}
            <div className="mt-[30px] px-6 pb-12 flex flex-col items-center">
                <div className="w-full max-w-[480px] space-y-6">

                    {isLoggedIn ? (
                        <>
                            {schedule ? (
                                <div className="premium-card p-6 flex items-center gap-4 bg-green-50/50">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center overflow-hidden p-2">
                                        <img
                                            src={COMPANY_LOGOS[schedule.company] || '/logo512.png'}
                                            alt={schedule.company}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg">{schedule.name}</h3>
                                        <p className="text-sm text-gray-500 capitalize">{schedule.company} 일정표</p>
                                    </div>
                                    <div className="text-green-500">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center gap-4">
                                    <span className="text-blue-500 text-xl">ℹ️</span>
                                    <p className="text-blue-700 text-sm font-medium">일정표가 아직 없으신가요?</p>
                                </div>
                            )}

                            <button
                                onClick={() => schedule
                                    ? router.push(`/schedule/entrance/${schedule.shortId}`)
                                    : router.push('/schedule/create')}
                                className="w-full primary-button py-5 rounded-2xl text-white font-bold text-lg shadow-lg"
                            >
                                {schedule ? '일정표 입장하기' : '무료 일정표 만들기'}
                            </button>


                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center gap-4 mb-2">
                                <span className="text-blue-500 text-xl">🔒</span>
                                <p className="text-blue-700 text-sm font-medium">일정표를 만들려면 로그인이 필요합니다</p>
                            </div>

                            <Link href="/login" className="block w-full text-center primary-button py-5 rounded-2xl text-white font-bold text-lg shadow-lg">
                                로그인하기
                            </Link>
                        </div>
                    )}

                    <Link
                        href="#"
                        className="block w-full text-center bg-white border-2 border-[#42A5F5] py-5 rounded-2xl text-[#42A5F5] font-bold text-lg hover:bg-blue-50 transition-colors"
                    >
                        유튜브 샘플 영상 10초 확인
                    </Link>

                    {/* Features Illustration/List */}
                    <div className="premium-card p-8 mt-8">
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">

                        </h4>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-4 text-gray-600">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <p className="text-sm font-medium">팀원별 근무 일정 통합 관리</p>
                            </li>
                            <li className="flex items-center gap-4 text-gray-600">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <p className="text-sm font-medium">A4용지 NO,  웹 주소로 공유 YES</p>
                            </li>
                            <li className="flex items-center gap-4 text-gray-600">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <p className="text-sm font-medium">비밀번호 기반 강력한 보안</p>
                            </li>
                            <li className="flex items-center gap-4 text-gray-600">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                <p className="text-sm font-medium">이제 중요 공지는 웹 일정표로 공유</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* ──────────────────── MODALS ──────────────────── */}

            {/* Settings Modal */}
            {modal === 'settings' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-5">일정표 설정</h3>
                        <div className="space-y-2 mb-4">
                            <button
                                onClick={() => setModal('changeName')}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 text-left"
                            >
                                <span className="text-xl">✏️</span>
                                <span className="font-medium text-gray-700">일정표 이름 변경</span>
                            </button>
                            <button
                                onClick={() => setModal('changePassword')}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 text-left"
                            >
                                <span className="text-xl">🔒</span>
                                <span className="font-medium text-gray-700">비밀번호 변경</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setModal(null)}
                            className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* Change Name Modal */}
            {modal === 'changeName' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-4">일정표 이름 변경</h3>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder={schedule?.name ?? '새 이름 입력'}
                            className="w-full input-field px-4 py-3 rounded-xl text-sm outline-none mb-5"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setModal('settings')} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">취소</button>
                            <button onClick={handleChangeName} className="flex-1 py-3 rounded-xl bg-[#42A5F5] text-white font-bold hover:bg-blue-600 transition-colors">저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {modal === 'changePassword' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-4">비밀번호 변경</h3>
                        <div className="space-y-3 mb-2">
                            <input
                                type="password"
                                value={newPw}
                                onChange={e => { setNewPw(e.target.value); setPwError(''); }}
                                placeholder="새 비밀번호"
                                className="w-full input-field px-4 py-3 rounded-xl text-sm outline-none"
                            />
                            <input
                                type="password"
                                value={confirmPw}
                                onChange={e => { setConfirmPw(e.target.value); setPwError(''); }}
                                placeholder="비밀번호 확인"
                                className="w-full input-field px-4 py-3 rounded-xl text-sm outline-none"
                            />
                            {pwError && <p className="text-red-500 text-xs px-1">{pwError}</p>}
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => { setModal('settings'); setNewPw(''); setConfirmPw(''); setPwError(''); }} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">취소</button>
                            <button onClick={handleChangePassword} className="flex-1 py-3 rounded-xl bg-[#42A5F5] text-white font-bold hover:bg-blue-600 transition-colors">저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {modal === 'share' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-4">일정표 공유</h3>
                        <p className="text-sm text-gray-500 mb-2">공유 링크:</p>
                        <div className="bg-gray-100 rounded-xl p-3 mb-4">
                            <p className="text-xs font-mono break-all text-gray-700 select-all">{shareUrl}</p>
                        </div>
                        <div className="flex gap-3 mb-3">
                            <button
                                onClick={() => { navigator.clipboard.writeText(shareUrl); alert('링크가 클립보드에 복사되었습니다.'); }}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#42A5F5] text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
                            >
                                <span>📋</span> 복사
                            </button>
                            <button
                                onClick={() => router.push(`/schedule/entrance/${schedule?.shortId}`)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                            >
                                <span>📲</span> 입장 페이지
                            </button>
                        </div>
                        <button onClick={() => setModal(null)} className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">닫기</button>
                    </div>
                </div>
            )}

            {/* Settlement Modal */}
            {modal === 'settlement' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-2">정산 관리</h3>
                        <p className="text-xs text-gray-500 mb-5">
                            엑셀 파일을 업로드하여 정산 데이터를 일괄 등록하거나, 업로드 양식을 다운로드할 수 있습니다.
                        </p>
                        {settlementMsg && (
                            <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-xl mb-4">
                                {settlementMsg}
                            </div>
                        )}
                        <div className="space-y-3 mb-4">
                            <button
                                onClick={handleExcelUpload}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                <span>📤</span> 엑셀 업로드
                            </button>
                            <button
                                onClick={handleDownloadFormat}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-blue-500 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors"
                            >
                                <span>📥</span> 양식 다운로드
                            </button>
                        </div>
                        <button onClick={() => setModal(null)} className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">닫기</button>
                    </div>
                </div>
            )}
        </div>
    );
}
