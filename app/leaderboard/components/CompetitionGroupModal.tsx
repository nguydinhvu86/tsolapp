'use client';


import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useEffect } from 'react';
import { X, Users, Trophy, Shield, Sparkles, Check, Trash2, Search, Target, DollarSign, Loader2 } from 'lucide-react';
import { createCompetitionGroup, updateCompetitionGroup, deleteCompetitionGroup, getAllUsersForManagement } from '../actions';

interface Props {
    group?: any | null; // If null => create mode, if provided => edit mode
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const EMOJI_OPTIONS = ['🦁', '🦅', '🚀', '⚡', '👑', '🛡️', '💎', '🔥', '🏆', '🌟', '🎯', '🐯', '🐺', '🐉', '⚔️', '🌊'];
const COLOR_OPTIONS = [
    { label: 'Ngọc lục bảo', value: '#059669' },
    { label: 'Xanh chàm', value: '#4f46e5' },
    { label: 'Vàng kim', value: '#d97706' },
    { label: 'Đỏ chiến binh', value: '#e11d48' },
    { label: 'Tím huyền bí', value: '#9333ea' },
    { label: 'Xanh lam biển', value: '#0284c7' },
    { label: 'Cam nhiệt huyết', value: '#ea580c' },
    { label: 'Hồng bứt phá', value: '#db2777' }
];

export function CompetitionGroupModal({ group, isOpen, onClose, onSuccess }: Props) {
    const [name, setName] = useState('');
    const [slogan, setSlogan] = useState('');
    const [description, setDescription] = useState('');
    const [avatar, setAvatar] = useState('🦁');
    const [color, setColor] = useState('#059669');
    const [targetRevenue, setTargetRevenue] = useState<number>(100000000);
    const [leaderId, setLeaderId] = useState<string>('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [memberSearch, setMemberSearch] = useState('');

    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setIsLoadingUsers(true);
        getAllUsersForManagement()
            .then(users => setAllUsers(users))
            .catch(err => console.error(err))
            .finally(() => setIsLoadingUsers(false));

        if (group) {
            setName(group.name || '');
            setSlogan(group.slogan || '');
            setDescription(group.description || '');
            setAvatar(group.avatar || '🦁');
            setColor(group.color || '#059669');
            setTargetRevenue(group.targetRevenue || 0);
            setLeaderId(group.leaderId || '');
            const existingMemberIds = (group.members || []).map((m: any) => m.userId || m.user?.id).filter(Boolean);
            setSelectedMemberIds(existingMemberIds);
        } else {
            setName('');
            setSlogan('');
            setDescription('');
            setAvatar('🦁');
            setColor('#059669');
            setTargetRevenue(100000000);
            setLeaderId('');
            setSelectedMemberIds([]);
        }
    }, [isOpen, group]);

    if (!isOpen) return null;

    const toggleMember = (uid: string) => {
        setSelectedMemberIds(prev => 
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const handleSelectAll = () => {
        if (selectedMemberIds.length === allUsers.length) {
            setSelectedMemberIds([]);
        } else {
            setSelectedMemberIds(allUsers.map(u => u.id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.warning('Vui lòng nhập tên nhóm thi đua.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (group?.id) {
                await updateCompetitionGroup(group.id, {
                    name,
                    slogan,
                    description,
                    avatar,
                    color,
                    targetRevenue: Number(targetRevenue) || 0,
                    leaderId: leaderId || undefined,
                    memberIds: selectedMemberIds
                });
            } else {
                await createCompetitionGroup({
                    name,
                    slogan,
                    description,
                    avatar,
                    color,
                    targetRevenue: Number(targetRevenue) || 0,
                    leaderId: leaderId || undefined,
                    memberIds: selectedMemberIds
                });
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Lỗi khi lưu thông tin nhóm thi đua.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!group?.id) return;
        if (!confirm(`Bạn có chắc muốn xóa nhóm thi đua "${group.name}"? Dữ liệu nhóm sẽ bị gỡ bỏ.`)) return;

        setIsDeleting(true);
        try {
            await deleteCompetitionGroup(group.id);
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Lỗi khi xóa nhóm.');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredUsers = (allUsers || []).filter(u => {
        const s = (memberSearch || '').toLowerCase().trim();
        if (!s) return true;
        const name = (u?.name || '').toLowerCase();
        const email = (u?.email || '').toLowerCase();
        const dept = (u?.employeeProfile?.department || u?.role || '').toLowerCase();
        return name.includes(s) || email.includes(s) || dept.includes(s);
    });

    const formatVND = (num: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num || 0);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div 
                    className="p-5 text-white flex items-center justify-between"
                    style={{ background: `linear-gradient(135deg, ${color} 0%, #0f172a 100%)` }}
                >
                    <div className="flex items-center gap-3">
                        <div className="text-3xl p-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-inner">
                            {avatar}
                        </div>
                        <div>
                            <h3 className="font-black text-lg sm:text-xl text-white">
                                {group ? 'Chỉnh Sửa Nhóm Thi Đua' : 'Tạo Nhóm Thi Đua Mới'}
                            </h3>
                            <p className="text-xs text-white/80">
                                Thiết lập đội ngũ, phân bổ chỉ tiêu KPI và vinh danh tập thể
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Basic Group Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                Tên nhóm thi đua *
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="VD: Chiến Binh Rồng Vàng, TSOL Champions..."
                                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                Slogan truyền cảm hứng
                            </label>
                            <input
                                type="text"
                                value={slogan}
                                onChange={e => setSlogan(e.target.value)}
                                placeholder="VD: Quyết chiến quyết thắng, chạm mốc đỉnh cao!"
                                className="w-full px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Icon & Color selector */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                    Biểu tượng nhóm
                                </label>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    {EMOJI_OPTIONS.map(em => (
                                        <button
                                            key={em}
                                            type="button"
                                            onClick={() => setAvatar(em)}
                                            className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-transform active:scale-90 ${avatar === em ? 'bg-white dark:bg-slate-700 shadow-md ring-2 ring-emerald-500 scale-110' : 'hover:bg-white/60 dark:hover:bg-slate-700/60'}`}
                                        >
                                            {em}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                    Màu sắc đại diện
                                </label>
                                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    {COLOR_OPTIONS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setColor(c.value)}
                                            style={{ backgroundColor: c.value }}
                                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${color === c.value ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' : 'opacity-80 hover:opacity-100'}`}
                                            title={c.label}
                                        >
                                            {color === c.value && <Check className="w-4 h-4 text-white stroke-[3]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Target Revenue & Leader */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                    Mục tiêu doanh thu (VNĐ)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000000"
                                    value={targetRevenue}
                                    onChange={e => setTargetRevenue(Number(e.target.value))}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Tương đương: <span className="font-bold text-emerald-600">{formatVND(targetRevenue)}</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                    Đội trưởng (Leader)
                                </label>
                                <select
                                    value={leaderId}
                                    onChange={e => {
                                        const newLeaderId = e.target.value;
                                        setLeaderId(newLeaderId);
                                        if (newLeaderId && !selectedMemberIds.includes(newLeaderId)) {
                                            setSelectedMemberIds(prev => [...prev, newLeaderId]);
                                        }
                                    }}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">-- Chưa chỉ định đội trưởng --</option>
                                    {allUsers.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.employeeProfile?.department || u.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Member Selection Section */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    Thành viên nhóm ({selectedMemberIds.length} người được chọn)
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                    Doanh thu của các thành viên sẽ được tự động cộng dồn cho nhóm
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                            >
                                {selectedMemberIds.length === allUsers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                        </div>

                        {/* Search Members Input */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={memberSearch}
                                onChange={e => setMemberSearch(e.target.value)}
                                placeholder="Tìm theo tên, email, phòng ban..."
                                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                            />
                        </div>

                        {/* Member List Grid */}
                        <div className="max-h-52 overflow-y-auto space-y-1.5 p-1">
                            {isLoadingUsers ? (
                                <div className="text-center py-6 text-slate-400 text-xs">Đang tải danh sách nhân sự...</div>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map(user => {
                                    const isSelected = selectedMemberIds.includes(user.id);
                                    const isLeader = leaderId === user.id;

                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => toggleMember(user.id)}
                                            className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${isSelected ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <img
                                                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=059669&color=fff&size=64`}
                                                    alt={user.name}
                                                    className="w-8 h-8 rounded-xl object-cover shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                                                        <span>{user.name}</span>
                                                        {isLeader && (
                                                            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                                                                👑 Leader
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 truncate">
                                                        {user.employeeProfile?.department || user.role} • {user.email}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-6 text-slate-400 text-xs">Không tìm thấy nhân viên phù hợp.</div>
                            )}
                        </div>
                    </div>

                    {/* Modal Footer Actions */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        {group?.id ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Xóa nhóm</span>
                            </button>
                        ) : <div />}

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                Hủy bỏ
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                style={{ backgroundColor: color }}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-white font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Đang lưu...</span>
                                    </>
                                ) : (
                                    <span>{group ? 'Cập nhật nhóm' : 'Hoàn tất & Ra mắt nhóm 🔥'}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
