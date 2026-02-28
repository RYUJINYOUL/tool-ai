# 팀 일정표 웹 애플리케이션

Flutter 앱을 Next.js로 이전한 팀 일정 관리 웹 애플리케이션입니다.

## 주요 기능

### 📱 3페이지 구성
1. **메인 페이지** - 로고와 팀 코드 입력창
2. **팀 관리 페이지** - 새 팀 만들기 / 기존 팀 참여하기
3. **일정표 페이지** - 팀 일정 보기, 추가, 삭제

### ✨ 기능
- 팀 코드를 통한 간편한 팀 참여
- 실시간 일정 공유 (Firebase Firestore)
- 반응형 디자인 (모바일/데스크톱 지원)
- 직관적인 UI/UX

## 🚀 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. Firebase 설정

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Firestore Database 활성화
3. 프로젝트 설정에서 웹 앱 추가
4. `.env.local` 파일에 Firebase 설정 정보 입력:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Firestore 보안 규칙 설정

Firebase 콘솔의 Firestore Database > 규칙에서 다음과 같이 설정:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 팀 문서 읽기/쓰기 허용
    match /teams/{teamId} {
      allow read, write: if true;
    }
    
    // 팀 코드 문서 읽기/쓰기 허용
    match /teamCodes/{codeId} {
      allow read, write: if true;
    }
    
    // 일정 문서 읽기/쓰기 허용
    match /schedules/{scheduleId} {
      allow read, write: if true;
    }
  }
}
```

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📱 사용 방법

### 새 팀 만들기
1. 메인 페이지에서 "새 팀 일정표 만들기" 클릭
2. 팀 이름과 설명 입력
3. "팀 만들기" 버튼 클릭
4. 생성된 팀 코드를 팀원들과 공유

### 기존 팀 참여하기
1. 메인 페이지에서 팀 코드 입력
2. "팀 일정표 입장하기" 클릭
3. 또는 팀 관리 페이지에서 "팀 참여하기" 탭 사용

### 일정 관리
- **일정 추가**: "일정 추가" 버튼으로 새 일정 생성
- **일정 삭제**: 각 일정 카드의 삭제 버튼 사용
- **실시간 동기화**: 팀원들의 일정 변경사항이 실시간으로 반영

## 🛠 기술 스택

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Deployment**: Vercel (권장)

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 메인 페이지
│   ├── team/
│   │   └── page.tsx          # 팀 관리 페이지
│   └── schedule/
│       └── [teamCode]/
│           └── page.tsx      # 일정표 페이지
├── lib/
│   └── firebase.ts           # Firebase 설정
└── types/
    └── schedule.ts           # TypeScript 타입 정의
```

## 🚀 배포

### Vercel 배포
1. [Vercel](https://vercel.com)에 프로젝트 연결
2. 환경 변수 설정 (Firebase 설정값들)
3. 자동 배포 완료

## Flutter에서 Next.js로 이전 시 고려사항

### ✅ 성공적으로 이전된 부분
- **UI/UX 구조**: Flutter의 위젯 구조를 React 컴포넌트로 변환
- **상태 관리**: Flutter의 setState를 React hooks로 대체
- **네비게이션**: Flutter의 Navigator를 Next.js Router로 변환
- **Firebase 연동**: Flutter Firebase 플러그인을 웹 SDK로 변환

### 🔄 변경된 부분
- **스타일링**: Flutter의 위젯 스타일을 Tailwind CSS로 변환
- **라우팅**: Flutter의 named routes를 Next.js 파일 기반 라우팅으로 변경
- **상태 관리**: Provider 패턴을 React Context/hooks로 대체

### 💡 개선 사항
- **반응형 디자인**: 웹 환경에 최적화된 반응형 레이아웃
- **SEO 최적화**: Next.js의 SSR/SSG 기능 활용 가능
- **성능**: 웹 최적화된 번들링과 코드 스플리팅

## 📝 라이선스

MIT License