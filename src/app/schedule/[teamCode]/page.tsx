'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TeamSchedule {
  id: string;
  teamId: string;
  title: string;
  description: string;
  date: string;
  time: string;
  createdAt?: any;
  updatedAt?: any;
}

export default function SchedulePage() {
  const params = useParams();
  const router = useRouter();
  const teamCode = params.teamCode as string;

  const [schedules, setSchedules] = useState<TeamSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    description: '',
    date: '',
    time: ''
  });

  useEffect(() => {
    loadSchedules();
  }, [teamCode]);

  const loadSchedules = async () => {
    try {
      const q = query(
        collection(db, 'schedules'),
        where('teamId', '==', teamCode),
        orderBy('date', 'asc'),
        orderBy('time', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const schedulesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamSchedule[];

      setSchedules(schedulesData);
    } catch (error) {
      console.error('일정 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.title.trim() || !newSchedule.date || !newSchedule.time) {
      alert('제목, 날짜, 시간은 필수 입력 항목입니다.');
      return;
    }

    try {
      await addDoc(collection(db, 'schedules'), {
        ...newSchedule,
        teamId: teamCode,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      setNewSchedule({ title: '', description: '', date: '', time: '' });
      setShowAddForm(false);
      loadSchedules();
    } catch (error) {
      console.error('일정 추가 오류:', error);
      alert('일정 추가에 실패했습니다.');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;

    try {
      await deleteDoc(doc(db, 'schedules', scheduleId));
      loadSchedules();
    } catch (error) {
      console.error('일정 삭제 오류:', error);
      alert('일정 삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">일정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">팀 일정표</h1>
              <p className="text-gray-600 mt-1">팀 코드: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{teamCode}</span></p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                일정 추가
              </button>
              <button
                onClick={() => router.push('/')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 일정 추가 폼 */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">새 일정 추가</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  일정 제목 *
                </label>
                <input
                  type="text"
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  placeholder="일정 제목을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  날짜 *
                </label>
                <input
                  type="date"
                  value={newSchedule.date}
                  onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시간 *
                </label>
                <input
                  type="time"
                  value={newSchedule.time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명 (선택사항)
                </label>
                <textarea
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                  placeholder="일정에 대한 추가 설명을 입력하세요"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddSchedule}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        )}

        {/* 일정 목록 */}
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">아직 등록된 일정이 없습니다</h3>
              <p className="text-gray-600 mb-4">첫 번째 일정을 추가해보세요!</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                일정 추가하기
              </button>
            </div>
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{schedule.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(schedule.date)}
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatTime(schedule.time)}
                      </div>
                    </div>
                    {schedule.description && (
                      <p className="text-gray-700 text-sm">{schedule.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="일정 삭제"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}