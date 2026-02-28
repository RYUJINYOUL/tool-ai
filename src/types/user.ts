export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  username: string;
  userKey: string;
  memberType?: 'personal' | 'enterprise';
  phone?: string;
  companyName?: string;
  businessNumber?: string;
  region?: string;
  subRegion?: string;
  address?: string;
  detailAddress?: string;
  fcmToken?: string;
  createdAt?: string;
  lastLoginAt?: string;
  batch?: number;
  badge?: number;
}
