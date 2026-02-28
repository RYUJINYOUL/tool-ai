'use client';

import { useState } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Member {
  id: string;
  name: string;
  phone?: string;
  color: string;
  createdAt: Date;
}

interface MemberManagerProps {
  teamCode: string;
  members: Member[];
  onMembersChange: (members: Member[]) => void;
  isAdmin: boolean;
}

const MEMBER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
];

export default function MemberManager({ teamCode, members, onMembersChange, isAdmin }: MemberManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    color: MEMBER_COLORS[0]
  });

  const handleAddMember = async () => {
    if (!formData.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    try {
      const newMember: Omit<Member, 'id'> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        color: formData.color,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'teams', teamCode, 'members'), newMember);
      const memberWithId = { ...newMember, id: docRef.id };
      
      onMembersChange([...members, memberWithId]);
      
      // 폼 초기화
      setFormData({
        name: '',
        phone: '',
        color: MEMBER_COLORS[(members.length + 1) % MEMBER_COLORS.length]
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('팀원 추가 오류:', error);
      alert('팀원 추가에 실패했습니다.');
    }
  };

  const handleEditMember = async () => {
    if (!editingMember || !formData.name.trim()) return;

    try {
      const updatedMember = {
        ...editingMember,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        color: formData.color
      };

      await updateDoc(doc(db, 'teams', teamCode, 'members', editingMember.id), {
        name: updatedMember.name,
        phone: updatedMember.phone,
        color: updatedMember.color
      });

      const updatedMembers = members.map(m => 
        m.id === editingMember.id ? updatedMember : m
      );
      onMembersChange(updatedMembers);
      
      setEditingMember(null);
      setFormData({ name: '', phone: '', color: MEMBER_COLORS[0] });
    } catch (error) {
      console.error('팀원 수정 오류:', error);
      alert('팀원 수정에 실패했습니다.');
    }
  };

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`${member.name} 팀원을 삭제하시겠습니까?`)) return;

    try {
      await deleteDoc(doc(db, 'teams', teamCode, 'members', member.id));
      onMembersChange(members.filter(m => m.id !== member.id));
    } catch (error) {
      console.error('팀원 삭제 오류:', error);
      alert('팀원 삭제에 실패했습니다.');
    }
  };

  const startEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      phone: member.phone || '',
      color: member.color
    });
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingMember(null);
    setFormData({ name: '', phone: '', color: MEMBER_COLORS[0] });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">팀원 관리</h3>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
            {members.length}명
          </span>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            팀원 추가
          </button>
        )}
      </div>

      {/* 팀원 추가/수정 폼 */}
      {showAddForm && isAdmin && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900">
            {editingMember ? '팀원 수정' : '새 팀원 추가'}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="팀원 이름"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                전화번호
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="010-0000-0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              색상 선택
            </label>
            <div className="flex space-x-2">
              {MEMBER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={editingMember ? handleEditMember : handleAddMember}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              {editingMember ? '수정' : '추가'}
            </button>
            <button
              onClick={cancelEdit}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 팀원 목록 */}
      <div className="space-y-3">
        {members.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>등록된 팀원이 없습니다.</p>
            {isAdmin && (
              <p className="text-sm mt-2">위의 "팀원 추가" 버튼을 클릭해서 팀원을 추가해보세요.</p>
            )}
          </div>
        ) : (
          members.map((member) => (
            <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{member.name}</h4>
                  {member.phone && (
                    <p className="text-sm text-gray-500 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {member.phone}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {member.phone && (
                  <a
                    href={`tel:${member.phone}`}
                    className="text-green-600 hover:text-green-700 p-2 rounded-md hover:bg-green-50 transition-colors"
                    title="전화걸기"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </a>
                )}
                
                {isAdmin && (
                  <>
                    <button
                      onClick={() => startEdit(member)}
                      className="text-blue-600 hover:text-blue-700 p-2 rounded-md hover:bg-blue-50 transition-colors"
                      title="수정"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member)}
                      className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors"
                      title="삭제"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}