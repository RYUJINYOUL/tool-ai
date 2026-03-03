'use client';

import React, { useState } from 'react';
import { ImageIcon, Loader2, FileText, ExternalLink, Trash2, FileCode, X, Copy, DownloadCloud } from 'lucide-react';
import { useUserStorage } from '@/hooks/useUserStorage';
import { StorageItem } from '@/types/home';

export default function StorageTab() {
    const [newTextNote, setNewTextNote] = useState('');
    const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
    const {
        storageItems,
        isStorageLoading,
        isUploadingItem,
        uploadImage,
        saveText,
        deleteItem
    } = useUserStorage();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await uploadImage(file);
        } catch (error) {
            alert(`이미지 업로드에 실패했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
        }
    };

    const handleTextSave = async () => {
        if (!newTextNote.trim()) return;
        try {
            await saveText(newTextNote);
            setNewTextNote('');
        } catch (error) {
            alert(`글 저장에 실패했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
        }
    };

    const handleDelete = async (item: StorageItem) => {
        if (!confirm("정말 이 항목을 삭제하시겠습니까?")) return;
        try {
            await deleteItem(item);
        } catch (error) {
            alert(`삭제 작업에 실패했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
        }
    };

    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async (item: StorageItem) => {
        if (item.type !== 'image') return;

        setIsDownloading(true);
        try {
            const response = await fetch(item.content);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = item.fileName || 'image.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            alert('이미지 다운로드 중 오류가 발생했습니다.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex-1 flex flex-col min-h-[500px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                    저장 파일 및 메모
                </h3>
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-100 transition-all font-bold text-sm">
                        <ImageIcon className="w-4 h-4" />
                        이미지 업로드
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>

            {/* Input Area */}
            <div className="mb-10">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-5 group-focus-within:opacity-10 transition duration-500"></div>
                    <div className="relative flex flex-col md:flex-row gap-3 bg-white rounded-2xl p-2 border border-gray-100 shadow-sm focus-within:border-blue-300 transition-all">
                        <textarea
                            value={newTextNote}
                            onChange={(e) => setNewTextNote(e.target.value)}
                            placeholder="중요한 텍스트 정보를 이곳에 저장하세요..."
                            className="flex-1 px-4 py-3 outline-none text-gray-700 placeholder-gray-400 font-medium resize-none min-h-[80px]"
                        />
                        <button
                            onClick={handleTextSave}
                            disabled={isUploadingItem || !newTextNote.trim()}
                            className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale font-bold md:self-end mb-2 mr-2 flex items-center justify-center"
                        >
                            {isUploadingItem ? <Loader2 className="w-5 h-5 animate-spin" /> : '저장하기'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Storage Items List */}
            <div className="flex-1">
                {isStorageLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <Loader2 className="w-10 h-10 text-blue-200 animate-spin mb-4" />
                        <p className="text-gray-400 font-bold">데이터를 불러오는 중...</p>
                    </div>
                ) : storageItems.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {storageItems.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all flex flex-col cursor-pointer"
                            >
                                {item.type === 'image' ? (
                                    <div className="aspect-square bg-gray-50 relative overflow-hidden">
                                        <img
                                            src={item.content}
                                            alt={item.fileName}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white">
                                                <ExternalLink className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-square p-5 flex flex-col justify-between bg-white relative group-hover:bg-blue-50/30 transition-colors">
                                        <div className="flex items-start gap-2 mb-2">
                                            <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-gray-700 text-sm font-medium line-clamp-6 leading-relaxed">
                                                {item.content}
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Note</span>
                                    </div>
                                )}

                                {/* Bottom Actions */}
                                <div className="p-3 bg-white border-t border-gray-50 flex items-center justify-between mt-auto">
                                    <span className="text-[10px] text-gray-400 font-bold">
                                        {item.createdAt?.seconds
                                            ? new Date(item.createdAt.seconds * 1000).toLocaleDateString()
                                            : '방금 전'
                                        }
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(item);
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        title="삭제"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-gray-300">
                        <FileCode className="w-16 h-16 mb-4 opacity-10" />
                        <p className="font-black text-xl text-gray-400">저장된 파일이나 메모가 없습니다.</p>
                        <p className="text-sm font-medium mt-2">중요한 정보와 이미지를 이곳에 안전하게 보관하세요.</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedItem(null)}
                    ></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                {selectedItem.type === 'image' ? (
                                    <ImageIcon className="w-5 h-5 text-blue-500" />
                                ) : (
                                    <FileText className="w-5 h-5 text-blue-500" />
                                )}
                                <h4 className="font-bold text-gray-800 text-sm md:text-base">
                                    {selectedItem.type === 'image' ? (selectedItem.fileName || '이미지 상세') : '메모 상세'}
                                </h4>
                            </div>
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {selectedItem.type === 'image' ? (
                                <div className="flex flex-col items-center gap-4 text-center">
                                    <img
                                        src={selectedItem.content}
                                        alt={selectedItem.fileName}
                                        className="max-w-full h-auto rounded-xl shadow-lg border border-gray-100 mb-2"
                                    />
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 whitespace-pre-wrap text-gray-700 leading-relaxed font-medium text-sm">
                                    {selectedItem.content}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (selectedItem.type === 'text') {
                                            navigator.clipboard.writeText(selectedItem.content);
                                            alert('클립보드에 복사되었습니다.');
                                        } else {
                                            handleDownload(selectedItem);
                                        }
                                    }}
                                    disabled={isDownloading}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-bold transition-all active:scale-95"
                                >
                                    {selectedItem.type === 'text' ? (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            전체 복사
                                        </>
                                    ) : (
                                        <>
                                            {isDownloading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <DownloadCloud className="w-4 h-4" />
                                            )}
                                            이미지 다운로드
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        handleDelete(selectedItem);
                                        setSelectedItem(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 text-red-500 border border-red-100 rounded-xl text-sm font-bold transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    삭제
                                </button>
                            </div>
                            <span className="text-[10px] md:text-xs text-gray-400 font-bold tabular-nums">
                                {selectedItem.createdAt?.seconds
                                    ? new Date(selectedItem.createdAt.seconds * 1000).toLocaleString()
                                    : '방금 전'
                                }
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
