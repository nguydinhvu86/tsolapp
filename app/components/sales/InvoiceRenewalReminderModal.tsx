'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    CalendarClock, Clock, Calendar, UserCheck, AlertCircle, 
    Sparkles, CheckSquare, Repeat, FileText, X, Check, BellRing
} from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/utils/formatters';
import { UserMultiSelect } from '@/app/components/ui/UserMultiSelect';
import { createTask } from '@/app/tasks/actions';

interface InvoiceRenewalReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
    users: any[];
    currentUserId?: string;
    onSuccess?: () => void;
}

const RENEWAL_PERIODS = [
    { value: 1, label: '1 Tháng', freq: 'MONTHLY' },
    { value: 3, label: '3 Tháng', freq: 'QUARTERLY' },
    { value: 6, label: '6 Tháng', freq: 'BIANNUALLY' },
    { value: 9, label: '9 Tháng', freq: 'MONTHLY' },
    { value: 12, label: '12 Tháng (1 Năm)', freq: 'YEARLY' },
    { value: -1, label: 'Tùy chọn', freq: 'YEARLY' },
];

export function InvoiceRenewalReminderModal({
    isOpen,
    onClose,
    invoice,
    users = [],
    currentUserId,
    onSuccess
}: InvoiceRenewalReminderModalProps) {
    const customerName = invoice?.customer?.name || invoice?.customerName || 'Khách hàng';
    const customerPhone = invoice?.customer?.phone || '';
    const customerEmail = invoice?.customer?.email || '';
    
    // Base date (default to invoice date or today)
    const initialBaseDate = invoice?.date 
        ? new Date(invoice.date).toISOString().substring(0, 10) 
        : new Date().toISOString().substring(0, 10);

    const [selectedPeriod, setSelectedPeriod] = useState<number>(12); // Default: 12 months (1 year)
    const [customMonths, setCustomMonths] = useState<number>(12);
    const [baseDate, setBaseDate] = useState<string>(initialBaseDate);
    const [reminderDays, setReminderDays] = useState<number>(5); // Default: 5 days before due date
    
    const [startDate, setStartDate] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>('');
    const [isManualDates, setIsManualDates] = useState<boolean>(false);

    const [title, setTitle] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [priority, setPriority] = useState<string>('HIGH');
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [selectedObservers, setSelectedObservers] = useState<string[]>([]);
    
    // Recurrence
    const [isRecurring, setIsRecurring] = useState<boolean>(false);
    const [recurrenceFreq, setRecurrenceFreq] = useState<string>('YEARLY');
    const [recurrenceCount, setRecurrenceCount] = useState<number>(2);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Initial setup on open or invoice change
    useEffect(() => {
        if (isOpen && invoice) {
            const defaultBase = invoice.date 
                ? new Date(invoice.date).toISOString().substring(0, 10) 
                : new Date().toISOString().substring(0, 10);
            
            setBaseDate(defaultBase);
            setSelectedPeriod(12);
            setCustomMonths(12);
            setReminderDays(5);
            setIsManualDates(false);
            setPriority('HIGH');
            setError(null);
            
            // Set current user as default assignee
            if (currentUserId) {
                setSelectedAssignees([currentUserId]);
            } else {
                setSelectedAssignees([]);
            }
            setSelectedObservers([]);
            setIsRecurring(false);
            setRecurrenceFreq('YEARLY');
            setRecurrenceCount(2);

            // Set Title
            setTitle(`[${customerName}] - Nhắc gia hạn hóa đơn ${invoice.code}`);
            setNotes('');
        }
    }, [isOpen, invoice, currentUserId, customerName]);

    // Recalculate start & due dates when baseDate, selectedPeriod, customMonths, or reminderDays change
    useEffect(() => {
        if (isManualDates) return;

        const monthsToAdd = selectedPeriod === -1 ? (Number(customMonths) || 1) : selectedPeriod;
        
        try {
            const base = new Date(baseDate || new Date().toISOString().substring(0, 10));
            if (isNaN(base.getTime())) return;

            // Calculate Due Date = baseDate + monthsToAdd
            const calculatedDue = new Date(base);
            calculatedDue.setMonth(calculatedDue.getMonth() + monthsToAdd);
            const dueStr = calculatedDue.toISOString().substring(0, 10);

            // Calculate Start Date = calculatedDue - reminderDays
            const calculatedStart = new Date(calculatedDue);
            calculatedStart.setDate(calculatedStart.getDate() - (Number(reminderDays) || 0));
            const startStr = calculatedStart.toISOString().substring(0, 10);

            setDueDate(dueStr);
            setStartDate(startStr);

            // Auto set recurrence frequency matching period
            const periodObj = RENEWAL_PERIODS.find(p => p.value === selectedPeriod);
            if (periodObj && periodObj.freq) {
                setRecurrenceFreq(periodObj.freq);
            }
        } catch (e) {
            console.error('Error calculating renewal dates:', e);
        }
    }, [baseDate, selectedPeriod, customMonths, reminderDays, isManualDates]);

    // Format products list for task description
    const itemsSummary = useMemo(() => {
        if (!invoice?.items || !Array.isArray(invoice.items) || invoice.items.length === 0) {
            return '';
        }
        return invoice.items.map((item: any, idx: number) => {
            const name = item.product?.name || item.productName || item.customName || `Sản phẩm/Dịch vụ #${idx + 1}`;
            const qty = item.quantity;
            const unit = item.unit || item.product?.unit || '';
            const price = item.unitPrice ? formatMoney(item.unitPrice) : '';
            return `• ${name} (SL: ${qty} ${unit}${price ? ` - ${price}` : ''})`;
        }).join('\n');
    }, [invoice?.items]);

    const handlePeriodClick = (val: number) => {
        setSelectedPeriod(val);
        setIsManualDates(false);
        if (val !== -1) {
            setCustomMonths(val);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Vui lòng nhập tiêu đề công việc');
            return;
        }
        if (!dueDate) {
            setError('Vui lòng chọn thời gian kết thúc (ngày tới hạn)');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Build comprehensive structured description
            const descriptionParts = [
                `🔔 NHẮC GIA HẠN DỊCH VỤ / HỢP ĐỒNG KHÁCH HÀNG`,
                `----------------------------------------`,
                `📋 THÔNG TIN HÓA ĐƠN:`,
                `• Mã hóa đơn: ${invoice.code}`,
                `• Ngày đăng ký / lập: ${formatDate(invoice.date)}`,
                `• Hạn gia hạn: ${formatDate(dueDate)}`,
                `• Tổng tiền HĐ: ${formatMoney(invoice.totalAmount)}`,
                ``,
                `🏢 THÔNG TIN KHÁCH HÀNG:`,
                `• Tên đơn vị: ${customerName}`,
                customerPhone ? `• Số điện thoại: ${customerPhone}` : null,
                customerEmail ? `• Email: ${customerEmail}` : null,
                invoice.customer?.address ? `• Địa chỉ: ${invoice.customer.address}` : null,
                ``,
                itemsSummary ? `📦 SẢN PHẨM / DỊCH VỤ CẦN GIA HẠN:\n${itemsSummary}\n` : null,
                notes.trim() ? `📝 GHI CHÚ NHÂN VIÊN:\n${notes.trim()}` : null
            ].filter(Boolean).join('\n');

            const payload: any = {
                title: title.trim(),
                description: descriptionParts,
                priority,
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                status: 'TODO',
                assignees: selectedAssignees,
                observers: selectedObservers,
                salesInvoiceId: invoice.id,
                customerId: invoice.customerId || null
            };

            if (isRecurring) {
                payload.recurrence = {
                    isRecurring: true,
                    frequency: recurrenceFreq,
                    count: Math.max(2, parseInt(recurrenceCount as any) || 2)
                };
            }

            const activeCreatorId = currentUserId || sessionCreatorFallback();
            await createTask(payload, activeCreatorId);

            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err: any) {
            console.error('Error creating renewal task:', err);
            setError(err.message || 'Không thể tạo công việc nhắc gia hạn. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    function sessionCreatorFallback() {
        if (users && users.length > 0) return users[0].id;
        return '';
    }

    if (!isOpen) return null;

    return (
        <div 
            className="modal-backdrop" 
            style={{ 
                position: 'fixed', 
                inset: 0, 
                padding: '1rem', 
                zIndex: 99999, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: 'rgba(15, 23, 42, 0.7)', 
                backdropFilter: 'blur(3px)' 
            }}
        >
            <div 
                className="modal-container shadow-2xl w-full max-w-[680px]" 
                style={{ 
                    maxHeight: '92vh', 
                    background: '#ffffff', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflow: 'hidden', 
                    border: '1px solid #e2e8f0' 
                }}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200/90 flex justify-between items-center bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
                            <CalendarClock size={22} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <span>Tạo Công Việc Nhắc Gia Hạn</span>
                                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                    {invoice?.code}
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Tự động lập kế hoạch nhắc nhở nhân viên chăm sóc và gia hạn dịch vụ
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Form */}
                <form id="renewalReminderForm" onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4" style={{ maxHeight: 'calc(92vh - 130px)' }}>
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
                            <AlertCircle size={16} className="shrink-0 text-rose-600" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Task Title */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Tiêu Đề Công Việc <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full h-[38px] border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-semibold text-slate-800 bg-white shadow-2xs"
                            placeholder="Nhập tiêu đề công việc..."
                        />
                    </div>

                    {/* Period Selector (Quick Pills) */}
                    <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <Clock size={15} className="text-purple-600" />
                                <span>Thời Hạn Nhắc Gia Hạn Sau:</span>
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                                Ngày đăng ký gốc: <strong className="text-slate-700 font-mono">{formatDate(baseDate)}</strong>
                            </span>
                        </div>

                        {/* Pills */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {RENEWAL_PERIODS.map((period) => {
                                const isSelected = selectedPeriod === period.value;
                                return (
                                    <button
                                        type="button"
                                        key={period.value}
                                        onClick={() => handlePeriodClick(period.value)}
                                        className={`h-9 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center text-center cursor-pointer ${
                                            isSelected 
                                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-2 ring-purple-600 ring-offset-1 scale-[1.02]' 
                                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                                        }`}
                                    >
                                        {period.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom Months Input if custom selected */}
                        {selectedPeriod === -1 && (
                            <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60">
                                <span className="text-xs font-medium text-slate-600">Số tháng tùy chọn:</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    value={customMonths}
                                    onChange={(e) => {
                                        setCustomMonths(parseInt(e.target.value) || 1);
                                        setIsManualDates(false);
                                    }}
                                    className="w-24 h-8 border border-slate-200 rounded-lg px-2.5 text-xs text-center font-bold text-purple-700 bg-white outline-none focus:border-purple-500"
                                />
                                <span className="text-xs text-slate-500 font-medium">tháng kể từ ngày đăng ký</span>
                            </div>
                        )}

                        {/* Timing calculation preview box */}
                        <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/80 text-xs text-purple-900 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-700">Nhắc trước khi tới hạn:</span>
                                    <select
                                        value={reminderDays}
                                        onChange={(e) => {
                                            setReminderDays(parseInt(e.target.value) || 5);
                                            setIsManualDates(false);
                                        }}
                                        className="h-7 border border-purple-200 rounded-lg px-2 text-xs font-bold bg-white text-purple-800 outline-none cursor-pointer"
                                    >
                                        <option value="1">1 ngày</option>
                                        <option value="3">3 ngày</option>
                                        <option value="5">5 ngày (Mặc định)</option>
                                        <option value="7">7 ngày (1 tuần)</option>
                                        <option value="10">10 ngày</option>
                                        <option value="15">15 ngày (Nửa tháng)</option>
                                        <option value="30">30 ngày (1 tháng)</option>
                                    </select>
                                </div>

                                <div className="text-[11px] text-purple-700 font-medium">
                                    💡 Thời gian thực hiện: <strong>{reminderDays} ngày</strong>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5 border-t border-purple-200/60">
                                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-purple-100">
                                    <span className="text-[11px] text-slate-500 font-medium">Bắt đầu nhắc:</span>
                                    <span className="font-mono font-bold text-indigo-700">{formatDate(startDate)}</span>
                                </div>
                                <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-purple-100">
                                    <span className="text-[11px] text-slate-500 font-medium">Hạn chót (Tới hạn):</span>
                                    <span className="font-mono font-bold text-rose-600">{formatDate(dueDate)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date Pickers (Customizable) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Thời Gian Bắt Đầu Nhắc
                            </label>
                            <input
                                type="date"
                                required
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setIsManualDates(true);
                                }}
                                className="w-full h-[36px] border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-purple-500 transition-all font-mono text-slate-800 bg-white shadow-2xs"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Thời điểm công việc hiển thị nhắc nhân viên</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Thời Gian Kết Thúc (Ngày Tới Hạn) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={dueDate}
                                onChange={(e) => {
                                    setDueDate(e.target.value);
                                    setIsManualDates(true);
                                }}
                                className="w-full h-[36px] border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-purple-500 transition-all font-mono text-slate-800 bg-white shadow-2xs"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Hạn cuối khách hàng cần gia hạn dịch vụ</p>
                        </div>
                    </div>

                    {/* Assignees & Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Người Thực Hiện <span className="text-rose-500">*</span>
                            </label>
                            <UserMultiSelect
                                users={users}
                                selectedUserIds={selectedAssignees}
                                onChange={setSelectedAssignees}
                                placeholder="Chọn nhân viên phụ trách..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Mức Độ Ưu Tiên
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full h-[36px] border border-slate-200 rounded-xl px-3 text-xs font-semibold outline-none focus:border-purple-500 transition-all bg-white text-slate-800 shadow-2xs cursor-pointer"
                            >
                                <option value="URGENT">🔴 Khẩn cấp</option>
                                <option value="HIGH">🟠 Cao (Ưu tiên)</option>
                                <option value="MEDIUM">🟡 Trung bình</option>
                                <option value="LOW">🔵 Thấp</option>
                            </select>
                        </div>
                    </div>

                    {/* Observers (Optional) */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Người Theo Dõi (Tùy chọn)
                        </label>
                        <UserMultiSelect
                            users={users}
                            selectedUserIds={selectedObservers}
                            onChange={setSelectedObservers}
                            placeholder="Chọn quản lý / người theo dõi..."
                        />
                    </div>

                    {/* Recurrence Options */}
                    <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2.5">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Repeat size={14} className="text-purple-600" />
                                <span>Lặp lại định kỳ cho các kỳ gia hạn sau</span>
                            </span>
                        </label>

                        {isRecurring && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Tần suất lặp lại
                                    </label>
                                    <select
                                        value={recurrenceFreq}
                                        onChange={(e) => setRecurrenceFreq(e.target.value)}
                                        className="w-full h-8 border border-slate-200 rounded-lg px-2.5 text-xs font-medium bg-white text-slate-800 outline-none focus:border-purple-500"
                                    >
                                        <option value="MONTHLY">Hàng tháng (Monthly)</option>
                                        <option value="QUARTERLY">Hàng quý / 3 tháng (Quarterly)</option>
                                        <option value="BIANNUALLY">Nửa năm / 6 tháng (Biannually)</option>
                                        <option value="YEARLY">Hàng năm / 12 tháng (Yearly)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Số lần lặp lại dự kiến
                                    </label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="10"
                                        value={recurrenceCount}
                                        onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 2)}
                                        className="w-full h-8 border border-slate-200 rounded-lg px-2.5 text-xs font-bold text-center bg-white text-slate-800 outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notes & Description */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Ghi Chú Thêm Cho Nhân Viên
                        </label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ghi chú chi tiết thêm về nhu cầu của khách hàng, điều khoản gia hạn đặc biệt, báo giá dự kiến..."
                            className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none text-slate-800 bg-white placeholder:text-slate-400 shadow-2xs"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/80 flex justify-between items-center mt-auto">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <CheckSquare size={14} className="text-emerald-600" />
                        <span>Liên kết trực tiếp với hóa đơn <strong>{invoice?.code}</strong></span>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-[36px] px-4 border border-slate-300 rounded-xl hover:bg-white text-xs font-semibold text-slate-600 transition-all cursor-pointer shadow-2xs"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            form="renewalReminderForm"
                            disabled={isSubmitting}
                            className="h-[36px] px-5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <span>Đang tạo công việc...</span>
                            ) : (
                                <>
                                    <BellRing size={15} />
                                    <span>Tạo Công Việc Nhắc Gia Hạn</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
