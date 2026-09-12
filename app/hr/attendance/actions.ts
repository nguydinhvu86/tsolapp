'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { createNotification } from '@/app/notifications/actions';
import { sendEmailWithTracking } from '@/lib/mailer';
import { verifyActionPermission } from '@/lib/permissions';

// Helper: Parse HH:mm to minutes from start of day
function parseTimeToMinutes(timeStr: string) {
    const [hh, mm] = timeStr.split(':').map(Number);
    return hh * 60 + mm;
}

// Calculate total work minutes considering lunch break
function calculateWorkMinutes(inTime: Date, outTime: Date, shift: any): number {
    const inMins = inTime.getHours() * 60 + inTime.getMinutes();
    const outMins = outTime.getHours() * 60 + outTime.getMinutes();

    const sLunch = parseTimeToMinutes(shift.lunchStart);
    const eLunch = parseTimeToMinutes(shift.lunchEnd);

    // If completely before lunch or completely after lunch
    if (outMins <= sLunch || inMins >= eLunch) {
        return Math.max(0, outMins - inMins);
    }

    // If straddles lunch
    let validIn = Math.min(inMins, sLunch);
    let validOut = Math.max(outMins, eLunch);

    const morningWork = Math.max(0, sLunch - validIn);
    const afternoonWork = Math.max(0, validOut - eLunch);

    return morningWork + afternoonWork;
}

// Get the effective shift config for a user
async function getEffectiveShift(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { shiftConfig: true }
    });

    if (user?.shiftConfig) return user.shiftConfig;

    // Fallback to first active shift
    const defaultShift = await prisma.shiftConfig.findFirst({
        where: { isActive: true }
    });

    // Hard fallback if none exists yet
    if (!defaultShift) {
        return {
            startTime: '08:00',
            endTime: '17:00',
            lunchStart: '12:00',
            lunchEnd: '13:00',
            lateThreshold: 0,
            earlyThreshold: 0
        };
    }
    return defaultShift;
}

export async function getTodayAttendance() {
    noStore();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;

    // Force Vietnam Timezone to avoid GMT+0 day shift
    const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const nowVn = new Date(nowStr);
    const todayDate = new Date(Date.UTC(nowVn.getFullYear(), nowVn.getMonth(), nowVn.getDate(), 0, 0, 0, 0));

    return await prisma.attendanceRecord.findUnique({
        where: {
            userId_date: {
                userId: session.user.id,
                date: todayDate
            }
        }
    });
}

export async function checkIn(data: { photoUrl?: string, location?: string, notes?: string }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const nowVn = new Date(nowStr);
    const todayDate = new Date(Date.UTC(nowVn.getFullYear(), nowVn.getMonth(), nowVn.getDate(), 0, 0, 0, 0));
    const now = new Date(); // Keep UTC for checkInTime storage, but date is forced to VNT context

    const existing = await prisma.attendanceRecord.findUnique({
        where: { userId_date: { userId: session.user.id, date: todayDate } }
    });

    if (existing?.checkInTime && !existing?.checkOutTime) {
        throw new Error("Bạn đã Check In hôm nay rồi và chưa Check Out.");
    }

    const userCheck = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!userCheck) {
        throw new Error(`Phiên đăng nhập không hợp lệ hoặc tài khoản không tồn tại (ID: ${session.user.id}). Vui lòng đăng xuất và đăng nhập lại.`);
    }

    const shift = await getEffectiveShift(session.user.id);
    const shiftStartMins = parseTimeToMinutes(shift.startTime);
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let status = 'PRESENT';
    if (currentMins > shiftStartMins + shift.lateThreshold) {
        status = 'LATE';
    }

    try {
        let record;
        if (existing) {
            record = await prisma.attendanceRecord.update({
                where: { id: existing.id },
                data: {
                    checkInTime: now,
                    checkOutTime: null, // Reset checkOutTime for a new session
                    checkInPhotoUrl: data.photoUrl,
                    checkInLocation: data.location,
                    checkOutPhotoUrl: null, // Reset previous checkOutPhotoUrl
                    checkOutLocation: null, // Reset previous checkOutLocation
                    notes: data.notes ? (existing.notes ? existing.notes + ' | C/IN-Lại: ' + data.notes : data.notes) : existing.notes,
                    status: status !== 'PRESENT' ? status : existing.status // Keep LATE if already set
                }
            });
        } else {
            console.log("DEBUG CheckIn User ID:", session.user.id);
            record = await prisma.attendanceRecord.create({
                data: {
                    userId: session.user.id,
                    date: todayDate,
                    checkInTime: now,
                    checkInPhotoUrl: data.photoUrl,
                    checkInLocation: data.location,
                    notes: data.notes,
                    status: status
                }
            });
        }

        // ----------------------------------------
        // HR PUSH NOTIFICATION & EMAIL (CHECK-IN)
        // ----------------------------------------
        await createNotification(
            session.user.id,
            "Điểm danh thành công",
            `CHECK-IN lúc ${now.toLocaleTimeString('vi-VN')} ngày ${now.toLocaleDateString('vi-VN')}. Trạng thái: ${status === 'PRESENT' ? 'Đúng giờ' : 'Đi muộn'}`,
            status === 'PRESENT' ? 'SUCCESS' : 'WARNING',
            '/my-attendance'
        ).catch(console.error);

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (user && user.email) {
            const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #4f46e5; margin-top: 0;">Biên Lai Chấm Công - CHECK IN</h2>
                <p>Xin chào <strong>${user.name}</strong>,</p>
                <p>Hệ thống đã ghi nhận lượt điểm danh của bạn theo thông tin:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Hành động</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #16a34a;">CHECK IN</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Thời gian</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${now.toLocaleTimeString('vi-VN')} - Ngày ${now.toLocaleDateString('vi-VN')}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Trạng thái</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: ${status === 'PRESENT' ? '#16a34a' : '#ea580c'};">${status === 'PRESENT' ? 'Đúng Giờ' : 'Đi Muộn'}</td></tr>
                </table>
                <p style="color: #6b7280; font-size: 13px;">Khớp định vị GPS: ${data.location || 'Bị tắt'}</p>
                <p style="margin-top: 30px; font-size: 14px; color: #9ca3af;">Khởi đầu một ngày mới năng suất nhé!<br/>ERP System</p>
            </div>
            `;
            await sendEmailWithTracking({
                to: user.email,
                subject: `[ERP] Biên Lai Bạn Đã CHECK-IN: ${now.toLocaleDateString('vi-VN')}`,
                htmlBody: emailHtml
            }).catch(console.error);
        }

        revalidatePath('/dashboard');
        revalidatePath('/my-attendance');
        return { success: true, data: record };
    } catch (e: any) {
        console.error("Lỗi Check In:", e);
        return { success: false, error: e.message };
    }
}

export async function checkOut(data: { photoUrl?: string, location?: string, notes?: string }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const nowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const nowVn = new Date(nowStr);
    const todayDate = new Date(Date.UTC(nowVn.getFullYear(), nowVn.getMonth(), nowVn.getDate(), 0, 0, 0, 0));
    const now = new Date();

    const existing = await prisma.attendanceRecord.findUnique({
        where: { userId_date: { userId: session.user.id, date: todayDate } }
    });

    if (!existing || !existing.checkInTime) {
        throw new Error("Bạn chưa Check In, vui lòng Check In trước.");
    }

    const shift = await getEffectiveShift(session.user.id);
    const sessionMins = calculateWorkMinutes(existing.checkInTime, now, shift);
    const previousTotalMins = existing.totalWorkMinutes || 0;
    const newTotalMins = previousTotalMins + sessionMins;

    // Check early leave
    const shiftEndMins = parseTimeToMinutes(shift.endTime);
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let status = existing.status;
    if (currentMins < shiftEndMins - shift.earlyThreshold) {
        status = 'EARLY_LEAVE'; // Or we can keep half day logic if needed
    }

    try {
        const record = await prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: {
                checkOutTime: now,
                checkOutPhotoUrl: data.photoUrl,
                checkOutLocation: data.location,
                notes: data.notes ? (existing.notes ? existing.notes + ' | C/OUT-Lại: ' + data.notes : data.notes) : existing.notes,
                totalWorkMinutes: newTotalMins,
                status: status
            }
        });

        // ----------------------------------------
        // HR PUSH NOTIFICATION & EMAIL (CHECK-OUT)
        // ----------------------------------------
        await createNotification(
            session.user.id,
            "Ghi nhận Check-out",
            `Bạn đã CHECK-OUT lúc ${now.toLocaleTimeString('vi-VN')}. Tổng thời gian làm việc hôm nay: ${Math.floor(newTotalMins / 60)}h ${newTotalMins % 60}m.`,
            'SUCCESS',
            '/my-attendance'
        ).catch(console.error);

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (user && user.email) {
            const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #e11d48; margin-top: 0;">Biên Lai Chấm Công - CHECK OUT</h2>
                <p>Xin chào <strong>${user.name}</strong>,</p>
                <p>Hành trình làm việc hôm nay của bạn đã được kết nối và ghi lại:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Giờ Vào (In)</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${existing.checkInTime.toLocaleTimeString('vi-VN')}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Giờ Ra (Out)</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${now.toLocaleTimeString('vi-VN')}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Phiên cập nhật</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #4f46e5;">+${Math.floor(sessionMins / 60)} giờ ${sessionMins % 60} phút</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Tổng thời gian hợp lệ hôm nay</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #b91c1c;">${Math.floor(newTotalMins / 60)} giờ ${newTotalMins % 60} phút</td></tr>
                </table>
                <p style="color: #6b7280; font-size: 13px;">Khớp định vị GPS: ${data.location || 'Bị tắt'}</p>
                <p style="margin-top: 30px; font-size: 14px; color: #9ca3af;">Công sức của bạn đã trọn vẹn, hãy nghỉ ngơi thoải mái nhé! <br/>Hẹn gặp lại bạn sớm.</p>
            </div>
            `;
            await sendEmailWithTracking({
                to: user.email,
                subject: `[ERP] Cám ơn bạn ngày hôm nay! Biên lai CHECK-OUT: ${now.toLocaleDateString('vi-VN')}`,
                htmlBody: emailHtml
            }).catch(console.error);
        }

        revalidatePath('/dashboard');
        revalidatePath('/my-attendance');
        return { success: true, data: record };
    } catch (e: any) {
        console.error("Lỗi Check Out:", e);
        return { success: false, error: e.message };
    }
}

// Lịch sử cá nhân
export async function getMyAttendanceHistory(month: number, year: number) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return [];

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day of month

    return await prisma.attendanceRecord.findMany({
        where: {
            userId: session.user.id,
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: { date: 'desc' }
    });
}

import { LEAVE_TYPE_MAP } from './constants';

// ===================================
// LEAVE REQUESTS
// ===================================

export async function getColleaguesForHandover() {
    noStore();
    const session = await getServerSession(authOptions);
    if (!session?.user) return [];

    return await prisma.user.findMany({
        where: {
            isActive: true,
            id: { not: session.user.id }
        },
        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true
        },
        orderBy: { name: 'asc' }
    });
}

export async function createLeaveRequest(data: {
    type: string;
    startDate: Date;
    endDate: Date;
    duration?: string;
    totalDays?: number;
    reason: string;
    handoverTo?: string;
    handoverUserId?: string;
    contactPhone?: string;
    imageUrl?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    try {
        const leave = await prisma.leaveRequest.create({
            data: {
                userId: session.user.id,
                type: data.type,
                startDate: data.startDate,
                endDate: data.endDate,
                duration: data.duration || 'FULL_DAY',
                totalDays: data.totalDays !== undefined ? data.totalDays : 1,
                reason: data.reason,
                handoverTo: data.handoverTo || null,
                handoverUserId: data.handoverUserId || null,
                contactPhone: data.contactPhone || null,
                imageUrl: data.imageUrl || null,
                status: 'PENDING'
            },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        });

        // ----------------------------------------
        // HR NOTIFICATION FOR NEW LEAVE REQUEST
        // ----------------------------------------
        const hrUsers = await prisma.user.findMany({
            where: { role: { in: ['HR', 'ADMIN'] } },
            select: { id: true, email: true, name: true }
        });
        const sender = await prisma.user.findUnique({ where: { id: session.user.id } });
        const typeLabel = LEAVE_TYPE_MAP[data.type] || data.type;

        for (const hr of hrUsers) {
            await createNotification(
                hr.id,
                "Có Đơn Xin Nghỉ Mới",
                `Nhân sự ${sender?.name} vừa tạo đơn: ${typeLabel} (${data.totalDays || 1} ngày) từ ${new Date(data.startDate).toLocaleDateString('vi-VN')}`,
                "INFO",
                "/hr/approvals"
            ).catch(console.error);

            if (hr.email) {
                const emailHtml = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                        <h2 style="color: #0284c7; margin-top: 0;">Thông Báo Kiểm Duyệt Đơn</h2>
                        <p>Xin chào <strong>${hr.name}</strong>,</p>
                        <p>Hệ thống vừa nhận được đơn mới từ Nhân sự <strong>${sender?.name}</strong>.</p>
                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 8px 0;"><strong>Loại Đơn:</strong> <span style="color: #4f46e5; font-weight: bold;">${typeLabel}</span></p>
                            <p style="margin: 0 0 8px 0;"><strong>Thời gian:</strong> Từ ${new Date(data.startDate).toLocaleDateString('vi-VN')} đến ${new Date(data.endDate).toLocaleDateString('vi-VN')} (${data.totalDays || 1} ngày)</p>
                            ${data.handoverTo ? `<p style="margin: 0 0 8px 0;"><strong>Bàn giao công việc cho:</strong> ${data.handoverTo}</p>` : ''}
                            ${data.contactPhone ? `<p style="margin: 0 0 8px 0;"><strong>SĐT khẩn cấp:</strong> ${data.contactPhone}</p>` : ''}
                            <p style="margin: 0;"><strong>Lý do:</strong> <em>${data.reason}</em></p>
                        </div>
                        <p>Bộ phận HCNS vui lòng đăng nhập vào ứng dụng và truy cập mục <strong>Duyệt Đơn</strong> để phê duyệt cho nhân sự.</p>
                    </div>
                `;
                await sendEmailWithTracking({
                    to: hr.email,
                    subject: `[ERP] Đơn ${typeLabel} mới từ ${sender?.name}`,
                    htmlBody: emailHtml
                }).catch(console.error);
            }
        }

        revalidatePath('/leave-requests');
        revalidatePath('/hr/approvals');
        return { success: true, data: leave };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getMyLeaveRequests() {
    noStore();
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return [];

    return await prisma.leaveRequest.findMany({
        where: { userId: session.user.id },
        include: {
            approver: {
                select: { id: true, name: true, email: true, avatar: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function updateLeaveRequest(
    id: string,
    data: {
        type?: string;
        startDate?: Date;
        endDate?: Date;
        duration?: string;
        totalDays?: number;
        reason?: string;
        handoverTo?: string;
        handoverUserId?: string;
        contactPhone?: string;
        imageUrl?: string;
    }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const existing = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new Error("Không tìm thấy đơn.");
    if (existing.userId !== session.user.id) throw new Error("Không có quyền chỉnh sửa đơn của người khác.");
    if (existing.status !== 'PENDING') throw new Error("Chỉ có thể chỉnh sửa đơn đang chờ duyệt.");

    try {
        const leave = await prisma.leaveRequest.update({
            where: { id },
            data: {
                type: data.type !== undefined ? data.type : existing.type,
                startDate: data.startDate !== undefined ? data.startDate : existing.startDate,
                endDate: data.endDate !== undefined ? data.endDate : existing.endDate,
                duration: data.duration !== undefined ? data.duration : existing.duration,
                totalDays: data.totalDays !== undefined ? data.totalDays : existing.totalDays,
                reason: data.reason !== undefined ? data.reason : existing.reason,
                handoverTo: data.handoverTo !== undefined ? data.handoverTo : existing.handoverTo,
                handoverUserId: data.handoverUserId !== undefined ? data.handoverUserId : existing.handoverUserId,
                contactPhone: data.contactPhone !== undefined ? data.contactPhone : existing.contactPhone,
                imageUrl: data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl,
            },
            include: {
                approver: {
                    select: { id: true, name: true, email: true, avatar: true }
                }
            }
        });

        revalidatePath('/leave-requests');
        revalidatePath('/hr/approvals');
        return { success: true, data: leave };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function cancelLeaveRequest(id: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const existing = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) throw new Error("Không tìm thấy đơn.");
    if (existing.userId !== session.user.id) throw new Error("Không có quyền hủy đơn của người khác.");
    if (existing.status !== 'PENDING') throw new Error("Chỉ có thể hủy đơn đang ở trạng thái Chờ duyệt.");

    try {
        const leave = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'CANCELLED'
            },
            include: {
                approver: {
                    select: { id: true, name: true, email: true, avatar: true }
                }
            }
        });

        revalidatePath('/leave-requests');
        revalidatePath('/hr/approvals');
        return { success: true, data: leave };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// HR Actions
async function checkHR() {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    
    // Allow ADMIN, HR or users with ATTENDANCE or HR_MANAGE permission
    if (['ADMIN', 'HR'].includes(session.user.role)) {
        return session.user;
    }
    
    const user = await verifyActionPermission('HR_MANAGE');
    return user as any;
}

export async function getPendingLeaveRequests() {
    noStore();
    await checkHR();
    return await prisma.leaveRequest.findMany({
        where: { status: 'PENDING' },
        include: { 
            user: { 
                select: { 
                    id: true, 
                    name: true, 
                    email: true, 
                    role: true, 
                    avatar: true,
                    employeeProfile: { select: { department: true, position: true } }
                } 
            } 
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function getAllLeaveRequestsForHR() {
    noStore();
    await checkHR();
    return await prisma.leaveRequest.findMany({
        include: {
            user: { 
                select: { 
                    id: true, 
                    name: true, 
                    email: true, 
                    role: true, 
                    avatar: true,
                    employeeProfile: { select: { department: true, position: true } }
                } 
            },
            approver: { select: { id: true, name: true, email: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function resolveLeaveRequest(id: string, action: 'APPROVE' | 'REJECT', note?: string) {
    const me = await checkHR();
    try {
        const leave = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                approverId: me.id,
                approverNote: note || null
            },
            include: { 
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        avatar: true,
                        employeeProfile: { select: { department: true, position: true } }
                    }
                },
                approver: { select: { id: true, name: true, email: true, avatar: true } }
            }
        });

        // ----------------------------------------
        // EMPLOYEE NOTIFICATION FOR APPROVED/REJECTED
        // ----------------------------------------
        const statusLabel = action === 'APPROVE' ? 'ĐƯỢC DUYỆT' : 'BỊ TỪ CHỐI';
        const typeLabel = LEAVE_TYPE_MAP[leave.type] || leave.type;

        const noteText = note ? ` Lời nhắn: "${note}"` : '';

        await createNotification(
            leave.user.id,
            `Đơn ${typeLabel} đã ${statusLabel}`,
            `Đơn xin của bạn (${new Date(leave.startDate).toLocaleDateString('vi-VN')} - ${new Date(leave.endDate).toLocaleDateString('vi-VN')}) đã được phản hồi bởi ${me.name || 'Ban Quản Trị'}.${noteText}`,
            action === 'APPROVE' ? "SUCCESS" : "ERROR",
            "/leave-requests"
        ).catch(console.error);

        if (leave.user.email) {
            const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: ${action === 'APPROVE' ? '#16a34a' : '#ea580c'}; margin-top: 0;">Quyết Định Đơn Nghỉ Phép: ${statusLabel}</h2>
                <p>Xin chào <strong>${leave.user.name}</strong>,</p>
                <p>Phòng Hành Chính Nhân Sự đã thực hiện phản hồi đối với đơn xin phép của bạn. Chi tiết như sau:</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px 0;"><strong>Loại Đơn:</strong> <span style="color: #4f46e5; font-weight: bold;">${typeLabel}</span></p>
                    <p style="margin: 0 0 8px 0;"><strong>Thời gian:</strong> Từ ${leave.startDate.toLocaleDateString('vi-VN')} đến ${leave.endDate.toLocaleDateString('vi-VN')} (${leave.totalDays} ngày)</p>
                    <p style="margin: 0 0 8px 0;"><strong>Người duyệt:</strong> ${me.name || 'HCNS'}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Trạng thái:</strong> <strong style="color: ${action === 'APPROVE' ? '#16a34a' : '#ea580c'};">${statusLabel}</strong></p>
                    ${note ? `<p style="margin: 0;"><strong>Ý kiến/Lý do:</strong> <em>${note}</em></p>` : ''}
                </div>
                <p>Bạn có thể vào ứng dụng để kiểm tra chi tiết lịch sử đơn từ của mình.</p>
            </div>
            `;
            await sendEmailWithTracking({
                to: leave.user.email,
                subject: `[ERP] Kết quả xử lý đơn: ${statusLabel}`,
                htmlBody: emailHtml
            }).catch(console.error);
        }

        revalidatePath('/leave-requests');
        revalidatePath('/hr/approvals');
        return { success: true, data: leave };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// XUẤT BẢNG CÔNG HR (Ma trận nhân viên x ngày)
export async function getHRAttendanceMatrix(month: number, year: number) {
    await checkHR();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, avatar: true, isActive: true, shiftConfig: true },
        orderBy: { name: 'asc' }
    });

    const attendances = await prisma.attendanceRecord.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: { date: 'asc' }
    });

    // Also get approved leave requests in this month
    const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
            status: 'APPROVED',
            OR: [
                {
                    startDate: { lte: endDate },
                    endDate: { gte: startDate }
                }
            ]
        }
    });

    // Gom dữ liệu chấm công theo Cấu trúc: { [userId]: { [day]: record } }
    const matrix: any = {};
    users.forEach(u => {
        matrix[u.id] = { 
            user: u, 
            records: {}, 
            totalPresent: 0, 
            totalLate: 0, 
            totalHalfDay: 0,
            totalAbsent: 0,
            totalLeave: 0,
            totalWorkMinutes: 0 
        };
    });

    // Map leave requests to days
    approvedLeaves.forEach(l => {
        if (!matrix[l.userId]) return;
        const lStart = new Date(l.startDate);
        const lEnd = new Date(l.endDate);

        const cur = new Date(Math.max(lStart.getTime(), startDate.getTime()));
        const maxDate = new Date(Math.min(lEnd.getTime(), endDate.getTime()));

        while (cur <= maxDate) {
            const day = cur.getDate();
            // Don't overwrite if actual attendance exists
            if (!matrix[l.userId].records[day]) {
                let leaveStatus = 'LEAVE_ANNUAL';
                if (l.type === 'SICK_LEAVE') leaveStatus = 'LEAVE_SICK';
                else if (l.type === 'UNPAID_LEAVE') leaveStatus = 'LEAVE_UNPAID';
                else if (l.type === 'MATERNITY_LEAVE') leaveStatus = 'LEAVE_MATERNITY';
                else if (l.type === 'SPECIAL_LEAVE') leaveStatus = 'LEAVE_SPECIAL';

                matrix[l.userId].records[day] = {
                    id: 'leave-' + l.id + '-' + day,
                    userId: l.userId,
                    date: new Date(cur),
                    status: leaveStatus,
                    leaveType: l.type,
                    notes: l.reason,
                    isLeave: true
                };
                matrix[l.userId].totalLeave++;
            }
            cur.setDate(cur.getDate() + 1);
        }
    });

    // Map attendance records
    attendances.forEach(a => {
        if (!matrix[a.userId]) return;
        const day = a.date.getDate();
        matrix[a.userId].records[day] = a;

        if (a.status === 'PRESENT') matrix[a.userId].totalPresent++;
        else if (a.status === 'LATE') matrix[a.userId].totalLate++;
        else if (a.status === 'HALF_DAY') matrix[a.userId].totalHalfDay++;
        else if (a.status === 'ABSENT') matrix[a.userId].totalAbsent++;
        
        if (a.totalWorkMinutes) matrix[a.userId].totalWorkMinutes += a.totalWorkMinutes;
    });

    return Object.values(matrix);
}
