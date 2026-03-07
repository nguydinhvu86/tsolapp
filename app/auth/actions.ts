'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const EMAIL_SETTING_KEYS = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_IGNORE_TLS',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM_NAME',
    'SMTP_FROM_EMAIL'
];

async function getSmtpTransporter() {
    const settings = await prisma.systemSetting.findMany({
        where: { key: { in: EMAIL_SETTING_KEYS } }
    });

    const data: Record<string, string> = {};
    settings.forEach(s => data[s.key] = s.value);

    // Ensure we have minimal credentials
    if (!data.SMTP_HOST || !data.SMTP_USER || !data.SMTP_PASS) {
        throw new Error('Hệ thống chưa cấu hình SMTP. Vui lòng liên hệ quản trị viên.');
    }

    return {
        transporter: nodemailer.createTransport({
            host: data.SMTP_HOST || '',
            port: parseInt(data.SMTP_PORT || '587'),
            secure: data.SMTP_SECURE === 'true',
            auth: {
                user: data.SMTP_USER,
                pass: data.SMTP_PASS,
            },
            tls: data.SMTP_IGNORE_TLS === 'true' ? { rejectUnauthorized: false } : undefined
        }),
        from: `"${data.SMTP_FROM_NAME || 'ContractMgr System'}" <${data.SMTP_FROM_EMAIL || data.SMTP_USER}>`
    };
}

export async function requestPasswordReset(email: string) {
    if (!email) {
        return { success: false, error: 'Vui lòng cung cấp email hợp lệ.' };
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        // Return success even if user not found to prevent email enumeration
        if (!user) {
            return {
                success: true,
                message: 'Nếu email này có trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi đến hộp thư của bạn.'
            };
        }

        // Generate a secure 64-hex token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry: tokenExpiry
            }
        });

        // Send email with reset token
        const { transporter, from } = await getSmtpTransporter();
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

        await transporter.sendMail({
            from,
            to: email,
            subject: 'Yêu cầu đặt lại mật khẩu - ContractMgr',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
                    <h2 style="color: #4f46e5;">Yêu cầu Đặt lại Mật khẩu</h2>
                    <p>Xin chào ${user.name || user.email},</p>
                    <p>Hệ thống vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                    <p>Vui lòng nhấp vào nút bên dưới để tiến hành đặt mới mật khẩu. Liên kết này sẽ hết hạn sau 1 giờ.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            Đặt lại mật khẩu
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #64748b;">
                        Nếu nút bấm không hoạt động, bạn có thể copy đường dẫn sau: <br />
                        <a href="${resetLink}" style="color: #4f46e5; word-break: break-all;">${resetLink}</a>
                    </p>
                    <p style="font-size: 14px; color: #ef4444; margin-top: 20px;">
                        * Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                    </p>
                </div>
            `
        });

        return {
            success: true,
            message: 'Nếu email này có trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi đến hộp thư của bạn.'
        };

    } catch (error: any) {
        console.error("Lỗi khi yêu cầu đặt lại mật khẩu:", error);
        return { success: false, error: error.message || 'Lỗi hệ thống khi gửi email. Vui lòng thử lại sau.' };
    }
}

export async function resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
        return { success: false, error: 'Thiếu thông tin token hoặc mật khẩu mới.' };
    }

    if (newPassword.length < 6) {
        return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' };
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date() // Must be in the future
                }
            }
        });

        if (!user) {
            return { success: false, error: 'Mã khôi phục không hợp lệ hoặc đã hết hạn.' };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
                twoFactorEnabled: false,
                twoFactorSecret: null
            }
        });

        return { success: true, message: 'Đổi mật khẩu thành công.' };
    } catch (error: any) {
        console.error("Lỗi đặt lại mật khẩu:", error);
        return { success: false, error: 'Lỗi hệ thống khi đặt lại mật khẩu.' };
    }
}
