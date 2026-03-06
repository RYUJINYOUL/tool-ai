'use client';

import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { useAuth } from '@/context/auth-context';
import { StorageItem } from '@/types/home';

export function useUserStorage() {
    const { firebaseUser } = useAuth();
    const [storageItems, setStorageItems] = useState<StorageItem[]>([]);
    const [isStorageLoading, setIsStorageLoading] = useState(false);
    const [isUploadingItem, setIsUploadingItem] = useState(false);

    useEffect(() => {
        if (!firebaseUser) {
            setStorageItems([]);
            return;
        }

        const q = query(
            collection(db, 'userStorage'),
            where('userId', '==', firebaseUser.uid),
            orderBy('createdAt', 'desc')
        );

        setIsStorageLoading(true);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as StorageItem[];
            setStorageItems(items);
            setIsStorageLoading(false);
        }, (error) => {
            console.error("Error fetching storage items:", error);
            setIsStorageLoading(false);
        });

        return () => unsubscribe();
    }, [firebaseUser]);

    const uploadImage = async (file: File) => {
        if (!firebaseUser) return;
        setIsUploadingItem(true);
        try {
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
            // 파일명 산세타이징 (한글 및 특수문자 제거)
            const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `userStorage/${firebaseUser.uid}/${timestamp}_${safeName}`;
            const storageRef = ref(storage, storagePath);

            // MIME 타입 명시 및 메타데이터 추가
            await uploadBytes(storageRef, fileToUpload, {
                contentType: 'image/webp'
            });

            const downloadURL = await getDownloadURL(storageRef);

            await addDoc(collection(db, 'userStorage'), {
                userId: firebaseUser.uid,
                type: 'image',
                content: downloadURL,
                storagePath: storagePath, // 삭제를 위해 경로 저장
                fileName: file.name, // 디스플레이용 이름은 원본 유지
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error uploading storage image:", error);
            throw error;
        } finally {
            setIsUploadingItem(false);
        }
    };

    const saveText = async (text: string) => {
        if (!firebaseUser || !text.trim()) return;
        setIsUploadingItem(true);
        try {
            await addDoc(collection(db, 'userStorage'), {
                userId: firebaseUser.uid,
                type: 'text',
                content: text,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error saving storage text:", error);
            throw error;
        } finally {
            setIsUploadingItem(false);
        }
    };

    const deleteItem = async (item: StorageItem & { storagePath?: string }) => {
        try {
            if (item.type === 'image') {
                try {
                    // 저장된 경로가 있으면 경로로 삭제, 없으면 URL에서 추론 시도
                    const fileRef = item.storagePath
                        ? ref(storage, item.storagePath)
                        : ref(storage, item.content);
                    await deleteObject(fileRef);
                } catch (e) {
                    console.warn("Could not delete image file from storage:", e);
                }
            }
            await deleteDoc(doc(db, 'userStorage', item.id));
        } catch (error) {
            console.error("Error deleting storage item:", error);
            throw error;
        }
    };

    return {
        storageItems,
        isStorageLoading,
        isUploadingItem,
        uploadImage,
        saveText,
        deleteItem
    };
}
