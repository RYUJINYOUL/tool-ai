'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, limit, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { ChevronLeft, ChevronRight, Save, Loader2, Calendar as CalendarIcon, User, Settings2, Edit3, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';

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

type DailyData = Record<string, Record<string, Record<string, any>>>; // dateKey → memberName → colKey → value
type YearlyData = Record<string, Record<string, Record<string, number>>>; // memberName → month → colKey → value

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

    // Dynamic column labels
    const [columns, setColumns] = useState(DEFAULT_COLUMNS);
    const [editingColumn, setEditingColumn] = useState<string | null>(null);
    const [tempLabel, setTempLabel] = useState('');

    // Monthly view states
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
    const [focusedYear, setFocusedYear] = useState(new Date().getFullYear());
    const [yearlyData, setYearlyData] = useState<YearlyData>({});
    const [isLoadingYearly, setIsLoadingYearly] = useState(false);

    const year = focusedDate.getFullYear();
    const month = focusedDate.getMonth() + 1;
    const dateKey = formatDateKey(focusedDate);
    const docId = getDocId(shortId, year, month);

    // ── Load Schedule (to get members and column labels) ──────────────────────────────────────────
    useEffect(() => {
        async function loadSchedule() {
            const q = query(collection(db, 'schedules'), where('shortId', '==', shortId), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const data = snap.docs[0].data();
                setMembers(data.members || []);

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
                const isCreator = firebaseUser && (firebaseUser.uid === (searchParams.get('uid') ?? ''));
                const isAuthorized = sessionStorage.getItem(`schedule_auth_${shortId}`) === 'true';

                if (!isCreator && !isAuthorized) {
                    console.log('Unauthorized access attempt in settlement. Redirecting to entrance.');
                    router.replace(`/schedule/entrance/${shortId}`);
                    return;
                }
            } else {
                // Schedule not found, also redirect
                router.replace('/');
            }
        }
        loadSchedule();
    }, [shortId, firebaseUser, router, searchParams]);

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

    const changeYear = (offset: number) => {
        setFocusedYear(prev => prev + offset);
    };

    // ── Load yearly data for monthly view ──────────────────────────────────────────
    const loadYearlyData = async (year: number) => {
        console.log(`연간 데이터 로드 시작: ${year}년`);
        setIsLoadingYearly(true);
        try {
            const yearlyData: YearlyData = {};

            // Load data for all 12 months
            for (let month = 1; month <= 12; month++) {
                const monthStr = String(month).padStart(2, '0');
                const docId = `${shortId}_${year}-${monthStr}`;

                console.log(`문서 확인 중: ${docId}`);
                const snap = await getDoc(doc(db, 'performance', docId));
                if (snap.exists()) {
                    const data = snap.data();
                    const monthlyTotal = data.monthlyTotal || {};
                    console.log(`${docId} 데이터 발견:`, monthlyTotal);

                    // Store each member's monthly totals
                    Object.entries(monthlyTotal).forEach(([memberName, totals]: [string, any]) => {
                        if (!yearlyData[memberName]) {
                            yearlyData[memberName] = {};
                        }
                        yearlyData[memberName][monthStr] = totals || {};
                    });
                } else {
                    console.log(`${docId} 문서 없음`);
                }
            }

            console.log('최종 연간 데이터:', yearlyData);
            setYearlyData(yearlyData);
        } catch (error) {
            console.error('연간 데이터 로드 실패:', error);
        } finally {
            setIsLoadingYearly(false);
        }
    };

    // Load yearly data when switching to monthly view or changing year
    useEffect(() => {
        if (viewMode === 'monthly') {
            loadYearlyData(focusedYear);
        }
    }, [viewMode, focusedYear, shortId]);

    // ── Column label management ──────────────────────────────────────────────────
    const startEditingColumn = (columnKey: string, currentLabel: string) => {
        setEditingColumn(columnKey);
        setTempLabel(currentLabel);
    };

    const cancelEditingColumn = () => {
        setEditingColumn(null);
        setTempLabel('');
    };

    const saveColumnLabel = async (columnKey: string) => {
        if (!tempLabel.trim()) {
            cancelEditingColumn();
            return;
        }

        try {
            // Update local state
            const updatedColumns = columns.map(col =>
                col.key === columnKey ? { ...col, label: tempLabel.trim() } : col
            );
            setColumns(updatedColumns);

            // Save to Firestore
            const q = query(collection(db, 'schedules'), where('shortId', '==', shortId), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const docRef = snap.docs[0].ref;
                const columnLabels = Object.fromEntries(
                    updatedColumns.map(col => [col.key, col.label])
                );
                await updateDoc(docRef, { columnLabels });
            }

            setEditingColumn(null);
            setTempLabel('');
        } catch (error) {
            console.error('컬럼 라벨 저장 실패:', error);
            alert('라벨 저장에 실패했습니다.');
        }
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
                monthlyTotal[m.name] = Object.fromEntries(columns.map(c => [c.key, 0]));
            });

            // Iterate through every date in the month stored in allDailyData
            for (const [dKey, membersMap] of Object.entries(allDailyData)) {
                if (dKey.startsWith(monthPrefix)) {
                    for (const [mName, cols] of Object.entries(membersMap as Record<string, Record<string, any>>)) {
                        if (!monthlyTotal[mName]) {
                            monthlyTotal[mName] = Object.fromEntries(columns.map(c => [c.key, 0]));
                        }
                        for (const col of columns) {
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
                    console.log('엑셀 업로드 시작');
                    const data = await file.arrayBuffer();
                    const workbook = XLSX.read(data);
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(sheet) as any[];
                    console.log('엑셀 데이터 읽기 완료:', rows.length, '행');

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
                        console.log(`처리 중인 행 ${idx + 1}:`, row);
                        const dateK = normalizeDate(row['날짜']);
                        if (!dateK) {
                            console.log(`행 ${idx + 1}: 날짜 파싱 실패`, row['날짜']);
                            return;
                        }

                        const ym = dateK.substring(0, 7);
                        if (!updatesByMonth[ym]) updatesByMonth[ym] = [];

                        // 동적 컬럼 매핑: 사용자 라벨 또는 고정 키로 데이터 읽기
                        const rowData: any = {
                            dateKey: dateK,
                            memberName: String(row['기사'] || '').trim(),
                        };
                        console.log(`행 ${idx + 1}: 날짜=${dateK}, 기사=${rowData.memberName}`);

                        // 각 컬럼에 대해 여러 방식으로 데이터 읽기 시도
                        columns.forEach(col => {
                            let value = 0;
                            let foundMethod = 'none';

                            // 1. 고정 키로 읽기 (del, err 등)
                            if (row[col.key]) {
                                value = Number(row[col.key]) || 0;
                                foundMethod = 'key';
                            }
                            // 2. 템플릿 형식으로 읽기 (del - 박스 등)
                            else if (row[`${col.key} - ${col.label}`]) {
                                value = Number(row[`${col.key} - ${col.label}`]) || 0;
                                foundMethod = 'template';
                            }
                            // 3. 현재 라벨로 읽기 (박스, 봉지 등)
                            else if (row[col.label]) {
                                value = Number(row[col.label]) || 0;
                                foundMethod = 'label';
                            }
                            // 4. 기본 라벨로 읽기 (배송, 배송2 등) - 하위 호환성
                            else {
                                const defaultCol = DEFAULT_COLUMNS.find(dc => dc.key === col.key);
                                if (defaultCol && row[defaultCol.label]) {
                                    value = Number(row[defaultCol.label]) || 0;
                                    foundMethod = 'default';
                                }
                            }
                            // 5. 패턴 매칭으로 읽기 (del - 임의문자 형식)
                            if (foundMethod === 'none') {
                                // 모든 컬럼명에서 "del - " 패턴 찾기
                                const pattern = `${col.key} - `;
                                const matchingKey = Object.keys(row).find(key => key.startsWith(pattern));
                                if (matchingKey && row[matchingKey]) {
                                    value = Number(row[matchingKey]) || 0;
                                    foundMethod = 'pattern';
                                }
                            }

                            console.log(`  컬럼 ${col.key}(${col.label}): ${value} (방식: ${foundMethod})`);
                            rowData[col.key] = value;
                        });

                        updatesByMonth[ym].push(rowData);
                        console.log(`행 ${idx + 1} 처리 완료:`, rowData);
                    });

                    console.log('월별 업데이트 데이터:', updatesByMonth);

                    if (Object.keys(updatesByMonth).length === 0) {
                        alert('가져올 데이터가 없거나 날짜 형식이 올바르지 않습니다.');
                        return;
                    }

                    // Update Firestore per month
                    console.log('Firestore 업데이트 시작');
                    for (const [ym, monthUpdates] of Object.entries(updatesByMonth)) {
                        console.log(`${ym} 월 업데이트 시작:`, monthUpdates.length, '건');
                        const perfDocId = `${shortId}_${ym}`;
                        const ref = doc(db, 'performance', perfDocId);
                        const snap = await getDoc(ref);
                        console.log(`문서 ${perfDocId} 존재:`, snap.exists());

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
                            const total: Record<string, number> = {};

                            // 동적 컬럼에 대해 합계 계산
                            columns.forEach(col => {
                                total[col.key] = 0;
                            });

                            Object.entries(dailyD).forEach(([dKy, membersMap]: [string, any]) => {
                                if (dKy.startsWith(ym) && membersMap[m]) {
                                    const md = membersMap[m];
                                    columns.forEach(col => {
                                        total[col.key] += Number(md[col.key] || 0);
                                    });
                                }
                            });
                            monthlyT[m] = total;
                        });

                        console.log(`${ym} 월 Firestore 저장 시작`);
                        await setDoc(ref, {
                            ...performanceData,
                            dailyData: dailyD,
                            monthlyTotal: monthlyT
                        }, { merge: true });
                        console.log(`${ym} 월 Firestore 저장 완료`);
                    }

                    console.log('엑셀 업로드 전체 완료');
                    setSettlementMsg('입력 되었습니다.');
                } catch (err) {
                    console.error('Excel upload error:', err);
                    const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다';
                    setSettlementMsg('업로드 중 오류가 발생했습니다: ' + errorMessage);
                }
            }
        };
        input.click();
    };

    const handleDownloadFormat = () => {
        try {
            // 동적 헤더 생성
            const headers = [
                '날짜',
                '기사',
                ...columns.map(col => `${col.key} - ${col.label}`)
            ];

            // 샘플 데이터 생성
            const sampleData = [
                headers,
                ['2026-01-01', '홍길동', ...columns.map(() => '0')],
                ['2026-01-02', '김철수', ...columns.map(() => '0')],
                ['', '', ...columns.map(() => '')], // 빈 행
                ['📌 사용법:', '', '', '', '', '', '', ''],
                ['1. 날짜: YYYY-MM-DD 형식 (예: 2026-01-01)', '', '', '', '', '', '', ''],
                ['2. 기사: 팀원 이름', '', '', '', '', '', '', ''],
                [`3. ${columns.map(col => `${col.key}(${col.label})`).join(', ')}: 숫자만 입력`, '', '', '', '', '', '', ''],
                ['4. 빈 셀은 0으로 처리됩니다', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['⚠️ 중요 사항:', '', '', '', '', '', '', ''],
                [`${columns.map(col => `${col.key} -`).join(', ')} 위 카테고리명은 삭제하시면 안됩니다.`, '', '', '', '', '', '', ''],
                [`${columns.map(col => `${col.key} - 희망카테고리명`).join(', ')} (희망카테고리는 이렇게 사용하세요)`, '', '', '', '', '', '', ''],
            ];

            // 엑셀 파일 생성
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(sampleData);

            // 컬럼 너비 설정
            const colWidths = [
                { wch: 12 }, // 날짜
                { wch: 10 }, // 기사
                ...columns.map(() => ({ wch: 12 })) // 각 컬럼
            ];
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, '정산 템플릿');

            // 파일 다운로드
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/octet-stream' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `정산_업로드_템플릿_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('템플릿 생성 실패:', error);
            alert('템플릿 생성에 실패했습니다.');
        }
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

            {/* Navigation */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 flex-shrink-0">
                {/* View Mode Toggle */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${viewMode === 'daily'
                                ? 'bg-[#42A5F5] text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        일별보기
                    </button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${viewMode === 'monthly'
                                ? 'bg-[#42A5F5] text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        월별보기
                    </button>
                </div>

                {/* Date/Year Navigation */}
                {viewMode === 'daily' ? (
                    <div className="flex items-center justify-between">
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
                ) : (
                    <div className="flex items-center justify-between">
                        <button onClick={() => changeYear(-1)} className="p-2 rounded-2xl border border-gray-100 hover:bg-blue-50 text-[#42A5F5] transition-all">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2 text-gray-400 mb-0.5">
                                <CalendarIcon size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Selected Year</span>
                            </div>
                            <span className="text-lg font-black text-gray-800">
                                {focusedYear}년 연간 합계
                            </span>
                        </div>
                        <button onClick={() => changeYear(1)} className="p-2 rounded-2xl border border-gray-100 hover:bg-blue-50 text-[#42A5F5] transition-all">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            {(viewMode === 'daily' ? isLoading : isLoadingYearly) ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                        <Loader2 className="w-10 h-10 text-[#42A5F5] animate-spin" />
                        <p className="text-sm font-medium">
                            {viewMode === 'daily' ? '데이터 로딩 중...' : '연간 데이터 로딩 중...'}
                        </p>
                    </div>
                </div>
            ) : viewMode === 'monthly' ? (
                // Monthly View
                <div className="flex-1 overflow-auto">
                    <div className="min-w-full inline-block align-middle">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="sticky left-0 z-20 bg-gray-50/50 py-4 px-3 text-left text-xs font-black text-gray-400 border-b border-gray-100 min-w-[100px]">
                                        팀원 이름
                                    </th>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <th key={i} className="py-4 px-2 text-center text-xs font-black text-[#42A5F5] border-b border-gray-100 min-w-[80px]">
                                            {i + 1}월
                                        </th>
                                    ))}
                                    <th className="py-4 px-2 text-center text-xs font-black text-red-600 border-b border-gray-100 min-w-[80px]">
                                        연간 합계
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.length === 0 ? (
                                    <tr>
                                        <td colSpan={14} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 text-gray-300">
                                                <User size={40} className="opacity-20" />
                                                <p className="text-sm font-medium">등록된 팀원이 없습니다</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    members.map((member, idx) => {
                                        const memberData = yearlyData[member.name] || {};
                                        let yearTotal = 0;

                                        return (
                                            <tr key={idx} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                                                <td className="sticky left-0 z-10 bg-white py-3 px-3 border-r border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: member.color || '#42A5F5' }}
                                                        ></div>
                                                        <span className="font-bold text-gray-700 text-sm truncate">{member.name}</span>
                                                    </div>
                                                </td>
                                                {Array.from({ length: 12 }, (_, monthIndex) => {
                                                    const monthStr = String(monthIndex + 1).padStart(2, '0');
                                                    const monthData = memberData[monthStr] || {};
                                                    const monthTotal = columns.reduce((sum, col) =>
                                                        sum + (Number(monthData[col.key]) || 0), 0
                                                    );
                                                    yearTotal += monthTotal;

                                                    return (
                                                        <td key={monthIndex} className="px-2 py-3 text-center">
                                                            <div className={`h-9 flex items-center justify-center rounded-lg text-sm font-medium border
                                                                ${monthTotal > 0
                                                                    ? 'bg-blue-50 border-blue-100 text-gray-800'
                                                                    : 'bg-gray-50 border-gray-100 text-gray-300'
                                                                }`}>
                                                                {monthTotal > 0 ? monthTotal : '-'}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-2 py-3 text-center">
                                                    <div className={`h-9 flex items-center justify-center rounded-lg text-sm font-bold border-2
                                                        ${yearTotal > 0
                                                            ? 'bg-red-50 border-red-200 text-red-700'
                                                            : 'bg-gray-50 border-gray-200 text-gray-300'
                                                        }`}>
                                                        {yearTotal > 0 ? yearTotal : '-'}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                // Daily View (기존 테이블)
                <div className="flex-1 overflow-auto">
                    <div className="min-w-full inline-block align-middle">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="sticky left-0 z-20 bg-gray-50/50 py-4 px-3 text-left text-xs font-black text-gray-400 border-b border-gray-100 min-w-[100px]">
                                        팀원 이름
                                    </th>
                                    {columns.map(col => (
                                        <th key={col.key} className="py-4 px-2 text-center text-xs font-black text-[#42A5F5] border-b border-gray-100 min-w-[80px] uppercase">
                                            <div className="flex items-center justify-center gap-1">
                                                {editingColumn === col.key ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            value={tempLabel}
                                                            onChange={(e) => setTempLabel(e.target.value)}
                                                            className="w-16 px-1 py-0.5 text-xs border rounded text-gray-700 text-center"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveColumnLabel(col.key);
                                                                if (e.key === 'Escape') cancelEditingColumn();
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => saveColumnLabel(col.key)}
                                                            className="p-0.5 hover:bg-green-100 rounded"
                                                        >
                                                            <Check className="w-3 h-3 text-green-600" />
                                                        </button>
                                                        <button
                                                            onClick={cancelEditingColumn}
                                                            className="p-0.5 hover:bg-red-100 rounded"
                                                        >
                                                            <X className="w-3 h-3 text-red-600" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span>{col.label}</span>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => startEditingColumn(col.key, col.label)}
                                                                className="p-0.5 hover:bg-blue-100 rounded opacity-60 hover:opacity-100 transition-opacity"
                                                                title="라벨 편집"
                                                            >
                                                                <Edit3 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
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
                                        <td colSpan={columns.length + 2} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 text-gray-300">
                                                <User size={40} className="opacity-20" />
                                                <p className="text-sm font-bold">등록된 팀원이 없습니다.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    members.map((member, idx) => {
                                        const mData = currentDayData[member.name] ?? {};
                                        const rowTotal = columns.reduce((acc: number, col) => acc + (parseInt(mData[col.key] ?? '0') || 0), 0);
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
                                                {columns.map(col => {
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
                                        {columns.map(col => {
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
                                                    grandTotal += columns.reduce((acc: number, col) => acc + (parseInt(mData[col.key] ?? '0') || 0), 0);
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
                    {viewMode === 'daily' ? (
                        <>💡 상단 날짜를 이동하며 팀 전체의 배송/반품 성과를 한눈에 입력할 수 있습니다.<br />
                            입력 완료 후 우측 상단 '저장하기' 버튼을 꼭 눌러주세요.</>
                    ) : (
                        <>📊 연간 월별 합계를 한눈에 확인할 수 있습니다.<br />
                            각 월의 데이터는 일별보기에서 입력하실 수 있습니다.</>
                    )}
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
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                                <h4 className="font-bold text-blue-800 mb-2">업로드 방법</h4>
                                <div className="text-sm text-blue-700 space-y-1">
                                    <p>1. 엑셀 양식 다운로드</p>
                                    <p>2. "엑셀 업로드"로 파일 업로드</p>
                                </div>
                            </div>

                            <button onClick={handleDownloadFormat}
                                className="w-full flex items-center justify-center gap-3 py-4 border-2 border-green-500 text-green-600 rounded-2xl font-bold hover:bg-green-50 transition-all active:scale-95">
                                <span className="text-lg">📥</span>
                                엑셀 양식 다운로드
                            </button>

                            <button onClick={handleExcelUpload}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95">
                                <span className="text-lg">📤</span>
                                엑셀 업로드
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
