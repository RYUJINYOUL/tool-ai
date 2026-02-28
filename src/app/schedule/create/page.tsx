'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, query, setDoc, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';

const COMPANIES = [
    { value: 'coupang', name: '쿠팡', image: '/cou.png' },
    { value: 'cj', name: '씨제이', image: '/cj.png' },
    { value: 'lotte', name: '롯데', image: '/lot.png' },
    { value: 'logen', name: '로젠', image: '/log.png' },
    { value: 'etc', name: '기타', image: '/logo512.png' },
];

async function sha256(str: string) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateShortId(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function ScheduleCreatePage() {
    const { user, isLoggedIn } = useAuth();
    const router = useRouter();

    const [selectedCompany, setSelectedCompany] = useState('coupang');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!name.trim() || name.trim().length < 2) errs.name = '일정표 이름은 2글자 이상 입력해주세요.';
        if (!password || password.length < 4) errs.password = '비밀번호는 4자리 이상 입력해주세요.';
        if (password !== confirmPassword) errs.confirm = '비밀번호가 일치하지 않습니다.';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (!isLoggedIn || !user) {
            setErrors({ global: '로그인이 필요합니다.' });
            return;
        }

        setIsLoading(true);
        try {
            // Check if schedule already exists
            const existing = await getDoc(doc(db, 'schedules', user.uid));
            if (existing.exists()) {
                setErrors({ global: '이미 일정표가 존재합니다. 사용자당 하나의 일정표만 만들 수 있습니다.' });
                return;
            }

            // Generate unique shortId
            let shortId = '';
            for (let i = 0; i < 10; i++) {
                const candidate = generateShortId();
                const snap = await getDocs(query(collection(db, 'schedules'), where('shortId', '==', candidate), limit(1)));
                if (snap.empty) { shortId = candidate; break; }
            }
            if (!shortId) throw new Error('고유한 ID 생성에 실패했습니다. 다시 시도해주세요.');

            const hashedPassword = await sha256(password);
            const company = COMPANIES.find(c => c.value === selectedCompany)!;

            await setDoc(doc(db, 'schedules', user.uid), {
                name: name.trim(),
                company: selectedCompany,
                coverImagePath: `assets/images/${selectedCompany}.png`,
                password: hashedPassword,
                shortId,
                createdAt: new Date(),
                updatedAt: new Date(),
                members: [],
                notices: [],
                communications: [],
                dayOffs: {},
            });

            router.push(`/schedule/entrance/${shortId}?new=1`);
        } catch (err: any) {
            setErrors({ global: err.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f0f4f8]">
            {/* Header */}
            <div className="bg-[#42A5F5] pt-14 pb-20 px-6 flex flex-col items-center text-white">
                <h1 className="text-2xl font-bold mb-1">새로운 일정표 만들기</h1>
                <p className="text-white/80 text-sm text-center">팀원들과 카톡으로 공유하세요</p>
            </div>

            <div className="mt-[-40px] px-4 pb-16 max-w-lg mx-auto">
                <div className="premium-card p-6 bg-white">
                    <form onSubmit={handleCreate} className="space-y-6">

                        {errors.global && (
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-600 text-sm">
                                ⚠️ {errors.global}
                            </div>
                        )}

                        {/* Company selector */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">택배사 선택</label>
                            <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                                {COMPANIES.map((company) => {
                                    const isSelected = selectedCompany === company.value;
                                    return (
                                        <button
                                            key={company.value}
                                            type="button"
                                            onClick={() => setSelectedCompany(company.value)}
                                            className={`w-full flex items-center gap-4 px-5 py-4 transition-all text-left ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden shrink-0">
                                                <img src={company.image} alt={company.name} className="w-full h-full object-contain" />
                                            </div>
                                            <span className={`flex-1 font-semibold ${isSelected ? 'text-[#42A5F5]' : 'text-gray-700'}`}>
                                                {company.name}
                                            </span>
                                            <span className={`text-lg ${isSelected ? 'text-[#42A5F5]' : 'text-gray-200'}`}>
                                                {isSelected ? '🔵' : '○'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Schedule name */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">일정표 이름</label>
                            <input
                                type="text"
                                placeholder="예: 용카 배송팀 일정표"
                                className="w-full input-field px-5 py-4 rounded-xl text-base outline-none"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">비밀번호</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="4자리 이상 입력해주세요"
                                    className="w-full input-field px-5 py-4 rounded-xl text-base outline-none pr-12"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                        </div>

                        {/* Confirm password */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">비밀번호 확인</label>
                            <input
                                type="password"
                                placeholder="비밀번호를 다시 입력해주세요"
                                className="w-full input-field px-5 py-4 rounded-xl text-base outline-none"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                            {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>}
                        </div>

                        {/* Info banner */}
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-700 flex gap-3">
                            <span>ℹ️</span>
                            <span>일정표가 생성되면 고유한 공유 링크가 만들어집니다. 팀원들과 링크를 공유하여 함께 사용하세요!</span>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 rounded-2xl text-white font-bold text-lg disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #42A5F5 0%, #0076d3 100%)' }}
                        >
                            {isLoading ? '생성 중...' : '일정표 만들기'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
