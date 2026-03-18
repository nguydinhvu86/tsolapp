'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Locale, fallbackLng } from './settings';

// Define the structure of the dictionary based on an example file (e.g. en.json)
export type Dictionary = Record<string, any>;

interface LanguageContextType {
    locale: Locale;
    dictionary: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: ReactNode;
    locale: Locale;
    dictionary: Dictionary;
}

export const LanguageProvider = ({ children, locale, dictionary }: LanguageProviderProps) => {
    return (
        <LanguageContext.Provider value={{ locale, dictionary }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);

    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }

    const { locale, dictionary } = context;

    // Simple nested key resolver, e.g., t('common.save')
    const t = (key: string): string => {
        const keys = key.split('.');
        let result: any = dictionary;

        for (const k of keys) {
            if (result === undefined || result === null) break;
            result = result[k];
        }

        return typeof result === 'string' ? result : key;
    };

    return { t, locale };
};
