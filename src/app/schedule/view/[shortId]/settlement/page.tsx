'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, limit, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { ChevronLeft, ChevronRight, Save, Loader2, Calendar as CalendarIcon, User, Settings2 } from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── Column definitions ───────────────────────────────────────────────────────
const COLUMNS = [
    { key: 'del', label: '배송' },
    { key: 'err', label: '배송2' },
    { key: 'ret', label: '반품' },
    { key: 'ret2', label: '반품2' },
    { key: 'cvs', label: '편의점' },
    { key: 'pick', label: '집화' },
];

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

type DailyData = Record<string, Record<string, Record<string, any>>>; // dateKey → memberName → colKey → value

function getDocId(shortId: string, year: number, month: number) {
    return `${shortId}_${year}-${String(month).padStart(2, '0')}`;
}

function formatDateKey(date: Date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function TeamSettlementPage() {
    const { shortId } = useParams<{ shortId: string }>();
    const searchParams = useSearchParams();
    const creatorUid = searchParams.get('uid') ?? '';
    const router = useRouter();
    const { user, firebaseUser, loading: authLoading } = useAuth();

    // Fix: Using firebaseUser as fallback for more robust admin check during loading
    const currentUserUid = user?.uid || firebaseUser?.uid;
    const isAdmin = !!currentUserUid && currentUserUid === creatorUid;

    const [focusedDate, setFocusedDate] = useState(new Date());
    const [allDailyData, setAllDailyData] = useState<DailyData>({});
    const [members, setMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [adminModal, setAdminModal] = useState<'settlement' | null>(null);
    const [settlementMsg, setSettlementMsg] = useState('');

    const year = focusedDate.getFullYear();
    const month = focusedDate.getMonth() + 1;
    const dateKey = formatDateKey(focusedDate);
    const docId = getDocId(shortId, year, month);

    // ── Load Schedule (to get members) ──────────────────────────────────────────
    useEffect(() => {
        async function loadSchedule() {
            const q = query(collection(db, 'schedules'), where('shortId', '==', shortId), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const data = snap.docs[0].data();
                setMembers(data.members || []);
            }
        }
        loadSchedule();
    }, [shortId]);

    // ── Real-time listener for current month's performance ──────────────────────
    useEffect(() => {
        setIsLoading(true);
        const ref = doc(db, 'performance', docId);
        const unsub = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                setAllDailyData(snap.data()?.dailyData ?? {});
            } else {
                setAllDailyData({});
            }
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setIsLoading(false);
        });
        return () => unsub();
    }, [docId]);

    // ── Date navigation ──────────────────────────────────────────────────────
    const changeDate = (offset: number) => {
        const next = new Date(focusedDate);
        next.setDate(next.getDate() + offset);
        setFocusedDate(next);
    };

    // ── Cell update (local only while editing) ────────────────────────────────
    const updateCell = (memberName: string, colKey: string, value: string) => {
        setAllDailyData(prev => ({
            ...prev,
            [dateKey]: {
                ...(prev[dateKey] ?? {}),
                [memberName]: {
                    ...(prev[dateKey]?.[memberName] ?? {}),
                    [colKey]: value
                }
            }
        }));
    };

    // ── Save to Firestore ─────────────────────────────────────────────────────
    const saveData = async () => {
        if (!isAdmin) return;
        setIsSaving(true);
        try {
            const ref = doc(db, 'performance', docId);

            // Re-calculate Monthly Totals for ALL members based on current allDailyData
            const monthlyTotal: Record<string, any> = {};

            // Collect all dates in this month from allDailyData
            const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

            // Reset totals for all known members
            members.forEach(m => {
                monthlyTotal[m.name] = Object.fromEntries(COLUMNS.map(c => [c.key, 0]));
            });

            // Iterate through every date in the month stored in allDailyData
            for (const [dKey, membersMap] of Object.entries(allDailyData)) {
                if (dKey.startsWith(monthPrefix)) {
                    for (const [mName, cols] of Object.entries(membersMap as Record<string, Record<string, any>>)) {
                        if (!monthlyTotal[mName]) {
                            monthlyTotal[mName] = Object.fromEntries(COLUMNS.map(c => [c.key, 0]));
                        }
                        for (const col of COLUMNS) {
                            const val = parseInt(cols[col.key] ?? '0') || 0;
                            monthlyTotal[mName][col.key] += val;
                        }
                    }
                }
            }

            await setDoc(ref, {
                shortId,
                creatorUid,
                yearMonth: monthPrefix,
                dailyData: allDailyData,
                monthlyTotal: monthlyTotal,
            }, { merge: true });

            alert('정산 데이터가 저장되었습니다.');
        } catch (e: any) {
            console.error('Save failed:', e);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Excel Features ──────────────────────────────────────────────────────────
    const handleExcelUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

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
                        const dateK = normalizeDate(row['날짜']);
                        if (!dateK) return;

                        const ym = dateK.substring(0, 7);
                        if (!updatesByMonth[ym]) updatesByMonth[ym] = [];

                        updatesByMonth[ym].push({
                            dateKey: dateK,
                            memberName: String(row['기사'] || '').trim(),
                            del: Number(row['배송']) || 0,
                            err: Number(row['배송2']) || 0,
                            ret: Number(row['반품']) || 0,
                            ret2: Number(row['반품2']) || 0,
                            cvs: Number(row['편의점']) || 0,
                            pick: Number(row['집하']) || 0,
                        });
                    });

                    if (Object.keys(updatesByMonth).length === 0) {
                        alert('가져올 데이터가 없거나 날짜 형식이 올바르지 않습니다.');
                        return;
                    }

                    // Update Firestore per month
                    for (const [ym, monthUpdates] of Object.entries(updatesByMonth)) {
                        const perfDocId = `${shortId}_${ym}`;
                        const ref = doc(db, 'performance', perfDocId);
                        const snap = await getDoc(ref);

                        let performanceData = snap.exists() ? snap.data() : {
                            shortId,
                            creatorUid,
                            yearMonth: ym,
                            dailyData: {},
                            monthlyTotal: {}
                        };

                        const dailyD = { ...(performanceData.dailyData || {}) };
                        const monthlyT = { ...(performanceData.monthlyTotal || {}) };

                        monthUpdates.forEach(upd => {
                            const { dateKey: dk, memberName: mName, ...metrics } = upd;
                            if (!mName) return;

                            if (!dailyD[dk]) dailyD[dk] = {};
                            dailyD[dk][mName] = metrics;
                        });

                        // Re-calculate monthly totals for affected members
                        const affectedMembers = new Set(monthUpdates.map(u => u.memberName));
                        affectedMembers.forEach(m => {
                            if (!m) return;
                            const total = { del: 0, err: 0, ret: 0, ret2: 0, cvs: 0, pick: 0 };
                            Object.entries(dailyD).forEach(([dKy, membersMap]: [string, any]) => {
                                if (dKy.startsWith(ym) && membersMap[m]) {
                                    const md = membersMap[m];
                                    total.del += Number(md.del || 0);
                                    total.err += Number(md.err || 0);
                                    total.ret += Number(md.ret || 0);
                                    total.ret2 += Number(md.ret2 || 0);
                                    total.cvs += Number(md.cvs || 0);
                                    total.pick += Number(md.pick || 0);
                                }
                            });
                            monthlyT[m] = total;
                        });

                        await setDoc(ref, {
                            ...performanceData,
                            dailyData: dailyD,
                            monthlyTotal: monthlyT
                        }, { merge: true });
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

    const getColumnTotal = (colKey: string) => {
        let total = 0;
        const currentDayData = allDailyData[dateKey] ?? {};
        Object.values(currentDayData).forEach((cols: any) => {
            total += parseInt(cols[colKey] ?? '0') || 0;
        });
        return total;
    };

    const currentDayData = allDailyData[dateKey] ?? {};

    return (
        <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
            {/* AppBar */}
            <header className="bg-white border-b border-gray-100 flex items-center gap-3 px-4 h-16 flex-shrink-0 sticky top-0 z-50">
                <button onClick={() => router.back()} className="text-gray-600 text-xl p-2 hover:bg-gray-50 rounded-full transition-colors">←</button>
                <div className="flex-1">
                    <p className="font-bold text-gray-800 text-lg leading-tight">정산 데이터</p>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-400">팀 전체 데이터 관리</p>
                        {authLoading ? (
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full uppercase">Loading...</span>
                        ) : !isAdmin && (
                            <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full uppercase">Read Only</span>
                        )}
                    </div>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setSettlementMsg(''); setAdminModal('settlement'); }}
                            className="flex items-center gap-2 border-2 border-green-500 text-green-600 font-bold text-sm px-4 py-2 rounded-2xl hover:bg-green-50 transition-all active:scale-95 shadow-sm"
                        >
                            정산 관리
                        </button>
                        <button
                            onClick={saveData}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-[#42A5F5] text-white font-bold text-sm px-5 py-2.5 rounded-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-blue-100"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            저장하기
                        </button>
                    </div>
                )}
            </header>

            {/* Date navigation */}
            <div className="bg-white border-b border-gray-100 flex items-center justify-between px-4 py-4 flex-shrink-0">
                <button onClick={() => changeDate(-1)} className="p-2 rounded-2xl border border-gray-100 hover:bg-blue-50 text-[#42A5F5] transition-all">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 text-gray-400 mb-0.5">
                        <CalendarIcon size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Selected Date</span>
                    </div>
                    <span className="text-lg font-black text-gray-800">
                        {year}년 {month}월 {focusedDate.getDate()}일 ({WEEKDAY_NAMES[focusedDate.getDay()]})
                    </span>
                </div>
                <button onClick={() => changeDate(1)} className="p-2 rounded-2xl border border-gray-100 hover:bg-blue-50 text-[#42A5F5] transition-all">
                    <ChevronRight size={20} />
                </button>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                        <Loader2 className="w-10 h-10 text-[#42A5F5] animate-spin" />
                        <p className="text-sm font-medium">데이터 로딩 중...</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-auto">
                    <div className="min-w-full inline-block align-middle">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="sticky left-0 z-20 bg-gray-50/50 py-4 px-3 text-left text-xs font-black text-gray-400 border-b border-gray-100 min-w-[100px]">
                                        팀원 이름
                                    </th>
                                    {COLUMNS.map(col => (
                                        <th key={col.key} className="py-4 px-2 text-center text-xs font-black text-[#42A5F5] border-b border-gray-100 min-w-[80px] uppercase">
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="py-4 px-2 text-center text-xs font-black text-gray-400 border-b border-gray-100 min-w-[80px] uppercase">
                                        합계
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {members.length === 0 ? (
                                    <tr>
                                        <td colSpan={COLUMNS.length + 2} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 text-gray-300">
                                                <User size={40} className="opacity-20" />
                                                <p className="text-sm font-bold">등록된 팀원이 없습니다.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    members.map((member, idx) => {
                                        const mData = currentDayData[member.name] ?? {};
                                        const rowTotal = COLUMNS.reduce((acc, col) => acc + (parseInt(mData[col.key] ?? '0') || 0), 0);
                                        return (
                                            <tr key={idx} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                                                <td className="sticky left-0 z-10 bg-white/80 backdrop-blur-md py-4 px-3 border-r border-gray-50">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-sm"
                                                            style={{ backgroundColor: member.color || '#CBD5E1' }}
                                                        >
                                                            {member.name.charAt(0)}
                                                        </div>
                                                        <span className="font-bold text-gray-700 text-sm truncate">{member.name}</span>
                                                    </div>
                                                </td>
                                                {COLUMNS.map(col => {
                                                    const value = mData[col.key] ?? '';
                                                    return (
                                                        <td key={col.key} className="px-2 py-3">
                                                            {isAdmin ? (
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={value}
                                                                    onChange={e => updateCell(member.name, col.key, e.target.value)}
                                                                    className={`w-full text-center text-[15px] font-bold py-3 rounded-2xl outline-none border-2 transition-all
                                                                        ${value
                                                                            ? 'bg-blue-50 border-blue-100 text-[#42A5F5] shadow-sm shadow-blue-50'
                                                                            : 'bg-gray-50 border-gray-50 text-gray-300 hover:border-gray-100'}
                                                                        focus:border-[#42A5F5] focus:bg-white focus:text-gray-800 focus:shadow-lg focus:shadow-blue-50`}
                                                                    placeholder="0"
                                                                />
                                                            ) : (
                                                                <div className={`h-12 flex items-center justify-center rounded-2xl text-[15px] font-bold border-2
                                                                    ${value
                                                                        ? 'bg-blue-50 border-blue-50 text-gray-700'
                                                                        : 'bg-gray-50 border-gray-50 text-gray-300'}`}>
                                                                    {value || '-'}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-2 py-3">
                                                    <div className={`h-12 flex items-center justify-center rounded-2xl text-[15px] font-black border-2
                                                        ${rowTotal > 0
                                                            ? 'bg-gray-100 border-gray-200 text-gray-800 shadow-sm'
                                                            : 'bg-gray-50 border-gray-50 text-gray-300'}`}>
                                                        {rowTotal || '-'}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {members.length > 0 && (
                                <tfoot className="sticky bottom-0 z-30">
                                    <tr className="bg-[#F0F7FF] border-t-2 border-blue-100 font-bold">
                                        <td className="sticky left-0 z-30 bg-[#F0F7FF] py-4 px-4 text-center text-xs font-black text-blue-500 uppercase">
                                            전체 합계
                                        </td>
                                        {COLUMNS.map(col => {
                                            const total = getColumnTotal(col.key);
                                            return (
                                                <td key={col.key} className="py-4 px-2 text-center text-[15px] font-black text-blue-700">
                                                    {total > 0 ? total : '-'}
                                                </td>
                                            );
                                        })}
                                        <td className="py-4 px-2 text-center text-[15px] font-black text-gray-800">
                                            {(() => {
                                                let grandTotal = 0;
                                                members.forEach(member => {
                                                    const mData = currentDayData[member.name] ?? {};
                                                    grandTotal += COLUMNS.reduce((acc, col) => acc + (parseInt(mData[col.key] ?? '0') || 0), 0);
                                                });
                                                return grandTotal > 0 ? grandTotal : '-';
                                            })()}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}

            {/* Info Banner */}
            <div className="p-4 bg-blue-50/50 border-t border-blue-100 mt-auto">
                <p className="text-[11px] text-blue-600 font-bold leading-relaxed text-center">
                    💡 상단 날짜를 이동하며 팀 전체의 배송/반품 성과를 한눈에 입력할 수 있습니다.<br />
                    입력 완료 후 우측 상단 '저장하기' 버튼을 꼭 눌러주세요.
                </p>
            </div>

            {/* ── Admin: Settlement Modal ───────────────────────────────────── */}
            {adminModal === 'settlement' && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="font-bold text-xl mb-2 text-gray-800">정산 관리</h3>
                        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                            엑셀 파일을 업로드하여 정산 데이터를 일괄 등록하거나, 업로드 양식을 다운로드할 수 있습니다.
                        </p>
                        {settlementMsg && (
                            <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-4 rounded-2xl mb-6 flex items-center gap-2">
                                <span className="text-lg">✅</span>
                                {settlementMsg}
                            </div>
                        )}
                        <div className="space-y-3 mb-6">
                            <button onClick={handleExcelUpload}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95">
                                <span className="text-lg">📤</span>
                                엑셀 업로드
                            </button>
                            <button onClick={handleDownloadFormat}
                                className="w-full flex items-center justify-center gap-3 py-4 border-2 border-blue-500 text-blue-600 rounded-2xl font-bold hover:bg-blue-50 transition-all active:scale-95">
                                <span className="text-lg">📥</span>
                                양식 다운로드
                            </button>
                        </div>
                        <button onClick={() => setAdminModal(null)}
                            className="w-full py-4 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all active:scale-95">닫기</button>
                    </div>
                </div>
            )}
        </div>
    );
}
