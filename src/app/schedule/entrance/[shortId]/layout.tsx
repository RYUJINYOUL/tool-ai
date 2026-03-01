import { Metadata } from 'next';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COMPANY_LOGOS } from '@/lib/constants';

interface Props {
    params: { shortId: string };
    children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { shortId } = params;
    
    // shortId 유효성 검사
    if (!shortId || typeof shortId !== 'string') {
        return {
            title: '용카팀 일정표 입장',
            description: '용카팀에서 제공하는 스마트 일정 관리 서비스에 입장하세요.',
            icons: {
                icon: '/logo512.png',
                shortcut: '/logo512.png',
                apple: '/logo512.png',
            },
        };
    }
    
    try {
        // Firestore에서 일정표 데이터 가져오기
        const q = query(collection(db, 'schedules'), where('shortId', '==', shortId), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const scheduleData = querySnapshot.docs[0].data();
            const name = scheduleData.name || '일정표';
            const company = scheduleData.company || '';
            const logoUrl = company ? COMPANY_LOGOS[company] || '/logo512.png' : '/logo512.png';
            const absoluteLogoUrl = logoUrl.startsWith('http') ? logoUrl : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${logoUrl}`;
            
            return {
                metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
                title: `${name} - 용카팀 일정표 입장`,
                description: `${name} 팀의 일정표에 입장하세요. 용카팀에서 제공하는 스마트 일정 관리 서비스.`,
                icons: {
                    icon: absoluteLogoUrl,
                    shortcut: absoluteLogoUrl,
                    apple: absoluteLogoUrl,
                },
                openGraph: {
                    title: `${name} - 용카팀 일정표 입장`,
                    description: `${name} 팀의 일정표에 입장하세요. 용카팀에서 제공하는 스마트 일정 관리 서비스.`,
                    images: [absoluteLogoUrl],
                    type: 'website',
                },
                twitter: {
                    card: 'summary',
                    title: `${name} - 용카팀 일정표 입장`,
                    description: `${name} 팀의 일정표에 입장하세요. 용카팀에서 제공하는 스마트 일정 관리 서비스.`,
                    images: [absoluteLogoUrl],
                },
            };
        }
    } catch (error) {
        console.error('Error fetching schedule metadata:', error);
    }
    
    // 기본 메타데이터
    return {
        metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
        title: '용카팀 일정표 입장',
        description: '용카팀에서 제공하는 스마트 일정 관리 서비스에 입장하세요.',
        icons: {
            icon: '/logo512.png',
            shortcut: '/logo512.png',
            apple: '/logo512.png',
        },
        openGraph: {
            title: '용카팀 일정표 입장',
            description: '용카팀에서 제공하는 스마트 일정 관리 서비스에 입장하세요.',
            images: ['/logo512.png'],
            type: 'website',
        },
    };
}

export default function ScheduleEntranceLayout({ children }: Props) {
    return children;
}