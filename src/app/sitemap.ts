import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://yongcar.com';
    const lastModified = new Date();

    return [
        {
            url: baseUrl,
            lastModified,
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/?tab=NoticeBoard&noticeTab=%ED%83%9D%EB%B0%B0%EA%B5%AC%EC%9D%B8`,
            lastModified,
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/?tab=NoticeBoard`,
            lastModified,
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/?tab=schedule`,
            lastModified,
            changeFrequency: 'daily',
            priority: 0.5,
        },
    ];
}
