'use client';

import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    where,
    Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { useAuth } from '@/context/auth-context';
import { ADMIN_UID } from '@/lib/constants';

export interface BoardPost {
    id: string;
    type: 'intro' | 'suggestion';
    title: string;
    content: string;
    images?: string[];
    link?: string;
    author: string;
    authorId: string;
    createdAt: Date;
}

export interface BoardReply {
    id: string;
    content: string;
    author: string;
    authorId: string;
    createdAt: Date;
}

export interface BoardApplication {
    id: string;
    content: string;
    images?: string[];
    author: string;
    authorId: string;
    createdAt: Date;
}

export function useAIBoard(type: 'intro' | 'suggestion') {
    const { firebaseUser, user } = useAuth();
    const [posts, setPosts] = useState<BoardPost[]>([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = firebaseUser?.uid === ADMIN_UID;

    useEffect(() => {
        setLoading(true);
        const q = query(
            collection(db, 'aiBoard'),
            where('type', '==', type ? type : 'intro'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: (doc.data().createdAt as Timestamp)?.toDate?.() || new Date()
            })) as BoardPost[];
            setPosts(fetchedPosts);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching board posts:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [type]);

    const addPost = async (title: string, content: string, imageFiles: File[] = [], link: string = '') => {
        if (!firebaseUser) throw new Error('로그인이 필요합니다.');
        if (type === 'intro' && !isAdmin) throw new Error('관리자만 작성 가능합니다.');

        // Upload images if any
        const imageUrls: string[] = [];
        for (const file of imageFiles) {
            let fileToUpload = file;
            try {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    fileType: 'image/webp'
                };
                const compressedFile = await imageCompression(file, options);
                // 원본 파일 이름 유지하되 확장자만 webp로 변경한 새로운 File 객체 생성
                fileToUpload = new File([compressedFile], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                    type: 'image/webp',
                    lastModified: Date.now(),
                });
            } catch (error) {
                console.warn("Image compression failed, uploading original:", error);
            }

            const timestamp = Date.now();
            const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `ai-board/${type}/${timestamp}_${safeName}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, fileToUpload, {
                contentType: 'image/webp'
            });
            const url = await getDownloadURL(storageRef);
            imageUrls.push(url);
        }

        const author = user?.username || firebaseUser.email || '익명';
        await addDoc(collection(db, 'aiBoard'), {
            type,
            title,
            content,
            images: imageUrls,
            link: link.trim() || null,
            author,
            authorId: firebaseUser.uid,
            createdAt: serverTimestamp()
        });
    };

    const updatePost = async (postId: string, title: string, content: string, imageFiles: File[] = [], existingImages: string[] = [], link: string = '') => {
        if (!firebaseUser) throw new Error('로그인이 필요합니다.');

        // Check permission: post owner or admin
        const postRef = doc(db, 'aiBoard', postId);

        // Upload NEW images if any
        const newImageUrls: string[] = [...existingImages];
        for (const file of imageFiles) {
            let fileToUpload = file;
            try {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    fileType: 'image/webp'
                };
                const compressedFile = await imageCompression(file, options);
                fileToUpload = new File([compressedFile], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                    type: 'image/webp',
                    lastModified: Date.now(),
                });
            } catch (error) {
                console.warn("Image compression failed, uploading original:", error);
            }

            const timestamp = Date.now();
            const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `ai-board/${type}/${timestamp}_${safeName}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, fileToUpload, {
                contentType: 'image/webp'
            });
            const url = await getDownloadURL(storageRef);
            newImageUrls.push(url);
        }

        await updateDoc(postRef, {
            title,
            content,
            images: newImageUrls,
            link: link.trim() || null,
            updatedAt: serverTimestamp()
        });
    };

    const deletePost = async (postId: string) => {
        if (!firebaseUser) throw new Error('로그인이 필요합니다.');
        await deleteDoc(doc(db, 'aiBoard', postId));
    };

    const addReply = async (postId: string, content: string) => {
        if (!firebaseUser) throw new Error('로그인이 필요합니다.');
        const author = user?.username || firebaseUser.email || '익명';
        await addDoc(collection(db, 'aiBoard', postId, 'replies'), {
            content,
            author,
            authorId: firebaseUser.uid,
            createdAt: serverTimestamp()
        });
    };

    const updateReply = async (postId: string, replyId: string, content: string) => {
        if (!firebaseUser) throw new Error('로그인이 필요합니다.');
        await updateDoc(doc(db, 'aiBoard', postId, 'replies', replyId), {
            content,
            updatedAt: serverTimestamp()
        });
    };

    const deleteReply = async (postId: string, replyId: string) => {
        if (!firebaseUser) throw new Error('로그인이 필요합니다.');
        await deleteDoc(doc(db, 'aiBoard', postId, 'replies', replyId));
    };

    // ── EXE Application CRUD ───────────────────────────────────────────────
    const addApplication = async (postId: string, content: string, imageFiles: File[] = []) => {
        if (!firebaseUser) throw new Error('로그인이 필요합니다.');

        const imageUrls: string[] = [];
        for (const file of imageFiles) {
            let fileToUpload = file;
            try {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    fileType: 'image/webp'
                };
                const compressedFile = await imageCompression(file, options);
                fileToUpload = new File([compressedFile], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                    type: 'image/webp',
                    lastModified: Date.now(),
                });
            } catch (error) {
                console.warn("Image compression failed, uploading original:", error);
            }

            const timestamp = Date.now();
            const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `ai-board/suggestion/${postId}_${timestamp}_${safeName}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, fileToUpload, {
                contentType: 'image/webp'
            });
            const url = await getDownloadURL(storageRef);
            imageUrls.push(url);
        }

        const author = user?.username || firebaseUser.email || '익명';
        await addDoc(collection(db, 'aiBoard', postId, 'applications'), {
            content,
            images: imageUrls,
            author,
            authorId: firebaseUser.uid,
            createdAt: serverTimestamp()
        });
    };

    const updateApplication = async (postId: string, applicationId: string, content: string, imageFiles: File[] = [], existingImages: string[] = []) => {
        if (!firebaseUser) throw new Error('로그인이 필요합니다.');
        const appRef = doc(db, 'aiBoard', postId, 'applications', applicationId);

        const newUrls = [...existingImages];
        for (const file of imageFiles) {
            let fileToUpload = file;
            try {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                    fileType: 'image/webp'
                };
                const compressedFile = await imageCompression(file, options);
                fileToUpload = new File([compressedFile], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                    type: 'image/webp',
                    lastModified: Date.now(),
                });
            } catch (error) {
                console.warn("Image compression failed, uploading original:", error);
            }

            const timestamp = Date.now();
            const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `ai-board/suggestion/${postId}_${timestamp}_${safeName}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, fileToUpload, {
                contentType: 'image/webp'
            });
            const url = await getDownloadURL(storageRef);
            newUrls.push(url);
        }

        await updateDoc(appRef, {
            content,
            images: newUrls,
            updatedAt: serverTimestamp()
        });
    };

    const deleteApplication = async (postId: string, applicationId: string) => {
        if (!firebaseUser) throw new Error('로그인이 필요합니다.');
        await deleteDoc(doc(db, 'aiBoard', postId, 'applications', applicationId));
    };

    return {
        posts,
        loading,
        isAdmin,
        addPost,
        updatePost,
        deletePost,
        addReply,
        updateReply,
        deleteReply,
        addApplication,
        updateApplication,
        deleteApplication
    };
}

export function useBoardReplies(postId: string) {
    const [replies, setReplies] = useState<BoardReply[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!postId) return;
        setLoading(true);
        const q = query(
            collection(db, 'aiBoard', postId, 'replies'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedReplies = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: (doc.data().createdAt as Timestamp)?.toDate?.() || new Date()
            })) as BoardReply[];
            setReplies(fetchedReplies);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching replies:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [postId]);

    return { replies, loading };
}
export function useBoardApplications(postId: string) {
    const [applications, setApplications] = useState<BoardApplication[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!postId) return;
        setLoading(true);
        const q = query(
            collection(db, 'aiBoard', postId, 'applications'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedApps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: (doc.data().createdAt as Timestamp)?.toDate?.() || new Date()
            })) as BoardApplication[];
            setApplications(fetchedApps);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching applications:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [postId]);

    return { applications, loading };
}
