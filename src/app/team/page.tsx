'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TeamPage() {
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const router = useRouter();

  const generateTeamCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    
    setIsCreating(true);
    try {
      const teamCode = generateTeamCode();
      
      // 팀 생성
      const teamRef = doc(db, 'teams', teamCode);
      await setDoc(teamRef, {
        name: teamName,
        description: description,
        createdAt: new Date(),
        members: [],
        code: teamCode
      });

      // 팀 코드 문서 생성
      const codeRef = doc(db, 'teamCodes', teamCode);
      await setDoc(codeRef, {
        code: teamCode,
        teamId: teamCode,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후 만료
      });

      router.push(`/schedule/${teamCode}`);
    } catch (error) {
      console.error('팀 생성 오류:', error);
      alert('팀 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return;
    
    setIsJoining(true);
    try {
      // 실제로는 팀 코드 유효성을 확인해야 합니다
      router.push(`/schedule/${joinCode.toUpperCase()}`);
    } catch (error) {
      console.error('팀 입장 오류:', error);
      alert('팀 입장에 실패했습니다. 코드를 확인해주세요.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">팀 관리</h1>
          <p className="text-gray-600">새 팀을 만들거나 기존 팀에 참여하세요</p>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            팀 만들기
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'join'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            팀 참여하기
          </button>
        </div>

        {/* 팀 만들기 탭 */}
        {activeTab === 'create' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                팀 이름 *
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="팀 이름을 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                팀 설명 (선택사항)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="팀에 대한 간단한 설명을 입력하세요"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
              />
            </div>

            <button
              onClick={handleCreateTeam}
              disabled={!teamName.trim() || isCreating}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  팀 생성 중...
                </>
              ) : (
                '팀 만들기'
              )}
            </button>
          </div>
        )}

        {/* 팀 참여하기 탭 */}
        {activeTab === 'join' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                팀 코드
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="팀 코드를 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-center text-lg font-mono tracking-wider"
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinTeam()}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">팀 코드란?</p>
                  <p className="text-sm text-blue-600 mt-1">
                    팀장이 생성한 6자리 코드입니다. 팀장에게 코드를 받아 입력하세요.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleJoinTeam}
              disabled={!joinCode.trim() || isJoining}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isJoining ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  팀 참여 중...
                </>
              ) : (
                '팀 참여하기'
              )}
            </button>
          </div>
        )}

        {/* 뒤로가기 버튼 */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            ← 메인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}