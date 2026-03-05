'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/authOptions";
import { sendEmailWithTracking } from '@/lib/mailer';

// 1. Get List of Leads
export async function getLeads() {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        const leads = await prisma.lead.findMany({
            include: {
                assignedTo: { select: { id: true, name: true, avatar: true } },
                customer: { select: { id: true, name: true, email: true, phone: true } }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        return leads;
    } catch (error) {
        console.error('Error fetching leads:', error);
        throw new Error('Không thể tải dữ liệu Cơ hội bán hàng');
    }
}

// 2. Get Single Lead by ID
export async function getLeadById(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        const lead = await prisma.lead.findUnique({
            where: { id },
            include: {
                assignedTo: { select: { id: true, name: true, avatar: true } },
                customer: { select: { id: true, name: true, phone: true, email: true } },
                activityLogs: {
                    include: {
                        user: { select: { id: true, name: true, avatar: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                tasks: {
                    include: {
                        assignees: {
                            include: { user: { select: { name: true, avatar: true } } }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!lead) throw new Error('Lead not found');

        return lead;
    } catch (error) {
        console.error('Error fetching lead details:', error);
        throw new Error('Không thể tải chi tiết Cơ hội bán hàng');
    }
}

// 3. Create Lead
export async function createLead(data: {
    name: string;
    company?: string | null;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    customerId?: string | null;
    source?: string | null;
    status: string;
    estimatedValue?: number | null;
    expectedCloseDate?: Date | null;
    notes?: string | null;
    assignedToId?: string | null;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        // Generate a code LEAD-YYYYMM-001
        const date = new Date();
        const yy = String(date.getFullYear()).slice(2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const prefix = `LEAD-${yy}${mm}-`;

        // Run in transaction to get safe code
        const result = await prisma.$transaction(async (tx) => {
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

            const newLead = await tx.lead.create({
                data: {
                    code: finalCode,
                    name: data.name,
                    company: data.company,
                    contactName: data.contactName,
                    email: data.email,
                    phone: data.phone,
                    customerId: data.customerId,
                    source: data.source,
                    status: data.status,
                    estimatedValue: data.estimatedValue,
                    expectedCloseDate: data.expectedCloseDate,
                    notes: data.notes,
                    assignedToId: data.assignedToId || session.user.id,
                }
            });

            // Tao Activity Log
            await tx.leadActivityLog.create({
                data: {
                    leadId: newLead.id,
                    userId: session.user.id,
                    action: "TẠO_MỚI",
                    details: `Tạo cơ hội bán hàng mới: ${newLead.code}`
                }
            });

            return newLead;
        });

        return result;
    } catch (error) {
        console.error('Error creating lead:', error);
        throw new Error('Không thể tạo Cơ hội bán hàng');
    }
}

// 4. Update Lead
export async function updateLead(id: string, data: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        const lead = await prisma.lead.update({
            where: { id },
            data: {
                name: data.name,
                company: data.company,
                contactName: data.contactName,
                email: data.email,
                phone: data.phone,
                customerId: data.customerId,
                source: data.source,
                estimatedValue: data.estimatedValue,
                expectedCloseDate: data.expectedCloseDate,
                notes: data.notes,
                assignedToId: data.assignedToId,
            }
        });

        // Log
        await prisma.leadActivityLog.create({
            data: {
                leadId: id,
                userId: session.user.id,
                action: "CẬP_NHẬT_THÔNG_TIN",
                details: "Cập nhật thông tin chung của Cơ hội bán hàng."
            }
        });

        return lead;
    } catch (error) {
        console.error('Error updating lead:', error);
        throw new Error('Không thể cập nhật Cơ hội bán hàng');
    }
}

// 5. Update Status (Kanban Drop)
export async function updateLeadStatus(id: string, status: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        const oldLead = await prisma.lead.findUnique({ where: { id } });

        const lead = await prisma.lead.update({
            where: { id },
            data: { status }
        });

        await prisma.leadActivityLog.create({
            data: {
                leadId: id,
                userId: session.user.id,
                action: "CHUYỂN_TRẠNG_THÁI",
                details: `Đổi trạng thái từ ${oldLead?.status} sang ${status}`
            }
        });

        return lead;
    } catch (error) {
        console.error('Error updating lead status:', error);
        throw new Error('Không thể cập nhật trạng thái Cơ hội bán hàng');
    }
}

// 6. Delete Lead
export async function deleteLead(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        await prisma.lead.delete({
            where: { id }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting lead:', error);
        throw new Error('Không thể xóa Cơ hội bán hàng');
    }
}

// 7. Convert Lead to Customer
export async function convertLeadToCustomer(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        const lead = await prisma.lead.findUnique({
            where: { id }
        });

        if (!lead) throw new Error('Lead not found');

        // Check if already connected to a customer
        if (lead.customerId) {
            throw new Error('Cơ hội này đã được liên kết với một Khách Hàng hiện tại.');
        }

        // DUPLICATE CHECK
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                OR: [
                    { phone: lead.phone && lead.phone !== '' ? lead.phone : undefined },
                    { email: lead.email && lead.email !== '' ? lead.email : undefined }
                ].filter(Boolean) as any
            }
        });

        if (existingCustomer) {
            return {
                success: false,
                duplicate: true,
                existingCustomer: existingCustomer,
                message: `Đã tồn tại khách hàng ${existingCustomer.name} có số điện thoại/email này.`
            };
        }

        // CREATE NEW CUSTOMER
        const result = await prisma.$transaction(async (tx) => {
            const newCustomer = await tx.customer.create({
                data: {
                    name: lead.company || lead.contactName || lead.name,
                    email: lead.email,
                    phone: lead.phone,
                }
            });

            // Update lead with new customer id
            const updatedLead = await tx.lead.update({
                where: { id },
                data: {
                    customerId: newCustomer.id,
                    status: 'WON' // Usually convert = won 
                }
            });

            // Add logs
            await tx.leadActivityLog.create({
                data: {
                    leadId: id,
                    userId: session.user.id,
                    action: "CHUYỂN_ĐỔI",
                    details: `Đã chuyển đổi thành Khách Hàng mới: ${newCustomer.name}`
                }
            });

            return { success: true, customer: newCustomer, lead: updatedLead };
        });

        return result;

    } catch (error: any) {
        console.error('Error converting lead:', error);
        throw new Error(error.message || 'Không thể chuyển đổi Khách Hàng');
    }
}

// 8. Connect Lead to Existing Customer
export async function connectLeadToExistingCustomer(leadId: string, customerId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) throw new Error("Khách hàng không tồn tại");

        const lead = await prisma.lead.update({
            where: { id: leadId },
            data: {
                customerId: customerId,
                status: 'WON' // Or assume it's just connected, but status update is explicit. 
                // We'll set it to WON as this is usually the flow of "Convert"
            }
        });

        await prisma.leadActivityLog.create({
            data: {
                leadId: leadId,
                userId: session.user.id,
                action: "LIÊN_KẾT",
                details: `Đã liên kết cơ hội này vào khách hàng cũ: ${customer.name}`
            }
        });

        return { success: true, lead, customer };
    } catch (err) {
        console.error('Error connecting lead:', err);
        throw new Error('Không thể liên kết Khách Hàng');
    }
}

// 9. Add Note or Link to Activity Log
export async function addLeadActivityLog(leadId: string, action: string, details: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        const log = await prisma.leadActivityLog.create({
            data: {
                leadId,
                userId: session.user.id,
                action,
                details
            },
            include: { user: { select: { name: true, avatar: true } } }
        });
        return { success: true, log };
    } catch (error) {
        console.error('Error adding lead activity log:', error);
        return { success: false, error: 'Không thể thêm hoạt động' };
    }
}

export async function sendLeadEmail(leadId: string, to: string, subject: string, htmlBody: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { customer: true, assignee: true }
        });

        if (!lead) {
            return { success: false, error: "Không tìm thấy cơ hội." };
        }

        const res = await sendEmailWithTracking({
            to,
            subject,
            htmlBody,
            senderId: session.user.id,
            customerId: lead.customerId || undefined
        });

        if (res.success) {
            await prisma.leadActivityLog.create({
                data: {
                    leadId,
                    userId: session.user.id,
                    action: "GỬI_EMAIL",
                    details: `Đã gửi Email cho Lead hoặc Assignee tới ${to}`
                }
            });
        }

        return res;
    } catch (error: any) {
        console.error("Lỗi khi gửi email cơ hội bán hàng:", error);
        return { success: false, error: error.message };
    }
}
