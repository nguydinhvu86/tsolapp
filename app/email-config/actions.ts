'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';
import nodemailer from 'nodemailer';
import { verifyActionPermission } from '@/lib/permissions';

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

export async function getEmailSettings() {
    await verifyActionPermission('SETTINGS_VIEW_ALL');

    const settings = await prisma.systemSetting.findMany({
        where: { key: { in: EMAIL_SETTING_KEYS } }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(s => settingsMap[s.key] = s.value);
    return settingsMap;
}

export async function updateEmailSettings(data: Record<string, string>) {
    await verifyActionPermission('SETTINGS_EDIT');

    // Upsert từng key
    for (const key of Object.keys(data)) {
        if (!EMAIL_SETTING_KEYS.includes(key)) continue;

        await prisma.systemSetting.upsert({
            where: { key },
            update: { value: data[key] },
            create: { key, value: data[key] }
        });
    }

    revalidatePath('/email-config');

    return { success: true };
}

export async function testEmailConnection(data: Record<string, string>) {
    const user = await verifyActionPermission('SETTINGS_EDIT');
    if (!user) throw new Error('Unauthorized');
    
    try {
        const transporter = nodemailer.createTransport({
            host: data.SMTP_HOST || '',
            port: parseInt(data.SMTP_PORT || '587'),
            secure: data.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: data.SMTP_USER,
                pass: data.SMTP_PASS,
            },
            tls: data.SMTP_IGNORE_TLS === 'true' ? { rejectUnauthorized: false } : undefined
        });

        // Verify connection configuration
        await transporter.verify();

        // Optional: Send a test email
        await transporter.sendMail({
            from: `"${data.SMTP_FROM_NAME || 'Test System'}" <${data.SMTP_FROM_EMAIL || data.SMTP_USER}>`,
            to: (user as any).email || data.SMTP_USER, // Gửi về chính email đang đăng nhập hoặc email config
            subject: 'Test Email Configuration - ContractMgr',
            html: '<p>Cấu hình hệ thống Email của bạn đang hoạt động bình thường!</p>',
        });

        return { success: true, message: 'Kết nối máy chủ Email thành công và email kiểm tra đã được gửi.' };
    } catch (error: any) {
        console.error("SMTP Test Error:", error);
        return { success: false, error: error.message || 'Lỗi kết nối máy chủ Email.' };
    }
}
