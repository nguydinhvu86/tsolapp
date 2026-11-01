'use server'

import { prisma } from '@/lib/prisma';

export async function lookupPublicWarranty(serialNumber: string) {
    try {
        const cleanSerial = (serialNumber || '').trim();
        if (!cleanSerial) {
            return { success: false, error: 'Vui lòng nhập số Serial hoặc IMEI cần tra cứu.' };
        }

        const record = await prisma.productSerial.findUnique({
            where: { serialNumber: cleanSerial },
            include: {
                product: {
                    select: {
                        name: true,
                        sku: true,
                        unit: true,
                        warrantyMonths: true,
                        description: true,
                    }
                },
                salesInvoice: {
                    select: {
                        date: true
                    }
                }
            }
        });

        if (!record) {
            return {
                success: false,
                error: `Không tìm thấy thông tin bảo hành cho số Serial/IMEI "${cleanSerial}" trên hệ thống chính hãng. Vui lòng kiểm tra lại chính xác từng ký tự hoặc liên hệ tổng đài hỗ trợ.`
            };
        }

        const warrantyMonths = record.product?.warrantyMonths ?? 12;
        const isNoWarranty = warrantyMonths === 0;

        // Ngày xuất hàng / ngày kích hoạt
        const exportDate = record.warrantyStartDate || record.salesInvoice?.date || (record.status === 'SOLD' ? record.updatedAt : null);
        const endDate = record.warrantyEndDate;

        const now = new Date();
        const isWarrantyValid = !isNoWarranty && !!endDate && now <= new Date(endDate);
        const isExpired = !isNoWarranty && !!endDate && now > new Date(endDate);

        let daysRemaining = 0;
        let daysExpired = 0;
        if (endDate && !isNoWarranty) {
            const diffDays = Math.ceil((new Date(endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0) {
                daysRemaining = diffDays;
            } else {
                daysExpired = Math.abs(diffDays);
            }
        }

        // Lấy thông tin công ty từ SystemSetting để khách hàng có thể liên hệ tại gốc
        const companySettings = await prisma.systemSetting.findMany({
            where: {
                key: {
                    in: ['COMPANY_NAME', 'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_ADDRESS', 'COMPANY_WEBSITE', 'COMPANY_LOGO']
                }
            }
        });

        const settingsMap: Record<string, string> = {};
        companySettings.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        return {
            success: true,
            data: {
                serialNumber: record.serialNumber,
                productName: record.product?.name || 'Sản phẩm chính hãng',
                sku: record.product?.sku || 'N/A',
                unit: record.product?.unit || 'Cái',
                description: record.product?.description || null,
                status: record.status, // "IN_STOCK", "SOLD", etc.
                isNoWarranty,
                warrantyMonths,
                exportDate: exportDate ? exportDate.toISOString() : null,
                warrantyEndDate: endDate ? endDate.toISOString() : null,
                isWarrantyValid,
                isExpired,
                daysRemaining,
                daysExpired,
                supportContact: {
                    companyName: settingsMap['COMPANY_NAME'] || 'TRUNG TÂM BẢO HÀNH CHÍNH HÃNG',
                    phone: settingsMap['COMPANY_PHONE'] || '(0274) 999 2222',
                    email: settingsMap['COMPANY_EMAIL'] || 'support@trinhgiatelecom.vn',
                    address: settingsMap['COMPANY_ADDRESS'] || 'Số 147/80, Đường NTMK, Phường Phú Lợi, Tp. Hồ Chí Minh',
                    website: settingsMap['COMPANY_WEBSITE'] || 'trinhgiatelecom.vn',
                    logo: settingsMap['COMPANY_LOGO'] || null
                }
            }
        };
    } catch (err: any) {
        console.error('Lỗi khi tra cứu bảo hành public:', err);
        return { success: false, error: 'Đã xảy ra lỗi trong quá trình tra cứu. Vui lòng thử lại sau.' };
    }
}
