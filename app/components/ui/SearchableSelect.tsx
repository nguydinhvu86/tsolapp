'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Check, ChevronDown } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Chọn một mục",
    className = "",
    disabled = false
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }} className={className}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    backgroundColor: disabled ? '#f8fafc' : 'white',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '42px',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: isOpen ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
                    borderColor: isOpen ? 'var(--primary)' : 'var(--border)'
                }}
            >
                <span style={{
                    color: selectedOption ? 'var(--text-main)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '0.875rem'
                }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '0.5rem', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {isOpen && !disabled && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 50,
                    maxHeight: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'sticky', top: 0, backgroundColor: 'white' }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm..."
                            style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem' }}
                            autoFocus
                        />
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, padding: '0.25rem' }}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        fontSize: '0.875rem',
                                        backgroundColor: value === opt.value ? '#e0e7ff' : 'transparent',
                                        color: value === opt.value ? 'var(--primary)' : 'var(--text-main)',
                                        transition: 'background-color 0.15s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (value !== opt.value) e.currentTarget.style.backgroundColor = '#f1f5f9';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (value !== opt.value) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    {opt.label}
                                    {value === opt.value && <Check size={16} color="var(--primary)" />}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Không tìm thấy kết quả
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
