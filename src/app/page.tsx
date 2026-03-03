'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { auth, db } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Schedule } from '@/types/schedule';
import { Home, Calendar as CalendarIcon, Bot, ImageIcon } from 'lucide-react';

// New Modular Components
import Header from '@/components/home/Header';
import HomeTab from '@/components/home/HomeTab';
import ScheduleTab from '@/components/home/ScheduleTab';
import AIToolsTab from '@/components/home/AIToolsTab';
import StorageTab from '@/components/home/StorageTab';
import NoticeBoard from '@/components/home/NoticeBoard';

// Existing Modals
import RouteMapModal from '@/components/RouteMapModal';
import RecruitOrganizerModal from '@/components/RecruitOrganizerModal';
import SimpleImageModal from '@/components/SimpleImageModal';

function HomePageContent() {
  const { firebaseUser, isLoggedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTabState] = useState<'home' | 'schedule' | 'ai' | 'memo'>('home');
  const [userSchedule, setUserSchedule] = useState<Schedule | null>(null);

  // Modal states maintained at top level for coordination
  const [isRecruitModalOpen, setIsRecruitModalOpen] = useState(false);
  const [isRouteMapModalOpen, setIsRouteMapModalOpen] = useState(false);
  const [isSimpleImageModalOpen, setIsSimpleImageModalOpen] = useState(false);

  // Sync activeTab with URL & Handle Kakao Token
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['home', 'schedule', 'ai', 'memo'].includes(tabParam)) {
      setActiveTabState(tabParam as any);
    }

    const token = searchParams.get('token');
    if (token) {
      const signIn = async () => {
        try {
          await signInWithCustomToken(auth, token);
          router.replace('/');
        } catch (error) {
          console.error('Firebase custom token login failed:', error);
          router.replace('/login?error=firebase_token_failed');
        }
      };
      signIn();
    }
  }, [searchParams, router]);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab as any);
    router.push(`/?tab=${tab}`, { scroll: false });
  };

  // Fetch User Schedule (Real-time)
  useEffect(() => {
    if (isLoggedIn && firebaseUser) {
      const unsub = onSnapshot(doc(db, 'schedules', firebaseUser.uid), (snapshot) => {
        if (snapshot.exists()) {
          setUserSchedule({ id: snapshot.id, ...snapshot.data() } as Schedule);
        } else {
          setUserSchedule(null);
        }
      }, (error) => {
        console.error("Error listening to user schedule:", error);
      });
      return () => unsub();
    } else {
      setUserSchedule(null);
    }
  }, [isLoggedIn, firebaseUser]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Header
        userSchedule={userSchedule}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-100 px-2 sm:px-6">
        <div className="max-w-[1200px] mx-auto flex justify-center gap-1 sm:gap-4 md:gap-12">
          {[
            { id: 'home', name: '홈', icon: <Home className="w-4 h-4" /> },
            { id: 'schedule', name: '팀일정표', icon: <CalendarIcon className="w-4 h-4" /> },
            { id: 'ai', name: '용카 AI 툴', icon: <Bot className="w-4 h-4" /> },
            { id: 'memo', name: '저장파일', icon: <ImageIcon className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3 sm:py-4 px-2 sm:px-4 border-b-2 transition-all font-bold text-xs sm:text-sm whitespace-nowrap min-w-0 flex-1 sm:flex-none ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
              {tab.icon}
              <span className="truncate text-center">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 flex flex-col">
        <div className="max-w-[1200px] mx-auto w-full animate-fade-in flex-1">
          {activeTab === 'home' && <HomeTab setActiveTab={setActiveTab} />}
          {activeTab === 'schedule' && <ScheduleTab userSchedule={userSchedule} />}
          {activeTab === 'ai' && (
            <AIToolsTab
              setIsRouteMapModalOpen={setIsRouteMapModalOpen}
              setIsRecruitModalOpen={setIsRecruitModalOpen}
              setIsSimpleImageModalOpen={setIsSimpleImageModalOpen}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'memo' && <StorageTab />}
        </div>
      </main>

      {/* Persistent Components & Modals */}
      <NoticeBoard />

      <RouteMapModal
        isOpen={isRouteMapModalOpen}
        onClose={() => setIsRouteMapModalOpen(false)}
      />

      <RecruitOrganizerModal
        isOpen={isRecruitModalOpen}
        onClose={() => setIsRecruitModalOpen(false)}
      />

      <SimpleImageModal
        isOpen={isSimpleImageModalOpen}
        onClose={() => setIsSimpleImageModalOpen(false)}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center">
            <img src="/logo512.png" className="w-10 h-10 opacity-20" alt="Loading..." />
          </div>
          <p className="text-gray-400 font-bold text-sm tracking-widest">Loading yongcar AI...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
