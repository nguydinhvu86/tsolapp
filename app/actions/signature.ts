'use server'

import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { createNotification } from '@/app/notifications/actions';
import { sendWebPushNotification } from '@/lib/notifications/webPush';
import { sendEmailWithTracking } from '@/lib/mailer';
import { formatMoney, formatDateTime } from '@/lib/utils/formatters';

interface SignatureMetadata {
    location?: string;
    userAgent?: string;
}

function generateSignatureEmailHtml(params: {
    documentType: string;
    documentCode: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    totalAmount: number;
    signedAt: Date;
    ip: string;
    location?: string;
    device?: string;
    signatureDataUrl?: string;
    documentUrl: string;
    recipientName: string;
}) {
    const formattedAmount = formatMoney(params.totalAmount);
    const formattedDate = formatDateTime(params.signedAt);

    return `
    <div style="background-color: #f1f5f9; padding: 30px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
                <div style="display: inline-block; padding: 6px 14px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; color: #34d399; margin-bottom: 10px;">
                    ✍️ XÁC NHẬN CHỮ KÝ ĐIỆN TỬ
                </div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                    Khách Hàng Đã Ký Xác Nhận
                </h1>
                <p style="margin: 6px 0 0 0; font-size: 14px; color: #94a3b8;">
                    ${params.documentType}: <strong style="color: #38bdf8;">#${params.documentCode}</strong>
                </p>
            </div>

            <!-- Body -->
            <div style="padding: 28px 24px;">
                <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                    Xin chào <strong>${params.recipientName}</strong>,
                </p>
                <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                    Hệ thống ghi nhận khách hàng <strong>${params.customerName}</strong> vừa thực hiện ký xác nhận điện tử cho chứng từ <strong>${params.documentCode}</strong>. Dưới đây là thông tin chi tiết:
                </p>

                <!-- Document Info Card -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; width: 40%;">Loại chứng từ:</td>
                            <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${params.documentType}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Mã số chứng từ:</td>
                            <td style="padding: 6px 0; font-weight: 700; color: #0284c7; font-family: monospace; font-size: 15px;">${params.documentCode}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Khách hàng:</td>
                            <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${params.customerName}</td>
                        </tr>
                        ${params.customerPhone && params.customerPhone !== '---' ? `
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Số điện thoại:</td>
                            <td style="padding: 6px 0; color: #334155;">${params.customerPhone}</td>
                        </tr>` : ''}
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Tổng giá trị:</td>
                            <td style="padding: 6px 0; font-weight: 800; color: #16a34a; font-size: 16px;">${formattedAmount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Thời gian ký:</td>
                            <td style="padding: 6px 0; color: #334155;">${formattedDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Địa chỉ IP / Vị trí:</td>
                            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">${params.ip}${params.location ? ` • ${params.location}` : ''}</td>
                        </tr>
                    </table>
                </div>

                ${params.signatureDataUrl ? `
                <!-- Signature Preview -->
                <div style="margin-bottom: 24px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
                        Hình ảnh chữ ký xác nhận
                    </div>
                    <div style="display: inline-block; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 20px;">
                        <img src="${params.signatureDataUrl}" alt="Chữ ký" style="max-height: 70px; max-width: 200px; object-fit: contain; display: block; margin: 0 auto;" />
                    </div>
                </div>` : ''}

                <!-- Action CTA Button -->
                <div style="text-align: center; margin: 28px 0 10px 0;">
                    <a href="${params.documentUrl}" target="_blank" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 13px 32px; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);">
                        Xem Chi Tiết Chứng Từ &rarr;
                    </a>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                Đây là thông báo tự động từ hệ thống <strong>T-SOLUTION Business Platform</strong>.<br />
                Vui lòng không trả lời trực tiếp email này.
            </div>
        </div>
    </div>
    `;
}

async function notifyResponsibleUsers(params: {
    documentType: string;
    documentCode: string;
    documentId: string;
    customerId?: string | null;
    customerName: string;
    customerPhone?: string | null;
    customerEmail?: string | null;
    totalAmount: number;
    signedAt: Date;
    ip: string;
    location?: string;
    device?: string;
    signatureDataUrl: string;
    linkUrl: string;
    recipients: { id: string; name?: string | null; email?: string | null }[];
    estimateId?: string;
    invoiceId?: string;
}) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inside.tsol.vn';
    const notifTitle = `Khách hàng đã ký ${params.documentType} ${params.documentCode}`;
    const notifMessage = `Khách hàng "${params.customerName}" vừa ký xác nhận điện tử cho ${params.documentType} ${params.documentCode} (Giá trị: ${formatMoney(params.totalAmount)}).`;

    // Filter unique recipients
    const uniqueMap = new Map<string, { id: string; name?: string | null; email?: string | null }>();
    for (const r of params.recipients) {
        if (r && r.id && !uniqueMap.has(r.id)) {
            uniqueMap.set(r.id, r);
        }
    }

    const uniqueRecipients = Array.from(uniqueMap.values());

    for (const user of uniqueRecipients) {
        try {
            // 1. Web Notification (Database & Pusher realtime popup)
            await createNotification(
                user.id,
                notifTitle,
                notifMessage,
                'SUCCESS',
                params.linkUrl
            );

            // 2. Mobile App Push Notification (WebPush / PWA)
            await sendWebPushNotification(user.id, {
                title: notifTitle,
                body: notifMessage,
                url: params.linkUrl
            });

            // 3. Email Notification
            if (user.email) {
                const subject = `[Ký nhận điện tử] Khách hàng ${params.customerName} đã ký xác nhận ${params.documentType} ${params.documentCode}`;
                const htmlBody = generateSignatureEmailHtml({
                    documentType: params.documentType,
                    documentCode: params.documentCode,
                    customerName: params.customerName,
                    customerPhone: params.customerPhone || '---',
                    customerEmail: params.customerEmail || '---',
                    totalAmount: params.totalAmount,
                    signedAt: params.signedAt,
                    ip: params.ip,
                    location: params.location,
                    device: params.device,
                    signatureDataUrl: params.signatureDataUrl,
                    documentUrl: `${appUrl}${params.linkUrl}`,
                    recipientName: user.name || 'Quý đồng nghiệp'
                });

                await sendEmailWithTracking({
                    to: user.email,
                    subject,
                    htmlBody,
                    senderId: user.id,
                    customerId: params.customerId || undefined,
                    estimateId: params.estimateId,
                    invoiceId: params.invoiceId
                });
            }
        } catch (err) {
            console.error(`Error notifying user ${user.id} for document signature:`, err);
        }
    }
}

export async function saveDocumentSignature(
    entityType: 'SALES_ESTIMATE' | 'SALES_ORDER' | 'SALES_INVOICE' | 'CASH_TRANSACTION' | 'SALES_PAYMENT' | 'PURCHASE_PAYMENT', 
    entityId: string, 
    role: 'CUSTOMER' | 'COMPANY' | 'PAYER_RECEIVER' | 'SUPPLIER', 
    signatureDataUrl: string, 
    companySignerId?: string,
    meta?: SignatureMetadata
) {
    if (!entityId || !signatureDataUrl) throw new Error('Missing parameters');

    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'Unknown IP');
    const rawUserAgent = headersList.get('user-agent') || meta?.userAgent || 'Unknown Device';

    const now = new Date();
    const updateData: any = {};

    if (role === 'CUSTOMER' || role === 'PAYER_RECEIVER' || role === 'SUPPLIER') {
        if (entityType === 'CASH_TRANSACTION') {
            updateData.payerSignature = signatureDataUrl;
            updateData.payerSignedAt = now;
            updateData.payerSignIP = ip;
            updateData.payerSignDevice = rawUserAgent.substring(0, 190);
            if (meta?.location) updateData.payerSignLocation = meta.location;
        } else if (entityType === 'PURCHASE_PAYMENT') {
            updateData.supplierSignature = signatureDataUrl;
            updateData.supplierSignedAt = now;
            updateData.supplierSignIP = ip;
            updateData.supplierSignDevice = rawUserAgent.substring(0, 190);
            if (meta?.location) updateData.supplierSignLocation = meta.location;
        } else {
            updateData.customerSignature = signatureDataUrl;
            updateData.customerSignedAt = now;
            updateData.customerSignIP = ip;
            updateData.customerSignDevice = rawUserAgent.substring(0, 190);
            if (meta?.location) updateData.customerSignLocation = meta.location;
        }
    } else if (role === 'COMPANY') {
        updateData.companySignature = signatureDataUrl;
        updateData.companySignedAt = now;
        if (companySignerId) {
            updateData.companySignerId = companySignerId;
        }
    } else {
         throw new Error('Invalid role');
    }

    try {
        switch (entityType) {
            case 'SALES_ESTIMATE': {
                await prisma.salesEstimate.update({ where: { id: entityId }, data: updateData });

                // If customer signed, dispatch notifications to responsible staff
                if (role === 'CUSTOMER') {
                    const estimate = await prisma.salesEstimate.findUnique({
                        where: { id: entityId },
                        include: {
                            customer: true,
                            creator: { select: { id: true, name: true, email: true } },
                            managers: { select: { id: true, name: true, email: true } }
                        }
                    });

                    if (estimate) {
                        // Log activity
                        await prisma.salesEstimateActivityLog.create({
                            data: {
                                estimateId: entityId,
                                userId: estimate.creatorId,
                                action: 'CUSTOMER_SIGNED',
                                details: `Khách hàng "${estimate.customer?.name || 'Khách'}" đã ký xác nhận điện tử từ IP: ${ip}`
                            }
                        }).catch(e => console.error('Error logging estimate activity:', e));

                        // Collect recipients: creator + managers
                        const recipients: { id: string; name?: string | null; email?: string | null }[] = [];
                        if (estimate.creator) recipients.push(estimate.creator);
                        if (estimate.managers && estimate.managers.length > 0) {
                            recipients.push(...estimate.managers);
                        }

                        await notifyResponsibleUsers({
                            documentType: 'Báo Giá',
                            documentCode: estimate.code,
                            documentId: estimate.id,
                            customerId: estimate.customerId,
                            customerName: estimate.customer?.name || 'Khách hàng',
                            customerPhone: estimate.customer?.phone,
                            customerEmail: estimate.customer?.email,
                            totalAmount: estimate.totalAmount || 0,
                            signedAt: now,
                            ip,
                            location: meta?.location,
                            device: rawUserAgent,
                            signatureDataUrl,
                            linkUrl: `/sales/estimates/${estimate.id}`,
                            recipients,
                            estimateId: estimate.id
                        });
                    }
                }
                break;
            }
            case 'SALES_INVOICE': {
                await prisma.salesInvoice.update({ where: { id: entityId }, data: updateData });

                // If customer signed, dispatch notifications to responsible staff
                if (role === 'CUSTOMER') {
                    const invoice = await prisma.salesInvoice.findUnique({
                        where: { id: entityId },
                        include: {
                            customer: true,
                            creator: { select: { id: true, name: true, email: true } },
                            salesperson: { select: { id: true, name: true, email: true } },
                            managers: { select: { id: true, name: true, email: true } }
                        }
                    });

                    if (invoice) {
                        // Log activity
                        await prisma.salesInvoiceActivityLog.create({
                            data: {
                                invoiceId: entityId,
                                userId: invoice.creatorId,
                                action: 'CUSTOMER_SIGNED',
                                details: `Khách hàng "${invoice.customer?.name || 'Khách'}" đã ký xác nhận điện tử từ IP: ${ip}`
                            }
                        }).catch(e => console.error('Error logging invoice activity:', e));

                        // Collect recipients: creator + salesperson + managers
                        const recipients: { id: string; name?: string | null; email?: string | null }[] = [];
                        if (invoice.creator) recipients.push(invoice.creator);
                        if (invoice.salesperson) recipients.push(invoice.salesperson);
                        if (invoice.managers && invoice.managers.length > 0) {
                            recipients.push(...invoice.managers);
                        }

                        await notifyResponsibleUsers({
                            documentType: 'Hóa Đơn Bán Hàng',
                            documentCode: invoice.code,
                            documentId: invoice.id,
                            customerId: invoice.customerId,
                            customerName: invoice.customer?.name || 'Khách hàng',
                            customerPhone: invoice.customer?.phone,
                            customerEmail: invoice.customer?.email,
                            totalAmount: invoice.totalAmount || 0,
                            signedAt: now,
                            ip,
                            location: meta?.location,
                            device: rawUserAgent,
                            signatureDataUrl,
                            linkUrl: `/sales/invoices/${invoice.id}`,
                            recipients,
                            invoiceId: invoice.id
                        });
                    }
                }
                break;
            }
            case 'SALES_ORDER': {
                await prisma.salesOrder.update({ where: { id: entityId }, data: updateData });
                if (role === 'CUSTOMER') {
                    const order = await prisma.salesOrder.findUnique({
                        where: { id: entityId },
                        include: {
                            customer: true,
                            creator: { select: { id: true, name: true, email: true } }
                        }
                    });
                    if (order && order.creator) {
                        await notifyResponsibleUsers({
                            documentType: 'Đơn Hàng Bán',
                            documentCode: order.code,
                            documentId: order.id,
                            customerId: order.customerId,
                            customerName: order.customer?.name || 'Khách hàng',
                            customerPhone: order.customer?.phone,
                            customerEmail: order.customer?.email,
                            totalAmount: order.totalAmount || 0,
                            signedAt: now,
                            ip,
                            location: meta?.location,
                            device: rawUserAgent,
                            signatureDataUrl,
                            linkUrl: `/sales/orders/${order.id}`,
                            recipients: [order.creator]
                        });
                    }
                }
                break;
            }
            case 'CASH_TRANSACTION':
                await prisma.cashTransaction.update({ where: { id: entityId }, data: updateData });
                break;
            case 'SALES_PAYMENT':
                await prisma.salesPayment.update({ where: { id: entityId }, data: updateData });
                break;
            case 'PURCHASE_PAYMENT':
                await prisma.purchasePayment.update({ where: { id: entityId }, data: updateData });
                break;
            default:
                throw new Error('Unsupported entity type');
        }
        return { success: true };
    } catch (error) {
        console.error('Save signature error:', error);
        return { success: false, error: 'Failed to save signature' };
    }
}
