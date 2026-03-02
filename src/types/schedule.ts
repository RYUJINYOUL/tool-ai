export interface Schedule {
  id: string; // userId와 동일
  name: string;
  company: 'coupang' | 'cj' | 'lotte' | 'logen' | 'hanjin' | 'etc';
  coverImagePath: string;
  password?: string; // 해시된 비밀번호
  shortId: string; // 공유용 짧은 ID
  createdAt: string;
  updatedAt?: string;
  gallery?: string[]; // 갤러리 이미지 URL 배열
  galleryStoragePaths?: string[]; // 갤러리 이미지 저장 경로 배열
}

export interface ScheduleMember {
  id: string;
  name: string;
  role: string;
  color: string; // 색상 코드
  createdAt: string;
}

export interface Member {
  name: string;
  phone?: string;
  color?: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  memberId?: string; // 담당자 ID
  type: 'work' | 'meeting' | 'vacation' | 'etc';
  createdAt: string;
}