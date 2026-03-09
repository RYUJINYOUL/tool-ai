'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Loader2, Save, Truck, MapPin, Clock, Phone, Briefcase, CreditCard, Box, Calendar, PieChart, Camera, Plus, Trash2, Image as ImageIcon, FileText, ChevronRight, Check } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/auth-context';
import { useUserStorage } from '@/hooks/useUserStorage';

interface JobPostingData {
    title: string;
    company: string;
    category: string;
    jobField: '주간' | '야간' | '백업';
    monthlyIncome: string;
    workTime: string;
    holiday: string;
    license: string;
    deliverAddress: string;
    terminalAddress: string;
    phoneNumber: string;
    description: string;
    hasClassificationHelper: boolean;
    classificationHelperStatus: '있음' | '업체문의';
    deliveryRatio: {
        apt: string;
        land: string;
        oneroom: string;
    };
    imageUrls: string[];
}

interface JobPostingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const categories = [
    '쿠팡주간', '쿠팡야간', '씨제이', '씨제이오네', '롯데택배', '한진택배',
    '로젠택배', '경동택배', '일양택배', '대신택배', '마켓컬리', '알리테무',
    '기타택배', '생수배송', '기타'
];

// Geohash encoder (precision 6)
function encodeGeohash(lat: number, lng: number, precision = 6): string {
    const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
    let geohash = '';
    let isEven = true;
    let bit = 0;
    let ch = 0;
    while (geohash.length < precision) {
        if (isEven) {
            const mid = (minLng + maxLng) / 2;
            if (lng > mid) { ch |= (1 << (4 - bit)); minLng = mid; } else { maxLng = mid; }
        } else {
            const mid = (minLat + maxLat) / 2;
            if (lat > mid) { ch |= (1 << (4 - bit)); minLat = mid; } else { maxLat = mid; }
        }
        isEven = !isEven;
        if (bit < 4) { bit++; } else { geohash += BASE32[ch]; bit = 0; ch = 0; }
    }
    return geohash;
}

// Map courier text to category
function categorizeFromCourier(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('쿠팡')) return '쿠팡주간';
    if (t.includes('오네') || t.includes('one') || t.includes('cjone')) return '씨제이오네';
    if (t.includes('cj') || t.includes('대한통운') || t.includes('씨제이')) return '씨제이';
    if (t.includes('롯데')) return '롯데택배';
    if (t.includes('한진')) return '한진택배';
    if (t.includes('로젠')) return '로젠택배';
    if (t.includes('경동')) return '경동택배';
    if (t.includes('일양')) return '일양택배';
    if (t.includes('대신')) return '대신택배';
    if (t.includes('마켓컬리')) return '마켓컬리';
    if (t.includes('알리') || t.includes('테무')) return '알리테무';
    if (t.includes('생수')) return '생수배송';
    return '';
}

// Extract numeric income from Korean string (e.g. "월 400~500만" → 450, "월 500만원" → 500)
function extractIncomeNumber(income: string): number {
    if (!income) return 0;
    const rangeMatch = income.match(/(\d+)[~\-~](\d+)/);
    if (rangeMatch) {
        return Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);
    }
    const single = income.match(/(\d+)/);
    return single ? parseInt(single[1]) : 0;
}

// Extract province/city from Korean address
function extractRegion(address: string): string {
    if (!address) return '';
    const provinces = ['서울특별시', '서울', '부산광역시', '부산', '대구광역시', '대구',
        '인천광역시', '인천', '광주광역시', '광주', '대전광역시', '대전', '울산광역시', '울산',
        '세종특별자치시', '세종', '경기도', '경기', '강원특별자치도', '강원', '충청북도', '충북',
        '충청남도', '충남', '전라북도', '전북', '전라남도', '전남', '경상북도', '경북',
        '경상남도', '경남', '제주특별자치도', '제주'];
    for (const p of provinces) {
        if (address.includes(p)) return p.replace('도', '').replace('특별시', '').replace('광역시', '').replace('특별자치시', '').replace('특별자치도', '') + (p.endsWith('도') ? '도' : p.endsWith('시') ? '특별시' : '');
    }
    if (address.includes('경기')) return '경기도';
    if (address.includes('서울')) return '서울특별시';
    return address.split(' ')[0] || '';
}

// Extract district from Korean address
function extractSubRegion(address: string): string {
    if (!address) return '';
    const parts = address.split(/\s+/);
    const suffixes = ['구', '군', '시', '동', '읍', '면'];
    for (const part of parts) {
        if (part.length > 2 && suffixes.some(s => part.endsWith(s))) {
            return part;
        }
    }
    return parts[1] || '';
}

export default function JobPostingModal({ isOpen, onClose }: JobPostingModalProps) {
    const { firebaseUser, isLoggedIn } = useAuth();
    const { storageItems } = useUserStorage();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [isStoragePickerOpen, setIsStoragePickerOpen] = useState(false);
    const [storagePickerMode, setStoragePickerMode] = useState<'text' | 'image'>('text');
    const [uploadingImages, setUploadingImages] = useState<boolean[]>([]);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [geoPreview, setGeoPreview] = useState<{ geohash: string; lat: number; lng: number } | null>(null);

    const [formData, setFormData] = useState<JobPostingData>({
        title: '',
        company: '',
        category: '택배구인',
        jobField: '주간',
        monthlyIncome: '',
        workTime: '',
        holiday: '',
        license: '필요',
        deliverAddress: '',
        terminalAddress: '',
        phoneNumber: '',
        description: '',
        hasClassificationHelper: false,
        classificationHelperStatus: '업체문의',
        deliveryRatio: {
            apt: '',
            land: '',
            oneroom: ''
        },
        imageUrls: []
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleChange = (field: keyof JobPostingData, value: any) => {
        const newData = { ...formData, [field]: value };

        // Auto-category based on company name
        if (field === 'company') {
            const val = (value as string).toLowerCase();
            const matched = categorizeFromCourier(value as string);
            if (matched) {
                newData.category = matched;
            }
        }

        // Auto-generate title: [Category] Address
        if (field === 'category' || field === 'deliverAddress') {
            const category = field === 'category' ? value : formData.category;
            const address = field === 'deliverAddress' ? value : formData.deliverAddress;
            if (category && address) {
                newData.title = `[${category}] ${address}`;
            }
        }

        setFormData(newData);
    };

    const handleAiFill = async () => {
        const text = aiInput;
        if (!text.trim()) {
            alert('정리할 내용을 입력해주세요.');
            return;
        }

        setIsAiLoading(true);

        // 로컬 파싱 로직 (AI 없이 텍스트에서 정보 추출)
        setTimeout(() => {
            const extracted = {
                agency: text.match(/대리점[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                courier: text.match(/택배사[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                delivery_address: text.match(/(?:배송지|주소)[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                terminal_address: text.match(/터미널[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                income: text.match(/(?:수익|매출|급여)[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                working_hours: text.match(/시간[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                contact: text.match(/(?:연락처|번호)[:\s]*([^\n]+)/)?.[1]?.trim() || '',
                description: text.replace(/\[구인등록 완료\].*|대리점:.*|연락처:.*|등록일:.*|링크:.*/g, '').trim(),
                license: text.includes('자격증'),
                sorting_helper: text.includes('분류')
            };

            setFormData(prev => {
                const courierText = extracted.courier || extracted.agency || '';
                const newCategory = (() => {
                    const mapped = categorizeFromCourier(courierText);
                    if (mapped === '쿠팡주간' && prev.jobField === '야간') return '쿠팡야간';
                    return mapped || '';
                })();

                const newDeliverAddress = extracted.delivery_address || prev.deliverAddress;

                if (newCategory && !categories.includes(newCategory)) {
                    setIsCustomCategory(true);
                } else {
                    setIsCustomCategory(false);
                }

                return {
                    ...prev,
                    title: newDeliverAddress ? `[${newCategory || prev.category}] ${newDeliverAddress}` : prev.title,
                    company: extracted.agency || extracted.courier || prev.company,
                    deliverAddress: newDeliverAddress,
                    terminalAddress: extracted.terminal_address || prev.terminalAddress,
                    monthlyIncome: extracted.income || prev.monthlyIncome,
                    workTime: extracted.working_hours || prev.workTime,
                    phoneNumber: extracted.contact || prev.phoneNumber,
                    description: extracted.description || prev.description,
                    license: extracted.license ? '필요' : '불필요',
                    hasClassificationHelper: extracted.sorting_helper,
                    classificationHelperStatus: extracted.sorting_helper ? '있음' : '업체문의',
                    category: newCategory || prev.category
                };
            });

            setIsAiLoading(false);
            alert('내용을 확인하여 폼을 채웠습니다.');
        }, 800);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (formData.imageUrls.length + files.length > 5) {
            alert('사진은 최대 5장까지 등록 가능합니다.');
            return;
        }

        const newUrls = [...formData.imageUrls];
        for (const file of files) {
            const storageRef = ref(storage, `jobPostings/${firebaseUser?.uid}/${Date.now()}_${file.name}`);
            try {
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);
                newUrls.push(url);
            } catch (error) {
                console.error("Image upload failed:", error);
            }
        }
        setFormData(prev => ({ ...prev, imageUrls: newUrls }));
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            imageUrls: prev.imageUrls.filter((_, i) => i !== index)
        }));
    };

    const importFromStorage = async (item: any) => {
        if (item.type === 'image') {
            if (formData.imageUrls.length >= 5) {
                alert('사진은 최대 5장까지 등록 가능합니다.');
                return;
            }
            setFormData(prev => ({
                ...prev,
                imageUrls: [...prev.imageUrls, item.content]
            }));
            setIsStoragePickerOpen(false);
        } else {
            setAiInput(item.content);
            setIsStoragePickerOpen(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoggedIn || !firebaseUser) {
            alert('로그인이 필요합니다.');
            return;
        }

        if (!formData.title || !formData.company || !formData.phoneNumber) {
            alert('제목, 대리점명, 연락처는 필수 입력 사항입니다.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Geocode the delivery address for geoFirePoint
            let geoFirePoint: { geohash: string; geopoint: GeoPoint } | null = null;
            if (formData.deliverAddress) {
                try {
                    const geoRes = await fetch('/api/geocode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ address: formData.deliverAddress })
                    });
                    if (geoRes.ok) {
                        const { lat, lng } = await geoRes.json();
                        if (lat && lng) {
                            geoFirePoint = {
                                geohash: encodeGeohash(lat, lng),
                                geopoint: new GeoPoint(lat, lng)
                            };
                        }
                    }
                } catch (geoErr) {
                    console.warn('Geocoding failed, skipping geoFirePoint:', geoErr);
                }
            }

            const docRef = await addDoc(collection(db, 'proApply'), {
                // Web fields
                title: formData.title,
                content: formData.description,
                detail: formData.description,
                author: firebaseUser.displayName || '사용자',
                authorId: firebaseUser.uid,
                category: formData.category,
                company: formData.company,
                deliverAddress: formData.deliverAddress,
                address: formData.deliverAddress,
                terminalAddress: formData.terminalAddress,
                workTime: formData.workTime,
                holiday: formData.holiday,
                license: formData.license,
                phoneNumber: formData.phoneNumber,
                jobField: formData.jobField,
                hasClassificationHelper: formData.hasClassificationHelper,
                classificationHelperStatus: formData.classificationHelperStatus,
                deliveryRatio: formData.deliveryRatio,
                images: formData.imageUrls,
                updatedAt: serverTimestamp(),

                // ── App-required fields ──────────────────────────
                // confirmed: false → app filters only confirmed:false
                confirmed: false,
                notice: false,
                isNotice: false,

                // createdDate + createdAt both set to same timestamp
                createdAt: serverTimestamp(),
                createdDate: serverTimestamp(),
                uploadedAt: serverTimestamp(),

                // userKey = same as authorId
                userKey: firebaseUser.uid,

                // imageDownloadUrls = same array as images
                imageDownloadUrls: formData.imageUrls,

                // monthlyIncome as number (extract digits, e.g. "월 500만원" → 500)
                monthlyIncome: extractIncomeNumber(formData.monthlyIncome),

                // region / subRegion extracted from deliverAddress
                region: extractRegion(formData.deliverAddress),
                subRegion: extractSubRegion(formData.deliverAddress),

                // topCategories for app filtering
                topCategories: '구인',
                SubCategories: [formData.category],

                status: 'active',
                ...(geoFirePoint ? { geoFirePoint } : {})
            });

            // Save to user storage as well
            const postLink = `https://www.tool-ai.kr/pro-apply/${docRef.id}`;
            await addDoc(collection(db, 'userStorage'), {
                userId: firebaseUser.uid,
                type: 'text',
                content: `[구인등록 완료] ${formData.title}\n대리점: ${formData.company}\n연락처: ${formData.phoneNumber}\n등록일: ${new Date().toLocaleDateString()}\n링크: ${postLink}`,
                createdAt: serverTimestamp(),
                jobPostId: docRef.id,
                link: postLink
            });

            alert('구인 공고가 성공적으로 등록되었습니다! (저장에 보관됨)');
            onClose();
        } catch (error) {
            console.error('Error posting job:', error);
            alert('공고 등록 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>

            <div className="relative w-full max-w-2xl bg-white md:rounded-[32px] shadow-2xl overflow-hidden h-full md:h-auto md:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom md:zoom-in duration-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Truck className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-900 text-lg leading-tight">용카 구인 등록</h3>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Post a New Job with AI</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">

                    {/* AI Smart Fill Section */}
                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-3xl p-5 border border-blue-100/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-black text-blue-900">AI로 입력을 빠르게 정리하세요</span>
                            </div>
                            <button
                                onClick={() => setIsStoragePickerOpen(true)}
                                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-all"
                            >
                                <Plus className="w-3 h-3" /> 저장파일에서 가져오기
                            </button>
                        </div>
                        <div className="relative">
                            <textarea
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                placeholder="카톡이나 카페의 구인 공고글을 여기에 붙여넣으세요..."
                                className="w-full h-32 px-4 py-3 bg-white border border-blue-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-sm text-gray-700 resize-none shadow-sm"
                            />
                            <button
                                onClick={() => handleAiFill()}
                                disabled={isAiLoading || !aiInput.trim()}
                                className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
                            >
                                {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                확인
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title & Basic Info */}
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight">공고 제목</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    placeholder="예) [김포] CJ대한통운 구인합니다"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight flex items-center gap-1.5">
                                        <Briefcase className="w-3 h-3" /> 대리점명/회사명
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => handleChange('company', e.target.value)}
                                        placeholder="대리점명을 입력하세요"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight flex items-center gap-1.5">
                                        <Box className="w-3 h-3" /> 카테고리
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => {
                                                    setIsCustomCategory(false);
                                                    handleChange('category', cat);
                                                }}
                                                className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${!isCustomCategory && formData.category === cat
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setIsCustomCategory(true)}
                                            className={`px-3 py-2 rounded-xl text-xs font-black transition-all border ${isCustomCategory
                                                ? 'bg-blue-600 text-white shadow-md border-blue-600'
                                                : 'border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500'
                                                }`}
                                        >
                                            ✏️ 직접입력
                                        </button>
                                    </div>
                                    {isCustomCategory && (
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={(e) => handleChange('category', e.target.value)}
                                            placeholder="카테고리를 직접 입력하세요 (예) 쿠팡 퀸플렉스)"
                                            className="w-full px-5 py-4 bg-blue-50 border border-blue-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                                            autoFocus
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Job Field Selection */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight">직무 분야</label>
                                <div className="flex gap-2">
                                    {['주간', '야간', '백업'].map(field => (
                                        <button
                                            key={field}
                                            type="button"
                                            onClick={() => handleChange('jobField', field)}
                                            className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all ${formData.jobField === field
                                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-100'
                                                : 'bg-white border border-gray-100 text-gray-400 hover:border-blue-200 hover:text-blue-500'
                                                }`}
                                        >
                                            {field}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Images Upload Section */}
                        <div className="space-y-3">
                            <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight flex items-center gap-2">
                                <Camera className="w-3 h-3" /> 공고 사진 (최대 5장)
                            </label>
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-shrink-0 w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all active:scale-95"
                                >
                                    <Camera className="w-5 h-5" />
                                    <span className="text-[10px] font-bold">{formData.imageUrls.length}/5</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStoragePickerMode('image'); setIsStoragePickerOpen(true); }}
                                    className="flex-shrink-0 w-24 h-24 bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl flex flex-col items-center justify-center gap-1 text-blue-400 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95"
                                >
                                    <ImageIcon className="w-5 h-5" />
                                    <span className="text-[8px] font-bold text-center">저장파일\n에서</span>
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    multiple
                                    accept="image/*"
                                />
                                {formData.imageUrls.map((url, index) => (
                                    <div key={index} className="flex-shrink-0 relative w-24 h-24 group">
                                        <img src={url} alt={`Job image ${index + 1}`} className="w-full h-full object-cover rounded-2xl border border-gray-100" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Income & Contact */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight flex items-center gap-1.5">
                                    <CreditCard className="w-3 h-3" /> 수익/매출/급여
                                </label>
                                <input
                                    type="text"
                                    value={formData.monthlyIncome}
                                    onChange={(e) => handleChange('monthlyIncome', e.target.value)}
                                    placeholder="예) 500만원 내외"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight flex items-center gap-1.5">
                                    <Phone className="w-3 h-3" /> 연락처
                                </label>
                                <input
                                    type="text"
                                    value={formData.phoneNumber}
                                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                                    placeholder="010-0000-0000"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                                    required
                                />
                            </div>
                        </div>

                        {/* Work Schedule */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" /> 근무 시간
                                </label>
                                <input
                                    type="text"
                                    value={formData.workTime}
                                    onChange={(e) => handleChange('workTime', e.target.value)}
                                    placeholder="예) 07:00 ~ 18:00"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3" /> 휴일/근무요일
                                </label>
                                <input
                                    type="text"
                                    value={formData.holiday}
                                    onChange={(e) => handleChange('holiday', e.target.value)}
                                    placeholder="예) 일요일/공휴일 휴무"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                                />
                            </div>
                        </div>

                        {/* Address Details */}
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3" /> 배송지 주소 (상세 구역)
                                </label>
                                <input
                                    type="text"
                                    value={formData.deliverAddress}
                                    onChange={(e) => handleChange('deliverAddress', e.target.value)}
                                    placeholder="배송 지역을 상세히 적어주세요"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight flex items-center gap-1.5">
                                    <Truck className="w-3 h-3" /> 터미널 주소 (집하장 위치)
                                </label>
                                <input
                                    type="text"
                                    value={formData.terminalAddress}
                                    onChange={(e) => handleChange('terminalAddress', e.target.value)}
                                    placeholder="집하 터미널 위치를 입력하세요"
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                                />
                            </div>
                        </div>

                        {/* GeoFirePoint Preview (display only, from AI analysis) */}
                        {geoPreview && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 space-y-2 animate-in fade-in duration-300">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-green-600" />
                                    <span className="text-xs font-black text-green-800 uppercase tracking-tight">위치 좌표 (geoFirePoint 미리보기)</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-white rounded-xl p-2 shadow-sm border border-green-100">
                                        <p className="text-[10px] text-gray-400 font-bold">GEOHASH</p>
                                        <p className="text-sm font-black text-gray-800 font-mono">{geoPreview.geohash}</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-2 shadow-sm border border-green-100">
                                        <p className="text-[10px] text-gray-400 font-bold">위도 (LAT)</p>
                                        <p className="text-xs font-black text-gray-800 font-mono">{geoPreview.lat.toFixed(6)}</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-2 shadow-sm border border-green-100">
                                        <p className="text-[10px] text-gray-400 font-bold">경도 (LNG)</p>
                                        <p className="text-xs font-black text-gray-800 font-mono">{geoPreview.lng.toFixed(6)}</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-green-600 font-bold text-center">✓ 등록 시 Firebase에 자동 저장됩니다 (화면 표시 전용)</p>
                            </div>
                        )}

                        {/* Delivery Stats & Toggles */}
                        <div className="space-y-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-tight flex items-center gap-1.5">
                                    <PieChart className="w-3 h-3" /> 배송지 비율 / 난이도 (%)
                                </label>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { key: 'apt', label: '아파트' },
                                        { key: 'land', label: '일반지' },
                                        { key: 'oneroom', label: '원룸/상가' }
                                    ].map(item => (
                                        <div key={item.key} className="space-y-1.5 text-center">
                                            <label className="text-[10px] font-bold text-gray-400">{item.label}</label>
                                            <input
                                                type="text"
                                                value={formData.deliveryRatio[item.key as keyof typeof formData.deliveryRatio]}
                                                onChange={(e) => setFormData(prev => ({ ...prev, deliveryRatio: { ...prev.deliveryRatio, [item.key]: e.target.value } }))}
                                                className="w-full bg-white border border-gray-100 rounded-xl px-2 py-2.5 text-xs font-bold text-center focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
                                                placeholder="%"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-tight">화물운송자격증</label>
                                    <div className="flex bg-white p-1 rounded-xl border border-gray-100 gap-1 shadow-sm">
                                        {['필요', '불필요'].map(option => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => handleChange('license', option)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.license === option ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-tight">분류도우미</label>
                                    <div className="flex bg-white p-1 rounded-xl border border-gray-100 gap-1 shadow-sm">
                                        {['있음', '업체문의'].map(option => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    classificationHelperStatus: option as '있음' | '업체문의',
                                                    hasClassificationHelper: option === '있음'
                                                }))}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.classificationHelperStatus === option ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Final Description */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-tight">상세 업무 설명 / 우대 사항</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="추가적인 설명이나 우대사항을 적어주세요..."
                                className="w-full h-40 px-5 py-4 bg-gray-50 border border-gray-100 rounded-3xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-800 resize-none shadow-inner"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
                    >
                        창 닫기
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-blue-100 transition-all active:scale-[0.98]"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <Save className="w-6 h-6" />
                        )}
                        <span>구인 공고 등록 완료</span>
                    </button>
                </div>

                {/* Storage Content Picker Overlay */}
                {isStoragePickerOpen && (
                    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end">
                        <div className="w-full bg-white rounded-t-[40px] shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[70%]">
                            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                                <h4 className="font-black text-gray-900 text-xl flex items-center gap-2">
                                    {storagePickerMode === 'image' ? <ImageIcon className="w-5 h-5 text-blue-600" /> : <FileText className="w-5 h-5 text-blue-600" />}
                                    {storagePickerMode === 'image' ? '저장 이미지에서 불러오기' : '저장파일에서 불러오기'}
                                </h4>
                                <button onClick={() => setIsStoragePickerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                                <div className={storagePickerMode === 'image' ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-1 gap-2'}>
                                    {storageItems.filter(item => storagePickerMode === 'image' ? item.type === 'image' : (item.type !== 'image' && !item.content?.startsWith('[구인등록 완료]'))).length === 0 ? (
                                        <div className="col-span-3 py-20 text-center text-gray-400 font-bold">
                                            {storagePickerMode === 'image' ? '저장된 이미지가 없습니다.' : '저장된 텍스트가 없습니다.'}
                                        </div>
                                    ) : (
                                        storageItems
                                            .filter(item => storagePickerMode === 'image' ? item.type === 'image' : (item.type !== 'image' && !item.content?.startsWith('[구인등록 완료]')))
                                            .map((item) => (
                                                storagePickerMode === 'image' ? (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => importFromStorage(item)}
                                                        className="relative aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all group"
                                                    >
                                                        <img src={item.content} alt="Storage image" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-all flex items-center justify-center">
                                                            <Plus className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all" />
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => importFromStorage(item)}
                                                        className="flex items-center gap-4 p-4 hover:bg-blue-50 rounded-2xl transition-all group text-left border border-transparent hover:border-blue-100"
                                                    >
                                                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                            <FileText className="w-5 h-5 text-gray-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-800 line-clamp-2">{item.content}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold">{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                    </button>
                                                )
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
