'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { Schedule, Member } from '@/types/schedule';

export function useScheduleData(userSchedule: Schedule | null) {
    const { user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [dayOffs, setDayOffs] = useState<Record<string, Set<string>>>({});
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (user && userSchedule) {
            const fetchScheduleDetails = async () => {
                const scheduleDoc = await getDoc(doc(db, 'schedules', user.uid));
                if (scheduleDoc.exists()) {
                    const data = scheduleDoc.data();
                    if (data.members) setMembers(data.members);
                    if (data.dayOffs) {
                        const parsedDayOffs: Record<string, Set<string>> = {};
                        for (const [date, members] of Object.entries(data.dayOffs)) {
                            parsedDayOffs[date] = new Set(members as string[]);
                        }
                        setDayOffs(parsedDayOffs);
                    }
                }
            };
            fetchScheduleDetails();
        }
    }, [user, userSchedule]);

    const toggleDayOff = async (dateKey: string, memberName: string) => {
        if (!user || !userSchedule) return;

        const currentOffs = dayOffs[dateKey] ?? new Set();
        const newOffs = new Set(currentOffs);

        if (newOffs.has(memberName)) {
            newOffs.delete(memberName);
        } else {
            newOffs.add(memberName);
        }

        const nextDayOffs = { ...dayOffs, [dateKey]: newOffs };
        setDayOffs(nextDayOffs);

        const serialized: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(nextDayOffs)) {
            serialized[k] = [...v];
        }
        await updateDoc(doc(db, 'schedules', user.uid), { dayOffs: serialized });
    };

    const addMember = async (name: string, phone: string) => {
        if (!user || !userSchedule || !name.trim()) return;

        const newMember: Member = {
            name: name.trim(),
            phone: phone.trim(),
            color: `hsl(${Math.random() * 360}, 70%, 60%)`
        };

        try {
            const updatedMembers = [...members, newMember];
            setMembers(updatedMembers);
            await updateDoc(doc(db, 'schedules', user.uid), { members: updatedMembers });
        } catch (e) {
            console.error('Error adding member:', e);
            throw e;
        }
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

    return {
        members,
        dayOffs,
        currentDate,
        setCurrentDate,
        toggleDayOff,
        addMember,
        prevMonth,
        nextMonth
    };
}
