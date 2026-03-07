import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { triggerPusherEvent } from './pusher-server';

interface SendEmailParams {
    to: string;
    subject: string;
    htmlBody: string;
    senderId?: string;
    customerId?: string;
    estimateId?: string;
    invoiceId?: string;
    leadId?: string;
    attachmentName?: string;
    attachmentBase64?: string;
}

export async function sendEmailWithTracking(params: SendEmailParams) {
    const { to, subject, htmlBody, senderId, customerId, estimateId, invoiceId, leadId, attachmentName, attachmentBase64 } = params;

    // Fetch Email Configuration from Database
    const settings = await prisma.systemSetting.findMany({
        where: { key: { startsWith: 'SMTP_' } }
    });

    const config: Record<string, string> = {};
    settings.forEach(s => config[s.key] = s.value);

    // Create a transporter object dynamically
    const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(config.SMTP_PORT || process.env.SMTP_PORT || '587'),
        secure: (config.SMTP_SECURE === 'true') || (process.env.SMTP_SECURE === 'true'),
        auth: {
            user: config.SMTP_USER || process.env.SMTP_USER,
            pass: config.SMTP_PASS || process.env.SMTP_PASS,
        },
        tls: config.SMTP_IGNORE_TLS === 'true' ? { rejectUnauthorized: false } : undefined
    });

    const trackingId = require('crypto').randomUUID();

    // 1. Prepare Tracking HTML first
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inside.tsol.vn';
    const trackingPixelUrl = `${appUrl}/api/email/track?id=${trackingId}`;
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" />`;

    let processedHtml = htmlBody;
    const urlRegex = /href=["']([^"']+)["']/g;
    processedHtml = processedHtml.replace(urlRegex, (match, url) => {
        if (url.startsWith('http')) {
            const clickUrl = `${appUrl}/api/email/click?id=${trackingId}&url=${encodeURIComponent(url)}`;
            return `href="${clickUrl}"`;
        }
        return match;
    });

    const finalHtml = `${processedHtml}${trackingPixel}`;

    // 2. Create EmailLog in database with the exact finalHtml and generated trackingId
    const emailLog = await (prisma as any).emailLog.create({
        data: {
            trackingId: trackingId,
            toEmail: to,
            subject,
            body: finalHtml,
            status: 'SENT',
            senderId,
            customerId,
            estimateId,
            invoiceId,
            leadId,
        }
    });

    if (senderId) {
        await triggerPusherEvent(`user-${senderId}`, 'new-notification', { type: 'SILENT_REFRESH' });
    }

    const fromName = config.SMTP_FROM_NAME || process.env.SMTP_FROM_NAME || 'ERP System';
    const fromEmail = config.SMTP_FROM_EMAIL || config.SMTP_USER || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    // Handle Attachments
    const attachments = [];
    if (attachmentName && attachmentBase64) {
        let base64Data = attachmentBase64;
        if (attachmentBase64.includes('base64,')) {
            base64Data = attachmentBase64.split('base64,')[1];
        }
        attachments.push({
            filename: attachmentName,
            content: Buffer.from(base64Data, 'base64'),
            contentType: 'application/pdf'
        });
    }

    // 3. Send the email
    try {
        const info = await transporter.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject,
            html: finalHtml,
            attachments: attachments.length > 0 ? attachments : undefined
        });

        console.log("Message sent: %s", info.messageId);
        return { success: true, emailLogId: emailLog.id };
    } catch (error: any) {
        console.error("Error sending email: ", error);

        // Update log status to failed
        await (prisma as any).emailLog.update({
            where: { id: emailLog.id },
            data: { status: 'FAILED' }
        });

        return { success: false, error: error.message };
    }
}
