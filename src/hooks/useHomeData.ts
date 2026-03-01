'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { Favorite } from '@/types/home';

const DEFAULT_FAVORITES: Favorite[] = [];

export function useHomeData() {
    const { user, isLoggedIn } = useAuth();
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        if (!isLoggedIn || !user) {
            setFavorites([]);
            return;
        }

        const q = query(
            collection(db, 'userFavorites'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Favorite[];
            setFavorites(items);
        }, (error) => {
            console.error("Error fetching favorites:", error);
        });

        return () => unsubscribe();
    }, [isLoggedIn, user]);

    const addFavorite = async () => {
        if (!isLoggedIn || !user) {
            alert('즐겨찾기 추가를 위해 로그인이 필요합니다.');
            return;
        }

        const url = prompt('추가할 사이트 주소를 입력하세요 (http:// 포함):');
        if (!url) return;
        const name = prompt('사이트 이름을 입력하세요:');
        if (!name) return;

        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            let icon = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

            // Branded Icon Logic
            if (domain.includes('naver.com')) {
                icon = '/naver.png';
            } else if (domain.includes('kakao.com')) {
                icon = '/kakao.png';
            }

            await addDoc(collection(db, 'userFavorites'), {
                userId: user.uid,
                url,
                name,
                icon,
                createdAt: serverTimestamp()
            });
        } catch (e) {
            alert('올바른 URL 형식을 입력해주세요.');
        }
    };

    const removeFavorite = async (index: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const fav = favorites[index];
        if (!fav.id) {
            // This is a default favorite, we can just filter it locally or ignore
            // For now, let's say defaults cannot be deleted or just filter them
            setFavorites(prev => prev.filter((_, i) => i !== index));
            return;
        }

        try {
            await deleteDoc(doc(db, 'userFavorites', fav.id));
        } catch (error) {
            console.error("Error deleting favorite:", error);
            alert('즐겨찾기 삭제 중 오류가 발생했습니다.');
        }
    };

    return {
        favorites,
        isSearchFocused,
        setIsSearchFocused,
        addFavorite,
        removeFavorite
    };
}
