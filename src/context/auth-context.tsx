'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types/user';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    isLoggedIn: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    loading: true,
    isLoggedIn: false,
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
            setFirebaseUser(fUser);

            if (fUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', fUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUser({
                            uid: fUser.uid,
                            email: fUser.email || '',
                            displayName: fUser.displayName || undefined,
                            photoURL: fUser.photoURL || undefined,
                            ...userData,
                        } as User);
                    } else {
                        setUser(null);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, firebaseUser, loading, isLoggedIn: !!firebaseUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
