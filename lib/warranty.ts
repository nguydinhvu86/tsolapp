/**
 * Tiện ích tính toán và chuẩn hóa thời hạn bảo hành động cho Serial/IMEI
 */

export interface WarrantyCalculationResult {
    isValid: boolean;
    isExpired: boolean;
    isNoWarranty: boolean;
    daysRemaining: number;
    daysExpired: number;
    monthsRemaining: number;
    daysRemainingAfterMonths: number;
    breakdownText: string;
    badgeText: string;
    detailText: string;
}

/**
 * Tính toán động thời hạn bảo hành còn lại chính xác theo ngày lịch (Calendar Days)
 * Tự động giảm dần theo từng ngày trôi qua, loại bỏ sai số do giờ/phút/giây.
 */
export function calculateWarrantyRemaining(
    endDateInput: Date | string | null | undefined,
    warrantyMonths: number = 12,
    customNow?: Date
): WarrantyCalculationResult {
    const isNoWarranty = warrantyMonths === 0;

    if (!endDateInput || isNoWarranty) {
        return {
            isValid: false,
            isExpired: false,
            isNoWarranty: true,
            daysRemaining: 0,
            daysExpired: 0,
            monthsRemaining: 0,
            daysRemainingAfterMonths: 0,
            breakdownText: 'Không áp dụng',
            badgeText: 'Không áp dụng bảo hành (KBH)',
            detailText: 'Không áp dụng bảo hành'
        };
    }

    const now = customNow || new Date();
    // Chuẩn hóa ngày hôm nay về 00:00:00 theo giờ địa phương
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Chuẩn hóa ngày hết hạn về 00:00:00 theo giờ địa phương
    const endRaw = new Date(endDateInput);
    if (isNaN(endRaw.getTime())) {
        return {
            isValid: false,
            isExpired: false,
            isNoWarranty: false,
            daysRemaining: 0,
            daysExpired: 0,
            monthsRemaining: 0,
            daysRemainingAfterMonths: 0,
            breakdownText: 'Ngày không hợp lệ',
            badgeText: 'Chưa xác định',
            detailText: 'Ngày hết hạn không hợp lệ'
        };
    }

    const end = new Date(endRaw.getFullYear(), endRaw.getMonth(), endRaw.getDate());

    // Chênh lệch số ngày lịch
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Đã hết hạn bảo hành
    if (diffDays < 0) {
        const daysExpired = Math.abs(diffDays);
        const expireStr = daysExpired === 1 ? 'hôm qua' : `${daysExpired} ngày trước`;
        return {
            isValid: false,
            isExpired: true,
            isNoWarranty: false,
            daysRemaining: 0,
            daysExpired,
            monthsRemaining: 0,
            daysRemainingAfterMonths: 0,
            breakdownText: `Hết hạn ${expireStr}`,
            badgeText: `HẾT HẠN BẢO HÀNH (Hết ${expireStr})`,
            detailText: `Đã hết hạn bảo hành (${daysExpired === 1 ? 'Hết hạn hôm qua' : `${daysExpired} ngày trước`})`
        };
    }

    // Hôm nay là ngày cuối cùng của hạn bảo hành
    if (diffDays === 0) {
        return {
            isValid: true,
            isExpired: false,
            isNoWarranty: false,
            daysRemaining: 0,
            daysExpired: 0,
            monthsRemaining: 0,
            daysRemainingAfterMonths: 0,
            breakdownText: 'Hạn chót hôm nay',
            badgeText: 'HẾT HẠN HÔM NAY (Hạn chót)',
            detailText: 'Hôm nay là ngày cuối cùng bảo hành'
        };
    }

    // Đang còn hạn bảo hành: Đếm số tháng tròn và số ngày lẻ chính xác theo lịch
    const daysRemaining = diffDays;

    let tempDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let months = 0;
    while (true) {
        const nextMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, tempDate.getDate());
        if (nextMonth <= end) {
            tempDate = nextMonth;
            months++;
        } else {
            break;
        }
    }

    const remainingDaysAfterMonths = Math.round((end.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24));

    let breakdownParts: string[] = [];
    if (months > 0) {
        breakdownParts.push(`${months} tháng`);
    }
    if (remainingDaysAfterMonths > 0) {
        breakdownParts.push(`${remainingDaysAfterMonths} ngày`);
    }

    const breakdownText = breakdownParts.length > 0 ? breakdownParts.join(' ') : `${daysRemaining} ngày`;

    // Định dạng chi tiết thời gian còn lại tối ưu, chuyên nghiệp
    let detailText = '';
    if (daysRemaining < 30) {
        detailText = `${daysRemaining} ngày`;
    } else if (remainingDaysAfterMonths === 0 && months > 0) {
        // Ví dụ: Đúng 365 ngày (12 tháng tròn) -> Không còn bị lỗi hiển thị "12 tháng 5 ngày"
        detailText = `${daysRemaining} ngày (${breakdownText})`;
    } else {
        detailText = `${daysRemaining} ngày (~${breakdownText})`;
    }

    return {
        isValid: true,
        isExpired: false,
        isNoWarranty: false,
        daysRemaining,
        daysExpired: 0,
        monthsRemaining: months,
        daysRemainingAfterMonths: remainingDaysAfterMonths,
        breakdownText,
        badgeText: `CÒN BẢO HÀNH (Còn ${daysRemaining} ngày)`,
        detailText
    };
}
