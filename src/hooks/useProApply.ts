'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';

export interface ProApplyPost {
    id: string;
    title: string;
    content: string;
    author: string;
    authorId: string;
    createdAt: Date;
    images?: string[];
    link?: string;
    category?: string;
    company?: string;
    deliverAddress?: string;
    address?: string;
    monthlyIncome?: string;
    workTime?: string;
    totalVolume?: string;
    holiday?: string;
    license?: string;
    ratio?: string;
    dropOff?: string;
    terminalAddress?: string;
    phoneNumber?: string;
}

export function useProApply(enabled = true) {
    const [posts, setPosts] = useState<ProApplyPost[]>([]);
    const [loading, setLoading] = useState(enabled);

    useEffect(() => {
        if (!enabled) return;

        setLoading(true);
        // Optimize: Limit to recent 300 posts to improve search results while controlling costs
        const q = query(
            collection(db, 'proApply'),
            orderBy('createdDate', 'desc'),
            limit(300)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => {
                const data = doc.data();
                // Normalize date: Check multiple fields
                const rawDate = data.createdDate || data.pushTime || data.uploadedAt || data.createdAt;
                const createdAt = rawDate instanceof Timestamp
                    ? rawDate.toDate()
                    : (rawDate?.seconds ? new Date(rawDate.seconds * 1000) : new Date());

                return {
                    id: doc.id,
                    ...data,
                    createdAt: createdAt
                } as ProApplyPost;
            });

            // Client-side sorting for robustness
            fetchedPosts.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

            setPosts(fetchedPosts);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching proApply posts:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [enabled]);

    return { posts, loading };
}
