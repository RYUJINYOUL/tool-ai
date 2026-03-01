'use client';

import { useState } from 'react';
import { X, Sparkles, Copy, Check, Loader2, Save } from 'lucide-react';
import { useUserStorage } from '@/hooks/useUserStorage';
import { useAuth } from '@/context/auth-context';

interface RecruitData {
    courier: string;
    delivery_address: string;
    terminal_address: string;
    delivery_ratio: string;
    income: string;
    sorting_helper: string;
    working_hours: string;
    agency: string;
    license: string;
    deadline: string;
    contact: string;
    description: string;
}

interface RecruitOrganizerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RecruitOrganizerModal({ isOpen, onClose }: RecruitOrganizerModalProps) {
    const [step, setStep] = useState<'input' | 'result'>('input');
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resultData, setResultData] = useState<RecruitData | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { saveText } = useUserStorage();
    const { isLoggedIn } = useAuth();

    if (!isOpen) return null;

    const handleAnalyze = async () => {
        if (!inputText.trim()) {
            alert('정리할 공고 내용을 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/recruit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: inputText }),
            });

            if (!response.ok) throw new Error('AI analysis failed');

            const data = await response.json();
            setResultData(data);
            setStep('result');
        } catch (error) {
            console.error(error);
            alert('AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!resultData) return;

        const text = `
□ 택배사명 : ${resultData.courier}
□ 배송지 주소 : ${resultData.delivery_address}
□ 터미널 주소 : ${resultData.terminal_address}
□ 배송 비율 : ${resultData.delivery_ratio}
□ 매출 / 수익 : ${resultData.income}
□ 분류도우미 : ${resultData.sorting_helper}
□ 근무시간 : ${resultData.working_hours}
□ 대리점명 : ${resultData.agency}
□ 화물운송자격증 : ${resultData.license}
□ 모집마감 : ${resultData.deadline}
□ 연락처 : ${resultData.contact}

□ 상세설명
${resultData.description}
    `.trim();

        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleSaveToStorage = async () => {
        if (!resultData || !isLoggedIn) return;

        setIsSaving(true);
        try {
            const text = `
[AI 정리 결과]
□ 택배사명 : ${resultData.courier}
□ 배송지 주소 : ${resultData.delivery_address}
□ 터미널 주소 : ${resultData.terminal_address}
□ 배송 비율 : ${resultData.delivery_ratio}
□ 매출 / 수익 : ${resultData.income}
□ 분류도우미 : ${resultData.sorting_helper}
□ 근무시간 : ${resultData.working_hours}
□ 대리점명 : ${resultData.agency}
□ 화물운송자격증 : ${resultData.license}
□ 모집마감 : ${resultData.deadline}
□ 연락처 : ${resultData.contact}

□ 상세설명
${resultData.description}
            `.trim();

            await saveText(text);
            alert('저장파일 탭에 메모로 저장되었습니다!');
        } catch (error) {
            console.error('Save error:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (field: keyof RecruitData, value: string) => {
        if (!resultData) return;
        setResultData({ ...resultData, [field]: value });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">구인 공고 AI 정리</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {step === 'input' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 font-medium">
                                구인 공고의 내용을 붙여넣으시면 AI가 항목별로 깔끔하게 정리해 드립니다.
                            </p>
                            <textarea
                                className="w-full h-80 p-5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none text-gray-700 font-medium"
                                placeholder="카톡이나 카페의 구인글을 여기에 붙여넣어주세요..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                            ></textarea>
                            <button
                                onClick={handleAnalyze}
                                disabled={isLoading}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>정리 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        <span>AI로 정리하기</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { field: 'courier', label: '택배사명', icon: '🚚' },
                                    { field: 'delivery_address', label: '배송지 주소', icon: '' },
                                    { field: 'terminal_address', label: '터미널 주소', icon: '🏢' },
                                    { field: 'delivery_ratio', label: '배송 비율', icon: '' },
                                    { field: 'income', label: '매출 / 수익', icon: '💰' },
                                    { field: 'sorting_helper', label: '분류도우미', icon: '' },
                                    { field: 'working_hours', label: '근무시간', icon: '🕒' },
                                    { field: 'agency', label: '대리점명', icon: '🏪' },
                                    { field: 'license', label: '화물운송자격증', icon: '📄' },
                                    { field: 'deadline', label: '모집마감', icon: '📅' },
                                    { field: 'contact', label: '연락처', icon: '📞' },
                                    { field: 'description', label: '상세설명', icon: '📝', isTextArea: true },
                                ].map((item) => (
                                    <div key={item.field} className="space-y-1.5 text-left">
                                        <label className="text-[12px] font-bold text-gray-400 ml-1 flex items-center gap-1.5">
                                            <span>{item.icon}</span>
                                            {item.label}
                                            {resultData && !resultData[item.field as keyof RecruitData] && (
                                                <span className="text-red-400 text-[10px] bg-red-50 px-1.5 py-0.5 rounded ml-1">입력 필요</span>
                                            )}
                                        </label>
                                        {item.isTextArea ? (
                                            <textarea
                                                value={resultData?.[item.field as keyof RecruitData] || ''}
                                                onChange={(e) => handleChange(item.field as keyof RecruitData, e.target.value)}
                                                className={`w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all font-medium text-gray-700 min-h-[100px] ${!resultData?.[item.field as keyof RecruitData]
                                                    ? 'border-red-100 bg-red-50/20 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                                                    : 'border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                                                    }`}
                                                placeholder={`${item.label} 정보를 입력해주세요`}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={resultData?.[item.field as keyof RecruitData] || ''}
                                                onChange={(e) => handleChange(item.field as keyof RecruitData, e.target.value)}
                                                className={`w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all font-medium text-gray-700 ${!resultData?.[item.field as keyof RecruitData]
                                                    ? 'border-red-100 bg-red-50/20 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                                                    : 'border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                                                    }`}
                                                placeholder={`${item.label} 정보를 입력해주세요`}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                                <button
                                    onClick={() => setStep('input')}
                                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold transition-all"
                                >
                                    다시 입력
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    {isCopied ? (
                                        <>
                                            <Check className="w-5 h-5 text-green-500" />
                                            <span>복사 완료!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-5 h-5" />
                                            <span>결과 복사</span>
                                        </>
                                    )}
                                </button>

                                {isLoggedIn && (
                                    <button
                                        onClick={handleSaveToStorage}
                                        disabled={isSaving}
                                        className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Save className="w-5 h-5" />
                                        )}
                                        <span>내 저장공간에 저장하기</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
