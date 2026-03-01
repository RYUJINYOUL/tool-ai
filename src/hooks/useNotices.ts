'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Notice } from '@/types/home';

export function useNotices() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [isNoticesLoading, setIsNoticesLoading] = useState(false);

    useEffect(() => {
        const fetchNotices = async () => {
            setIsNoticesLoading(true);
            try {
                const q = collection(db, 'community');
                const querySnapshot = await getDocs(q);
                const fetchedNotices: Notice[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.categoryName === '공지사항') {
                        fetchedNotices.push({ id: doc.id, ...data } as Notice);
                    }
                });

                fetchedNotices.sort((a, b) => {
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                });
                setNotices(fetchedNotices);
            } catch (err) {
                console.error('Error fetching notices:', err);
            } finally {
                setIsNoticesLoading(false);
            }
        };

        fetchNotices();
    }, []);

    return { notices, isNoticesLoading };
}
