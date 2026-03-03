'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, LogIn, ChevronLeft, ChevronRight, Users, Plus, Phone, ClipboardList, LayoutDashboard, Youtube } from 'lucide-react';
import { useScheduleData } from '@/hooks/useScheduleData';
import { useAuth } from '@/context/auth-context';
import { Schedule } from '@/types/schedule';

interface ScheduleTabProps {
    userSchedule: Schedule | null;
}

export default function ScheduleTab({ userSchedule }: ScheduleTabProps) {
    const router = useRouter();
    const { user } = useAuth();
    const {
        members,
        dayOffs,
        currentDate,
        prevMonth,
        nextMonth,
        toggleDayOff,
        addMember
    } = useScheduleData(userSchedule);

    const [dayOffDialog, setDayOffDialog] = useState<string | null>(null);
    const [addMemberModal, setAddMemberModal] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberPhone, setNewMemberPhone] = useState('');
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [isFullCalendar, setIsFullCalendar] = useState(false);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handleAddMember = async () => {
        try {
            await addMember(newMemberName, newMemberPhone);
            setAddMemberModal(false);
            setNewMemberName('');
            setNewMemberPhone('');
        } catch (e) {
            alert('팀원 추가 중 오류가 발생했습니다.');
        }
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);
        const days = [];

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 border-b border-r border-gray-100 bg-gray-50/30"></div>);
        }

        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(year, month, d);
            const isToday = new Date().toDateString() === date.toDateString();
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayOffMembers = Array.from(dayOffs[dateKey] || []);
            const isHighlighted = selectedMember && dayOffMembers.includes(selectedMember);

            days.push(
                <div
                    key={d}
                    onClick={() => {
                        if (userSchedule) {
                            setDayOffDialog(dateKey);
                        } else {
                            setAddMemberModal(true);
                        }
                    }}
                    className={`${isFullCalendar ? 'h-32 md:h-36' : 'h-24 md:h-28'} border-b border-r border-gray-100 p-2 relative hover:bg-blue-50 transition-all cursor-pointer overflow-hidden ${isToday ? 'bg-blue-50/50' : ''
                        } ${isHighlighted ? 'bg-blue-100 border-blue-300' : ''}`}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-sm font-bold ${date.getDay() === 0 ? 'text-red-500' : date.getDay() === 6 ? 'text-blue-500' : 'text-gray-700'} ${isToday ? 'bg-blue-100 w-6 h-6 flex items-center justify-center rounded-full' : ''}`}>
                            {d}
                        </span>
                    </div>
                    {dayOffMembers.length > 0 && (
                        <div className={`mt-1 space-y-1 ${isFullCalendar ? 'max-h-24' : 'max-h-16'} overflow-hidden`}>
                            {dayOffMembers.map((memberName, idx) => {
                                if (selectedMember && memberName !== selectedMember) return null;
                                return (
                                    <div
                                        key={idx}
                                        className={`bg-blue-500 text-white ${isFullCalendar ? 'text-[10px] px-2 py-1' : 'text-[9px] px-1.5 py-0.5'} rounded font-bold truncate`}
                                    >
                                        {memberName}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
            {/* Top Buttons */}
            <div className="flex justify-center -mb-2 px-4 w-full">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
                    <button
                        onClick={() => userSchedule ? router.push(`/schedule/view/${userSchedule.shortId}`) : router.push('/schedule/create')}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-400 to-blue-400 text-white w-full md:w-auto px-6 md:px-8 py-3 md:py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all font-bold active:scale-95"
                    >
                        {userSchedule ? (
                            <>
                                <LogIn className="w-5 h-5" />
                                공유 일정표 입장
                            </>
                        ) : (
                            <>
                                <Plus className="w-5 h-5" />
                                팀 일정표 만들기
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => {
                            if (userSchedule) {
                                // 내 서비스 내부 이동은 기존처럼 router.push
                                router.push(`/schedule/entrance/${userSchedule.shortId}`);
                            } else {
                                // 외부 링크(유튜브)는 새 탭에서 열기
                                window.open('https://www.youtube.com/@%EC%9A%A9%EC%B9%B4%EC%95%B1', '_blank', 'noopener,noreferrer');
                            }
                        }}

                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-300 to-pink-300 text-white w-full md:w-auto px-6 md:px-8 py-3 md:py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all font-bold active:scale-95"
                    >
                        {userSchedule ? (
                            <>
                                <LayoutDashboard className="w-5 h-5" />
                                공유 일정표 메인
                            </>
                        ) : (
                            <>
                                <Youtube className="w-5 h-5" />
                                유튜브 영상 보기
                            </>
                        )}
                    </button>

                    {/* 정산입력 버튼 - PC에서만 표시 */}
                    <button
                        onClick={() => {
                            if (userSchedule) {
                                const uid = userSchedule.id || user?.uid || (userSchedule as any).userId;
                                router.push(`/schedule/view/${userSchedule.shortId}/settlement?uid=${uid}`);
                            } else {
                                // 일정표가 없는 경우 일정표 생성 페이지로 이동
                                router.push('/schedule/create');
                            }
                        }}
                        className="hidden sm:flex items-center justify-center gap-2 bg-gradient-to-r from-green-400 to-emerald-400 text-white w-full md:w-auto px-6 md:px-8 py-3 md:py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all font-bold active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        {userSchedule ? '팀원 정산 내역' : '정산 기능 사용하기'}
                    </button>
                </div>
            </div>

            {/* Desktop Layout: Calendar + Team Members */}
            <div className={`flex flex-col gap-6 ${isFullCalendar ? '' : 'lg:flex-row'}`}>
                {/* Calendar Section */}
                <div className={`${isFullCalendar ? 'w-full' : 'flex-1'} bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden`}>
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-blue-600" />
                                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                            </h3>
                            {selectedMember && (
                                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                    {selectedMember} 휴무 확인 중
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsFullCalendar(!isFullCalendar)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                title={isFullCalendar ? "분할 보기" : "전체 보기"}
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {isFullCalendar ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4h6v16H9V4z M4 8h5v8H4V8z M15 8h5v8h-5V8z" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
                        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                            <div key={day} className={`py-4 text-center text-xs font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'} uppercase tracking-widest`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 border-l border-gray-100">
                        {renderCalendar()}
                    </div>
                </div>

                {/* Team Members Section */}
                {!isFullCalendar && (
                    <div className="lg:w-80 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Users className="w-5 h-5 text-green-600" />
                                    팀원 목록
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                        {members.length}명
                                    </span>
                                </h3>
                                <button
                                    onClick={() => setAddMemberModal(true)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    title="팀원 추가"
                                >
                                    <Plus className="w-4 h-4 text-gray-600" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                            {members.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm font-medium mb-3">등록된 팀원이 없습니다</p>
                                    <button
                                        onClick={() => setAddMemberModal(true)}
                                        className="text-blue-600 text-sm font-bold hover:underline"
                                    >
                                        + 팀원 추가하기
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {members.map((member, index) => {
                                        const isSelected = selectedMember === member.name;
                                        return (
                                            <div
                                                key={member.name}
                                                onClick={() => setSelectedMember(isSelected ? null : member.name)}
                                                className={`p-4 rounded-2xl border cursor-pointer transition-all ${isSelected
                                                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                                            style={{
                                                                backgroundColor: member.color || `hsl(${index * 137.5 % 360}, 70%, 50%)`
                                                            }}
                                                        >
                                                            {member.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">{member.name}</p>
                                                            {member.phone && (
                                                                <p className="text-xs text-gray-500">{member.phone}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={`/schedule/view/${userSchedule?.shortId}/settlement/${encodeURIComponent(member.name)}?uid=${user?.uid || ''}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-1.5 hover:bg-blue-100 rounded-full transition-colors"
                                                            title="정산 입력"
                                                        >
                                                            <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                                                        </a>
                                                        {isSelected && (
                                                            <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                                                선택됨
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Full Calendar Mode - Team Members at Bottom */}
            {isFullCalendar && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Users className="w-5 h-5 text-green-600" />
                                팀원 목록
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                    {members.length}명
                                </span>
                            </h3>
                            <button
                                onClick={() => setAddMemberModal(true)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                title="팀원 추가"
                            >
                                <Plus className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>

                    <div className="p-4">
                        {members.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm font-medium mb-3">등록된 팀원이 없습니다</p>
                                <button
                                    onClick={() => setAddMemberModal(true)}
                                    className="text-blue-600 text-sm font-bold hover:underline"
                                >
                                    + 팀원 추가하기
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                                {members.map((member, index) => {
                                    const isSelected = selectedMember === member.name;
                                    return (
                                        <div
                                            key={member.name}
                                            onClick={() => setSelectedMember(isSelected ? null : member.name)}
                                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${isSelected
                                                ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex flex-col items-center text-center">
                                                <div
                                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2"
                                                    style={{
                                                        backgroundColor: member.color || `hsl(${index * 137.5 % 360}, 70%, 50%)`
                                                    }}
                                                >
                                                    {member.name.charAt(0)}
                                                </div>
                                                <p className="font-bold text-sm mb-1">{member.name}</p>
                                                {member.phone && (
                                                    <p className="text-xs text-gray-500 mb-2">{member.phone}</p>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={`/schedule/view/${userSchedule?.shortId}/settlement/${encodeURIComponent(member.name)}?uid=${user?.uid || ''}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-1.5 hover:bg-blue-100 rounded-full transition-colors"
                                                        title="정산 입력"
                                                    >
                                                        <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                                                    </a>
                                                    {isSelected && (
                                                        <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                                            선택됨
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Day Off Dialog */}
            {dayOffDialog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setDayOffDialog(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm p-8 flex flex-col shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-xl">휴무 관리</h3>
                        </div>
                        <p className="text-blue-600 font-bold mb-4">{dayOffDialog.split('-')[1]}월 {dayOffDialog.split('-')[2]}일</p>
                        <p className="text-xs text-gray-400 mb-6 font-medium">직원을 클릭하면 휴무로 자동 표시됩니다.</p>

                        <div className="space-y-2 max-h-64 overflow-y-auto px-1 custom-scrollbar">
                            {members.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-sm text-gray-400 font-bold">등록된 팀원이 없습니다.</p>
                                    <button onClick={() => { setDayOffDialog(null); setAddMemberModal(true); }} className="mt-2 text-blue-500 text-xs font-bold hover:underline">+ 팀원 추가하기</button>
                                </div>
                            ) : (
                                members.map((member) => {
                                    const isOff = dayOffs[dayOffDialog]?.has(member.name);
                                    return (
                                        <button
                                            key={member.name}
                                            onClick={() => toggleDayOff(dayOffDialog, member.name)}
                                            className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all border ${isOff ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-700 hover:border-blue-200'}`}
                                        >
                                            <span className="font-bold">{member.name}</span>
                                            {isOff && <div className="bg-white/20 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter">OFF</div>}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        <button onClick={() => setDayOffDialog(null)} className="mt-8 w-full py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-xl active:scale-95">확인</button>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {addMemberModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setAddMemberModal(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm p-8 flex flex-col shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center">
                                <Plus className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="font-bold text-xl">빠른 팀원 추가</h3>
                        </div>

                        <div className="space-y-4 mb-8">
                            {!userSchedule ? (
                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                    <p className="text-sm text-black font-bold text-center leading-relaxed">일정표를 먼저 만들고<br />팀원을 추가하세요.</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">팀원 이름</label>
                                        <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="실명을 입력하세요" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-700 font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">전화번호 (선택)</label>
                                        <input type="text" value={newMemberPhone} onChange={(e) => setNewMemberPhone(e.target.value)} placeholder="010-0000-0000" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-700 font-bold" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3">
                            {!userSchedule ? (
                                <button onClick={() => router.push('/schedule/create')} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95">일정표 만들기</button>
                            ) : (
                                <>
                                    <button onClick={() => setAddMemberModal(false)} className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-all active:scale-95">취소</button>
                                    <button onClick={handleAddMember} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95">저장</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
