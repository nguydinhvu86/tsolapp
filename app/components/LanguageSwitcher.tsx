'use client';

import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Locale, languages, localeNames, cookieName } from '../i18n/settings';
import { useTranslation } from '../i18n/LanguageContext';

export default function LanguageSwitcher() {
    const router = useRouter();
    const { locale } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleLanguageChange = (newLocale: Locale) => {
        document.cookie = `${cookieName}=${newLocale}; path=/; max-age=31536000`; // 1 year
        setIsOpen(false);
        router.refresh(); // Refresh to apply new language in Server Components
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md hover:bg-slate-100 focus:outline-none transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                style={{ color: 'var(--text-muted)' }}
                title={localeNames[locale]}
            >
                <Globe size={20} />
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-32 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {languages.map((lng) => (
                            <button
                                key={lng}
                                className={`${locale === lng ? 'bg-gray-100 text-gray-900 border-l-4 border-blue-500' : 'text-gray-700'
                                    } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900`}
                                role="menuitem"
                                onClick={() => handleLanguageChange(lng)}
                            >
                                {localeNames[lng]}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
