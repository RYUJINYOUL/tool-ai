'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { ImagePlus, Sparkles, CalendarRange, X, Map } from "lucide-react";
import RecruitOrganizerModal from '@/components/RecruitOrganizerModal';
import RouteMapModal from '@/components/RouteMapModal';
import SimpleImageModal from '@/components/SimpleImageModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { auth, db, storage } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Schedule, Member } from '@/types/schedule';
import {
  Search,
  MessageSquare,
  LogIn,
  User,
  Calendar as CalendarIcon,
  Bot,
  StickyNote,
  Plus,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCode,
  Briefcase,
  Car,
  Users,
  Home,
  Upload,
  Trash2,
  ExternalLink,
  LogOut
} from 'lucide-react';

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full mb-4"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>}>
      <HomePageContent />
    </Suspense>
  );
}

interface ExeFile {
  id: string;
  name: string;
  description: string;
  downloadUrl: string;
  uploadedAt: Date;
  version: string;
}

function HomePageContent() {
  const { user, isLoggedIn, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTabState] = useState<'home' | 'schedule' | 'ai' | 'memo'>('home');
  const [memo, setMemo] = useState('');
  const [userSchedule, setUserSchedule] = useState<Schedule | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [exeFiles, setExeFiles] = useState<ExeFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    version: ''
  });
  const [isRecruitModalOpen, setIsRecruitModalOpen] = useState(false);
  const [isRouteMapModalOpen, setIsRouteMapModalOpen] = useState(false);
  const [isSimpleImageModalOpen, setIsSimpleImageModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 관리자 UID
  const ADMIN_UID = 'cYjFpXKkvhe4vt4FU26XtMHwm1j2';
  const isAdmin = user?.uid === ADMIN_UID;
  const [favorites, setFavorites] = useState<{ url: string; name: string; icon: string }[]>([]);

  // Sync activeTab with URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['home', 'schedule', 'ai', 'memo'].includes(tabParam)) {
      setActiveTabState(tabParam as any);
    }

    // Handle Custom Token Login (Kakao Redirect)
    const token = searchParams.get('token');
    if (token) {
      const signIn = async () => {
        try {
          await signInWithCustomToken(auth, token);
          // Remove token from URL
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.delete('token');
          router.replace(`/${newParams.toString() ? '?' + newParams.toString() : ''}`, { scroll: false });
        } catch (error) {
          console.error('Custom token sign-in error:', error);
          alert('로그인 처리 중 오류가 발생했습니다.');
        }
      };
      signIn();
    }

    // EXE 파일 목록 로드
    loadExeFiles();
  }, [searchParams, router]);

  const loadExeFiles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'exeFiles'));
      const files = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate() || new Date()
      })) as ExeFile[];

      setExeFiles(files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()));
    } catch (error) {
      console.error('EXE 파일 로드 오류:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isAdmin) return;

    if (!file.name.endsWith('.exe')) {
      alert('EXE 파일만 업로드할 수 있습니다.');
      return;
    }

    if (!uploadForm.name.trim() || !uploadForm.description.trim() || !uploadForm.version.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    setIsUploading(true);
    try {
      // Firebase Storage에 파일 업로드
      const storageRef = ref(storage, `exe-files/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // Firestore에 파일 정보 저장
      await addDoc(collection(db, 'exeFiles'), {
        name: uploadForm.name,
        description: uploadForm.description,
        version: uploadForm.version,
        downloadUrl,
        uploadedAt: new Date(),
        fileName: file.name,
        fileSize: file.size
      });

      // 폼 초기화
      setUploadForm({ name: '', description: '', version: '' });
      event.target.value = '';

      // 목록 새로고침
      loadExeFiles();

      alert('파일이 성공적으로 업로드되었습니다.');
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteExe = async (exeFile: ExeFile) => {
    if (!isAdmin || !confirm(`${exeFile.name}을(를) 삭제하시겠습니까?`)) return;

    try {
      // Firestore에서 삭제
      await deleteDoc(doc(db, 'exeFiles', exeFile.id));

      // Storage에서 삭제 (URL에서 경로 추출)
      try {
        const storageRef = ref(storage, exeFile.downloadUrl);
        await deleteObject(storageRef);
      } catch (storageError) {
        console.warn('Storage 파일 삭제 실패:', storageError);
      }

      // 목록 새로고침
      loadExeFiles();

      alert('파일이 삭제되었습니다.');
    } catch (error) {
      console.error('파일 삭제 오류:', error);
      alert('파일 삭제에 실패했습니다.');
    }
  };

  const setActiveTab = (tab: 'home' | 'schedule' | 'ai' | 'memo') => {
    setActiveTabState(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  // Schedule Members & Day-offs
  const [members, setMembers] = useState<Member[]>([]);
  const [dayOffs, setDayOffs] = useState<Record<string, Set<string>>>({});
  const [dayOffDialog, setDayOffDialog] = useState<string | null>(null);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [memberListModal, setMemberListModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');

  const COMPANY_LOGOS: Record<string, string> = {
    'coupang': '/cou.png',
    'cj': '/cj.png',
    'lotte': '/lot.png',
    'logen': '/log.png',
    'etc': '/logo512.png'
  };

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Services for Home Tab
  const services = [
    { id: 'recruit', name: '구인정보', icon: <Briefcase className="w-6 h-6" />, color: 'bg-blue-500', link: '#' },
    { id: 'backup', name: '백업알바', icon: <Users className="w-6 h-6" />, color: 'bg-indigo-500', link: '#' },
    { id: 'call', name: '용차호출', icon: <Car className="w-6 h-6" />, color: 'bg-purple-500', link: '#' },
    { id: 'community', name: '커뮤니티', icon: <MessageSquare className="w-6 h-6" />, color: 'bg-pink-500', link: '#' },
    { id: 'schedule', name: '일정표', icon: <CalendarIcon className="w-6 h-6" />, color: 'bg-green-500', link: '/schedule' },
  ];

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

  // Load data
  useEffect(() => {
    const savedMemo = localStorage.getItem('yongcar_memo');
    if (savedMemo) setMemo(savedMemo);

    const savedFavs = localStorage.getItem('yongcar_favorites');
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs));
    } else {
      // Default favorites
      const defaults = [
        { url: 'https://naver.com', name: '네이버', icon: 'https://www.google.com/s2/favicons?sz=64&domain=naver.com' },
        { url: 'https://google.com', name: '구글', icon: 'https://www.google.com/s2/favicons?sz=64&domain=google.com' },
        { url: 'https://youtube.com', name: '유튜브', icon: 'https://www.google.com/s2/favicons?sz=64&domain=youtube.com' }
      ];
      setFavorites(defaults);
      localStorage.setItem('yongcar_favorites', JSON.stringify(defaults));
    }

    if (isLoggedIn && user) {
      const fetchSchedule = async () => {
        const docRef = doc(db, 'schedules', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const scheduleData = { id: docSnap.id, ...data } as Schedule;
          setUserSchedule(scheduleData);

          // Fetch members from field
          setMembers(data.members || []);

          // Parse day-offs from field (Record<string, string[]>)
          const rawDayOffs = data.dayOffs || {};
          const parsedDayOffs: Record<string, Set<string>> = {};
          for (const [date, members] of Object.entries(rawDayOffs)) {
            parsedDayOffs[date] = new Set(members as string[]);
          }
          setDayOffs(parsedDayOffs);
        }
      };
      fetchSchedule();
    }
  }, [isLoggedIn, user]);

  // Save memo to localStorage
  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMemo = e.target.value;
    setMemo(newMemo);
    localStorage.setItem('yongcar_memo', newMemo);
  };

  const handleAddFavorite = async () => {
    const url = window.prompt('추가할 사이트 주소를 입력하세요 (http:// 포함):');
    if (!url) return;

    try {
      // Validate URL first
      new URL(url);

      const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      const newFav = {
        url,
        name: data.title || 'SITE',
        icon: data.image
      };

      const updated = [...favorites, newFav];
      setFavorites(updated);
      localStorage.setItem('yongcar_favorites', JSON.stringify(updated));
    } catch (e) {
      alert('올바른 URL 형식이 아닙니다.');
    }
  };

  const handleRemoveFavorite = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('이 즐겨찾기를 삭제하시겠습니까?')) {
      const updated = favorites.filter((_, i) => i !== index);
      setFavorites(updated);
      localStorage.setItem('yongcar_favorites', JSON.stringify(updated));
    }
  };

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      await logout();
      router.push('/login');
    }
  };

  // Basic Calendar Logic
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const toggleDayOff = async (dateKey: string, memberName: string) => {
    if (!user || !userSchedule) return;

    const currentOffs = dayOffs[dateKey] ?? new Set();
    const newOffs = new Set(currentOffs);

    if (newOffs.has(memberName)) {
      newOffs.delete(memberName);
    } else {
      newOffs.add(memberName);
    }

    // Update local state
    const nextDayOffs = { ...dayOffs, [dateKey]: newOffs };
    setDayOffs(nextDayOffs);

    // Sync to Firestore (as a field)
    const serialized: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(nextDayOffs)) {
      serialized[k] = [...v];
    }
    await updateDoc(doc(db, 'schedules', user.uid), { dayOffs: serialized });
  };

  const addMember = async () => {
    if (!user || !userSchedule || !newMemberName.trim()) return;

    const newMember: Member = {
      name: newMemberName.trim(),
      phone: newMemberPhone.trim(),
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    };

    try {
      const updatedMembers = [...members, newMember];
      // Update local state
      setMembers(updatedMembers);
      setAddMemberModal(false);
      setNewMemberName('');
      setNewMemberPhone('');

      // Update Firestore field
      await updateDoc(doc(db, 'schedules', user.uid), { members: updatedMembers });
    } catch (e) {
      console.error('Error adding member:', e);
      alert('팀원 추가 중 오류가 발생했습니다.');
    }
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border-b border-r border-gray-100 bg-gray-50/30"></div>);
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const isToday = new Date().toDateString() === date.toDateString();
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOffCount = (dayOffs[dateKey]?.size) || 0;

      days.push(
        <div
          key={d}
          onClick={() => {
            if (userSchedule) {
              setDayOffDialog(dateKey);
            } else {
              // The user said: "달력 클릭 시 일정표 없을 경우 만들기 페이지로" 
              // but also "다이얼로그가 나오는데 닫기 버튼이 일정표 만들기 버튼으로"
              // I will show the modal as it allows "Quick Add", but the button will lead to create.
              setAddMemberModal(true);
            }
          }}
          className={`h-24 md:h-28 border-b border-r border-gray-100 p-2 relative hover:bg-blue-50 transition-all cursor-pointer overflow-hidden ${isToday ? 'bg-blue-50/50' : ''}`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-bold ${date.getDay() === 0 ? 'text-red-500' : date.getDay() === 6 ? 'text-blue-500' : 'text-gray-700'} ${isToday ? 'bg-blue-100 w-6 h-6 flex items-center justify-center rounded-full' : ''}`}>
              {d}
            </span>
          </div>
          {dayOffCount > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded font-bold">
                휴무 {dayOffCount}
              </span>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Header */}
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
                      setActiveTab('schedule');
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

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-100 px-6">
        <div className="max-w-[1200px] mx-auto flex justify-center gap-4 md:gap-12">
          {[
            { id: 'home', name: '홈', icon: <Home className="w-4 h-4" /> },
            { id: 'schedule', name: '팀일정표', icon: <CalendarIcon className="w-4 h-4" /> },
            { id: 'ai', name: '용카 AI 툴', icon: <Bot className="w-4 h-4" /> },
            { id: 'memo', name: '저장파일', icon: <StickyNote className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-4 border-b-2 transition-all font-bold text-sm whitespace-nowrap ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col">
        <div className="max-w-[1200px] mx-auto w-full animate-fade-in flex-1">

          {/* TAB 1: 홈 (기존 메인화면) */}
          {activeTab === 'home' && (
            <div className="flex flex-col items-center justify-center py-30">
              <div className="w-full max-w-[600px] text-center mb-12">
                <h2 className="text-2xl md:text-2xl font-bold mb-10 tracking-tight text-[#1a1a1a]">
                  용카 AI로 업무 시간을 50% 줄여 보세요.
                </h2>

                <div className="relative group mb-10">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                  <div className="relative flex items-center bg-white rounded-2xl p-2 shadow-xl border border-gray-100">
                    <div className="pl-5 text-indigo-500">
                      <Search className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="주요 업무를 선택 또는 입력 하세요"
                      className="w-full px-5 py-3 text-base outline-none text-gray-700 placeholder-gray-400 font-medium"
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    />
                    <button className="bg-indigo-600 text-white p-3.5 rounded-xl hover:bg-indigo-700 transition-all active:scale-95">
                      <Sparkles className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search Suggestions */}
                  {isSearchFocused && (
                    <div className="absolute top-full left-0 right-0 mt-3 animate-slide-up z-10">
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                        {[
                          { text: "구인 공고를 더 쉽게 올려 보시겠어요", tab: 'ai' },
                          { text: "팀원 근무일을 좀 더 편하게 관리하세요", tab: 'schedule' },
                          { text: "팀원들과 정산은 아주 가볍게 매일매일", tab: 'schedule' },
                          { text: "혹시 자동화 툴이 필요 하신가요?", tab: 'memo' }
                        ].map((item, i) => (
                          <div
                            key={i}
                            onClick={() => setActiveTab(item.tab as any)}
                            className="px-6 py-4 text-left text-sm font-semibold text-gray-600 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 flex items-center gap-3"
                          >
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            {item.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Favorites Section */}
                <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
                  {favorites.map((fav, i) => (
                    <a
                      key={i}
                      href={fav.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 group relative"
                    >
                      <div className="w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 group-hover:shadow-lg group-hover:scale-105 transition-all overflow-hidden p-3">
                        <img src={fav.icon} alt={fav.name} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-500 group-hover:text-gray-800 transition-colors uppercase tracking-wider">
                        {fav.name}
                      </span>
                      <button
                        onClick={(e) => handleRemoveFavorite(i, e)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] shadow-sm hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </a>
                  ))}
                  <button
                    onClick={handleAddFavorite}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="w-14 h-14 bg-gray-50 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:border-blue-300 group-hover:text-blue-500 transition-all">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 group-hover:text-blue-500 transition-colors uppercase tracking-wider">
                      추가
                    </span>
                  </button>
                </div>

                {/* Service Grid - Original Home Page style */}
              </div>
            </div>
          )}

          {/* TAB 2: 팀일정표 */}
          {activeTab === 'schedule' && (
            <div className="flex flex-col gap-6 max-w-[1000px] mx-auto">
              {/* Top Button: Visit or Create */}
              <div className="flex justify-center -mb-2">
                <button
                  onClick={() => userSchedule ? router.push(`/schedule/view/${userSchedule.shortId}`) : router.push('/schedule/create')}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all font-bold active:scale-95"
                >
                  {userSchedule ? (
                    <>
                      <LogIn className="w-5 h-5" />
                      일정표 방문
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      팀 일정표 만들기
                    </>
                  )}
                </button>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                  </h3>
                  <div className="flex items-center gap-2">
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
                    <div key={day} className={`py-3 text-center text-xs font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}`}>
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {renderCalendar()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => userSchedule ? router.push(`/schedule/view/${userSchedule.shortId}/settlement/all`) : router.push('/schedule/create')}
                  className="flex items-center justify-center gap-3 p-5 bg-sky-400 text-white rounded-2xl shadow-lg hover:bg-sky-500 transition-all font-bold group active:scale-95"
                >
                  <Calculator className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-lg">정산 입력</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (userSchedule) {
                      setMemberListModal(true);
                    } else {
                      setAddMemberModal(true);
                    }
                  }}
                  className="flex items-center justify-center gap-3 p-5 bg-sky-400 text-white rounded-2xl shadow-lg hover:bg-sky-500 transition-all font-bold group active:scale-95"
                >
                  <Users className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-lg">팀원 보기</p>
                  </div>
                </button>

                {/* Additional Buttons */}
                <button
                  onClick={() => userSchedule ? router.push(`/schedule/view/${userSchedule.shortId}?tab=notice`) : router.push('/schedule/create')}
                  className="flex items-center justify-center gap-3 p-5 bg-sky-400 text-white rounded-2xl shadow-lg hover:bg-sky-500 transition-all font-bold group active:scale-95"
                >
                  <StickyNote className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-lg">공지 사항</p>
                  </div>
                </button>
                <button
                  onClick={() => userSchedule ? router.push(`/schedule/view/${userSchedule.shortId}?tab=comm`) : router.push('/schedule/create')}
                  className="flex items-center justify-center gap-3 p-5 bg-sky-400 text-white rounded-2xl shadow-lg hover:bg-sky-500 transition-all font-bold group active:scale-95"
                >
                  <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-lg">오늘 소통</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: 용카 AI 툴 */}
          {activeTab === 'ai' && (
            <div className="flex flex-col gap-10 py-10 items-center">
              <div className="w-full max-w-[1200px]">
                <h2 className="text-3xl font-extrabold mb-10 tracking-tight text-[#1a1a1a] text-center">
                  용카 AI 툴
                </h2>

                {/* 웹 기능 섹션 */}
                <div className="mb-12">
                  <h4 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-green-500" />
                    웹 기능
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Map className="w-5 h-5 text-orange-600" />
                        </div>
                        <h5 className="font-bold text-gray-800">라우트 지도 만들기</h5>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">라우트가 어떻게 되요? 라는 질문 전 먼저 공개 하세요.</p>
                      <button
                        onClick={() => setIsRouteMapModalOpen(true)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                      >
                        사용하기
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-blue-600" />
                        </div>
                        <h5 className="font-bold text-gray-800">구인 공고 AI로 정리하기</h5>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">머리 아픈 구인공고 그만, AI가 정리하면 채용도 빠르고 정확합니다.</p>
                      <button
                        onClick={() => setIsRecruitModalOpen(true)}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                      >
                        사용하기
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <ImagePlus className="w-5 h-5 text-green-600" />
                        </div>
                        <h5 className="font-bold text-gray-800">심플한 이미지 만들기</h5>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">구인 정보 복사 입력 끝, 간단한 이미지 업로드로 구인광고 끝</p>
                      <button
                        onClick={() => setIsSimpleImageModalOpen(true)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                      >
                        사용하기
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <CalendarRange className="w-5 h-5 text-purple-600" />
                        </div>
                        <h5 className="font-bold text-gray-800">팀 공유일정표</h5>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">버튼 누르면 휴무, 엑셀 입력 정산 끝, 간단 공유 일정표웹</p>
                      <button
                        onClick={() => setActiveTab('schedule')}
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                      >
                        사용하기
                      </button>
                    </div>
                  </div>
                </div>

                {/* EXE 다운로드 섹션 */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                      <Download className="w-5 h-5 text-blue-500" />
                      다운로드 도구 (.exe)
                    </h4>
                    {isAdmin && (
                      <label className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        파일 업로드
                        <input
                          type="file"
                          accept=".exe"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </label>
                    )}
                  </div>

                  {/* 관리자 업로드 폼 */}
                  {isAdmin && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h5 className="font-medium text-blue-800 mb-3">파일 정보 입력</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="프로그램 이름"
                          value={uploadForm.name}
                          onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                          className="px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <input
                          type="text"
                          placeholder="버전 (예: v1.0.0)"
                          value={uploadForm.version}
                          onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                          className="px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <input
                          type="text"
                          placeholder="설명"
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                          className="px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      {isUploading && (
                        <div className="mt-3 flex items-center gap-2 text-blue-600">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm">업로드 중...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* EXE 파일 목록 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exeFiles.length === 0 ? (
                      <div className="col-span-full bg-white p-8 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 text-gray-400">
                        <FileCode className="w-12 h-12 opacity-30" />
                        <div className="text-center">
                          <span className="block text-sm font-bold">등록된 도구가 없습니다</span>
                          <span className="text-xs opacity-70">관리자가 도구를 등록하면 여기에 표시됩니다</span>
                        </div>
                      </div>
                    ) : (
                      exeFiles.map((exeFile) => (
                        <div key={exeFile.id} className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <FileCode className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <h5 className="font-bold text-gray-800">{exeFile.name}</h5>
                                <span className="text-xs text-gray-500">{exeFile.version}</span>
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteExe(exeFile)}
                                className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-4">{exeFile.description}</p>
                          <div className="flex gap-2">
                            <a
                              href={exeFile.downloadUrl}
                              download
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors text-center flex items-center justify-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              다운로드
                            </a>
                          </div>
                          <div className="mt-2 text-xs text-gray-400">
                            업로드: {exeFile.uploadedAt.toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 주요메모 */}
          {activeTab === 'memo' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex-1 flex flex-col min-h-[500px]">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-yellow-500" />
                저장 파일
              </h3>
              <textarea
                value={memo}
                onChange={handleMemoChange}
                placeholder="여기에 중요한 메모를 남겨주세요. 자동으로 저장됩니다..."
                className="flex-1 w-full p-6 text-lg border border-gray-100 rounded-2xl bg-gray-50/50 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-medium leading-relaxed"
              ></textarea>
              <div className="mt-4 flex items-center justify-between text-gray-400 text-sm font-medium">
                <p>마지막 저장: {new Date().toLocaleTimeString()}</p>
                <p>{memo.length} 자</p>
              </div>
            </div>
          )}

        </div>
        <RouteMapModal
          isOpen={isRouteMapModalOpen}
          onClose={() => setIsRouteMapModalOpen(false)}
        />
        <SimpleImageModal
          isOpen={isSimpleImageModalOpen}
          onClose={() => setIsSimpleImageModalOpen(false)}
        />
      </main>

      {/* Modals & Dialogs */}
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

            <div className="space-y-3 mb-8 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {members.map(m => {
                const off = (dayOffs[dayOffDialog] ?? new Set()).has(m.name);
                return (
                  <button
                    key={m.name}
                    onClick={() => toggleDayOff(dayOffDialog, m.name)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${off
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                      style={{ backgroundColor: m.color ?? '#42A5F5' }}
                    >
                      {m.name[0]}
                    </div>
                    <span className={`flex-1 text-left font-bold ${off ? 'text-blue-700' : 'text-gray-700'}`}>
                      {m.name}
                    </span>
                    {off && (
                      <div className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        휴무
                      </div>
                    )}
                  </button>
                );
              })}
              {members.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-sm font-bold">팀원을 먼저 추가해주세요.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (userSchedule) {
                  router.push(`/schedule/view/${userSchedule.shortId}`);
                }
                setDayOffDialog(null);
              }}
              className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-lg active:scale-95"
            >
              휴무 입력
            </button>
          </div>
        </div>
      )}

      {memberListModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setMemberListModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 flex flex-col shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-xl">우리 팀원</h3>
            </div>

            <div className="space-y-3 mb-8 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
              {members.map(m => (
                <div key={m.name} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/30">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
                    style={{ backgroundColor: m.color ?? '#42A5F5' }}
                  >
                    {m.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{m.name}</p>
                    {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm font-bold">등록된 팀원이 없습니다.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (userSchedule) {
                  router.push(`/schedule/view/${userSchedule.shortId}`);
                }
                setMemberListModal(false);
              }}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
            >
              상세 보기 (일정표)
            </button>
          </div>
        </div>
      )}

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
              {!userSchedule && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-sm text-black font-bold text-center leading-relaxed">
                    일정표를 먼저 만들고<br />팀원을 추가하세요.
                  </p>
                </div>
              )}

            </div>

            <div className="flex gap-3">
              {!userSchedule ? (
                <button
                  onClick={() => router.push('/schedule/create')}
                  className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                >
                  일정표 만들기
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setAddMemberModal(false)}
                    className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-all active:scale-95"
                  >
                    취소
                  </button>
                  <button
                    onClick={addMember}
                    className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                  >
                    저장
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <RecruitOrganizerModal
        isOpen={isRecruitModalOpen}
        onClose={() => setIsRecruitModalOpen(false)}
      />

      <footer className="w-full py-8 text-center text-gray-400 text-sm font-medium border-t border-gray-100 bg-white mt-auto">
        © 2026 용카. All rights reserved.
      </footer>
    </div>
  );
}
