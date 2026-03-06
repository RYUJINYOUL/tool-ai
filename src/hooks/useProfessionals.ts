'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';

export interface Professional {
    id: string;
    username: string;
    TopCategories: string;
    SubCategories: string[];
    regionCodes: string[];
    userKey: string;
    createdDate: Date;
    resumeSettings: {
        isPublic: boolean;
        publicEndDate: Date;
    };
    gender?: string;
    birthDate?: string;
    userTitle?: string;
}

export function useProfessionals() {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Basic query for public and non-expired resumes
        const q = query(
            collection(db, 'professionals'),
            where('resumeSettings.isPublic', '==', true),
            where('resumeSettings.publicEndDate', '>=', Timestamp.fromDate(today))
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdDate: (data.createdDate as Timestamp)?.toDate?.() || new Date(),
                    resumeSettings: {
                        ...data.resumeSettings,
                        publicEndDate: (data.resumeSettings?.publicEndDate as Timestamp)?.toDate?.() || new Date()
                    }
                } as Professional;
            });

            // Client-side sorting by createdDate descending
            fetched.sort((a, b) => (b.createdDate?.getTime() || 0) - (a.createdDate?.getTime() || 0));

            setProfessionals(fetched);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching professionals:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { professionals, loading };
}
