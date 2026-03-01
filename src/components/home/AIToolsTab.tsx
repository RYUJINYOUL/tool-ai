'use client';

import React from 'react';
import { Sparkles, Map, Upload, Download, FileCode, Trash2, ImagePlus, CalendarRange } from 'lucide-react';
import { useAITools } from '@/hooks/useAITools';
import { useAuth } from '@/context/auth-context';

interface AIToolsTabProps {
    setIsRouteMapModalOpen: (open: boolean) => void;
    setIsRecruitModalOpen: (open: boolean) => void;
    setIsSimpleImageModalOpen: (open: boolean) => void;
    setActiveTab: (tab: string) => void;
}

export default function AIToolsTab({
    setIsRouteMapModalOpen,
    setIsRecruitModalOpen,
    setIsSimpleImageModalOpen,
    setActiveTab
}: AIToolsTabProps) {
    const { isLoggedIn } = useAuth();
    const {
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
    } = useAITools();

    const checkAuthAndRun = (fn: () => void) => {
        if (!isLoggedIn) {
            alert('로그인이 필요한 서비스입니다.');
            return;
        }
        fn();
    };

    return (
        <div className="flex flex-col gap-10 max-w-[1000px] mx-auto pb-20">

            <div className="text-center pt-5">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    용카 AI 툴
                </h2>
            </div>
            {/* AI 서비스 그리드 */}
            <div>
                <h4 className="font-bold text-gray-700 flex items-center gap-2 mb-8">
                    <ImagePlus className="w-5 h-5 text-blue-500" />
                    웹 서비스 (.web)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Map className="w-5 h-5 text-orange-600" />
                            </div>
                            <h5 className="font-bold text-gray-800">라우트 지도 만들기 (Map)</h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">라우트가 어떻게 되요? 라는 질문 전 먼저 간단하게 만들어 공개 하세요. </p>
                        <button
                            onClick={() => checkAuthAndRun(() => setIsRouteMapModalOpen(true))}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                            사용하기
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-blue-600" />
                            </div>
                            <h5 className="font-bold text-gray-800">구인 공고 AI로 정리하기</h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">머리 아픈 구인공고 그만, AI가 정리하면 채용도 빠르고 정확합니다.</p>
                        <button
                            onClick={() => checkAuthAndRun(() => setIsRecruitModalOpen(true))}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                            사용하기
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <ImagePlus className="w-5 h-5 text-green-600" />
                            </div>
                            <h5 className="font-bold text-gray-800">심플한 이미지 만들기</h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">구인 정보 복사 입력 끝, 간단한 이미지 업로드로 구인광고 끝</p>
                        <button
                            onClick={() => checkAuthAndRun(() => setIsSimpleImageModalOpen(true))}
                            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                            사용하기
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <CalendarRange className="w-5 h-5 text-purple-600" />
                            </div>
                            <h5 className="font-bold text-gray-800">팀 공유일정표</h5>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">버튼 누르면 휴무, 엑셀 입력 정산 끝, 간단 공유 일정표웹</p>
                        <button
                            onClick={() => checkAuthAndRun(() => setActiveTab('schedule'))}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                            사용하기
                        </button>
                    </div>
                </div>
            </div>

            {/* EXE 다운로드 섹션 */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                        <Download className="w-5 h-5 text-blue-500" />
                        자동화 툴 (.exe)
                    </h4>
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            {selectedFile && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 max-w-[150px] truncate">
                                    {selectedFile.name}
                                </span>
                            )}
                            <label className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                {selectedFile ? '파일 변경' : '파일 선택'}
                                <input
                                    type="file"
                                    accept=".exe"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                            </label>
                        </div>
                    )}
                </div>

                {/* 관리자 업로드 폼 */}
                {isAdmin && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h5 className="font-medium text-blue-800 mb-3">파일 정보 입력</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                                type="text"
                                placeholder="프로그램 이름"
                                value={uploadForm.name}
                                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                                className="px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            <input
                                type="text"
                                placeholder="버전 (예: v1.0.0)"
                                value={uploadForm.version}
                                onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                                className="px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            <input
                                type="text"
                                placeholder="설명"
                                value={uploadForm.description}
                                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                                className="px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleRegister}
                                disabled={isUploading || !selectedFile}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isUploading || !selectedFile
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                                    }`}
                            >
                                {isUploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        업로드 중...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        프로그램 등록하기
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* EXE 파일 목록 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exeFiles.length === 0 ? (
                        <div className="col-span-full bg-white p-8 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 text-gray-400">
                            <FileCode className="w-12 h-12 opacity-30" />
                            <div className="text-center">
                                <span className="block text-sm font-bold">등록된 도구가 없습니다</span>
                                <span className="text-xs opacity-70">관리자가 도구를 등록하면 여기에 표시됩니다</span>
                            </div>
                        </div>
                    ) : (
                        exeFiles.map((exeFile) => (
                            <div key={exeFile.id} className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <FileCode className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-gray-800">{exeFile.name}</h5>
                                            <span className="text-xs text-gray-500">{exeFile.version}</span>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleDeleteExe(exeFile)}
                                            className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 mb-4">{exeFile.description}</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => checkAuthAndRun(() => {
                                            const link = document.createElement('a');
                                            link.href = exeFile.downloadUrl;
                                            link.download = exeFile.name;
                                            link.click();
                                        })}
                                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors text-center flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        다운로드
                                    </button>
                                </div>
                                <div className="mt-2 text-xs text-gray-400">
                                    업로드: {exeFile.uploadedAt.toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
