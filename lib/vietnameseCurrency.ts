/**
 * Tiện ích chuyển đổi số tiền thành chữ Tiếng Việt chuẩn xác
 */
export function numberToVietnameseWords(n: number): string {
    if (n === 0) return 'Không đồng';
    if (!n || isNaN(n)) return '';

    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

    let isNegative = false;
    let num = Math.round(Math.abs(n));
    if (n < 0) isNegative = true;

    function readThreeDigits(threeDigits: number, isLastGroup: boolean): string {
        const hundred = Math.floor(threeDigits / 100);
        const ten = Math.floor((threeDigits % 100) / 10);
        const unit = threeDigits % 10;
        let result = '';

        if (hundred > 0 || !isLastGroup) {
            result += digits[hundred] + ' trăm ';
            if (ten === 0 && unit > 0) {
                result += 'lẻ ';
            }
        }

        if (ten > 0 && ten !== 1) {
            result += digits[ten] + ' mươi ';
            if (ten === 0 && unit > 0) result += 'lẻ ';
        } else if (ten === 1) {
            result += 'mười ';
        }

        switch (unit) {
            case 1:
                if (ten > 1) {
                    result += 'mốt';
                } else {
                    result += digits[unit];
                }
                break;
            case 5:
                if (ten > 0) {
                    result += 'lăm';
                } else {
                    result += digits[unit];
                }
                break;
            default:
                if (unit > 0) {
                    result += digits[unit];
                }
                break;
        }

        return result.trim();
    }

    const groups: number[] = [];
    while (num > 0) {
        groups.push(num % 1000);
        num = Math.floor(num / 100);
    }

    let words: string[] = [];
    let groupIndex = 0;
    let tempNum = Math.round(Math.abs(n));

    while (tempNum > 0) {
        const group = tempNum % 1000;
        if (group > 0) {
            const groupWord = readThreeDigits(group, tempNum < 1000);
            const unitWord = units[groupIndex];
            words.unshift(groupWord + (unitWord ? ' ' + unitWord : ''));
        }
        tempNum = Math.floor(tempNum / 1000);
        groupIndex++;
    }

    let fullText = words.join(' ').trim();
    if (!fullText) fullText = 'Không';
    // Viết hoa chữ cái đầu tiên
    fullText = fullText.charAt(0).toUpperCase() + fullText.slice(1) + ' đồng chẵn.';

    return (isNegative ? 'Âm ' : '') + fullText;
}

export function formatVND(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', '₫');
}
