'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';

// ─── Column definitions ───────────────────────────────────────────────────────
const DEFAULT_COLUMNS = [
    { key: 'del', label: '배송' },
    { key: 'err', label: '배송2' },
    { key: 'ret', label: '반품' },
    { key: 'ret2', label: '반품2' },
    { key: 'cvs', label: '편의점' },
    { key: 'pick', label: '집화' },
];

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

type DailyData = Record<string, Record<string, string>>; // dateKey → { colKey → value }

function getDocId(shortId: string, year: number, month: number) {
    return `${shortId}_${year}-${String(month).padStart(2, '0')}`;
}

function formatDateKey(y: number, m: number, d: number) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function SettlementPage() {
    const { shortId, memberName: encodedName } = useParams<{ shortId: string; memberName: string }>();
    const memberName = decodeURIComponent(encodedName);
    const searchParams = useSearchParams();
    const creatorUid = searchParams.get('uid') ?? '';
    const router = useRouter();
    const { firebaseUser, loading: authLoading } = useAuth();

    const isAdmin = !!firebaseUser && firebaseUser.uid === creatorUid;

    const now = new Date();
    const [focusedYear, setFocusedYear] = useState(now.getFullYear());
    const [focusedMonth, setFocusedMonth] = useState(now.getMonth() + 1); // 1-indexed
    const [dailyData, setDailyData] = useState<DailyData>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Dynamic column labels
    const [columns, setColumns] = useState(DEFAULT_COLUMNS);

    const daysInMonth = new Date(focusedYear, focusedMonth, 0).getDate();
    const docId = getDocId(shortId, focusedYear, focusedMonth);

    // ── Load column labels from schedule ──────────────────────────────────────────
    useEffect(() => {
        async function loadColumnLabels() {
            try {
                const q = query(collection(db, 'schedules'), where('shortId', '==', shortId), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();

                    // Load custom column labels if they exist
                    if (data.columnLabels) {
                        const customColumns = DEFAULT_COLUMNS.map(col => ({
                            ...col,
                            label: data.columnLabels[col.key] || col.label
                        }));
                        setColumns(customColumns);
                    } else {
                        setColumns(DEFAULT_COLUMNS);
                    }

                    // Access Control Check
                    const isCreator = firebaseUser && firebaseUser.uid === creatorUid;
                    const isAuthorized = sessionStorage.getItem(`schedule_auth_${shortId}`) === 'true';

                    if (!isCreator && !isAuthorized) {
                        console.log('Unauthorized access attempt in member settlement. Redirecting to entrance.');
                        router.replace(`/schedule/entrance/${shortId}`);
                        return;
                    }
                } else {
                    router.replace('/');
                }
            } catch (error) {
                console.error('컬럼 라벨 로드 실패:', error);
                setColumns(DEFAULT_COLUMNS);
            }
        }
        loadColumnLabels();
    }, [shortId, firebaseUser, creatorUid, router]);

    // ── Real-time listener ────────────────────────────────────────────────────
    useEffect(() => {
        setIsLoading(true);
        const ref = doc(db, 'performance', docId);
        const unsub = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                const raw = snap.data()?.dailyData ?? {};
                // Extract only this member's data
                const parsed: DailyData = {};
                for (const [dateKey, membersMap] of Object.entries(raw as Record<string, any>)) {
                    if (membersMap?.[memberName]) {
                        parsed[dateKey] = Object.fromEntries(
                            Object.entries(membersMap[memberName]).map(([k, v]) => [k, String(v)])
                        );
                    }
                }
                setDailyData(parsed);
            } else {
                setDailyData({});
            }
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setIsLoading(false);
        });
        return () => unsub();
    }, [docId, memberName]);

    // ── Month navigation ──────────────────────────────────────────────────────
    const prevMonth = () => {
        if (focusedMonth === 1) { setFocusedYear(y => y - 1); setFocusedMonth(12); }
        else setFocusedMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (focusedMonth === 12) { setFocusedYear(y => y + 1); setFocusedMonth(1); }
        else setFocusedMonth(m => m + 1);
    };

    // ── Cell update (local only while editing) ────────────────────────────────
    const updateCell = (dateKey: string, colKey: string, value: string) => {
        setDailyData(prev => ({
            ...prev,
            [dateKey]: { ...(prev[dateKey] ?? {}), [colKey]: value },
        }));
    };

    // ── Save to Firestore ─────────────────────────────────────────────────────
    const saveData = async () => {
        if (!isAdmin) return;
        setIsSaving(true);
        try {
            const ref = doc(db, 'performance', docId);
            const existing = await getDoc(ref);
            const existingData = existing.exists() ? (existing.data() ?? {}) : {};
            const existingDailyData: Record<string, any> = { ...(existingData.dailyData ?? {}) };
            const existingMonthlyTotal: Record<string, any> = { ...(existingData.monthlyTotal ?? {}) };

            // Merge this member's data into each date
            for (let d = 1; d <= daysInMonth; d++) {
                const dateKey = formatDateKey(focusedYear, focusedMonth, d);
                const memberDayData = dailyData[dateKey];
                if (memberDayData && Object.values(memberDayData).some(v => v !== '')) {
                    const numMap: Record<string, number> = {};
                    for (const col of columns) numMap[col.key] = parseInt(memberDayData[col.key] ?? '0') || 0;
                    if (!existingDailyData[dateKey]) existingDailyData[dateKey] = {};
                    existingDailyData[dateKey][memberName] = numMap;
                } else {
                    // Remove this member's entry if empty
                    if (existingDailyData[dateKey]?.[memberName]) {
                        delete existingDailyData[dateKey][memberName];
                    }
                }
            }

            // Calculate monthly total for this member
            const myTotal: Record<string, number> = Object.fromEntries(columns.map(c => [c.key, 0]));
            for (const [, membersMap] of Object.entries(existingDailyData)) {
                const mData = (membersMap as any)[memberName];
                if (mData) {
                    for (const col of columns) myTotal[col.key] += (mData[col.key] as number) || 0;
                }
            }
            existingMonthlyTotal[memberName] = myTotal;

            await setDoc(ref, {
                shortId,
                creatorUid,
                yearMonth: `${focusedYear}-${String(focusedMonth).padStart(2, '0')}`,
                dailyData: existingDailyData,
                monthlyTotal: existingMonthlyTotal,
            });
        } catch (e: any) {
            console.error('Save failed:', e);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Column totals ─────────────────────────────────────────────────────────
    const colTotal = (colKey: string) => {
        let total = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = formatDateKey(focusedYear, focusedMonth, d);
            total += parseInt(dailyData[dateKey]?.[colKey] ?? '0') || 0;
        }
        return total;
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
            {/* AppBar */}
            <header className="bg-white border-b border-gray-100 flex items-center gap-3 px-4 h-14 flex-shrink-0">
                <button onClick={() => router.back()} className="text-gray-600 text-xl p-1">←</button>
                <div className="flex-1">
                    <p className="font-bold text-gray-800 text-[15px] leading-tight">{memberName}</p>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-400">정산표</p>
                        {!isAdmin && (
                            <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">읽기 전용</span>
                        )}
                    </div>
                </div>
                {isAdmin && (
                    isSaving
                        ? <div className="w-5 h-5 border-2 border-[#42A5F5] border-t-transparent rounded-full animate-spin" />
                        : <button onClick={saveData}
                            className="flex items-center gap-1.5 text-[#42A5F5] font-bold text-sm px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                            💾 저장
                        </button>
                )}
            </header>

            {/* Month navigation */}
            <div className="bg-white border-b border-gray-100 flex items-center justify-center gap-6 py-3 flex-shrink-0">
                <button onClick={prevMonth} className="p-2 rounded-full hover:bg-blue-50 text-[#42A5F5]">◀</button>
                <span className="text-lg font-bold text-gray-800">
                    {focusedYear}년 {focusedMonth}월
                </span>
                <button onClick={nextMonth} className="p-2 rounded-full hover:bg-blue-50 text-[#42A5F5]">▶</button>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="w-8 h-8 border-2 border-[#42A5F5] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm">데이터를 불러오는 중...</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                        {/* Table header */}
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-[#F0F4FF]">
                                <th className="w-14 py-3 px-2 text-center text-xs font-bold text-gray-500 border-b border-gray-200">날짜</th>
                                {columns.map(col => (
                                    <th key={col.key} className="py-3 px-2 text-center text-xs font-bold text-[#42A5F5] border-b border-gray-200 min-w-[60px]">
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const date = new Date(focusedYear, focusedMonth - 1, day);
                                const weekday = date.getDay(); // 0=Sun
                                const dateKey = formatDateKey(focusedYear, focusedMonth, day);
                                const isSun = weekday === 0;
                                const isSat = weekday === 6;
                                const dayColor = isSun ? 'text-red-400' : isSat ? 'text-blue-500' : 'text-gray-800';
                                const rowBg = isSun ? 'bg-red-50/30' : isSat ? 'bg-blue-50/30' : 'bg-white';

                                return (
                                    <tr key={day} className={`border-b border-gray-100 ${rowBg}`}>
                                        {/* Date cell */}
                                        <td className="w-14 py-2.5 text-center">
                                            <div className={`font-bold text-sm leading-tight ${dayColor}`}>{day}</div>
                                            <div className={`text-[10px] ${dayColor} opacity-80`}>{WEEKDAY_NAMES[weekday]}</div>
                                        </td>
                                        {/* Data cells */}
                                        {columns.map(col => {
                                            const value = dailyData[dateKey]?.[col.key] ?? '';
                                            return (
                                                <td key={col.key} className="px-1.5 py-1.5 text-center min-w-[60px]">
                                                    {isAdmin ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={value}
                                                            onChange={e => updateCell(dateKey, col.key, e.target.value)}
                                                            className={`w-full text-center text-sm font-medium py-2 rounded-lg outline-none border transition-colors
                                ${value ? 'bg-blue-50 border-blue-200 text-gray-800' : 'bg-gray-50 border-gray-200 text-gray-400'}
                                focus:border-[#42A5F5] focus:bg-white`}
                                                            placeholder="-"
                                                        />
                                                    ) : (
                                                        <div className={`h-9 flex items-center justify-center rounded-lg text-sm font-medium border
                              ${value ? 'bg-blue-50 border-blue-100 text-gray-800' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                                            {value || '-'}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}

                            {/* Totals row */}
                            <tr className="bg-[#F0F4FF] font-bold border-t-2 border-gray-300 sticky bottom-0">
                                <td className="py-3 text-center text-xs font-bold text-[#42A5F5]">합계</td>
                                {columns.map(col => {
                                    const total = colTotal(col.key);
                                    return (
                                        <td key={col.key} className="py-3 text-center">
                                            <span className={`text-sm font-bold ${total > 0 ? 'text-[#1565C0]' : 'text-gray-300'}`}>
                                                {total > 0 ? total : '-'}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
