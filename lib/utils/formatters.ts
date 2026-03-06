import { format as dateFnsFormat } from 'date-fns';

export const formatMoney = (amount: number) => { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount); };

export const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return dateFnsFormat(date, 'dd/MM/yyyy');
};

export const formatDateTime = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return dateFnsFormat(date, 'dd/MM/yyyy HH:mm');
};
