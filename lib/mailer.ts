import nodemailer from 'nodemailer';
import { prisma } from './prisma';

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

    // 1. Create EmailLog in database first to get the trackingId
    const emailLog = await (prisma as any).emailLog.create({
        data: {
            toEmail: to,
            subject,
            body: htmlBody, // Might want to sanitize or store raw
            status: 'SENT',
            senderId,
            customerId,
            estimateId,
            invoiceId,
            leadId,
        }
    });

    // 2. Inject Tracking Pixel into HTML body
    const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/track?id=${emailLog.trackingId}`;
    const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" />`;
    const finalHtml = `${htmlBody}${trackingPixel}`;

    const fromName = config.SMTP_FROM_NAME || process.env.SMTP_FROM_NAME || 'ERP System';
    const fromEmail = config.SMTP_FROM_EMAIL || config.SMTP_USER || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    // Handle Attachments
    const attachments = [];
    if (attachmentName && attachmentBase64) {
        // Strip out the data:application/pdf;base64, prefix if it's there
        const base64Data = attachmentBase64.replace(/^data:application\/pdf;base64,/, "");
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
