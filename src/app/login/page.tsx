'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { X } from 'lucide-react';

declare global {
    interface Window {
        Kakao: any;
    }
}

export default function LoginPage() {
    const { isLoggedIn } = useAuth();
    const [activeTab, setActiveTab] = useState<'personal' | 'enterprise'>('personal');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (isLoggedIn) {
            router.replace('/');
        }
    }, [isLoggedIn, router]);

    const getKoreanErrorMessage = (errorCode: string) => {
        switch (errorCode) {
            case 'auth/invalid-email':
                return '유효하지 않은 이메일 형식입니다.';
            case 'auth/user-disabled':
                return '비활성화된 계정입니다.';
            case 'auth/user-not-found':
                return '등록되지 않은 이메일입니다.';
            case 'auth/wrong-password':
                return '비밀번호가 틀렸습니다.';
            case 'auth/too-many-requests':
                return '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
            case 'auth/network-request-failed':
                return '네트워크 연결이 지연되고 있습니다. 인터넷 연결을 확인해주세요.';
            case 'auth/internal-error':
                return '시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
            default:
                return '로그인 중 오류가 발생했습니다. 아이디와 비밀번호를 확인해주세요.';
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check member type matching
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const memberType = userData.memberType;

                if (activeTab === 'enterprise' && memberType !== 'enterprise') {
                    throw new Error('기사회원으로 가입되지 않은 계정입니다. 개인회원 탭에서 로그인해주세요.');
                } else if (activeTab === 'personal' && memberType === 'enterprise') {
                    throw new Error('기사회원으로 가입된 계정입니다. 기사회원 탭에서 로그인해주세요.');
                }

                router.push('/');
            } else {
                throw new Error('사용자 정보를 찾을 수 없습니다.');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.code) {
                setError(getKoreanErrorMessage(err.code));
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                router.push('/');
            } else {
                // Redirect to signup or handle new user
                setError('가입된 정보가 없습니다. 회원가입을 진행해주세요.');
                await auth.signOut();
            }
        } catch (err: any) {
            console.error('Google login error:', err);
            if (err.code) {
                setError(getKoreanErrorMessage(err.code));
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        alert('애플로그인은 준비중입니다.');
    };

    const handleKakaoLogin = async () => {
        if (typeof window !== 'undefined' && window.Kakao) {
            try {
                if (!window.Kakao.isInitialized()) {
                    window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY);
                }

                if (window.Kakao.Auth) {
                    window.Kakao.Auth.authorize({
                        redirectUri: `${window.location.origin}/api/auth/kakao/callback`,
                    });
                } else {
                    setError('카카오 인증 모듈을 찾을 수 없습니다.');
                }
            } catch (err) {
                console.error('Kakao init error:', err);
                setError('카카오 로그인 초기화 중 오류가 발생했습니다.');
            }
        } else {
            setError('카카오 SDK가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#f0f4f8]">
            <div className="w-full max-w-[480px] animate-fade-in">
                {/* Logo Section */}
                <Link href="/" className="flex flex-col items-center mb-10 group cursor-pointer transition-all">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden p-2">
                        <img src="/logo512.png" className="w-full h-full object-contain" alt="Yongcar Logo" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        <span className="text-[#1a1a1a]">용카 AI</span>

                    </h1>
                </Link>

                <div className="premium-card p-10">
                    {/* Tab Selector */}
                    <div className="flex bg-[#f3f4f6] p-1.5 rounded-2xl mb-8 border border-gray-100">
                        <button
                            onClick={() => setActiveTab('personal')}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'personal' ? 'tab-active' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            개인회원
                        </button>
                        <button
                            onClick={() => setActiveTab('enterprise')}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === 'enterprise' ? 'tab-active' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            기사회원
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-3">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className="space-y-5">
                        <div>
                            <input
                                type="email"
                                placeholder="아이디 (이메일)"
                                className="w-full input-field px-5 py-4 rounded-xl text-base outline-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                placeholder="비밀번호"
                                className="w-full input-field px-5 py-4 rounded-xl text-base outline-none"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full primary-button py-4 rounded-xl text-white font-bold text-lg disabled:opacity-50"
                        >
                            {isLoading ? '로그인 중...' : '로그인'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSignupModalOpen(true)}
                            className="w-full py-4 rounded-xl text-[#3b82f6] font-bold text-lg border-2 border-[#3b82f6] hover:bg-blue-50 transition-all duration-300"
                        >
                            회원가입
                        </button>
                    </form>

                    {activeTab === 'personal' && (
                        <>
                            <div className="relative my-10">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-4 text-gray-400 font-medium">소셜 로그인</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <button
                                    onClick={handleGoogleLogin}
                                    type="button"
                                    className="flex items-center justify-center py-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
                                    title="Google 로그인"
                                >
                                    <img src="/google_logo.png" width="35" height="35" alt="Google" />
                                </button>
                                <button
                                    onClick={handleKakaoLogin}
                                    type="button"
                                    className="flex items-center justify-center py-4 bg-[#FEE500] rounded-xl shadow-sm hover:translate-y-[-2px] transition-all active:scale-95"
                                    title="카카오 로그인"
                                >
                                    <img src="/kakao_logo.png" width="35" height="35" alt="Kakao" />
                                </button>
                                <button
                                    onClick={handleAppleLogin}
                                    type="button"
                                    className="flex items-center justify-center py-4 bg-black rounded-xl shadow-sm hover:translate-y-[-2px] transition-all active:scale-95"
                                    title="Apple 로그인"
                                >
                                    <img src="/apple.png" width="35" height="35" alt="Apple" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Signup Modal */}
            {
                isSignupModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div
                            className="bg-white w-full max-w-[420px] rounded-[32px] shadow-2xl overflow-hidden animate-scale-up border border-white/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">회원가입</h3>
                                    <button
                                        onClick={() => setIsSignupModalOpen(false)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X className="w-6 h-6 text-gray-400" />
                                    </button>
                                </div>

                                <div className="bg-blue-50 p-6 rounded-2xl mb-8 border border-blue-100">
                                    <div className="text-blue-600 font-bold text-lg text-center leading-relaxed">
                                        회원가입은 용카앱 · 용카웹 지원
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <a
                                        href="https://play.google.com/store/apps/details?id=com.yongcar.app&pcampaignid=web_share"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 w-full p-5 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all duration-300 group"
                                    >
                                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                            <img src="/google_logo.png" className="w-8 h-8 object-contain" alt="Play Store" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">GET IT ON</span>
                                            <span className="text-gray-900 text-lg font-extrabold">Google Play</span>
                                        </div>
                                    </a>

                                    <a
                                        href="https://apps.apple.com/kr/app/%EC%9A%A9%EC%B9%B4/id6758199533"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 w-full p-5 bg-white border-2 border-gray-100 rounded-2xl hover:border-[#1a1a1a] hover:shadow-lg transition-all duration-300 group"
                                    >
                                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                                            <img src="/apple.png" className="w-8 h-8 object-contain" alt="App Store" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Download on the</span>
                                            <span className="text-gray-900 text-lg font-extrabold">App Store</span>
                                        </div>
                                    </a>

                                    <a
                                        href="https://yongcar.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 w-full p-5 bg-white border-2 border-gray-100 rounded-2xl hover:border-[#1a1a1a] hover:shadow-lg transition-all duration-300 group"
                                    >
                                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                                            <img src="/web.png" className="w-8 h-8 object-contain" alt="yoncar web" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">MOVE SITE</span>
                                            <span className="text-gray-900 text-lg font-extrabold">용카 웹사이트</span>
                                        </div>
                                    </a>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 border-t border-gray-100">
                                <button
                                    onClick={() => setIsSignupModalOpen(false)}
                                    className="w-full py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
