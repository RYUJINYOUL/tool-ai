'use client';

import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '@/context/auth-context';
import { ExeFile } from '@/types/home';
import { ADMIN_UID } from '@/lib/constants';

export function useAITools() {
    const { firebaseUser } = useAuth();
    const [exeFiles, setExeFiles] = useState<ExeFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({ name: '', version: '', description: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const isAdmin = firebaseUser?.uid === ADMIN_UID;

    useEffect(() => {
        const q = query(collection(db, 'exeFiles'), orderBy('uploadedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const files = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    description: data.description,
                    downloadUrl: data.downloadUrl,
                    version: data.version,
                    uploadedAt: data.uploadedAt?.toDate() || new Date(),
                    storagePath: data.storagePath // Store path for deletion
                };
            }) as ExeFile[];
            setExeFiles(files);
        }, (error) => {
            console.error('Error listening to exe files:', error);
        });

        return () => unsubscribe();
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            // Auto-fill name if empty
            if (!uploadForm.name) {
                setUploadForm(prev => ({ ...prev, name: file.name.replace('.exe', '') }));
            }
        }
    };

    const handleRegister = async () => {
        if (!selectedFile || !isAdmin) return;

        if (!uploadForm.name || !uploadForm.version) {
            alert('프로그램 이름과 버전을 입력해주세요.');
            return;
        }

        setIsUploading(true);
        try {
            const timestamp = Date.now();
            // 파일명 산세타이징 (한글 및 특수문자 제거)
            const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `exe-files/${timestamp}_${safeName}`;
            const storageRef = ref(storage, storagePath);

            // 파일 업로드 (가장 범용적인 MIME 타입 사용)
            await uploadBytes(storageRef, selectedFile, {
                contentType: 'application/octet-stream'
            });
            const downloadUrl = await getDownloadURL(storageRef);

            await addDoc(collection(db, 'exeFiles'), {
                name: uploadForm.name,
                version: uploadForm.version,
                description: uploadForm.description,
                downloadUrl,
                storagePath,
                uploadedAt: serverTimestamp(),
                fileName: selectedFile.name
            });

            setUploadForm({ name: '', version: '', description: '' });
            setSelectedFile(null);
            alert('등록이 완료되었습니다!');
        } catch (error) {
            console.error('Upload error:', error);
            alert('파일 업로드 중 오류가 발생했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteExe = async (exeFile: ExeFile & { storagePath?: string }) => {
        if (!isAdmin || !confirm('정말 이 파일을 삭제하시겠습니까?')) return;

        try {
            // Delete from Storage first if storagePath exists
            if (exeFile.storagePath) {
                try {
                    const storageRef = ref(storage, exeFile.storagePath);
                    await deleteObject(storageRef);
                } catch (e) {
                    console.warn("Could not delete file from storage:", e);
                }
            }

            await deleteDoc(doc(db, 'exeFiles', exeFile.id));
        } catch (error) {
            console.error('Delete error:', error);
            alert('파일 삭제 중 오류가 발생했습니다.');
        }
    };

    return {
        exeFiles,
        isUploading,
        uploadForm,
        setUploadForm,
        selectedFile,
        setSelectedFile,
        isAdmin,
        handleFileChange,
        handleRegister,
        handleDeleteExe
    };
}
