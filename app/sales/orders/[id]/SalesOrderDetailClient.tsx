'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, ShoppingCart, CheckSquare, Building, FileDown, Plus, ExternalLink, Copy, User, ArrowRightLeft, Edit2, Mail, CheckCircle2, GripVertical, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { updateSalesOrderStatus, convertOrderToInvoice, reorderSalesOrderItems } from '../actions';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { TaxBadge } from '@/app/components/ui/TaxRateSelect';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { Modal } from '@/app/components/ui/Modal';
import { SendEmailModal } from '@/app/components/ui/modals/SendEmailModal';
import { sendOrderEmail } from '../actions';
import { useSession } from 'next-auth/react';
import { DocumentSignatureBlock } from '@/app/components/ui/DocumentSignatureBlock';

export default function SalesOrderDetailClient({ initialData, customers, products, users, emailTemplates }: any) {
    const { data: session } = useSession() as any;
    const router = useRouter();
    const [order, setOrder] = useState(initialData);
    const [activeTab, setActiveTab] = useState<'items'>('items');
    const [copied, setCopied] = useState(false);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

    // Reorder state
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
    const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [reorderSuccessToast, setReorderSuccessToast] = useState(false);

    const handleReorder = async (newItems: any[]) => {
        setOrder((prev: any) => ({ ...prev, items: newItems }));
        setIsSavingOrder(true);
        try {
            const res = await reorderSalesOrderItems(order.id, newItems);
            if (res.success) {
                setReorderSuccessToast(true);
                setTimeout(() => setReorderSuccessToast(false), 2500);
            } else {
                alert(res.error || 'Lỗi khi cập nhật thứ tự');
                setOrder(initialData);
            }
        } catch (e: any) {
            alert(e.message || 'Lỗi khi cập nhật thứ tự');
            setOrder(initialData);
        } finally {
            setIsSavingOrder(false);
        }
    };

    const handleItemDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleItemDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverItemIndex !== index) {
            setDragOverItemIndex(index);
        }
    };

    const handleItemDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
            setDraggedItemIndex(null);
            setDragOverItemIndex(null);
            return;
        }

        const newItems = [...(order.items || [])];
        const [movedItem] = newItems.splice(draggedItemIndex, 1);
        newItems.splice(targetIndex, 0, movedItem);

        setDraggedItemIndex(null);
        setDragOverItemIndex(null);
        handleReorder(newItems);
    };

    const handleItemDragEnd = () => {
        setDraggedItemIndex(null);
        setDragOverItemIndex(null);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const items = order.items || [];
        if (targetIndex < 0 || targetIndex >= items.length) return;
        const newItems = [...items];
        const [movedItem] = newItems.splice(index, 1);
        newItems.splice(targetIndex, 0, movedItem);
        handleReorder(newItems);
    };

    // Email Modal State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // Generic Action Modal State
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, title: string, message: React.ReactNode, action: () => Promise<void> } | null>(null);
    const [isActioning, setIsActioning] = useState(false);

    useEffect(() => {
        setOrder(initialData);
    }, [initialData]);

    const handleCopyPublicLink = () => {
        const publicUrl = `${window.location.origin}/public/sales/order/${order.id}`;
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStatusChange = async (newStatus: string) => {
        setActionModal({
            isOpen: true,
            title: 'Chuyển Trạng Thái',
            message: `Xác nhận đổi trạng thái đơn đặt hàng thành: ${newStatus}?`,
            action: async () => {
                const res = await updateSalesOrderStatus(order.id, newStatus);
                if (res.success) {
                    setOrder({ ...order, status: newStatus });
                    router.refresh();
                } else {
                    alert(res.error);
                }
            }
        });
    };

    const handleConfirmConvert = async () => {
        setIsConverting(true);
        const res = await convertOrderToInvoice(order.id);
        if (res.success) {
            alert("Đã tạo Hóa Đơn thành công, đang chuyển hướng...");
            router.push('/sales/invoices');
        } else {
            alert(res.error);
            setIsConverting(false);
            setIsConvertModalOpen(false);
        }
    };

    const tabs = [
        { id: 'items', label: 'Chi tiết sản phẩm', icon: <ShoppingCart size={16} />, count: order.items?.length || 0 }
    ] as const;

    return (
        <div className="space-y-6">
            {/* Header & Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shadow-xs"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                                Đơn Hàng <span className="font-mono text-slate-700">{order.code}</span>
                            </h1>
                            <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Quản lý chi tiết đơn hàng, xuất bán và các công việc liên quan.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleCopyPublicLink}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-colors"
                    >
                        <Copy size={14} className="text-slate-500" />
                        {copied ? 'Đã sao chép' : 'Copy Link Gửi KH'}
                    </button>
                    <Link
                        href={`/print/sales/order/${order.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50/50 text-xs font-semibold text-sky-700 hover:bg-sky-100/60 shadow-xs transition-colors"
                    >
                        <ExternalLink size={14} />
                        Xem Bản In
                    </Link>
                    <button
                        onClick={() => router.push(`/sales/orders?edit=${order.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
                    >
                        <Edit2 size={14} className="text-slate-500" />
                        Chỉnh Sửa
                    </button>
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/80 shadow-xs transition-colors"
                    >
                        <Mail size={14} className="text-emerald-700" />
                        Gửi Email
                    </button>

                    {(order.status === 'DRAFT' || order.status === 'CONFIRMED') && (
                        <button
                            onClick={() => setIsConvertModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100/80 shadow-xs transition-colors"
                        >
                            <ArrowRightLeft size={14} className="text-amber-700" />
                            Lên Hóa Đơn
                        </button>
                    )}

                    {order.status === 'DRAFT' && (
                        <button
                            onClick={() => handleStatusChange('CONFIRMED')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--primary)] text-xs font-semibold text-white hover:opacity-90 shadow-xs transition-all"
                        >
                            <CheckCircle2 size={14} />
                            Chốt Đơn Mới
                        </button>
                    )}
                    {order.status === 'CONFIRMED' && (
                        <>
                            <button
                                onClick={() => handleStatusChange('COMPLETED')}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--primary)] text-xs font-semibold text-white hover:opacity-90 shadow-xs transition-all"
                            >
                                <CheckCircle2 size={14} />
                                Hoàn Thành Đơn
                            </button>
                            <button
                                onClick={() => handleStatusChange('CANCELLED')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-xs transition-colors"
                            >
                                Hủy Đơn Hàng
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details & Items */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Summary Info Card */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
                        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                            <FileText size={16} className="text-[var(--primary)]" />
                            <h2 className="text-sm font-semibold text-slate-900">Thông tin đơn hàng</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Khách hàng</p>
                                <div className="flex items-center gap-1.5">
                                    <Building size={14} className="text-slate-400 shrink-0" />
                                    <Link href={`/customers/${order.customerId}`} className="font-semibold text-xs text-slate-800 hover:text-[var(--primary)] truncate">
                                        {order.customer?.name}
                                    </Link>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Ngày lập đơn</p>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                    <Calendar size={14} className="text-slate-400 shrink-0" />
                                    {formatDate(order.date)}
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nhân viên phụ trách</p>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                    <User size={14} className="text-slate-400 shrink-0" />
                                    {order.creator?.name || '---'}
                                </div>
                            </div>
                            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">Tổng giá trị</p>
                                <p className="font-bold text-sm text-[var(--primary)] tracking-tight">{formatMoney(order.totalAmount)}</p>
                            </div>
                            {order.notes && (
                                <div className="col-span-full p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Ghi chú</p>
                                    <p className="text-xs text-slate-600 leading-relaxed">{order.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs area & Item Table */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="flex border-b border-slate-100 bg-slate-50/50 px-4 pt-2">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                                            isActive
                                                ? 'border-[var(--primary)] text-[var(--primary)] bg-white rounded-t-lg shadow-2xs'
                                                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            isActive ? 'bg-emerald-50 text-[var(--primary)]' : 'bg-slate-200/60 text-slate-600'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-5">
                            {activeTab === 'items' && (
                                <div className="space-y-4">
                                    {/* Reorder feedback / instructions banner */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
                                        <div className="flex items-center gap-2">
                                            <GripVertical size={14} className="text-emerald-700" />
                                            <span>Kéo thả biểu tượng ⠿ hoặc dùng nút mũi tên để đổi thứ tự sản phẩm. Hệ thống sẽ tự động lưu.</span>
                                        </div>
                                        {isSavingOrder && (
                                            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                                                <Loader2 size={13} className="animate-spin" />
                                                <span>Đang lưu thứ tự...</span>
                                            </div>
                                        )}
                                        {reorderSuccessToast && (
                                            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                                                <CheckCircle2 size={13} />
                                                <span>Đã lưu thứ tự mới!</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="overflow-x-auto rounded-lg border border-slate-100">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                                                    <th className="py-2.5 px-2 w-[60px] text-center font-semibold">STT</th>
                                                    <th className="py-2.5 px-3.5 font-semibold">Sản Phẩm</th>
                                                    <th className="py-2.5 px-3.5 font-semibold text-center">Số Lượng</th>
                                                    <th className="py-2.5 px-3.5 font-semibold text-right">Đơn Giá</th>
                                                    <th className="py-2.5 px-3.5 font-semibold text-center">Thuế</th>
                                                    <th className="py-2.5 px-3.5 font-semibold text-right">Thành Tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {order.items?.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                                                            Chưa có sản phẩm nào trong đơn hàng.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    order.items?.map((item: any, idx: number) => {
                                                        const isDragging = draggedItemIndex === idx;
                                                        const isDragOver = dragOverItemIndex === idx;
                                                        return (
                                                            <tr 
                                                                key={item.id || idx}
                                                                draggable
                                                                onDragStart={(e) => handleItemDragStart(e, idx)}
                                                                onDragOver={(e) => handleItemDragOver(e, idx)}
                                                                onDrop={(e) => handleItemDrop(e, idx)}
                                                                onDragEnd={handleItemDragEnd}
                                                                className={`group transition-colors ${
                                                                    isDragging 
                                                                        ? 'opacity-40 bg-emerald-50/50' 
                                                                        : isDragOver 
                                                                            ? 'bg-emerald-50 border-t-2 border-emerald-500' 
                                                                            : item.isSubItem 
                                                                                ? 'bg-slate-50/30 hover:bg-slate-50/60' 
                                                                                : 'hover:bg-slate-50/50'
                                                                }`}
                                                            >
                                                                <td className="py-2 px-2 text-center align-middle">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <div 
                                                                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-emerald-700 p-1 rounded hover:bg-emerald-50"
                                                                            title="Kéo thả để sắp xếp"
                                                                        >
                                                                            <GripVertical size={14} />
                                                                        </div>
                                                                        <span className="font-mono text-slate-500 font-semibold text-[11px] w-4 text-center">
                                                                            {idx + 1}
                                                                        </span>
                                                                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button 
                                                                                type="button"
                                                                                disabled={idx === 0}
                                                                                onClick={() => moveItem(idx, 'up')}
                                                                                className="p-0.5 hover:text-emerald-600 disabled:opacity-20 cursor-pointer"
                                                                                title="Di chuyển lên"
                                                                            >
                                                                                <ChevronUp size={11} />
                                                                            </button>
                                                                            <button 
                                                                                type="button"
                                                                                disabled={idx === order.items.length - 1}
                                                                                onClick={() => moveItem(idx, 'down')}
                                                                                className="p-0.5 hover:text-emerald-600 disabled:opacity-20 cursor-pointer"
                                                                                title="Di chuyển xuống"
                                                                            >
                                                                                <ChevronDown size={11} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className={`py-3 px-3.5 font-medium ${item.isSubItem ? 'pl-8 text-slate-600' : 'text-slate-800'}`}>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {item.isSubItem && <span className="text-slate-400 text-xs">↳</span>}
                                                                        <span className="font-semibold">{item.customName || item.product?.name || 'Sản phẩm tự do'}</span>
                                                                    </div>
                                                                    {item.product?.sku && <div className="text-[11px] font-mono text-slate-400 mt-0.5">SKU: {item.product.sku}</div>}
                                                                    {item.description && <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap font-normal leading-relaxed">{item.description}</div>}
                                                                </td>
                                                                <td className="py-3 px-3.5 text-center text-slate-600 font-medium">
                                                                    {item.quantity} {item.unit || item.product?.unit || ''}
                                                                </td>
                                                                <td className="py-3 px-3.5 text-right font-mono text-slate-700">
                                                                    {formatMoney(item.unitPrice)}
                                                                </td>
                                                                <td className="py-3 px-3.5 text-center">
                                                                    <TaxBadge rate={item.taxRate} />
                                                                </td>
                                                                <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-900">
                                                                    {formatMoney(item.totalPrice)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            {order.items?.length > 0 && (
                                                <>
                                                    <tr className="bg-slate-50/40 border-t border-slate-200">
                                                        <td colSpan={5} className="py-2.5 px-3.5 text-right text-slate-500 font-medium">Tiền trước thuế:</td>
                                                        <td className="py-2.5 px-3.5 text-right font-mono font-medium text-slate-800">{formatMoney(order.subTotal || 0)}</td>
                                                    </tr>
                                                    <tr className="bg-slate-50/40">
                                                        <td colSpan={5} className="py-2.5 px-3.5 text-right text-slate-500 font-medium">Tiền thuế:</td>
                                                        <td className="py-2.5 px-3.5 text-right font-mono font-medium text-slate-800">{formatMoney(order.taxAmount || 0)}</td>
                                                    </tr>
                                                    <tr className="bg-emerald-50/30 border-t border-slate-200">
                                                        <td colSpan={5} className="py-3 px-3.5 text-right font-bold text-slate-900">Tổng Cộng:</td>
                                                        <td className="py-3 px-3.5 text-right font-mono font-bold text-[var(--primary)] text-sm">{formatMoney(order.totalAmount)}</td>
                                                    </tr>
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        </div>
                    </div>

                    {/* Signatures Card */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
                        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                            <FileText size={16} className="text-[var(--primary)]" />
                            <h2 className="text-sm font-semibold text-slate-900">Chữ ký xác nhận</h2>
                        </div>
                        <div className="flex justify-around flex-wrap sm:flex-nowrap gap-6">
                            <DocumentSignatureBlock 
                                entityType="SALES_ORDER" 
                                entityId={order.id} 
                                role="CUSTOMER" 
                                title="ĐẠI DIỆN KHÁCH HÀNG" 
                                subtitle="(Khách hàng ký qua link public)" 
                                canSign={false} 
                                initialSignature={order.customerSignature} 
                                initialSignedAt={order.customerSignedAt}
                                metadata={{
                                    ip: order.customerSignIP,
                                    device: order.customerSignDevice,
                                    location: order.customerSignLocation
                                }} 
                            />
                            <DocumentSignatureBlock 
                                entityType="SALES_ORDER" 
                                entityId={order.id} 
                                role="COMPANY" 
                                title="NGƯỜI LẬP ĐƠN HÀNG" 
                                subtitle="(Ký xác nhận nội bộ)" 
                                canSign={true} 
                                initialSignature={order.companySignature} 
                                initialSignedAt={order.companySignedAt} 
                                signerName={order.creator?.name} 
                                companySignerId={session?.user?.id}
                            />
                        </div>
                    </div>

                </div>

                {/* Right Column: Related Tasks */}
                <div className="lg:col-span-1 space-y-6">
                    <TaskPanel
                        initialTasks={order.tasks || []}
                        users={users || []}
                        entityType="SALES_ORDER"
                        entityId={order.id}
                    />
                </div>
            </div>
            {/* Convert Modal */}
            <Modal isOpen={isConvertModalOpen} onClose={() => !isConverting && setIsConvertModalOpen(false)} title="Xác nhận Lên Hóa Đơn">
                <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <p className="text-gray-700 text-[15px] mb-6 leading-relaxed">
                        Bạn có chắc chắn muốn chuyển dữ liệu từ Đơn Đặt Hàng này thành <strong>Hóa Đơn</strong> không? Các thông tin chi tiết sẽ được tự động sao chép sang Hóa Đơn mới.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', padding: '1rem', borderRadius: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '9999px', color: '#3b82f6', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <ArrowRightLeft size={20} />
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: 1.625, marginTop: '0.125rem' }}>
                            <strong style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Cập nhật tự động</strong>
                            Đơn đặt hàng này sẽ tự động chuyển thành trạng thái <strong style={{ backgroundColor: '#dbeafe', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', color: '#1d4ed8', fontWeight: 700 }}>"Hoàn Thành"</strong> sau quá trình khởi tạo thành công.
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6' }}>
                        <button
                            onClick={() => setIsConvertModalOpen(false)}
                            className="btn btn-secondary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px' }}
                            disabled={isConverting}
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            onClick={handleConfirmConvert}
                            className="btn btn-primary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px', minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            disabled={isConverting}
                        >
                            {isConverting ? (
                                <>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>Xác Nhận Lên Hóa Đơn</>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Generic Action Modal */}
            <Modal isOpen={!!actionModal?.isOpen} onClose={() => !isActioning && setActionModal(null)} title={actionModal?.title || 'Xác nhận'}>
                <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <div className="text-gray-700 text-[15px] mb-6 leading-relaxed">
                        {actionModal?.message}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6' }}>
                        <button
                            onClick={() => setActionModal(null)}
                            className="btn btn-secondary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px' }}
                            disabled={isActioning}
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            onClick={async () => {
                                if (!actionModal) return;
                                setIsActioning(true);
                                try {
                                    await actionModal.action();
                                    setActionModal(null);
                                } finally {
                                    setIsActioning(false);
                                }
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            disabled={isActioning}
                        >
                            {isActioning ? (
                                <>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>Xác Nhận</>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                moduleType="ESTIMATE" // For now, we reuse ESTIMATE templates or create ORDER templates.
                defaultToEmail={order.customer?.email || ''}
                variablesData={{
                    customerName: order.customer?.name || '',
                    customerEmail: order.customer?.email || '',
                    senderName: order.creator?.name || '',
                    today: new Date().toLocaleDateString('vi-VN'),
                    code: order.code,
                    totalAmount: formatMoney(order.totalAmount),
                    link: typeof window !== 'undefined' ? `${window.location.origin}/public/sales/order/${order.id}` : ''
                }}
                templates={emailTemplates || []}
                printUrl={typeof window !== 'undefined' ? `${window.location.origin}/public/sales/order/${order.id}` : ''}
                documentName={`DonHang_${order.code}.pdf`}
                onSend={async (data) => {
                    const res = await sendOrderEmail(order.id, data.to, data.subject, data.htmlBody, data.attachmentName, data.attachmentBase64);
                    if (res.success) {
                        alert('Đã gửi email thành công!');
                        router.refresh();
                    } else {
                        throw new Error(res.error);
                    }
                }}
            />
        </div>
    );
}

