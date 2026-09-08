export interface BusinessTaxInfo {
    id: string; // Tax Code
    name: string; // Tên đầy đủ công ty
    shortName?: string; // Tên viết tắt
    internationalName?: string; // Tên giao dịch quốc tế
    address?: string; // Địa chỉ trụ sở
    status?: string; // Trạng thái hoạt động
}

export interface TaxLookupResult {
    success: boolean;
    data?: BusinessTaxInfo;
    message?: string;
}

/**
 * Tra cứu thông tin doanh nghiệp qua API VietQR theo Mã Số Thuế
 * API: https://api.vietqr.io/v2/business/{taxCode}
 */
export async function lookupBusinessByTaxCode(rawTaxCode: string): Promise<TaxLookupResult> {
    if (!rawTaxCode || typeof rawTaxCode !== 'string') {
        return { success: false, message: 'Vui lòng nhập mã số thuế cần tra cứu.' };
    }

    const taxCode = rawTaxCode.trim().replace(/\s+/g, '').replace(/-/g, '');
    if (!taxCode) {
        return { success: false, message: 'Mã số thuế không hợp lệ.' };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`https://api.vietqr.io/v2/business/${encodeURIComponent(taxCode)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (compatible; BusinessTaxLookup/1.0)'
            },
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return {
                success: false,
                message: `Dịch vụ tra cứu trả về mã phản hồi: ${response.status} (${response.statusText})`
            };
        }

        const resData = await response.json();

        if (resData.code === '00' && resData.data) {
            return {
                success: true,
                data: {
                    id: resData.data.id || taxCode,
                    name: (resData.data.name || '').trim(),
                    shortName: (resData.data.shortName || '').trim(),
                    internationalName: (resData.data.internationalName || '').trim(),
                    address: (resData.data.address || '').trim(),
                    status: (resData.data.status || '').trim()
                }
            };
        } else {
            return {
                success: false,
                message: resData.desc || 'Không tìm thấy thông tin doanh nghiệp với mã số thuế này.'
            };
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            return { success: false, message: 'Yêu cầu tra cứu quá thời gian chờ (10s). Vui lòng thử lại.' };
        }
        return {
            success: false,
            message: error.message || 'Lỗi kết nối khi tra cứu mã số thuế.'
        };
    }
}
