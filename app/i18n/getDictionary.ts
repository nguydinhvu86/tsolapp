import 'server-only';
import { cookies } from 'next/headers';
import { fallbackLng, Locale, cookieName } from './settings';

const dictionaries = {
    en: () => import('./dictionaries/en.json').then((module) => module.default),
    vi: () => import('./dictionaries/vi.json').then((module) => module.default),
    zh: () => import('./dictionaries/zh.json').then((module) => module.default),
};

export const getDictionary = async () => {
    const cookieStore = cookies();
    const localeCookie = cookieStore.get(cookieName);
    const currentLocale = (localeCookie?.value as Locale) || fallbackLng;

    // Fallback to default if the language is not supported
    if (!dictionaries[currentLocale]) {
        return dictionaries[fallbackLng]();
    }

    return dictionaries[currentLocale]();
};

export const getCurrentLocale = () => {
    const cookieStore = cookies();
    const localeCookie = cookieStore.get(cookieName);
    return (localeCookie?.value as Locale) || fallbackLng;
};
