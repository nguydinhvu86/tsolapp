'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Save, CheckCircle2, UserCircle2, ShieldCheck, ShieldAlert, Upload, QrCode } from 'lucide-react';
import { updateProfile } from './actions';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { QRCodeSVG } from 'qrcode.react';

export function ProfileClient({ initialProfile }: { initialProfile: any }) {
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
        <Card style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ position: 'relative' }}>
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                    ) : (
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                            <UserCircle2 size={50} />
                        </div>
                    )}
                    <label style={{
                        position: 'absolute', bottom: -5, right: -5, background: 'white', borderRadius: '50%',
                        padding: '6px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', border: '1px solid var(--border)'
                    }} title="Tải ảnh lên">
                        {isUploading ? <CheckCircle2 size={16} color="var(--primary)" /> : <Upload size={16} color="var(--text-main)" />}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={isUploading} />
                    </label>
                </div>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>{initialProfile.email}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                        Quyền hạn: <strong style={{ color: 'var(--primary)' }}>{initialProfile.role}</strong>
                    </p>
                </div>
            </div>

            {error && <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{error}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <Input
                    label="Họ và tên hiển thị"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                />

                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Đổi Mật Khẩu</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Bỏ trống nếu không muốn thay đổi mật khẩu hiện tại.</p>

                    <Input
                        label="Mật khẩu hiện tại"
                        type="password"
                        value={formData.currentPassword}
                        onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                        placeholder="Nhập mật khẩu hiện tại để xác minh"
                    />
                    <Input
                        label="Mật khẩu mới"
                        type="password"
                        value={formData.newPassword}
                        onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                        placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                    />
                    <Input
                        label="Xác nhận mật khẩu mới"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Nhập lại mật khẩu mới"
                    />
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {twoFactorEnabled ? <ShieldCheck size={20} color="#16a34a" /> : <ShieldAlert size={20} color="#eab308" />}
                            Xác Thực 2 Yếu Tố (2FA)
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
                            Bảo vệ tài khoản của bạn bằng mã xuất ra từ ứng dụng Authenticator (Google Authenticator, Authy, v.v...)
                        </p>
                    </div>

                    {!twoFactorEnabled && !setup2Fa && (
                        <div>
                            <Button type="button" onClick={generate2FA} disabled={isGenerating2Fa}>
                                {isGenerating2Fa ? 'Đang tạo...' : 'Bật 2FA ngay bây giờ'}
                            </Button>
                        </div>
                    )}

                    {!twoFactorEnabled && setup2Fa && (
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <p style={{ margin: 0, fontWeight: 500, textAlign: 'center' }}>Quét mã QR dưới đây bằng ứng dụng Authenticator</p>
                            <div style={{ padding: '1rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                                <QRCodeSVG value={setup2Fa.uri} size={160} />
                            </div>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                Hoặc nhập mã bí mật tự công này: <strong style={{ userSelect: 'all', color: 'var(--primary)' }}>{setup2Fa.secret}</strong>
                            </p>
                            <div style={{ width: '100%', marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                <Input
                                    placeholder="Nhập mã 6 chữ số từ app"
                                    value={token2Fa}
                                    onChange={e => setToken2Fa(e.target.value)}
                                    maxLength={6}
                                    style={{ flex: 1, textAlign: 'center', letterSpacing: '0.2rem', fontWeight: 'bold' }}
                                />
                                <Button type="button" onClick={verifyAndEnable2FA} disabled={isVerifying2Fa || token2Fa.length < 6}>
                                    Xác nhận
                                </Button>
                            </div>
                            <Button type="button" variant="secondary" onClick={() => setSetup2Fa(null)} style={{ width: '100%' }}>Hủy bỏ</Button>
                        </div>
                    )}

                    {twoFactorEnabled && !showDisableForm && (
                        <div>
                            <Button type="button" variant="secondary" style={{ color: '#dc2626', borderColor: '#fecaca' }} onClick={() => setShowDisableForm(true)}>
                                Tắt Xác thực 2 yếu tố
                            </Button>
                        </div>
                    )}

                    {twoFactorEnabled && showDisableForm && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                                <Input
                                    label="Xác nhận mật khẩu để tắt"
                                    type="password"
                                    placeholder="Nhập mật khẩu hiện tại"
                                    value={disablePassword}
                                    onChange={e => setDisablePassword(e.target.value)}
                                />
                            </div>
                            <Button type="button" variant="primary" style={{ background: '#dc2626' }} onClick={disable2FA} disabled={!disablePassword}>
                                Tắt 2FA
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => setShowDisableForm(false)}>Hủy</Button>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 items-center justify-end" style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    {saveSuccess && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontSize: '0.875rem', fontWeight: 500 }}>
                            <CheckCircle2 size={18} /> Đã cập nhật thành công
                        </div>
                    )}
                    <Button type="submit" disabled={isSaving} className="gap-2">
                        <Save size={18} /> {isSaving ? 'Đang lưu...' : 'Lưu Hồ sơ'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
