'use server'

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

async function getPbxSettings() {
    const urlSet = await prisma.systemSetting.findUnique({ where: { key: 'PBX_URL' } });
    const keySet = await prisma.systemSetting.findUnique({ where: { key: 'PBX_KEY' } });
    const domainSet = await prisma.systemSetting.findUnique({ where: { key: 'PBX_DOMAIN' } });
    
    const pbxConfig = await (prisma as any).pbxConfig.findFirst();
    
    return {
        url: pbxConfig?.pbxEndpoint || urlSet?.value || process.env.PBX_URL || 'portal.voicecloud.vn',
        reportUrl: pbxConfig?.pbxReportEndpoint || '103.245.251.97',
        key: pbxConfig?.apiKey || keySet?.value || process.env.PBX_KEY || '2d63a13194ff14de8b287af76aa5d515',
        domain: pbxConfig?.domain || domainSet?.value || process.env.PBX_DOMAIN || 'trinhgia.incall.vn'
    };
}

export async function clickToCall(to_number: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !(user as any).extension) {
         return { success: false, error: 'Bạn chưa được cấu hình số nội bộ (Extension) trong hồ sơ.' };
    }
    const from_number = (user as any).extension;

    const settings = await getPbxSettings();
    if (!settings.url || !settings.key) throw new Error("PBX Settings missing. Please configure PBX_URL and PBX_KEY in System Settings.");

    let baseUrl = settings.url;
    if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;

    const safeTo = to_number.replace(/\D/g, ''); // Strip non-numeric chars
    const url = `${baseUrl}/api/CallControl/dial/from_number/${from_number}/to_number/${safeTo}/key/${settings.key}/domain/${settings.domain}`;
    
    try {
        const res = await fetch(url, { method: 'GET' });
        if (res.ok) {
             return { success: true };
        }
        return { success: false, error: await res.text() };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function spyCall(src: string, dst: string, mode: 'whisper' | 'threeway' | 'caller' | 'callee') {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    const settings = await getPbxSettings();
    if (!settings.url || !settings.key) throw new Error("PBX Settings missing.");

    let baseUrl = settings.url;
    if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;

    const url = `${baseUrl}/api/Agent/spy/format/json`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: settings.key,
                src,
                dst,
                mode
            })
        });
        if (res.ok) {
             return { success: true };
        }
        return { success: false, error: await res.text() };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getExtensionStatus(exts: string[]) {
    if (!exts.length) return [];
    
    const settings = await getPbxSettings();
    if (!settings.url || !settings.key) return []; // Graceful failure for dashboard

    let baseUrl = settings.url;
    if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;

    const url = `${baseUrl}/api/Agent/status/format/json`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: settings.key,
                list: exts.map(ext => ({ ext }))
            })
        });
        if (res.ok) {
             const data = await res.json();
             return data; // Check JSON payload format based on specific PBX config
        }
        return [];
    } catch (e) {
        console.error("Fetch EXT Status error:", e);
        return [];
    }
}

export async function syncPbxCallLogs(daysBack = 5) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const permissions = session.user.permissions as string[] || [];
    const viewAll = permissions.includes('CALL_CENTER_VIEW_ALL');
    
    if (!viewAll && session.user.role !== 'ADMIN') {
        throw new Error("Bạn không có quyền đồng bộ dữ liệu Tổng Đài toàn hệ thống.");
    }

    const settings = await getPbxSettings();
    if (!settings.reportUrl || !settings.key) throw new Error("Cấu hình PBX chưa hoàn tất.");

    // Xử lý hostname loại bỏ `http://` nếu người dùng nhập thừa để format cho chuẩn
    let baseUrl = settings.reportUrl;
    if (!baseUrl.startsWith('http')) baseUrl = 'http://' + baseUrl;

    const url = `${baseUrl}/internal/Reports/cdr/format/json`;
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysBack);
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: settings.key,
                startdate: startDate.toISOString().split('T')[0],
                enddate: today.toISOString().split('T')[0]
            })
        });
        
        if (!res.ok) throw new Error("Lỗi kết nối đến máy chủ tổng đài.");
        const data = await res.json();
        
        if (!data || !data.result || !Array.isArray(data.result)) {
            return { success: false, error: "Dữ liệu trả về không hợp lệ." };
        }

        let syncedCount = 0;

        for (const log of data.result) {
            const isOutbound = log.direction === 'Outbound';
            const phone = isOutbound ? log.destination : log.callerid;
            const extension = isOutbound ? log.callerid : log.destination;
            
            const customer = phone ? await prisma.customer.findFirst({ where: { phone } }) : null;
            const lead = (!customer && phone) ? await prisma.lead.findFirst({ where: { phone } }) : null;
            const agent = extension ? await prisma.user.findFirst({ where: { extension } as any }) : null;

            await (prisma as any).callLog.upsert({
                where: { callId: log.callid },
                update: {
                    duration: parseInt(log.duration || '0', 10),
                    billsec: parseInt(log.billsec || '0', 10),
                    status: log.status || 'UNKNOWN',
                    recordingUrl: log.recordingpath || '',
                    type: isOutbound ? 'OUTBOUND' : 'INBOUND'
                },
                create: {
                    callId: log.callid,
                    type: isOutbound ? 'OUTBOUND' : 'INBOUND',
                    phone: phone || '',
                    extension: extension || '',
                    userId: agent?.id,
                    customerId: customer?.id,
                    leadId: lead?.id,
                    startedAt: new Date(log.calldate),
                    duration: parseInt(log.duration || '0', 10),
                    billsec: parseInt(log.billsec || '0', 10),
                    status: log.status || 'UNKNOWN',
                    recordingUrl: log.recordingpath || ''
                }
            });
            syncedCount++;
        }

        return { success: true, count: syncedCount };
    } catch (e: any) {
        console.error("Sync PBX error:", e);
        return { success: false, error: e.message };
    }
}
