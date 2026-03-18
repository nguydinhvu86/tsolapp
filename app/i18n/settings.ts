export const fallbackLng = 'vi';
export const languages = [fallbackLng, 'en', 'zh'] as const;
export type Locale = typeof languages[number];

export const localeNames: Record<Locale, string> = {
    vi: 'Tiếng Việt',
    en: 'English',
    zh: '中文'
};

export const cookieName = 'NEXT_LOCALE';
