import { Metadata } from 'next';
import HomePageClient from '@/components/home/HomePageClient';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { searchParams }: Props
): Promise<Metadata> {
  const params = await searchParams;
  const tab = params.tab;
  const noticeTab = params.noticeTab;

  // Default SEO
  let title = "택배 구인 업무 자동화 용카";
  let description = "용카 AI를 활용한 택배 구인 공고 정리, 배송 구역 지도 제작, 홍보 이미지 생성 등 업무 자동화 서비스";
  let keywords = ["택배", "구인", "업무자동화", "용카", "AI", "배송지도", "구인공고"];

  // Specific SEO for NoticeBoard > 택배구인
  if (tab === 'NoticeBoard' && noticeTab === '택배구인') {
    title = "용카 택배일자리 - 실시간 택배 구인구직 정보";
    description = "용카에서 제공하는 실시간 택배 구인 정보를 확인하세요. 지역별 맞춤 검색과 AI 질문을 통해 최적의 일자리를 제안합니다.";
    keywords = ["택배구인", "택배일자리", "용카택배", "배송업무", "택배취업", "구인구직"];
  } else if (tab === 'NoticeBoard') {
    title = "용카 전체 공지 및 정보 - 용차호출 및 공지사항";
    description = "용카의 최신 공지사항과 용차 호출 정보를 한눈에 확인하세요.";
  }

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      images: ['/logo512.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/logo512.png'],
    },
    alternates: {
      canonical: tab === 'NoticeBoard' && noticeTab === '택배구인'
        ? 'https://yongcar.com/?tab=NoticeBoard&noticeTab=%ED%83%9D%EB%B0%B0%EA%B5%AC%EC%9D%B8'
        : 'https://yongcar.com/',
    }
  };
}

export default function HomePage() {
  return <HomePageClient />;
}
