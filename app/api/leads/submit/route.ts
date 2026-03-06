import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/app/notifications/actions';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { formId, name, phone, email, company, notes } = body;

        if (!formId || !name || !phone || !notes) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc (Họ Tên, Số điện thoại hoặc Ghi chú)' }, { status: 400 });
        }

        // 1. Kiểm tra Form
        const leadForm = await prisma.leadForm.findUnique({
            where: { id: formId }
        });

        if (!leadForm) {
            return NextResponse.json({ success: false, error: 'Biểu mẫu cấu hình không tồn tại' }, { status: 404 });
        }

        if (!leadForm.isActive) {
            return NextResponse.json({ success: false, error: 'Biểu mẫu này đã bị khóa' }, { status: 403 });
        }

        // 2. Tạo Mã Lead
        const date = new Date();
        const yy = String(date.getFullYear()).slice(2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const prefix = `LEAD-${yy}${mm}-`;

        // 3. Tạo Lead trong hệ thống (nằm trong transaction để đảm bảo mã code không trùng lặp)
        const leadFormTitle = leadForm.title;
        const leadFormSource = leadForm.source;

        const newLead = await prisma.$transaction(async (tx) => {
            const lastLead = await tx.lead.findFirst({
                where: { code: { startsWith: prefix } },
                orderBy: { code: 'desc' }
            });

            let nextSequence = '0001';
            if (lastLead && lastLead.code) {
                const parts = lastLead.code.split('-');
                if (parts.length === 3) {
                    const lastNumber = parseInt(parts[2], 10);
                    if (!isNaN(lastNumber)) {
                        nextSequence = String(lastNumber + 1).padStart(4, '0');
                    }
                }
            }
            const finalCode = `${prefix}${nextSequence}`;

            return await tx.lead.create({
                data: {
                    code: finalCode,
                    name: `Cơ hội từ: ${name} (${phone})`,
                    contactName: name,
                    phone: phone,
                    email: email || null,
                    company: company || null,
                    notes: notes || null,
                    source: leadFormSource,
                    status: 'NEW',
                    assignedToId: leadForm.assigneeId || null,
                }
            });
        });

        // 4. Tìm ID user để log (Ưu tiên assignee, nếu không có lấy admin đầu tiên)
        let logUserId = leadForm.assigneeId;
        if (!logUserId) {
            const fallbackAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
            if (fallbackAdmin) {
                logUserId = fallbackAdmin.id;
            }
        }

        // 5. Log sự kiện & Gửi Thông Báo
        if (logUserId) {
            await prisma.leadActivityLog.create({
                data: {
                    leadId: newLead.id,
                    userId: logUserId,
                    action: 'TẠO_MỚI',
                    details: `Tạo từ Form: ${leadForm.title}`
                }
            });

            // Gửi thông báo tới người phụ trách
            await createNotification(
                logUserId,
                `Có Cơ hội bán hàng mới: ${name}`,
                `Khách hàng mới vừa đăng ký từ biểu mẫu ${leadForm.title}. Vui lòng kiểm tra và liên hệ.`,
                'INFO',
                `/sales/leads/${newLead.id}`
            );
        }

        return NextResponse.json({
            success: true,
            message: leadForm.successMessage || 'Cảm ơn bạn đã gửi thông tin.'
        }, { status: 201 });

    } catch (error: any) {
        console.error("Lỗi khi nhận Lead Submit API:", error);
        return NextResponse.json({ success: false, error: 'Đã xảy ra lỗi hệ thống khi lưu Cơ hội' }, { status: 500 });
    }
}
