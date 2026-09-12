'use client'

import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Check, DollarSign, Calendar, User, Phone, MapPin, 
    FileText, Landmark, ArrowLeft, Receipt, ShoppingCart, 
    CheckCircle2, AlertCircle, RefreshCw, Layers, Search, ChevronDown, Sparkles, PlusCircle
} from 'lucide-react';
import { 
    createCashTransaction, 
    getCustomerUnpaidInvoices, 
    getSupplierUnpaidBills 
} from '../actions';
import { numberToVietnameseWords } from '@/lib/vietnameseCurrency';

interface Props {
    initialType?: 'RECEIPT' | 'PAYMENT';
    accounts: any[];
    customers: any[];
    suppliers: any[];
    projects: any[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateTransactionModal({
    initialType = 'RECEIPT',
    accounts,
    customers,
    suppliers,
    projects,
    onClose,
    onSuccess
}: Props) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const [type, setType] = useState<'RECEIPT' | 'PAYMENT'>(initialType);
    const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState<number>(0);
    const [category, setCategory] = useState<string>(initialType === 'RECEIPT' ? 'SALES' : 'EXPENSE');
    const [payerReceiver, setPayerReceiver] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
    const [financeAccountId, setFinanceAccountId] = useState<string>(
        accounts.find(a => a.isDefault)?.id || accounts[0]?.id || ''
    );
    const [customerId, setCustomerId] = useState<string>('');
    const [supplierId, setSupplierId] = useState<string>('');
    const [projectId, setProjectId] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Search query & dropdown state for Customer / Supplier combobox
    const [partnerSearch, setPartnerSearch] = useState<string>('');
    const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState<boolean>(false);
    const partnerDropdownRef = useRef<HTMLDivElement>(null);

    // Unpaid Invoices / Bills state for allocation
    const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
    const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
    
    // Allocations map: { [id: string]: number }
    const [allocations, setAllocations] = useState<{ [id: string]: number }>({});

    const formatVND = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    // Close partner dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(e.target as Node)) {
                setIsPartnerDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filtered customers / suppliers list
    const filteredCustomers = customers.filter(c => {
        if (!partnerSearch.trim()) return true;
        const q = partnerSearch.toLowerCase();
        return (c.name && c.name.toLowerCase().includes(q)) ||
               (c.code && c.code.toLowerCase().includes(q)) ||
               (c.phone && c.phone.includes(q));
    });

    const filteredSuppliers = suppliers.filter(s => {
        if (!partnerSearch.trim()) return true;
        const q = partnerSearch.toLowerCase();
        return (s.name && s.name.toLowerCase().includes(q)) ||
               (s.code && s.code.toLowerCase().includes(q)) ||
               (s.phone && s.phone.includes(q));
    });

    // Helper: auto allocate amount into documents sequentially (oldest to newest)
    const computeAutoAllocations = (docs: any[], totalAmt: number) => {
        const newAlloc: { [id: string]: number } = {};
        let rem = totalAmt;
        for (const doc of docs) {
            if (rem <= 0) break;
            const take = Math.min(rem, doc.remainingAmount);
            if (take > 0) {
                newAlloc[doc.id] = take;
                rem -= take;
            }
        }
        return newAlloc;
    };

    // Total calculations
    const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
    const totalCustomerDebt = unpaidInvoices.reduce((sum, i) => sum + (i.remainingAmount || 0), 0);
    const totalSupplierDebt = unpaidBills.reduce((sum, b) => sum + (b.remainingAmount || 0), 0);
    
    // Remaining unallocated from master amount
    const unallocatedAmount = Math.max(0, amount - totalAllocated);
    const overAllocatedAmount = Math.max(0, totalAllocated - amount);

    // Load customer unpaid invoices when customer changes
    const handleCustomerChange = async (cId: string) => {
        setCustomerId(cId);
        setAllocations({});
        setIsPartnerDropdownOpen(false);

        const c = customers.find(item => item.id === cId);
        if (c) {
            setPartnerSearch(`[${c.code || 'KH'}] ${c.name}`);
            setPayerReceiver(c.name);
            if (c.phone) setPhone(c.phone);
            if (c.address) setAddress(c.address);
            if (!reason || reason.startsWith('Thu tiền')) setReason(`Thu tiền bán hàng khách hàng ${c.name}`);
            
            setIsLoadingDocs(true);
            try {
                const invoices = await getCustomerUnpaidInvoices(cId);
                const validInvs = (invoices || []).filter((inv: any) => inv.status !== 'DRAFT');
                setUnpaidInvoices(validInvs);

                // If user already typed an amount, auto-allocate immediately
                if (amount > 0 && validInvs.length > 0) {
                    setAllocations(computeAutoAllocations(validInvs, amount));
                }
            } catch (err) {
                console.error('Error fetching unpaid invoices:', err);
                setUnpaidInvoices([]);
            } finally {
                setIsLoadingDocs(false);
            }
        } else {
            setPartnerSearch('');
            setUnpaidInvoices([]);
        }
    };

    // Load supplier unpaid bills when supplier changes
    const handleSupplierChange = async (sId: string) => {
        setSupplierId(sId);
        setAllocations({});
        setIsPartnerDropdownOpen(false);

        const s = suppliers.find(item => item.id === sId);
        if (s) {
            setPartnerSearch(`[${s.code || 'NCC'}] ${s.name}`);
            setPayerReceiver(s.name);
            if (s.phone) setPhone(s.phone);
            if (s.address) setAddress(s.address);
            if (!reason || reason.startsWith('Chi thanh toán')) setReason(`Chi thanh toán mua hàng NCC ${s.name}`);

            setIsLoadingDocs(true);
            try {
                const bills = await getSupplierUnpaidBills(sId);
                const validBills = (bills || []).filter((b: any) => b.status !== 'DRAFT');
                setUnpaidBills(validBills);

                // If user already typed an amount, auto-allocate immediately
                if (amount > 0 && validBills.length > 0) {
                    setAllocations(computeAutoAllocations(validBills, amount));
                }
            } catch (err) {
                console.error('Error fetching unpaid bills:', err);
                setUnpaidBills([]);
            } finally {
                setIsLoadingDocs(false);
            }
        } else {
            setPartnerSearch('');
            setUnpaidBills([]);
        }
    };

    // Real-time amount input change handler: keeps amount as MASTER total & distributes into docs
    const handleAmountChange = (newAmount: number) => {
        const safeAmount = Math.max(0, newAmount);
        setAmount(safeAmount);

        const docs = type === 'RECEIPT' ? unpaidInvoices : unpaidBills;
        if (docs.length > 0) {
            setAllocations(computeAutoAllocations(docs, safeAmount));
        }
    };

    // Quick fill full debt amount
    const handleFillFullDebt = () => {
        const docs = type === 'RECEIPT' ? unpaidInvoices : unpaidBills;
        const fullDebt = docs.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
        if (fullDebt > 0) {
            setAmount(fullDebt);
            setAllocations(computeAutoAllocations(docs, fullDebt));
        }
    };

    // Allocation change helper: toggle single invoice/bill checkbox
    // If master amount > 0: fill min(unallocatedAmount, maxDebt) without changing master amount!
    const handleAllocationToggle = (docId: string, maxDebt: number) => {
        setAllocations(prev => {
            const next = { ...prev };
            if (next[docId]) {
                delete next[docId];
            } else {
                if (amount === 0) {
                    next[docId] = maxDebt;
                    setAmount(maxDebt);
                } else if (unallocatedAmount > 0) {
                    next[docId] = Math.min(unallocatedAmount, maxDebt);
                } else {
                    next[docId] = maxDebt;
                }
            }
            return next;
        });
    };

    // Allocation change helper: manual input on specific invoice/bill
    // Keeps master amount FIXED!
    const handleAllocationAmountChange = (docId: string, val: number, maxDebt: number) => {
        const safeVal = Math.min(Math.max(0, val), maxDebt);
        setAllocations(prev => {
            const next = { ...prev };
            if (safeVal <= 0) {
                delete next[docId];
            } else {
                next[docId] = safeVal;
            }
            return next;
        });
    };

    // One-click helper: fill suggested remaining amount into a specific doc
    const handleFillSuggestedDocAmount = (docId: string, maxDebt: number) => {
        const currentDocAlloc = allocations[docId] || 0;
        const availablePool = unallocatedAmount + currentDocAlloc;
        const take = Math.min(availablePool, maxDebt);
        if (take > 0) {
            setAllocations(prev => ({
                ...prev,
                [docId]: take
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            setError('Số tiền phải lớn hơn 0');
            return;
        }
        if (!payerReceiver.trim()) {
            setError(type === 'RECEIPT' ? 'Vui lòng nhập họ tên người nộp tiền' : 'Vui lòng nhập họ tên người nhận tiền');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Build allocations array
            const formattedAllocations = Object.entries(allocations).map(([id, allocAmount]) => {
                if (type === 'RECEIPT') {
                    return { invoiceId: id, amount: allocAmount };
                } else {
                    return { billId: id, amount: allocAmount };
                }
            });

            const res = await createCashTransaction({
                type,
                category,
                transactionDate,
                amount,
                payerReceiver,
                phone,
                address,
                reason,
                paymentMethod,
                financeAccountId: financeAccountId || undefined,
                customerId: customerId || undefined,
                supplierId: supplierId || undefined,
                projectId: projectId || undefined,
                notes,
                allocations: formattedAllocations
            });

            if (res.success) {
                onSuccess();
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi khi lập chứng từ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ISSUED':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">Đã phát hành</span>;
            case 'PARTIAL_PAID':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">Đã trả 1 phần</span>;
            case 'APPROVED':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">Đã duyệt</span>;
            case 'SENT':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">Đã gửi</span>;
            default:
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 max-h-[92vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 shrink-0">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md text-sm"
                            style={{ backgroundColor: type === 'RECEIPT' ? '#059669' : '#e11d48' }}
                        >
                            {type === 'RECEIPT' ? 'PT' : 'PC'}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                {type === 'RECEIPT' ? 'Lập Phiếu Thu Tiền (PT)' : 'Lập Phiếu Chi Tiền (PC)'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {type === 'RECEIPT' ? 'Ghi nhận dòng tiền vào sổ quỹ & liên kết thu nợ hóa đơn bán hàng' : 'Ghi nhận dòng tiền chi từ quỹ & liên kết thanh toán hóa đơn NCC'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl transition cursor-pointer"
                        title="Đóng cửa sổ (ESC)"
                    >
                        <X className="w-4 h-4" />
                        <span>Đóng</span>
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs rounded-xl border border-rose-200 dark:border-rose-900 font-semibold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Switch Receipt / Payment */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 gap-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setType('RECEIPT');
                                setCategory('SALES');
                                setCustomerId('');
                                setSupplierId('');
                                setPartnerSearch('');
                                setUnpaidInvoices([]);
                                setUnpaidBills([]);
                                setAllocations({});
                            }}
                            style={type === 'RECEIPT' ? { backgroundColor: '#059669', color: '#ffffff' } : { color: '#475569' }}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                                type === 'RECEIPT' 
                                    ? 'shadow-md shadow-emerald-700/30' 
                                    : 'hover:text-slate-900 dark:text-slate-400'
                            }`}
                        >
                            + LẬP PHIẾU THU (INFLOW)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setType('PAYMENT');
                                setCategory('PURCHASE');
                                setCustomerId('');
                                setSupplierId('');
                                setPartnerSearch('');
                                setUnpaidInvoices([]);
                                setUnpaidBills([]);
                                setAllocations({});
                            }}
                            style={type === 'PAYMENT' ? { backgroundColor: '#e11d48', color: '#ffffff' } : { color: '#475569' }}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                                type === 'PAYMENT' 
                                    ? 'shadow-md shadow-rose-700/30' 
                                    : 'hover:text-slate-900 dark:text-slate-400'
                            }`}
                        >
                            - LẬP PHIẾU CHI (OUTFLOW)
                        </button>
                    </div>

                    {/* Partner Selection with Searchable Combobox */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative" ref={partnerDropdownRef}>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                {type === 'RECEIPT' ? 'Tìm & Chọn Khách Hàng (Tự liên kết HĐ nợ)' : 'Tìm & Chọn Nhà Cung Cấp (Tự liên kết HĐ mua)'}
                            </label>

                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={partnerSearch}
                                    onChange={(e) => {
                                        setPartnerSearch(e.target.value);
                                        setIsPartnerDropdownOpen(true);
                                        if (customerId || supplierId) {
                                            setCustomerId('');
                                            setSupplierId('');
                                            setUnpaidInvoices([]);
                                            setUnpaidBills([]);
                                            setAllocations({});
                                        }
                                    }}
                                    onFocus={() => setIsPartnerDropdownOpen(true)}
                                    placeholder={type === 'RECEIPT' ? 'Nhập tên, mã khách hàng, số điện thoại...' : 'Nhập tên, mã NCC, số điện thoại...'}
                                    className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                                {(partnerSearch || customerId || supplierId) ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPartnerSearch('');
                                            setCustomerId('');
                                            setSupplierId('');
                                            setPayerReceiver('');
                                            setPhone('');
                                            setAddress('');
                                            setUnpaidInvoices([]);
                                            setUnpaidBills([]);
                                            setAllocations({});
                                            setIsPartnerDropdownOpen(false);
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        title="Xóa lựa chọn"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                )}
                            </div>

                            {/* Dropdown Options */}
                            {isPartnerDropdownOpen && (
                                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                                    <div 
                                        onClick={() => {
                                            setPartnerSearch('');
                                            setCustomerId('');
                                            setSupplierId('');
                                            setUnpaidInvoices([]);
                                            setUnpaidBills([]);
                                            setAllocations({});
                                            setIsPartnerDropdownOpen(false);
                                        }}
                                        className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-xs text-slate-500 italic"
                                    >
                                        -- Không chọn / {type === 'RECEIPT' ? 'Khách vãng lai' : 'NCC khác'} --
                                    </div>

                                    {type === 'RECEIPT' ? (
                                        filteredCustomers.length > 0 ? (
                                            filteredCustomers.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => handleCustomerChange(c.id)}
                                                    className={`p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer text-xs flex items-center justify-between transition ${
                                                        customerId === c.id ? 'bg-emerald-50/80 dark:bg-emerald-950/60 font-bold text-emerald-900 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'
                                                    }`}
                                                >
                                                    <div>
                                                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mr-2">[{c.code || 'KH'}]</span>
                                                        <span className="font-semibold">{c.name}</span>
                                                    </div>
                                                    {c.phone && <span className="text-[11px] text-slate-400 font-mono">{c.phone}</span>}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-xs text-slate-400 text-center">Không tìm thấy khách hàng nào phù hợp</div>
                                        )
                                    ) : (
                                        filteredSuppliers.length > 0 ? (
                                            filteredSuppliers.map(s => (
                                                <div
                                                    key={s.id}
                                                    onClick={() => handleSupplierChange(s.id)}
                                                    className={`p-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer text-xs flex items-center justify-between transition ${
                                                        supplierId === s.id ? 'bg-rose-50/80 dark:bg-rose-950/60 font-bold text-rose-900 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200'
                                                    }`}
                                                >
                                                    <div>
                                                        <span className="font-mono font-bold text-rose-700 dark:text-rose-400 mr-2">[{s.code || 'NCC'}]</span>
                                                        <span className="font-semibold">{s.name}</span>
                                                    </div>
                                                    {s.phone && <span className="text-[11px] text-slate-400 font-mono">{s.phone}</span>}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-xs text-slate-400 text-center">Không tìm thấy NCC nào phù hợp</div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Gắn vào Dự Án (Nếu có)
                            </label>
                            <select
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                <option value="">-- Không gắn dự án --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Amount & Date Input (Positioned prominently with step="any" to fix number validation) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Tổng số tiền chứng từ (VNĐ) <span className="text-rose-500">*</span>
                                </label>
                                {((type === 'RECEIPT' && totalCustomerDebt > 0) || (type === 'PAYMENT' && totalSupplierDebt > 0)) && (
                                    <button
                                        type="button"
                                        onClick={handleFillFullDebt}
                                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Điền hết nợ ({formatVND(type === 'RECEIPT' ? totalCustomerDebt : totalSupplierDebt)})
                                    </button>
                                )}
                            </div>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                required
                                value={amount || ''}
                                onChange={(e) => handleAmountChange(Number(e.target.value))}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-black text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Ngày chứng từ <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={transactionDate}
                                onChange={(e) => setTransactionDate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Currency in Words Preview */}
                    {amount > 0 && (
                        <div className="p-3 bg-emerald-50/80 dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-slate-700 text-xs">
                            <span className="text-slate-600 dark:text-slate-400 font-semibold">Bằng chữ: </span>
                            <span className="font-bold italic text-emerald-800 dark:text-emerald-400">
                                {numberToVietnameseWords(amount)}
                            </span>
                        </div>
                    )}

                    {/* Invoice Allocations Section (Receipts) - Only Issued / Partial Paid Invoices */}
                    {type === 'RECEIPT' && customerId && (
                        <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                                        Phân Bổ Thu Tiền Từ Hóa Đơn ({unpaidInvoices.length} HĐ đã phát hành còn nợ - Tổng nợ: <span className="text-rose-600 font-black">{formatVND(totalCustomerDebt)}</span>)
                                    </span>
                                </div>
                                {unpaidInvoices.length > 0 && amount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setAllocations(computeAutoAllocations(unpaidInvoices, amount))}
                                        style={{ backgroundColor: '#059669', color: '#ffffff' }}
                                        className="px-3 py-1.5 text-[11px] font-bold rounded-lg shadow-sm hover:brightness-110 flex items-center gap-1.5 transition cursor-pointer"
                                    >
                                        <Layers className="w-3.5 h-3.5 text-white" />
                                        <span>Tự động chia lại {formatVND(amount)}</span>
                                    </button>
                                )}
                            </div>

                            {/* Real-time Allocation Summary Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 text-xs font-semibold">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div>Tổng tiền phiếu: <strong className="text-slate-900 dark:text-white">{formatVND(amount)}</strong></div>
                                    <div>Đã phân bổ: <strong className="text-emerald-600 dark:text-emerald-400">{formatVND(totalAllocated)}</strong></div>
                                    {amount > 0 && unallocatedAmount > 0 && (
                                        <div className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                                            <span>💡 Còn thừa chưa phân bổ:</span>
                                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 rounded text-amber-900 dark:text-amber-300 font-mono font-black">{formatVND(unallocatedAmount)}</span>
                                        </div>
                                    )}
                                    {amount > 0 && overAllocatedAmount > 0 && (
                                        <div className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                            <span>⚠️ Vượt quá tổng tiền:</span>
                                            <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/60 rounded text-rose-900 dark:text-rose-300 font-mono font-black">+{formatVND(overAllocatedAmount)}</span>
                                        </div>
                                    )}
                                    {amount > 0 && unallocatedAmount === 0 && overAllocatedAmount === 0 && (
                                        <div className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Đã phân bổ đủ 100%</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isLoadingDocs ? (
                                <div className="py-6 text-center text-xs text-slate-500 font-medium">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                                    Đang tải danh sách hóa đơn còn nợ của khách hàng...
                                </div>
                            ) : unpaidInvoices.length > 0 ? (
                                <div className="border border-emerald-200/80 dark:border-emerald-900/40 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-emerald-100/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-emerald-200 dark:border-slate-800 text-[10px] uppercase">
                                            <tr>
                                                <th className="py-2.5 px-3 w-10 text-center">Chọn</th>
                                                <th className="py-2.5 px-3">Mã Hóa Đơn</th>
                                                <th className="py-2.5 px-3">Ngày HĐ</th>
                                                <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                                                <th className="py-2.5 px-3 text-right">Tổng Tiền</th>
                                                <th className="py-2.5 px-3 text-right">Đã Trả</th>
                                                <th className="py-2.5 px-3 text-right">Còn Nợ</th>
                                                <th className="py-2.5 px-3 text-right w-44">Tiền Phân Bổ (đ)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {unpaidInvoices.map((inv) => {
                                                const isAllocated = !!allocations[inv.id];
                                                const allocVal = allocations[inv.id] || 0;
                                                const docRemainingDebt = inv.remainingAmount;
                                                const suggestedForEmpty = Math.min(unallocatedAmount, docRemainingDebt);
                                                const suggestedForPartial = Math.min(unallocatedAmount, docRemainingDebt - allocVal);

                                                return (
                                                    <tr key={inv.id} className={`transition ${isAllocated ? 'bg-emerald-50/50 dark:bg-emerald-950/30' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'}`}>
                                                        <td className="py-2.5 px-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllocated}
                                                                onChange={() => handleAllocationToggle(inv.id, inv.remainingAmount)}
                                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                                            {inv.code}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-500 font-medium">
                                                            {new Date(inv.date).toLocaleDateString('vi-VN')}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center">
                                                            {getStatusBadge(inv.status)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                                            {formatVND(inv.totalAmount)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right text-slate-500">
                                                            {formatVND(inv.paidAmount)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                                                            {formatVND(inv.remainingAmount)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={inv.remainingAmount}
                                                                step="any"
                                                                value={allocVal || ''}
                                                                onChange={(e) => handleAllocationAmountChange(inv.id, Number(e.target.value), inv.remainingAmount)}
                                                                placeholder="0"
                                                                className={`w-full px-2 py-1 text-right font-bold text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                                                                    allocVal > 0 ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50/40' : 'border-slate-300 dark:border-slate-700 text-slate-700'
                                                                }`}
                                                            />
                                                            {/* Smart Suggestion Badge */}
                                                            {allocVal === 0 && suggestedForEmpty > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFillSuggestedDocAmount(inv.id, inv.remainingAmount)}
                                                                    className="mt-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center justify-end gap-0.5 w-full cursor-pointer"
                                                                    title="Bấm để tự động điền số tiền còn thừa vào hóa đơn này"
                                                                >
                                                                    <PlusCircle className="w-3 h-3 text-emerald-600" />
                                                                    <span>Gợi ý điền: {formatVND(suggestedForEmpty)}</span>
                                                                </button>
                                                            )}
                                                            {allocVal > 0 && allocVal < docRemainingDebt && suggestedForPartial > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFillSuggestedDocAmount(inv.id, inv.remainingAmount)}
                                                                    className="mt-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center justify-end gap-0.5 w-full cursor-pointer"
                                                                    title="Bấm để cộng thêm số tiền còn thừa vào hóa đơn này"
                                                                >
                                                                    <PlusCircle className="w-3 h-3 text-blue-600" />
                                                                    <span>Thêm: +{formatVND(suggestedForPartial)}</span>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500 italic py-2">
                                    Khách hàng này hiện không có hóa đơn đã phát hành nào chưa thanh toán. Phiếu thu sẽ được ghi nhận vào sổ quỹ thông thường.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Purchase Bill Allocations Section (Payments) - Only Approved / Partial Paid Bills */}
                    {type === 'PAYMENT' && supplierId && (
                        <div className="p-4 bg-rose-50/70 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-rose-600" />
                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                                        Phân Bổ Chi Thanh Toán HĐ Mua Hàng ({unpaidBills.length} HĐ đã duyệt còn nợ - Tổng nợ: <span className="text-rose-600 font-black">{formatVND(totalSupplierDebt)}</span>)
                                    </span>
                                </div>
                                {unpaidBills.length > 0 && amount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setAllocations(computeAutoAllocations(unpaidBills, amount))}
                                        style={{ backgroundColor: '#e11d48', color: '#ffffff' }}
                                        className="px-3 py-1.5 text-[11px] font-bold rounded-lg shadow-sm hover:brightness-110 flex items-center gap-1.5 transition cursor-pointer"
                                    >
                                        <Layers className="w-3.5 h-3.5 text-white" />
                                        <span>Tự động chia lại {formatVND(amount)}</span>
                                    </button>
                                )}
                            </div>

                            {/* Real-time Allocation Summary Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-white dark:bg-slate-800/90 rounded-xl border border-rose-200/80 dark:border-rose-900/40 text-xs font-semibold">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div>Tổng tiền phiếu: <strong className="text-slate-900 dark:text-white">{formatVND(amount)}</strong></div>
                                    <div>Đã phân bổ: <strong className="text-rose-600 dark:text-rose-400">{formatVND(totalAllocated)}</strong></div>
                                    {amount > 0 && unallocatedAmount > 0 && (
                                        <div className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                                            <span>💡 Còn thừa chưa phân bổ:</span>
                                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 rounded text-amber-900 dark:text-amber-300 font-mono font-black">{formatVND(unallocatedAmount)}</span>
                                        </div>
                                    )}
                                    {amount > 0 && overAllocatedAmount > 0 && (
                                        <div className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                            <span>⚠️ Vượt quá tổng tiền:</span>
                                            <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/60 rounded text-rose-900 dark:text-rose-300 font-mono font-black">+{formatVND(overAllocatedAmount)}</span>
                                        </div>
                                    )}
                                    {amount > 0 && unallocatedAmount === 0 && overAllocatedAmount === 0 && (
                                        <div className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Đã phân bổ đủ 100%</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isLoadingDocs ? (
                                <div className="py-6 text-center text-xs text-slate-500 font-medium">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-600" />
                                    Đang tải danh sách hóa đơn mua hàng còn nợ...
                                </div>
                            ) : unpaidBills.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="border border-rose-200/80 dark:border-rose-900/40 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-rose-100/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-rose-200 dark:border-slate-800 text-[10px] uppercase">
                                                <tr>
                                                    <th className="py-2.5 px-3 w-10 text-center">Chọn</th>
                                                    <th className="py-2.5 px-3">Mã Đơn / HĐ Mua</th>
                                                    <th className="py-2.5 px-3">Ngày</th>
                                                    <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                                                    <th className="py-2.5 px-3 text-right">Tổng Tiền</th>
                                                    <th className="py-2.5 px-3 text-right">Đã Trả</th>
                                                    <th className="py-2.5 px-3 text-right">Còn Nợ</th>
                                                    <th className="py-2.5 px-3 text-right w-44">Tiền Chi (đ)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {unpaidBills.map((bill) => {
                                                    const isAllocated = !!allocations[bill.id];
                                                    const allocVal = allocations[bill.id] || 0;
                                                    const billRemainingDebt = bill.remainingAmount;
                                                    const suggestedForEmpty = Math.min(unallocatedAmount, billRemainingDebt);
                                                    const suggestedForPartial = Math.min(unallocatedAmount, billRemainingDebt - allocVal);

                                                    return (
                                                        <tr key={bill.id} className={`transition ${isAllocated ? 'bg-rose-50/50 dark:bg-rose-950/30' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'}`}>
                                                            <td className="py-2.5 px-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isAllocated}
                                                                    onChange={() => handleAllocationToggle(bill.id, bill.remainingAmount)}
                                                                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                                                                />
                                                            </td>
                                                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                                                {bill.code}
                                                                {bill.supplierInvoice && (
                                                                    <span className="text-[10px] text-slate-400 block font-normal">Số: {bill.supplierInvoice}</span>
                                                                )}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-slate-500 font-medium">
                                                                {new Date(bill.date).toLocaleDateString('vi-VN')}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-center">
                                                                {getStatusBadge(bill.status)}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                                                {formatVND(bill.totalAmount)}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right text-slate-500">
                                                                {formatVND(bill.paidAmount)}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                                                                {formatVND(bill.remainingAmount)}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={bill.remainingAmount}
                                                                    step="any"
                                                                    value={allocVal || ''}
                                                                    onChange={(e) => handleAllocationAmountChange(bill.id, Number(e.target.value), bill.remainingAmount)}
                                                                    placeholder="0"
                                                                    className={`w-full px-2 py-1 text-right font-bold text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none ${
                                                                        allocVal > 0 ? 'border-rose-500 text-rose-700 dark:text-rose-400 bg-rose-50/40' : 'border-slate-300 dark:border-slate-700 text-slate-700'
                                                                    }`}
                                                                />
                                                                {/* Smart Suggestion Badge */}
                                                                {allocVal === 0 && suggestedForEmpty > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleFillSuggestedDocAmount(bill.id, bill.remainingAmount)}
                                                                        className="mt-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 hover:underline flex items-center justify-end gap-0.5 w-full cursor-pointer"
                                                                        title="Bấm để tự động điền số tiền còn thừa vào hóa đơn này"
                                                                    >
                                                                        <PlusCircle className="w-3 h-3 text-rose-600" />
                                                                        <span>Gợi ý điền: {formatVND(suggestedForEmpty)}</span>
                                                                    </button>
                                                                )}
                                                                {allocVal > 0 && allocVal < billRemainingDebt && suggestedForPartial > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleFillSuggestedDocAmount(bill.id, bill.remainingAmount)}
                                                                        className="mt-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center justify-end gap-0.5 w-full cursor-pointer"
                                                                        title="Bấm để cộng thêm số tiền còn thừa vào hóa đơn này"
                                                                    >
                                                                        <PlusCircle className="w-3 h-3 text-blue-600" />
                                                                        <span>Thêm: +{formatVND(suggestedForPartial)}</span>
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex items-center justify-between text-xs px-2 pt-1 font-semibold text-slate-600 dark:text-slate-400">
                                        <span>Đã phân bổ vào HĐ: <strong className="text-rose-600 dark:text-rose-400">{formatVND(totalAllocated)}</strong></span>
                                        <span>Tổng tiền phiếu chi: <strong className="text-slate-900 dark:text-white">{formatVND(amount)}</strong></span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500 italic py-2">
                                    Nhà cung cấp này hiện không có hóa đơn mua hàng đã duyệt nào chưa thanh toán. Phiếu chi sẽ được ghi nhận vào sổ quỹ thông thường.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Category & Account */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Danh mục nghiệp vụ
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                {type === 'RECEIPT' ? (
                                    <>
                                        <option value="SALES">Thu tiền bán hàng / Khách thanh toán</option>
                                        <option value="ADVANCE_REFUND">Thu hoàn ứng tạm ứng</option>
                                        <option value="BANK_INTEREST">Thu lãi tiền gửi / Đầu tư</option>
                                        <option value="DEBT_RECOVERY">Thu hồi nợ khó đòi</option>
                                        <option value="OTHER">Thu khác</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="PURCHASE">Chi trả tiền mua hàng / NCC</option>
                                        <option value="EXPENSE">Chi phí vận hành doanh nghiệp</option>
                                        <option value="PAYROLL">Chi trả lương & thưởng nhân viên</option>
                                        <option value="ADVANCE">Tạm ứng cho nhân viên</option>
                                        <option value="OFFICE">Chi mua sắm văn phòng phẩm / TSCĐ</option>
                                        <option value="OTHER">Chi khác</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Tài khoản / Quỹ hạch toán
                            </label>
                            <select
                                value={financeAccountId}
                                onChange={(e) => setFinanceAccountId(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} ({new Intl.NumberFormat('vi-VN').format(acc.currentBalance)} đ)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Payer/Receiver details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                {type === 'RECEIPT' ? 'Họ tên người nộp tiền' : 'Họ tên người nhận tiền'} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={payerReceiver}
                                onChange={(e) => setPayerReceiver(e.target.value)}
                                placeholder="VD: Nguyễn Văn A..."
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Số điện thoại
                            </label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="098xxxxxxx"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            Địa chỉ / Đơn vị
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Địa chỉ hoặc đơn vị công tác..."
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            Lý do {type === 'RECEIPT' ? 'nộp tiền' : 'chi tiền'}
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Nội dung cụ thể..."
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition border border-slate-300 dark:border-slate-700 cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Đóng Lại</span>
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{ backgroundColor: type === 'RECEIPT' ? '#059669' : '#e11d48', color: '#ffffff' }}
                            className="px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-lg transition hover:brightness-110 flex items-center gap-2 cursor-pointer"
                        >
                            <Check className="w-4 h-4 text-white" />
                            <span className="text-white font-bold">{isSubmitting ? 'Đang lưu...' : type === 'RECEIPT' ? 'Lưu Phiếu Thu & Phân Bổ' : 'Lưu Phiếu Chi & Phân Bổ'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}



