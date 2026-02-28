'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { Share2, Settings, Phone, ClipboardList } from 'lucide-react';
import * as XLSX from 'xlsx';

async function sha256(msg: string) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Member {
    name: string;
    phone?: string;
    color?: string;
}
interface Notice {
    id?: string;
    type: string;
    title: string;
    date: string;
}
interface Communication {
    id?: string;
    author: string;
    content: string;
    date: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(y: number, m: number, d: number) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ScheduleViewPage() {
    const { shortId } = useParams<{ shortId: string }>();
    const searchParams = useSearchParams();
    const scheduleName = searchParams.get('name') ?? '일정표';
    const { user } = useAuth();
    const router = useRouter();

    // state
    const [docId, setDocId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [dayOffs, setDayOffs] = useState<Record<string, Set<string>>>({});
    const [notices, setNotices] = useState<Notice[]>([]);
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [loading, setLoading] = useState(true);

    // UI state
    const [focusedDate, setFocusedDate] = useState(new Date());
    const [outerTab, setOuterTab] = useState<'month' | 'week' | 'team'>('month');
    const [innerTab, setInnerTab] = useState<'team' | 'notice' | 'comm'>('team');
    const [selectedMember, setSelectedMember] = useState<string | null>(null);

    // Dialog state
    const [dayOffDialog, setDayOffDialog] = useState<string | null>(null); // date key
    const [newNotice, setNewNotice] = useState('');
    const [newComm, setNewComm] = useState('');
    const [addMemberModal, setAddMemberModal] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberPhone, setNewMemberPhone] = useState('');

    // Admin modals
    type AdminModal = 'settings' | 'changeName' | 'changePassword' | 'share' | 'settlement' | null;
    const [adminModal, setAdminModal] = useState<AdminModal>(null);
    const [adminNewName, setAdminNewName] = useState('');
    const [adminNewPw, setAdminNewPw] = useState('');
    const [adminConfirmPw, setAdminConfirmPw] = useState('');
    const [adminPwError, setAdminPwError] = useState('');
    const [settlementMsg, setSettlementMsg] = useState('');

    // ── Load schedule data ───────────────────────────────────────────────────────
    useEffect(() => {
        const q = query(collection(db, 'schedules'), where('shortId', '==', shortId), limit(1));
        const unsub = onSnapshot(q, (snap) => {
            if (snap.empty) { setLoading(false); return; }
            const d = snap.docs[0];
            const data = d.data();
            setDocId(d.id);
            setIsAdmin(!!user && user.uid === d.id);
            setMembers(data.members ?? []);
            setNotices(data.notices ?? []);
            setCommunications(data.communications ?? []);
            // convert dayOffs from Firestore (String→Array) to Map→Set
            const raw = data.dayOffs ?? {};
            const parsed: Record<string, Set<string>> = {};
            for (const [k, v] of Object.entries(raw)) {
                parsed[k] = new Set(v as string[]);
            }
            setDayOffs(parsed);
            setLoading(false);
        });
        return () => unsub();
    }, [shortId, user]);

    // ── Firestore helpers ────────────────────────────────────────────────────────
    const saveField = async (field: string, value: unknown) => {
        if (!docId) return;
        await updateDoc(doc(db, 'schedules', docId), { [field]: value });
    };

    const toggleDayOff = async (dateKey: string, memberName: string) => {
        const next = { ...dayOffs };
        if (!next[dateKey]) next[dateKey] = new Set();
        if (next[dateKey].has(memberName)) {
            next[dateKey].delete(memberName);
            if (next[dateKey].size === 0) delete next[dateKey];
        } else {
            next[dateKey].add(memberName);
        }
        setDayOffs(next);
        // serialize for Firestore
        const serialized: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(next)) serialized[k] = [...v];
        await saveField('dayOffs', serialized);
    };

    // ── Calendar helpers ─────────────────────────────────────────────────────────
    const year = focusedDate.getFullYear();
    const month = focusedDate.getMonth(); // 0-indexed
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const prevMonth = () => setFocusedDate(new Date(year, month - 1, 1));
    const nextMonth = () => setFocusedDate(new Date(year, month + 1, 1));

    // Week view calculations
    const startOfWeek = new Date(focusedDate);
    startOfWeek.setDate(focusedDate.getDate() - focusedDate.getDay());// Sunday

    const nextWeek = () => {
        const d = new Date(focusedDate);
        d.setDate(d.getDate() + 7);
        setFocusedDate(d);
    };
    const prevWeek = () => {
        const d = new Date(focusedDate);
        d.setDate(d.getDate() - 7);
        setFocusedDate(d);
    };

    // ── Admin helpers ────────────────────────────────────────────────────────────
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/schedule/entrance/${shortId}` : '';

    const handleAdminChangeName = async () => {
        if (!adminNewName.trim() || !docId) return;
        await updateDoc(doc(db, 'schedules', docId), { name: adminNewName.trim() });
        setAdminModal(null);
        setAdminNewName('');
    };

    const handleAdminChangePassword = async () => {
        if (!adminNewPw) { setAdminPwError('비밀번호를 입력해주세요.'); return; }
        if (adminNewPw !== adminConfirmPw) { setAdminPwError('비밀번호가 일치하지 않습니다.'); return; }
        if (!docId) return;
        const hashed = await sha256(adminNewPw);
        await updateDoc(doc(db, 'schedules', docId), { password: hashed });
        setAdminModal(null);
        setAdminNewPw(''); setAdminConfirmPw(''); setAdminPwError('');
        alert('비밀번호가 변경되었습니다.');
    };

    const handleExcelUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file || !docId) return;

            if (window.confirm('입력하시겠습니까?')) {
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

                    // Group updates by Year-Month
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

                    // Update Firestore per month
                    for (const [ym, monthUpdates] of Object.entries(updatesByMonth)) {
                        const perfDocId = `${shortId}_${ym}`;
                        console.log(`Updating Firestore document: performance/${perfDocId}`);

                        const ref = doc(db, 'performance', perfDocId);
                        const snap = await getDoc(ref);

                        let performanceData = snap.exists() ? snap.data() : {
                            shortId,
                            creatorUid: docId,
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

                        // Re-calculate monthly totals
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

                        await setDoc(ref, {
                            ...performanceData,
                            dailyData,
                            monthlyTotal
                        }, { merge: true });
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

    // ── Member management ────────────────────────────────────────────────────────
    const addMember = async () => {
        if (!newMemberName.trim()) return;
        const colors = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4'];
        const color = colors[members.length % colors.length];
        const updated = [...members, { name: newMemberName.trim(), phone: newMemberPhone.trim(), color }];
        setMembers(updated);
        await saveField('members', updated);
        setNewMemberName('');
        setNewMemberPhone('');
        setAddMemberModal(false);
    };

    const removeMember = async (name: string) => {
        const updated = members.filter(m => m.name !== name);
        setMembers(updated);
        await saveField('members', updated);
    };

    // ── Notice management ────────────────────────────────────────────────────────
    const addNotice = async () => {
        if (!newNotice.trim()) return;
        const notice: Notice = { type: '공지사항', title: newNotice.trim(), date: today.toISOString().slice(0, 10) };
        const updated = [notice, ...notices];
        setNotices(updated);
        await saveField('notices', updated);
        setNewNotice('');
    };

    const removeNotice = async (idx: number) => {
        const updated = notices.filter((_, i) => i !== idx);
        setNotices(updated);
        await saveField('notices', updated);
    };

    // ── Communication management ─────────────────────────────────────────────────
    const addComm = async () => {
        if (!newComm.trim() || !user) return;
        const comm: Communication = { author: user.username ?? user.email ?? '익명', content: newComm.trim(), date: new Date().toLocaleString('ko-KR') };
        const updated = [...communications, comm];
        setCommunications(updated);
        await saveField('communications', updated);
        setNewComm('');
    };

    // ─── Renders ─────────────────────────────────────────────────────────────────

    const CalendarHeader = () => (
        <div className="flex items-center justify-between py-3 px-1">
            <button onClick={prevMonth} className="p-2 rounded-full hover:bg-blue-50 text-[#42A5F5]">◀</button>
            <div className="text-center">
                <p className="text-lg font-bold text-gray-800">
                    {year}년 {month + 1}월
                </p>
                {selectedMember && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-semibold">
                        {selectedMember} 휴무 확인 중
                    </span>
                )}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-full hover:bg-blue-50 text-[#42A5F5]">▶</button>
        </div>
    );

    const WeekdayHeader = () => (
        <div className="grid grid-cols-7 bg-blue-50 rounded-lg mb-1">
            {WEEKDAYS.map((d, i) => (
                <div key={d} className={`text-center py-2 text-xs font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                    {d}
                </div>
            ))}
        </div>
    );

    const CalendarGrid = () => {
        const cells: React.ReactNode[] = [];
        const total = Math.ceil((daysInMonth + firstWeekday) / 7) * 7;
        for (let i = 0; i < total; i++) {
            const day = i - firstWeekday + 1;
            const valid = day > 0 && day <= daysInMonth;
            const dateKey = valid ? formatDate(year, month + 1, day) : '';
            const offs = valid ? (dayOffs[dateKey] ?? new Set<string>()) : new Set<string>();
            const isToday = valid && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const dow = i % 7;
            const highlighted = valid && selectedMember ? offs.has(selectedMember) : false;

            cells.push(
                <div
                    key={i}
                    onClick={() => valid && isAdmin && setDayOffDialog(dateKey)}
                    className={`border rounded-lg m-0.5 flex flex-col min-h-[90px] cursor-pointer
            ${valid ? 'bg-white hover:bg-blue-50' : 'bg-gray-50'}
            ${highlighted ? 'bg-blue-50 border-blue-200' : 'border-gray-100'}
            ${isAdmin && valid ? 'cursor-pointer' : ''}
          `}
                >
                    {valid && (
                        <>
                            <div className="flex justify-center pt-1.5 pb-0.5">
                                <span className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-[#42A5F5] text-white' : dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-500' : 'text-gray-800'}
                `}>{day}</span>
                            </div>
                            <div className="flex-1 overflow-hidden px-0.5 pb-0.5 space-y-0.5">
                                {[...offs].filter(n => !selectedMember || n === selectedMember).map(name => (
                                    <div key={name} className="text-[7px] text-white bg-[#42A5F5] rounded px-1 py-0.5 font-bold text-center truncate">
                                        {name}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            );
        }
        return <div className="grid grid-cols-7">{cells}</div>;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#42A5F5] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8faff] flex flex-col">
            {/* AppBar */}
            <header className="bg-[#42A5F5] text-white flex items-center px-4 h-14 flex-shrink-0 gap-3">
                <button onClick={() => history.back()} className="text-white text-xl">←</button>
                <span className="font-bold flex-1 truncate">{scheduleName}</span>
                {isAdmin && (
                    <>
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">관리자</span>
                        <button
                            onClick={() => setAdminModal('share')}
                            title="일정표 공유"
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                        ><Share2 size={16} /></button>
                        <button
                            onClick={() => setAdminModal('settings')}
                            title="일정표 설정"
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                        ><Settings size={16} /></button>
                    </>
                )}
            </header>

            {/* Outer Tabs */}
            <div className="bg-[#42A5F5] px-4 pb-2 flex-shrink-0">
                <div className="flex gap-1">
                    {(['month', 'week', 'team'] as const).map(t => (
                        <button key={t} onClick={() => setOuterTab(t)}
                            className={`flex-1 py-1.5 text-sm font-bold transition-all ${outerTab === t
                                ? 'text-white relative after:absolute after:bottom-0 after:left-1/4 after:w-1/2 after:h-[2px] after:bg-white after:rounded-full'
                                : 'text-white/60'
                                }`}
                            style={{ position: 'relative' }}
                        >
                            {t === 'month' ? '월' : t === 'week' ? '주' : '팀원'}
                            {outerTab === t && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {outerTab === 'month' && (
                <>
                    {/* Desktop: split layout | Mobile: stack + bottom sheet */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Desktop Layout */}
                        <div className="hidden md:flex flex-1 p-6 gap-6">
                            {/* Calendar */}
                            <div className="w-[58%] bg-white rounded-2xl p-5 shadow-sm border border-gray-100 overflow-y-auto">
                                <CalendarHeader />
                                <WeekdayHeader />
                                <CalendarGrid />
                            </div>
                            {/* Side Panel */}
                            <div className="flex-1 flex flex-col gap-4">
                                <div className="flex bg-gray-100 p-1 rounded-2xl">
                                    {(['team', 'notice', 'comm'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setInnerTab(t)}
                                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${innerTab === t ? 'bg-[#42A5F5] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            {t === 'team' ? '팀원' : t === 'notice' ? '공지' : '소통'}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    {innerTab === 'team' && (
                                        <div className="h-full overflow-y-auto">
                                            {isAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => { setSettlementMsg(''); setAdminModal('settlement'); }}
                                                        className="w-full mb-2 py-2.5 rounded-xl border-2 border-dashed border-[#059c13] text-[#059c13] text-sm font-semibold hover:bg-green-50 transition-colors"
                                                    >
                                                        + 정산 입력
                                                    </button>
                                                    <button
                                                        onClick={() => setAddMemberModal(true)}
                                                        className="w-full mb-3 py-2.5 rounded-xl border-2 border-dashed border-[#42A5F5] text-[#42A5F5] text-sm font-semibold hover:bg-blue-50 transition-colors"
                                                    >
                                                        + 팀원 추가
                                                    </button>
                                                </>
                                            )}
                                            {members.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                                    <span className="text-4xl mb-2">👥</span>
                                                    <p className="text-sm">팀원이 없습니다.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {members.map(m => {
                                                        const isSelected = selectedMember === m.name;
                                                        return (
                                                            <div
                                                                key={m.name}
                                                                onClick={() => setSelectedMember(isSelected ? null : m.name)}
                                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-[#42A5F5] bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-200'}`}
                                                            >
                                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                                                    style={{ backgroundColor: m.color ?? '#42A5F5' }}>
                                                                    {m.name[0]}
                                                                </div>
                                                                <span className={`flex-1 font-semibold text-sm ${isSelected ? 'text-[#42A5F5]' : 'text-gray-800'}`}>{m.name}</span>
                                                                {m.phone && (
                                                                    <a
                                                                        href={`tel:${m.phone}`}
                                                                        onClick={e => e.stopPropagation()}
                                                                        className="w-7 h-7 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                                                        title={`전화: ${m.phone}`}
                                                                    ><Phone size={14} /></a>
                                                                )}
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); router.push(`/schedule/view/${shortId}/settlement/${encodeURIComponent(m.name)}?uid=${docId ?? ''}`); }}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                                                    title="정산표"
                                                                ><ClipboardList size={14} /></button>
                                                                {isAdmin && (
                                                                    <button onClick={e => { e.stopPropagation(); removeMember(m.name); }}
                                                                        className="text-gray-300 hover:text-red-400 text-lg ml-1">×</button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {innerTab === 'notice' && (
                                        <div className="h-full flex flex-col gap-3 overflow-hidden">
                                            {isAdmin && (
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <input
                                                        type="text"
                                                        value={newNotice}
                                                        onChange={e => setNewNotice(e.target.value)}
                                                        placeholder="공지사항 내용 입력"
                                                        className="flex-1 input-field px-3 py-2 rounded-xl text-sm outline-none"
                                                        onKeyDown={e => e.key === 'Enter' && addNotice()}
                                                    />
                                                    <button onClick={addNotice} className="px-4 py-2 bg-[#42A5F5] text-white rounded-xl text-sm font-bold">등록</button>
                                                </div>
                                            )}
                                            <div className="flex-1 overflow-y-auto pr-1">
                                                {notices.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                                        <span className="text-4xl mb-2">📢</span>
                                                        <p className="text-sm">공지사항이 없습니다.</p>
                                                    </div>
                                                ) : notices.map((n, i) => (
                                                    <div key={i} className="bg-white rounded-xl p-3 mb-3 border border-gray-100 flex items-start gap-3">
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0 mt-0.5">{n.type}</span>
                                                        <div className="flex-1">
                                                            <p className="text-sm text-gray-800">{n.title}</p>
                                                            <p className="text-xs text-gray-400 mt-1">{n.date}</p>
                                                        </div>
                                                        {isAdmin && (
                                                            <button onClick={() => removeNotice(i)} className="text-gray-300 hover:text-red-400">×</button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {innerTab === 'comm' && (
                                        <div className="h-full flex flex-col gap-2.5 overflow-hidden">
                                            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                                                {communications.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                                        <span className="text-4xl mb-2">💬</span>
                                                        <p className="text-sm">소통 내용이 없습니다.</p>
                                                    </div>
                                                ) : communications.map((c, i) => (
                                                    <div key={i} className="bg-white rounded-xl p-3 border border-gray-100">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-6 h-6 rounded-full bg-[#42A5F5] text-white text-xs flex items-center justify-center font-bold">{c.author[0]}</div>
                                                            <span className="text-xs font-bold text-gray-700">{c.author}</span>
                                                            <span className="text-xs text-gray-400 ml-auto">{c.date}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 ml-8">{c.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {user && (
                                                <div className="flex gap-2 pt-1 flex-shrink-0">
                                                    <input
                                                        type="text"
                                                        value={newComm}
                                                        onChange={e => setNewComm(e.target.value)}
                                                        placeholder="메시지를 입력하세요"
                                                        className="flex-1 input-field px-3 py-2.5 rounded-xl text-sm outline-none bg-white border shadow-sm focus:border-[#42A5F5]"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                                                addComm();
                                                            }
                                                        }}
                                                    />
                                                    <button onClick={addComm} className="px-4 py-2 bg-[#42A5F5] text-white rounded-xl text-sm font-bold">전송</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mobile Layout */}
                        <div className="md:hidden flex-1 relative overflow-hidden">
                            {/* Calendar scrollable behind */}
                            <div className="absolute inset-0 overflow-y-auto pb-72 px-3 pt-2">
                                <CalendarHeader />
                                <WeekdayHeader />
                                <CalendarGrid />
                            </div>
                            {/* Bottom sheet */}
                            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100"
                                style={{ maxHeight: '60%', minHeight: '200px' }}>
                                <div className="flex justify-center py-3">
                                    <div className="w-10 h-1 bg-gray-200 rounded-full" />
                                </div>
                                <div className="px-4 pb-3">
                                    <div className="flex bg-gray-100 p-1 rounded-2xl">
                                        {(['team', 'notice', 'comm'] as const).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setInnerTab(t)}
                                                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${innerTab === t ? 'bg-[#42A5F5] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {t === 'team' ? '팀원' : t === 'notice' ? '공지' : '소통'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(60vh - 110px)' }}>
                                    {innerTab === 'team' && (
                                        <div className="h-full overflow-y-auto">
                                            {isAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => { setSettlementMsg(''); setAdminModal('settlement'); }}
                                                        className="w-full mb-2 py-2.5 rounded-xl border-2 border-dashed border-[#059c13] text-[#059c13] text-sm font-semibold hover:bg-green-50 transition-colors"
                                                    >
                                                        + 정산 입력
                                                    </button>
                                                    <button
                                                        onClick={() => setAddMemberModal(true)}
                                                        className="w-full mb-3 py-2.5 rounded-xl border-2 border-dashed border-[#42A5F5] text-[#42A5F5] text-sm font-semibold hover:bg-blue-50 transition-colors"
                                                    >
                                                        + 팀원 추가
                                                    </button>
                                                </>
                                            )}
                                            {members.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                                    <span className="text-4xl mb-2">👥</span>
                                                    <p className="text-sm">팀원이 없습니다.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {members.map(m => {
                                                        const isSelected = selectedMember === m.name;
                                                        return (
                                                            <div
                                                                key={m.name}
                                                                onClick={() => setSelectedMember(isSelected ? null : m.name)}
                                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-[#42A5F5] bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-200'}`}
                                                            >
                                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                                                    style={{ backgroundColor: m.color ?? '#42A5F5' }}>
                                                                    {m.name[0]}
                                                                </div>
                                                                <span className={`flex-1 font-semibold text-sm ${isSelected ? 'text-[#42A5F5]' : 'text-gray-800'}`}>{m.name}</span>
                                                                {m.phone && (
                                                                    <a
                                                                        href={`tel:${m.phone}`}
                                                                        onClick={e => e.stopPropagation()}
                                                                        className="w-7 h-7 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                                                        title={`전화: ${m.phone}`}
                                                                    ><Phone size={14} /></a>
                                                                )}
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); router.push(`/schedule/view/${shortId}/settlement/${encodeURIComponent(m.name)}?uid=${docId ?? ''}`); }}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                                                    title="정산표"
                                                                ><ClipboardList size={14} /></button>
                                                                {isAdmin && (
                                                                    <button onClick={e => { e.stopPropagation(); removeMember(m.name); }}
                                                                        className="text-gray-300 hover:text-red-400 text-lg ml-1">×</button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {innerTab === 'notice' && (
                                        <div className="h-full flex flex-col gap-3 overflow-hidden">
                                            {isAdmin && (
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <input
                                                        type="text"
                                                        value={newNotice}
                                                        onChange={e => setNewNotice(e.target.value)}
                                                        placeholder="공지사항 내용 입력"
                                                        className="flex-1 input-field px-3 py-2 rounded-xl text-sm outline-none"
                                                        onKeyDown={e => e.key === 'Enter' && addNotice()}
                                                    />
                                                    <button onClick={addNotice} className="px-4 py-2 bg-[#42A5F5] text-white rounded-xl text-sm font-bold">등록</button>
                                                </div>
                                            )}
                                            <div className="flex-1 overflow-y-auto pr-1">
                                                {notices.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                                        <span className="text-4xl mb-2">📢</span>
                                                        <p className="text-sm">공지사항이 없습니다.</p>
                                                    </div>
                                                ) : notices.map((n, i) => (
                                                    <div key={i} className="bg-white rounded-xl p-3 mb-3 border border-gray-100 flex items-start gap-3">
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0 mt-0.5">{n.type}</span>
                                                        <div className="flex-1">
                                                            <p className="text-sm text-gray-800">{n.title}</p>
                                                            <p className="text-xs text-gray-400 mt-1">{n.date}</p>
                                                        </div>
                                                        {isAdmin && (
                                                            <button onClick={() => removeNotice(i)} className="text-gray-300 hover:text-red-400">×</button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {innerTab === 'comm' && (
                                        <div className="h-full flex flex-col gap-2.5 overflow-hidden">
                                            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                                                {communications.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                                        <span className="text-4xl mb-2">💬</span>
                                                        <p className="text-sm">소통 내용이 없습니다.</p>
                                                    </div>
                                                ) : communications.map((c, i) => (
                                                    <div key={i} className="bg-white rounded-xl p-3 border border-gray-100">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-6 h-6 rounded-full bg-[#42A5F5] text-white text-xs flex items-center justify-center font-bold">{c.author[0]}</div>
                                                            <span className="text-xs font-bold text-gray-700">{c.author}</span>
                                                            <span className="text-xs text-gray-400 ml-auto">{c.date}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 ml-8">{c.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {user && (
                                                <div className="flex gap-2 pt-1 flex-shrink-0">
                                                    <input
                                                        type="text"
                                                        value={newComm}
                                                        onChange={e => setNewComm(e.target.value)}
                                                        placeholder="메시지를 입력하세요"
                                                        className="flex-1 input-field px-3 py-2.5 rounded-xl text-sm outline-none bg-white border shadow-sm focus:border-[#42A5F5]"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                                                addComm();
                                                            }
                                                        }}
                                                    />
                                                    <button onClick={addComm} className="px-4 py-2 bg-[#42A5F5] text-white rounded-xl text-sm font-bold">전송</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {outerTab === 'week' && (
                <div className="flex-1 flex flex-col bg-[#F8FAFB] p-4 lg:p-6 pb-20 overflow-y-auto">
                    {/* Week Header */}
                    <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 max-w-5xl mx-auto w-full">
                        <button onClick={prevWeek} className="p-2 rounded-full hover:bg-blue-50 text-[#42A5F5]">◀</button>
                        <div className="text-center">
                            <p className="text-lg font-bold text-gray-800">
                                {startOfWeek.getMonth() + 1}월 {startOfWeek.getDate()}일 – {new Date(startOfWeek.getTime() + 6 * 86400000).getMonth() + 1}월 {new Date(startOfWeek.getTime() + 6 * 86400000).getDate()}일
                            </p>
                            <p className="text-xs text-gray-500">{startOfWeek.getFullYear()}년</p>
                        </div>
                        <button onClick={nextWeek} className="p-2 rounded-full hover:bg-blue-50 text-[#42A5F5]">▶</button>
                    </div>

                    {/* Week Grid */}
                    <div className="flex flex-1 gap-2 max-w-5xl mx-auto w-full min-h-[400px]">
                        {Array.from({ length: 7 }).map((_, i) => {
                            const date = new Date(startOfWeek);
                            date.setDate(date.getDate() + i);
                            const dateKey = formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
                            const offs = dayOffs[dateKey] ?? new Set<string>();
                            const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
                            const workStaff = members.filter(m => !offs.has(m.name));
                            const offStaffNames = Array.from(offs);

                            return (
                                <div key={i} className={`flex-1 flex flex-col bg-white rounded-2xl border ${isToday ? 'border-[#42A5F5] border-2 shadow-md' : 'border-gray-200'}`}>
                                    {/* Column Header */}
                                    <div className={`py-2 text-center rounded-t-xl ${isToday ? 'bg-[#42A5F5] text-white' : i === 0 ? 'bg-red-50 text-red-400' : i === 6 ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-700'}`}>
                                        <p className="text-xs font-bold">{WEEKDAYS[i]}</p>
                                        <p className="text-sm font-bold">{date.getDate()}</p>
                                    </div>
                                    {/* Column Content */}
                                    <div className="flex-1 overflow-y-auto p-1.5 space-y-3">
                                        {/* Working */}
                                        {workStaff.length > 0 && (
                                            <div>
                                                <div className="bg-green-50 text-green-600 text-[10px] font-bold text-center rounded mb-1 py-0.5">근무</div>
                                                <div className="space-y-1">
                                                    {workStaff.map(m => (
                                                        <div key={m.name} className="bg-gradient-to-r from-green-400 to-green-500 text-white text-[10px] font-bold text-center rounded py-1 truncate px-1">
                                                            {m.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Off */}
                                        {offStaffNames.length > 0 && (
                                            <div>
                                                <div className="bg-red-50 text-red-500 text-[10px] font-bold text-center rounded mb-1 py-0.5">휴무</div>
                                                <div className="space-y-1">
                                                    {offStaffNames.map(name => (
                                                        <div key={name} className="bg-gradient-to-r from-blue-400 to-[#42A5F5] text-white text-[10px] font-bold text-center rounded py-1 truncate px-1">
                                                            {name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Empty */}
                                        {workStaff.length === 0 && offStaffNames.length === 0 && (
                                            <div className="text-center text-gray-300 font-bold py-2">-</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {outerTab === 'team' && (
                <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => { setSettlementMsg(''); setAdminModal('settlement'); }}
                                className="w-full mb-2 py-2.5 rounded-xl border-2 border-dashed border-[#059c13] text-[#059c13] text-sm font-semibold hover:bg-green-50 transition-colors"
                            >
                                + 정산 입력
                            </button>
                            <button
                                onClick={() => setAddMemberModal(true)}
                                className="w-full mb-3 py-2.5 rounded-xl border-2 border-dashed border-[#42A5F5] text-[#42A5F5] text-sm font-semibold hover:bg-blue-50 transition-colors"
                            >
                                + 팀원 추가
                            </button>
                        </>
                    )}
                    {members.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <span className="text-4xl mb-2">👥</span>
                            <p className="text-sm">팀원이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {members.map(m => (
                                <div key={m.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                        style={{ backgroundColor: m.color ?? '#42A5F5' }}>
                                        {m.name[0]}
                                    </div>
                                    <span className="flex-1 font-semibold text-sm text-gray-800">{m.name}</span>
                                    {m.phone && (
                                        <a
                                            href={`tel:${m.phone}`}
                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                            title={`전화: ${m.phone}`}
                                        ><Phone size={14} /></a>
                                    )}
                                    <button
                                        onClick={() => router.push(`/schedule/view/${shortId}/settlement/${encodeURIComponent(m.name)}?uid=${docId ?? ''}`)}
                                        className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                        title="정산표"
                                    ><ClipboardList size={14} /></button>
                                    {isAdmin && (
                                        <button onClick={() => removeMember(m.name)} className="text-gray-300 hover:text-red-400 text-lg ml-1">×</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Day-off dialog ─────────────────────────────────────────────────── */}
            {dayOffDialog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col max-h-[90vh]">
                        <h3 className="font-bold text-lg mb-1">
                            {dayOffDialog.slice(5).replace('-', '월 ')}일 휴무 관리
                        </h3>
                        <p className="text-xs text-gray-400 mb-4">직원을 선택하면 휴무 처리됩니다.</p>
                        <div className="space-y-2 mb-5 overflow-y-auto flex-1 pr-1">
                            {members.map(m => {
                                const off = (dayOffs[dayOffDialog] ?? new Set()).has(m.name);
                                return (
                                    <label key={m.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50">
                                        <input type="checkbox" checked={off}
                                            onChange={() => toggleDayOff(dayOffDialog, m.name)}
                                            className="w-4 h-4 rounded accent-blue-500" />
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                            style={{ backgroundColor: m.color ?? '#42A5F5' }}>{m.name[0]}</div>
                                        <span className="font-medium text-sm">{m.name}</span>
                                        {off && <span className="ml-auto text-xs text-blue-500 font-bold">휴무</span>}
                                    </label>
                                );
                            })}
                            {members.length === 0 && <p className="text-sm text-gray-400 text-center py-2">팀원을 먼저 추가하세요.</p>}
                        </div>
                        <button onClick={() => setDayOffDialog(null)}
                            className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors flex-shrink-0">
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* ── Add Member Modal ──────────────────────────────────────────────── */}
            {addMemberModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-4">팀원 추가</h3>
                        <div className="space-y-3 mb-5">
                            <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                                placeholder="이름 (필수)" className="w-full input-field px-4 py-3 rounded-xl text-sm outline-none" />
                            <input type="text" value={newMemberPhone} onChange={e => setNewMemberPhone(e.target.value)}
                                placeholder="전화번호 (선택)" className="w-full input-field px-4 py-3 rounded-xl text-sm outline-none" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setAddMemberModal(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">취소</button>
                            <button onClick={addMember}
                                className="flex-1 py-3 rounded-xl bg-[#42A5F5] text-white font-bold hover:bg-blue-600 transition-colors">추가</button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Admin: Settings Modal ─────────────────────────────────────── */}
            {adminModal === 'settings' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-5">일정표 설정</h3>
                        <div className="space-y-2 mb-4">
                            <button onClick={() => setAdminModal('changeName')}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 text-left">
                                <span className="text-xl">✏️</span>
                                <span className="font-medium text-gray-700">일정표 이름 변경</span>
                            </button>
                            <button onClick={() => setAdminModal('changePassword')}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 text-left">
                                <span className="text-xl">🔒</span>
                                <span className="font-medium text-gray-700">비밀번호 변경</span>
                            </button>
                        </div>
                        <button onClick={() => setAdminModal(null)}
                            className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">닫기</button>
                    </div>
                </div>
            )}

            {/* ── Admin: Change Name Modal ──────────────────────────────────── */}
            {adminModal === 'changeName' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-4">일정표 이름 변경</h3>
                        <input type="text" value={adminNewName}
                            onChange={e => setAdminNewName(e.target.value)}
                            placeholder="새 이름 입력"
                            className="w-full border border-gray-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-400 mb-5" />
                        <div className="flex gap-3">
                            <button onClick={() => setAdminModal('settings')}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">취소</button>
                            <button onClick={handleAdminChangeName}
                                className="flex-1 py-3 rounded-xl bg-[#42A5F5] text-white font-bold hover:bg-blue-600 transition-colors">저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Admin: Change Password Modal ──────────────────────────────── */}
            {adminModal === 'changePassword' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-4">비밀번호 변경</h3>
                        <div className="space-y-3 mb-2">
                            <input type="password" value={adminNewPw}
                                onChange={e => { setAdminNewPw(e.target.value); setAdminPwError(''); }}
                                placeholder="새 비밀번호"
                                className="w-full border border-gray-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-400" />
                            <input type="password" value={adminConfirmPw}
                                onChange={e => { setAdminConfirmPw(e.target.value); setAdminPwError(''); }}
                                placeholder="비밀번호 확인"
                                className="w-full border border-gray-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-blue-400" />
                            {adminPwError && <p className="text-red-500 text-xs px-1">{adminPwError}</p>}
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => { setAdminModal('settings'); setAdminNewPw(''); setAdminConfirmPw(''); setAdminPwError(''); }}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">취소</button>
                            <button onClick={handleAdminChangePassword}
                                className="flex-1 py-3 rounded-xl bg-[#42A5F5] text-white font-bold hover:bg-blue-600 transition-colors">저장</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Admin: Share Modal ────────────────────────────────────────── */}
            {adminModal === 'share' && (
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
                                📋 복사
                            </button>
                        </div>
                        <button onClick={() => setAdminModal(null)}
                            className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">닫기</button>
                    </div>
                </div>
            )}

            {/* ── Admin: Settlement Modal ───────────────────────────────────── */}
            {adminModal === 'settlement' && (
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
                            <button onClick={handleExcelUpload}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                                📤 엑셀 업로드
                            </button>
                            <button onClick={handleDownloadFormat}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-blue-500 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors">
                                📥 양식 다운로드
                            </button>
                        </div>
                        <button onClick={() => setAdminModal(null)}
                            className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">닫기</button>
                    </div>
                </div>
            )}
        </div>
    );
}
