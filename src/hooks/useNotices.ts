'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { Notice } from '@/types/home';

export function useNotices() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [isNoticesLoading, setIsNoticesLoading] = useState(true);

    useEffect(() => {
        setIsNoticesLoading(true);
        // Optimize: Limit to recent 100 community posts to reduce Firestore read costs
        const q = query(
            collection(db, 'community'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedNotices: Notice[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                const categories = ['구인구직', '택배부업', '용차출동', '공지사항'];
                if (categories.includes(data.categoryName)) {
                    // Convert Timestamp to Date if it exists
                    const createdAt = data.createdAt instanceof Timestamp
                        ? data.createdAt.toDate()
                        : (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date());

                    fetchedNotices.push({
                        ...data,
                        id: doc.id,
                        createdAt: createdAt
                    } as any);
                }
            });

            fetchedNotices.sort((a, b) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                return dateB - dateA;
            });

            setNotices(fetchedNotices);
            setIsNoticesLoading(false);
        }, (err) => {
            console.error('Error fetching notices:', err);
            setIsNoticesLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { notices, isNoticesLoading };
}
