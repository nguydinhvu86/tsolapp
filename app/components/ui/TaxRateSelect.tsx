'use client';

import React from 'react';
import { formatTaxRate } from '@/lib/utils/formatters';

interface TaxRateSelectProps {
    value: number | string;
    onChange: (rate: number) => void;
    disabled?: boolean;
    className?: string;
}

export function TaxRateSelect({
    value,
    onChange,
    disabled = false,
    className = ''
}: TaxRateSelectProps) {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    // Check if value is one of standard options: -1 (KCT), 0, 5, 8, 10
    const isStandard = [-1, 0, 5, 8, 10].includes(numValue);
    const [isCustom, setIsCustom] = React.useState(!isStandard && numValue !== undefined && !isNaN(numValue));

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === 'custom') {
            setIsCustom(true);
        } else {
            setIsCustom(false);
            onChange(parseFloat(val));
        }
    };

    if (disabled) {
        return (
            <div className={`flex items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-800 text-center font-medium ${className}`}>
                <TaxBadge rate={numValue} />
            </div>
        );
    }

    if (isCustom) {
        return (
            <div className="flex items-center gap-1 w-full">
                <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="%"
                    value={numValue >= 0 ? numValue : 0}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 ${className}`}
                />
                <button
                    type="button"
                    onClick={() => {
                        setIsCustom(false);
                        onChange(10);
                    }}
                    title="Chọn từ danh sách"
                    className="px-1.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border"
                >
                    ✕
                </button>
            </div>
        );
    }

    return (
        <select
            value={numValue}
            onChange={handleSelectChange}
            className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 text-sm font-medium ${className}`}
        >
            <option value="-1">KCT</option>
            <option value="0">0%</option>
            <option value="5">5%</option>
            <option value="8">8%</option>
            <option value="10">10%</option>
            <option value="custom">Khác...</option>
        </select>
    );
}

export function TaxBadge({ rate, className = '' }: { rate: number | string | null | undefined, className?: string }) {
    const formatted = formatTaxRate(rate);

    if (formatted === 'KCT') {
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-sm ${className}`}>
                KCT
            </span>
        );
    }

    if (formatted === '0%') {
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${className}`}>
                0%
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 ${className}`}>
            {formatted}
        </span>
    );
}
