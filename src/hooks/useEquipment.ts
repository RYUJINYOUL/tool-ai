'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';

export interface Equipment {
    id: string;
    SubCategories?: string[];
    TopCategories?: string;
    address?: string;
    badge?: number;
    confirmed?: boolean;
    createdDate?: any;
    equipment_businessLicense?: string;
    equipment_career?: string;
    equipment_name?: string;
    equipment_phoneNumber?: string;
    equipment_rentalRates?: string;
    expirationDate?: any;
    favorites?: string[];
    imageDownloadUrls?: string[];
    isNotice?: boolean;
    notice?: boolean;
    region?: string;
    subRegion?: string;
    createdAt?: Date; // Normalized field
}

export function useEquipment() {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = collection(db, 'equipment');

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEquipment = snapshot.docs.map(doc => {
                const data = doc.data();

                // Normalize date to standard JS Date using createdDate or pushTime or createdAt
                const rawDate = data.createdDate || data.pushTime || data.createdAt;
                const createdAt = rawDate instanceof Timestamp
                    ? rawDate.toDate()
                    : (rawDate?.seconds ? new Date(rawDate.seconds * 1000) : new Date());

                return {
                    id: doc.id,
                    ...data,
                    createdAt: createdAt
                } as Equipment;
            });

            // Client-side sorting
            fetchedEquipment.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

            setEquipment(fetchedEquipment);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching equipment:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { equipment, loading };
}
