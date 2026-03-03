export const formatMoney = (amount: number) => { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount); };

export const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
};
