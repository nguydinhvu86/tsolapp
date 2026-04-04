'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Save, CheckCircle2, UserCircle2, ShieldCheck, ShieldAlert, Upload, Wallet, CircleDollarSign, CalendarClock, Activity, ArrowRight, ListTodo } from 'lucide-react';
import { updateProfile } from './actions';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { AvatarImage } from '@/app/components/ui/AvatarImage';

export function ProfileClient({ initialProfile, initialStats }: { initialProfile: any, initialStats: any }) {
    const router = useRouter();
    const { update } = useSession();
    const [formData, setFormData] = useState({
        name: initialProfile.name || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');

    const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar || '');
    const [isUploading, setIsUploading] = useState(false);

    // 2FA states
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialProfile.twoFactorEnabled || false);
    const [setup2Fa, setSetup2Fa] = useState<{ secret: string, uri: string } | null>(null);
    const [token2Fa, setToken2Fa] = useState('');
    const [isGenerating2Fa, setIsGenerating2Fa] = useState(false);
    const [isVerifying2Fa, setIsVerifying2Fa] = useState(false);

    // Disable 2FA states
    const [disablePassword, setDisablePassword] = useState('');
    const [showDisableForm, setShowDisableForm] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(false);
        setError('');

        if (formData.newPassword) {
            if (formData.newPassword !== formData.confirmPassword) {
                setError('Mật khẩu xác nhận không khớp.');
                setIsSaving(false);
                return;
            }
            if (!formData.currentPassword) {
                setError('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới.');
                setIsSaving(false);
                return;
            }
        }

        try {
            await updateProfile({
                name: formData.name,
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });

            setSaveSuccess(true);
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' })); // clear password fields
            router.refresh();
            setTimeout(() => setSaveSuccess(false), 3000);

        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi cập nhật hồ sơ');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const res = await fetch('/api/users/avatar', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAvatarUrl(data.url);
            await update({ avatar: data.url });
            router.refresh(); // Refresh session
        } catch (err: any) {
            alert(err.message || 'Upload thất bại');
        } finally {
            setIsUploading(false);
        }
    };

    const generate2FA = async () => {
        setIsGenerating2Fa(true);
        try {
            const res = await fetch('/api/users/2fa/generate', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSetup2Fa({ secret: data.secret, uri: data.uri });
        } catch (err: any) {
            alert(err.message || 'Không thể tạo mã 2FA');
        } finally {
            setIsGenerating2Fa(false);
        }
    };

    const verifyAndEnable2FA = async () => {
        if (!token2Fa || !setup2Fa) return;
        setIsVerifying2Fa(true);
        try {
            const res = await fetch('/api/users/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: setup2Fa.secret, token: token2Fa })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setTwoFactorEnabled(true);
            setSetup2Fa(null);
            setToken2Fa('');
            await update({ twoFactorEnabled: true });
            alert('Bật xác thực 2 yếu tố thành công!');
            router.refresh();
        } catch (err: any) {
            alert(err.message || 'Mã xác thực không hợp lệ');
        } finally {
            setIsVerifying2Fa(false);
        }
    };

    const disable2FA = async () => {
        if (!disablePassword) return alert('Vui lòng nhập mật khẩu để tắt 2FA');
        try {
            const res = await fetch('/api/users/2fa/disable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: disablePassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setTwoFactorEnabled(false);
            setShowDisableForm(false);
            setDisablePassword('');
            await update({ twoFactorEnabled: false });
            alert('Đã tắt xác thực 2 yếu tố');
            router.refresh();
        } catch (err: any) {
            alert(err.message || 'Mật khẩu không đúng');
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column: Settings & Identity */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <Card className="p-6">
                    <div className="flex items-center gap-4 mb-6 relative">
                        <div className="relative shrink-0">
                            <AvatarImage
                                src={avatarUrl}
                                name={initialProfile.name || initialProfile.email}
                                size={80}
                                className="border-2 border-slate-200"
                            />
                            <label className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 cursor-pointer shadow-md border border-slate-200 hover:bg-slate-50 transition-colors" title="Tải ảnh lên">
                                {isUploading ? <CheckCircle2 size={16} className="text-primary" /> : <Upload size={16} className="text-slate-600" />}
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploading} />
                            </label>
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="text-lg font-bold text-slate-800 truncate mb-1" title={initialProfile.name || initialProfile.email}>{initialProfile.name || initialProfile.email}</h2>
                            <p className="text-sm text-slate-500 mb-1 truncate" title={initialProfile.email}>{initialProfile.email}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {initialProfile.role}
                            </span>
                        </div>
                    </div>

                    {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-6 border border-red-100 text-sm">{error}</div>}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <Input
                            label="Họ và tên hiển thị"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />

                        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200 flex flex-col gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">Đổi Mật Khẩu</h3>
                                <p className="text-xs text-slate-500">Bỏ trống nếu không đổi</p>
                            </div>
                            <Input
                                type="password"
                                value={formData.currentPassword}
                                onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                                placeholder="Mật khẩu hiện tại"
                            />
                            <Input
                                type="password"
                                value={formData.newPassword}
                                onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                            />
                            <Input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                placeholder="Xác nhận mật khẩu mới"
                            />
                        </div>

                        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200 flex flex-col gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    {twoFactorEnabled ? <ShieldCheck size={18} className="text-emerald-600" /> : <ShieldAlert size={18} className="text-amber-500" />}
                                    Bảo mật 2 Lớp (2FA)
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Dùng app Authenticator để bảo vệ tài khoản</p>
                            </div>

                            {!twoFactorEnabled && !setup2Fa && (
                                <Button type="button" onClick={generate2FA} disabled={isGenerating2Fa} className="w-full text-sm">
                                    {isGenerating2Fa ? 'Đang tạo...' : 'Thiết lập ngay'}
                                </Button>
                            )}

                            {!twoFactorEnabled && setup2Fa && (
                                <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col items-center gap-4 shadow-sm">
                                    <p className="text-sm font-medium text-center text-slate-700">Quét mã QR bằng Authenticator</p>
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                                        <QRCodeSVG value={setup2Fa.uri} size={140} />
                                    </div>
                                    <p className="text-xs text-slate-500 text-center">
                                        Hoặc nhập mã bí mật: <strong className="text-indigo-600 truncate block mt-1 select-all">{setup2Fa.secret}</strong>
                                    </p>
                                    <div className="flex gap-2 w-full mt-2">
                                        <input
                                            type="text"
                                            placeholder="Gồm 6 chữ số"
                                            value={token2Fa}
                                            onChange={e => setToken2Fa(e.target.value)}
                                            maxLength={6}
                                            className="flex-1 text-center font-bold tracking-widest text-lg border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        />
                                        <Button type="button" onClick={verifyAndEnable2FA} disabled={isVerifying2Fa || token2Fa.length < 6}>
                                            Xác nhận
                                        </Button>
                                    </div>
                                    <Button type="button" variant="secondary" onClick={() => setSetup2Fa(null)} className="w-full text-sm">Hủy bỏ</Button>
                                </div>
                            )}

                            {twoFactorEnabled && !showDisableForm && (
                                <Button type="button" variant="secondary" onClick={() => setShowDisableForm(true)} className="w-full text-sm !text-red-600 !border-red-200 hover:!bg-red-50">
                                    Tắt 2FA
                                </Button>
                            )}

                            {twoFactorEnabled && showDisableForm && (
                                <div className="flex flex-col gap-3">
                                    <Input
                                        type="password"
                                        placeholder="Nhập mật khẩu để tắt"
                                        value={disablePassword}
                                        onChange={e => setDisablePassword(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <Button type="button" onClick={disable2FA} disabled={!disablePassword} className="flex-1 text-sm bg-red-600 hover:bg-red-700 text-white border-transparent">
                                            Xác nhận Tắt
                                        </Button>
                                        <Button type="button" variant="secondary" onClick={() => setShowDisableForm(false)} className="px-3">Hủy</Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100 items-center">
                            {saveSuccess && (
                                <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium mr-auto">
                                    <CheckCircle2 size={16} /> Đã lưu hồ sơ
                                </div>
                            )}
                            <Button type="submit" disabled={isSaving} className="gap-2">
                                <Save size={16} /> {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>

            {/* Right Column: Dashboard & Real-time Stats */}
            {initialStats && (
                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                    {/* Top KPI row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-4 flex flex-col relative overflow-hidden group hover:border-emerald-200 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Wallet size={60} className="text-emerald-500" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Doanh thu (Bạn Thu)</span>
                            <span className="text-xl font-bold text-slate-800 break-words">{formatMoney(initialStats.revenue)}</span>
                        </Card>

                        <Card className="p-4 flex flex-col relative overflow-hidden group hover:border-rose-200 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <CircleDollarSign size={60} className="text-rose-500" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Công nợ tồn</span>
                            <span className="text-xl font-bold text-rose-600 break-words">{formatMoney(initialStats.debt)}</span>
                        </Card>

                        <Card className="p-4 flex flex-col relative overflow-hidden group hover:border-indigo-200 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <ListTodo size={60} className="text-indigo-500" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tác vụ đang xử lý</span>
                            <span className="text-2xl font-bold text-slate-800">{initialStats.tasks?.length || 0}</span>
                        </Card>

                        <Card className="p-4 flex flex-col relative overflow-hidden group hover:border-blue-200 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Activity size={60} className="text-blue-500" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Hoạt động gần đây</span>
                            <span className="text-2xl font-bold text-slate-800">{initialStats.activities?.length || 0}</span>
                        </Card>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Tasks Section */}
                        <Card className="p-0 overflow-hidden flex flex-col max-h-[500px]">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <CalendarClock size={18} className="text-indigo-500" />
                                    Lịch trình & Nhiệm vụ
                                </h3>
                                <Link href="/tasks" className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                    Xem tất cả <ArrowRight size={14} />
                                </Link>
                            </div>
                            <div className="overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                                {(!initialStats.tasks || initialStats.tasks.length === 0) ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        Không có nhiệm vụ nào đang chờ xử lý
                                    </div>
                                ) : (
                                    initialStats.tasks.map((task: any) => (
                                        <Link key={task.id} href={`/tasks/${task.id}`} className="block p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all group">
                                            <div className="flex justify-between items-start mb-1.5">
                                                <h4 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 line-clamp-1">{task.title}</h4>
                                                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 ${task.priority === 'URGENT' ? 'bg-red-100 text-red-700' : task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {task.priority === 'URGENT' ? 'CẤP BÁCH' : task.priority === 'HIGH' ? 'CAO' : task.priority === 'MEDIUM' ? 'T.BÌNH' : 'THẤP'}
                                                </span>
                                            </div>
                                            {task.customer && (
                                                <p className="text-xs text-slate-500 mb-2 truncate">Khách hàng: {task.customer.name}</p>
                                            )}
                                            <div className="flex items-center gap-2 justify-between mt-2">
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${task.status === 'TODO' ? 'bg-amber-100 text-amber-800' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {task.status === 'TODO' ? 'Cần làm' : task.status === 'IN_PROGRESS' ? 'Đang thực hiện' : 'Đang duyệt'}
                                                </span>
                                                {task.dueDate && (
                                                    <span className={`text-[11px] font-medium flex items-center gap-1.5 ${new Date(task.dueDate) < new Date() ? 'text-red-600' : 'text-slate-500'}`}>
                                                        Hạn: {formatDate(task.dueDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </Card>

                        {/* Activity Timeline */}
                        <Card className="p-0 overflow-hidden flex flex-col max-h-[500px]">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <Activity size={18} className="text-blue-500" />
                                    Hoạt động gần đây
                                </h3>
                            </div>
                            <div className="overflow-y-auto p-5 custom-scrollbar">
                                {(!initialStats.activities || initialStats.activities.length === 0) ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        Chưa có hoạt động nào được ghi nhận
                                    </div>
                                ) : (
                                    <div className="relative border-l border-slate-200 ml-3 space-y-6">
                                        {initialStats.activities.map((act: any) => (
                                            <div key={act.id} className="relative pl-6">
                                                <div className={`absolute w-3 h-3 rounded-full -left-[6.5px] top-1.5 border-2 border-white ${act.type === 'INVOICE' || act.type === 'ESTIMATE' ? 'bg-emerald-400' : act.type === 'CUSTOMER' ? 'bg-blue-400' : 'bg-indigo-400'}`} />
                                                <p className="text-xs font-medium text-slate-400 mb-1" suppressHydrationWarning>
                                                    {formatDate(act.date)}
                                                </p>
                                                <p className="text-sm text-slate-800 font-medium">
                                                    {act.action}
                                                    {act.entity && <span className="font-bold text-slate-900 ml-1">({act.entity})</span>}
                                                </p>
                                                {act.details && (
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 bg-slate-50 rounded p-1.5 border border-slate-100 italic">
                                                        {act.details}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
