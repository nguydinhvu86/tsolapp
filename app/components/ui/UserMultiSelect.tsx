'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Users, ChevronDown } from 'lucide-react';
import { AvatarImage } from '@/app/components/ui/AvatarImage';

export interface UserOption {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    avatar?: string | null;
}

interface UserMultiSelectProps {
    users: UserOption[];
    selectedUserIds: string[];
    onChange: (userIds: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function UserMultiSelect({
    users = [],
    selectedUserIds = [],
    onChange,
    placeholder = 'Chọn nhân sự...',
    disabled = false,
    className = ''
}: UserMultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredUsers = users.filter((u) => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return true;
        const nameMatch = u.name?.toLowerCase().includes(query);
        const emailMatch = u.email?.toLowerCase().includes(query);
        return nameMatch || emailMatch;
    });

    const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));

    const toggleUser = (userId: string) => {
        if (selectedUserIds.includes(userId)) {
            onChange(selectedUserIds.filter((id) => id !== userId));
        } else {
            onChange([...selectedUserIds, userId]);
        }
    };

    const removeUser = (e: React.MouseEvent, userId: string) => {
        e.stopPropagation();
        onChange(selectedUserIds.filter((id) => id !== userId));
    };

    const handleSelectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        const allFilteredIds = filteredUsers.map((u) => u.id);
        const combined = Array.from(new Set([...selectedUserIds, ...allFilteredIds]));
        onChange(combined);
    };

    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            {/* Display / Trigger Box */}
            <div
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                        if (!isOpen) {
                            setTimeout(() => inputRef.current?.focus(), 50);
                        }
                    }
                }}
                className={`min-h-[38px] w-full px-2.5 py-1.5 bg-white border rounded-lg flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                    disabled
                        ? 'bg-slate-50 border-slate-200 cursor-not-allowed text-slate-400'
                        : isOpen
                        ? 'border-emerald-500 ring-2 ring-emerald-500/15 shadow-xs'
                        : 'border-slate-300 hover:border-slate-400'
                }`}
            >
                <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    {selectedUsers.length === 0 ? (
                        <span className="text-xs text-slate-400 select-none py-0.5 px-1">{placeholder}</span>
                    ) : (
                        selectedUsers.map((u) => (
                            <span
                                key={u.id}
                                className="inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 hover:bg-slate-200/70 transition-colors select-none"
                            >
                                <AvatarImage
                                    src={u.avatar}
                                    name={u.name || u.email || 'U'}
                                    size={16}
                                    className="rounded-full shrink-0"
                                />
                                <span className="max-w-[120px] truncate">{u.name || u.email}</span>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={(e) => removeUser(e, u.id)}
                                        className="text-slate-400 hover:text-rose-600 rounded p-0.5 transition-colors"
                                        title="Bỏ chọn"
                                    >
                                        <X size={11} strokeWidth={2.5} />
                                    </button>
                                )}
                            </span>
                        ))
                    )}
                </div>

                <div className="flex items-center gap-1 text-slate-400 shrink-0">
                    {selectedUsers.length > 0 && !disabled && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="p-1 hover:text-rose-600 rounded text-slate-400 transition-colors"
                            title="Xóa tất cả"
                        >
                            <X size={13} />
                        </button>
                    )}
                    <ChevronDown
                        size={15}
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}
                    />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && !disabled && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[280px]">
                    {/* Search & Actions Header */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-1.5">
                        <div className="relative flex items-center">
                            <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Tìm theo tên hoặc email..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
                            <span>Đã chọn: <strong className="text-emerald-600">{selectedUserIds.length}</strong></span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                                >
                                    Chọn tất cả
                                </button>
                                {selectedUserIds.length > 0 && (
                                    <>
                                        <span className="text-slate-300">|</span>
                                        <button
                                            type="button"
                                            onClick={handleClearAll}
                                            className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                                        >
                                            Bỏ chọn hết
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto flex-1 p-1 space-y-0.5 custom-scrollbar">
                        {filteredUsers.length === 0 ? (
                            <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
                                <Users size={20} className="opacity-40" />
                                <span>Không tìm thấy người dùng phù hợp</span>
                            </div>
                        ) : (
                            filteredUsers.map((u) => {
                                const isSelected = selectedUserIds.includes(u.id);
                                return (
                                    <div
                                        key={u.id}
                                        onClick={() => toggleUser(u.id)}
                                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                                            isSelected
                                                ? 'bg-emerald-50 text-emerald-900 font-medium'
                                                : 'hover:bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <AvatarImage
                                                src={u.avatar}
                                                name={u.name || u.email || 'U'}
                                                size={24}
                                                className="rounded-full shrink-0"
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="truncate text-xs font-medium leading-tight">
                                                    {u.name || 'Không có tên'}
                                                </span>
                                                {u.email && (
                                                    <span className="truncate text-[10px] text-slate-400 leading-tight">
                                                        {u.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                isSelected
                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                    : 'border-slate-300 bg-white'
                                            }`}
                                        >
                                            {isSelected && <Check size={11} strokeWidth={3} />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
