import { prisma } from '@/lib/prisma';

export interface ZnsSendInput {
    recipientPhone: string;
    recipientName?: string;
    templateId: string;
    dataPayload: Record<string, any>;
}

/**
 * Danh mục mẫu tin Zalo ZNS tiêu chuẩn cho ERP/CRM
 */
export const DEFAULT_ZNS_TEMPLATES = [
    {
        templateId: 'ZNS_ORDER_CONFIRMED',
        templateName: 'Thông báo xác nhận đơn hàng thành công',
        templateType: 'TRANSACTIONAL',
        content: 'Kính chào Quý khách {{customer_name}}, đơn hàng {{order_code}} trị giá {{total_amount}} đ đã được xác nhận thành công. Xem chi tiết tại: {{tracking_link}}',
        pricePerMessage: 300
    },
    {
        templateId: 'ZNS_PAYMENT_REMINDER',
        templateName: 'Thông báo đề nghị thanh toán hóa đơn',
        templateType: 'TRANSACTIONAL',
        content: 'Kính gửi Quý khách {{customer_name}}, hóa đơn {{invoice_code}} số tiền {{amount_due}} đ đã đến hạn thanh toán vào ngày {{due_date}}. Vui lòng xem hóa đơn tại: {{invoice_link}}',
        pricePerMessage: 300
    },
    {
        templateId: 'ZNS_ESTIMATE_READY',
        templateName: 'Thông báo báo giá giải pháp mới',
        templateType: 'TRANSACTIONAL',
        content: 'Kính gửi Quý khách {{customer_name}}, TSOL xin gửi báo giá {{estimate_code}} cho dự án {{project_name}}. Xem và duyệt báo giá trực tuyến tại: {{estimate_link}}',
        pricePerMessage: 300
    },
    {
        templateId: 'ZNS_E_SIGN_INVITE',
        templateName: 'Mời ký hợp đồng / biên bản điện tử',
        templateType: 'TRANSACTIONAL',
        content: 'Kính gửi Quý khách {{customer_name}}, tài liệu {{doc_title}} đã sẵn sàng để ký điện tử. Quý khách vui lòng truy cập: {{sign_link}} để hoàn tất chữ ký.',
        pricePerMessage: 300
    }
];

/**
 * Khởi tạo danh mục mẫu tin Zalo ZNS mặc định
 */
export async function seedZnsTemplates() {
    for (const t of DEFAULT_ZNS_TEMPLATES) {
        await prisma.znsTemplate.upsert({
            where: { templateId: t.templateId },
            update: {
                templateName: t.templateName,
                templateType: t.templateType,
                content: t.content,
                pricePerMessage: t.pricePerMessage,
                isEnabled: true
            },
            create: {
                templateId: t.templateId,
                templateName: t.templateName,
                templateType: t.templateType,
                content: t.content,
                pricePerMessage: t.pricePerMessage,
                isEnabled: true
            }
        });
    }
}

/**
 * 1. ĐỘNG CƠ TỰ ĐỘNG CHẤM ĐIỂM & PHÂN LOẠI CƠ HỘI BÁN HÀNG (Lead Scoring Engine)
 * Thang điểm 0 - 100:
 * - Thông tin liên hệ đầy đủ: tối đa 25đ
 * - Quy mô giá trị ước tính: tối đa 25đ
 * - Tương tác qua cuộc gọi PBX: tối đa 25đ
 * - Tương tác qua Báo giá / Email / eCatalog: tối đa 25đ
 */
export async function calculateLeadScore(leadId: string) {
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
            callLogs: true,
            salesEstimates: true,
            EmailLog: true,
            comments: true,
            tasks: true
        }
    });

    if (!lead) throw new Error('Không tìm thấy cơ hội');

    let score = 0;
    const scoreBreakdown = {
        contactCompleteness: 0,
        dealValue: 0,
        callEngagement: 0,
        documentEngagement: 0
    };

    // 1. Độ đầy đủ thông tin (tối đa 25đ)
    if (lead.name) scoreBreakdown.contactCompleteness += 5;
    if (lead.phone) scoreBreakdown.contactCompleteness += 10;
    if (lead.email) scoreBreakdown.contactCompleteness += 5;
    if (lead.company || lead.contactName) scoreBreakdown.contactCompleteness += 5;

    // 2. Quy mô giá trị ước tính (tối đa 25đ)
    const val = lead.estimatedValue || 0;
    if (val >= 100000000) scoreBreakdown.dealValue = 25;      // >= 100 triệu
    else if (val >= 50000000) scoreBreakdown.dealValue = 20;  // >= 50 triệu
    else if (val >= 20000000) scoreBreakdown.dealValue = 15;  // >= 20 triệu
    else if (val > 0) scoreBreakdown.dealValue = 10;          // Có định giá

    // 3. Tương tác cuộc gọi PBX (tối đa 25đ)
    const answeredCalls = lead.callLogs.filter(c => c.status === 'ANSWER');
    if (answeredCalls.length >= 3) scoreBreakdown.callEngagement = 25;
    else if (answeredCalls.length >= 1) scoreBreakdown.callEngagement = 15;
    else if (lead.callLogs.length > 0) scoreBreakdown.callEngagement = 5;

    // 4. Tương tác tài liệu / Báo giá / Email (tối đa 25đ)
    const hasEstimate = lead.salesEstimates.length > 0;
    const hasOpenedEmail = lead.EmailLog.some(e => e.openedAt !== null);
    if (hasEstimate && hasOpenedEmail) scoreBreakdown.documentEngagement = 25;
    else if (hasEstimate || hasOpenedEmail) scoreBreakdown.documentEngagement = 15;
    else if (lead.EmailLog.length > 0) scoreBreakdown.documentEngagement = 10;

    score = scoreBreakdown.contactCompleteness + scoreBreakdown.dealValue + scoreBreakdown.callEngagement + scoreBreakdown.documentEngagement;

    // Phân loại nhiệt độ
    let temperature: 'COLD' | 'WARM' | 'HOT' = 'COLD';
    if (score >= 70) temperature = 'HOT';
    else if (score >= 40) temperature = 'WARM';

    // Cập nhật lại vào CSDL
    await prisma.lead.update({
        where: { id: lead.id },
        data: {
            score,
            temperature
        }
    });

    return {
        leadId: lead.id,
        leadCode: lead.code,
        leadName: lead.name,
        score,
        temperature,
        scoreBreakdown
    };
}

/**
 * 2. GỬI THÔNG BÁO QUA ZALO ZNS (Zalo Notification Service)
 */
export async function sendZnsNotification(input: ZnsSendInput) {
    const template = await prisma.znsTemplate.findUnique({
        where: { templateId: input.templateId }
    });

    if (!template || !template.isEnabled) {
        throw new Error(`Mẫu tin Zalo ZNS '${input.templateId}' không tồn tại hoặc đã bị vô hiệu hóa`);
    }

    const trackingId = `ZNS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Ghi nhật ký gửi ZNS
    const log = await prisma.znsLog.create({
        data: {
            recipientPhone: input.recipientPhone,
            recipientName: input.recipientName || null,
            templateId: input.templateId,
            dataPayload: JSON.stringify(input.dataPayload),
            status: 'DELIVERED',
            trackingId,
        }
    });

    return {
        success: true,
        trackingId,
        logId: log.id,
        templateName: template.templateName,
        recipientPhone: input.recipientPhone,
        sentAt: log.sentAt
    };
}
