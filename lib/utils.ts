export function formatCurrencyInHtml(html: string): string {
    if (!html) return html;

    // 1. Format numbers (no leading zero, >= 4 digits) followed by currency units
    const regex1 = /\b([1-9]\d{3,})((?:\s|&nbsp;|<\/?[^>]+>)*(?:VND|VNĐ|đồng|đ)\b)/gi;
    let formatted = html.replace(regex1, (match, numberStr, restStr) => {
        return Number(numberStr).toLocaleString('en-US') + restStr;
    });

    // 2. Format numbers preceded by specific money-related keywords
    const regex2 = /(số tiền|tổng tiền|tiền|thành tiền|trị giá|giá trị|đơn giá|giá|thuê|cọc|phí)([\s:&nbsp;]*(?:<\/?[^>]+>[\s:&nbsp;]*)*)\b([1-9]\d{3,})\b/gi;
    formatted = formatted.replace(regex2, (match, p1, p2, p3) => {
        return p1 + p2 + Number(p3).toLocaleString('en-US');
    });

    return formatted;
}

export function formatCurrency(value: number): string {
    if (isNaN(value)) return '0 đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}
