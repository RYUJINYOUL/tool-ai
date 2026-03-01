export interface ExeFile {
    id: string;
    name: string;
    description: string;
    downloadUrl: string;
    uploadedAt: Date;
    version: string;
    storagePath?: string;
}

export interface StorageItem {
    id: string;
    userId: string;
    type: 'image' | 'text';
    content: string;
    fileName?: string;
    createdAt: any;
}

export interface Notice {
    id: string;
    title: string;
    content: string;
    categoryName: string;
    createdAt: any;
    imageUrls?: string[];
    links?: { title: string; url: string }[];
    link?: string;
}

export interface Favorite {
    id?: string;
    url: string;
    name: string;
    icon: string;
}
