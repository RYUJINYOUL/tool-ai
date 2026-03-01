'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, LogIn, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Schedule } from '@/types/schedule';
import { COMPANY_LOGOS } from '@/lib/constants';

interface HeaderProps {
    userSchedule: Schedule | null;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export default function Header({ userSchedule, activeTab, setActiveTab }: HeaderProps) {
    const { user, isLoggedIn, logout } = useAuth();
    const router = useRouter();
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle click outside for dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <header className="w-full px-6 py-4 flex items-center justify-between bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 overflow-hidden p-1">
                    <img src="/logo512.png" className="w-full h-full object-contain" alt="Yongcar" />
                </div>
                <span className="text-xl font-bold tracking-tight text-[#1a1a1a]">용카 AI</span>
            </div>

            <div className="relative" ref={dropdownRef}>
                {isLoggedIn ? (
                    <>
                        <button
                            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-50 border border-gray-100 hover:bg-gray-200 transition-all group max-w-[200px]"
                            title="클릭하여 메뉴 보기"
                        >
                            {userSchedule ? (
                                <>
                                    <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                                        <img
                                            src={COMPANY_LOGOS[userSchedule.company] || '/logo512.png'}
                                            alt={userSchedule.company}
                                            className="w-full h-full object-contain p-0.5"
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 truncate">{userSchedule.name}</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors shrink-0">
                                        <User className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 truncate">{user?.email?.split('@')[0]}</span>
                                </>
                            )}
                        </button>

                        {/* User Dropdown Menu */}
                        {isUserDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                    <p className="text-[10px] font-bold text-gray-400 tracking-wider">내 계정</p>
                                    <p className="text-xs font-bold text-gray-600 truncate">{user?.email}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (userSchedule) {
                                            router.push(`/schedule/view/${userSchedule.shortId}`);
                                        } else {
                                            setActiveTab('schedule');
                                        }
                                        setIsUserDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                    <CalendarIcon className="w-4 h-4" />
                                    <span>팀 일정표</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsUserDropdownOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>로그아웃</span>
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <button
                        onClick={() => router.push('/login')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1a1a1a] text-white hover:bg-black transition-all shadow-sm active:scale-95"
                    >
                        <LogIn className="w-4 h-4" />
                        <span className="text-sm font-bold">로그인</span>
                    </button>
                )}
            </div>
        </header>
    );
}
