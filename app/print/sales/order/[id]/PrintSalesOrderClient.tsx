'use client';

import React, { useEffect } from 'react';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrintSalesOrderClient({ order, settings }: any) {
    const router = useRouter();


    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        alert("Lưu ý để có file PDF sắc nét:\n\nKhi hộp thoại In xuất hiện, hãy chọn Máy in (Destination) là 'Lưu dưới dạng PDF' (Save as PDF). Tính năng này sẽ giúp file PDF của bạn giữ nguyên định dạng giấy khổ A4 và rõ nét 100% ở định dạng chữ (Vector), không bị mờ nhòe như định dạng ảnh.");
        const originalTitle = document.title;
        document.title = `Don_Hang_${order.code}`;
        window.print();
        document.title = originalTitle;
    };

    // Lock body scroll when this page is open to prevent underlying layout scrolling
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <div className="print-wrapper" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#cbd5e1', // slate-300
            zIndex: 9999, // Cover entire Main Layout
            overflowY: 'auto',
            fontFamily: '"Times New Roman", Times, serif'
        }}>
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 15mm;
                        size: A4;
                    }
                    body, html {
                        height: auto !important;
                        overflow: visible !important;
                        display: block !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print-wrapper {
                        position: static !important;
                        top: auto !important;
                        left: auto !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        background-color: white !important;
                        display: block !important;
                    }
                    .print-wrapper, .print-wrapper * {
                        visibility: visible;
                    }
                    .print-container {
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        max-width: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
                    tr    { page-break-inside: auto; page-break-after: auto; }
                    td, th { page-break-inside: auto; }
                    thead { display: table-header-group; }
                    tfoot {
                        display: table-row-group;
                    }
                }
            `}</style>

            {/* Print Controls Navbar */}
            <div className="no-print" style={{
                position: 'sticky', top: 0, left: 0, right: 0, backgroundColor: '#1e293b',
                padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 10
            }}>
                <button onClick={() => router.back()} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent',
                    border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600
                }}>
                    <ArrowLeft size={18} /> Quay Lại
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleExportPDF} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981',
                        border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                        padding: '0.6rem 1.2rem', borderRadius: '6px'
                    }}>
                        <Download size={18} /> Xuất PDF (Sắc nét)
                    </button>
                    <button onClick={handlePrint} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6',
                        border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                        padding: '0.6rem 1.2rem', borderRadius: '6px'
                    }}>
                        <Printer size={18} /> In Đơn Hàng (Ctrl + P)
                    </button>
                </div>
            </div>

            {/* A4 Paper Container */}
            <div className="print-container" style={{
                maxWidth: '800px',
                margin: '2rem auto',
                backgroundColor: 'white',
                padding: '40px 50px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                color: '#000',
                minHeight: '1122px' // A4 approx height
            }}>

                {/* Header: Company Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', textTransform: 'uppercase', color: '#0f172a' }}>
                            {settings?.COMPANY_FULL_NAME || settings?.COMPANY_NAME || 'TÊN CÔNG TY CHƯA CẬP NHẬT'}
                        </h2>
                        <div style={{ fontSize: '0.95rem', lineHeight: '1.5', color: '#334155' }}>
                            {settings?.COMPANY_ADDRESS && <div><strong>Địa chỉ:</strong> {settings.COMPANY_ADDRESS}</div>}
                            {settings?.COMPANY_PHONE && <div><strong>Điện thoại:</strong> {settings.COMPANY_PHONE}</div>}
                            {settings?.COMPANY_EMAIL && <div><strong>Email:</strong> {settings.COMPANY_EMAIL}</div>}
                            {settings?.COMPANY_TAX && <div><strong>Mã số thuế:</strong> {settings.COMPANY_TAX}</div>}
                        </div>
                    </div>
                    {settings?.COMPANY_LOGO && (
                        <div style={{ marginLeft: '2rem' }}>
                            <img src={settings.COMPANY_LOGO} alt="Company Logo" style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }} />
                        </div>
                    )}
                </div>

                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>ĐƠN ĐẶT HÀNG</h1>
                    <i style={{ fontSize: '1rem', color: '#475569' }}>Số: {order.code} | Ngày: {formatDate(order.date)}</i>
                </div>

                {/* Order Detail Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px dotted #ccc', display: 'inline-block', marginBottom: '0.5rem' }}>THÔNG TIN KHÁCH HÀNG</h3>
                        <div><strong>Tên khách hàng:</strong> {order.customer?.name}</div>
                        {order.customer?.company && <div><strong>Công ty:</strong> {order.customer?.company}</div>}
                        {order.customer?.address && <div><strong>Địa chỉ:</strong> {order.customer?.address}</div>}
                        {order.customer?.phone && <div><strong>Điện thoại:</strong> {order.customer?.phone}</div>}
                    </div>
                    <div style={{ flex: 1, paddingLeft: '1rem', textAlign: 'right' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px dotted #ccc', display: 'inline-block', marginBottom: '0.5rem' }}>THÔNG TIN ĐƠN HÀNG</h3>
                        <div><strong>Người lập:</strong> {order.creator?.name || '---'}</div>
                        <div><strong>Trạng thái:</strong> {
                            order.status === 'DRAFT' ? 'Bản Dự Thảo' :
                                order.status === 'CONFIRMED' ? 'Chốt Đơn' :
                                    order.status === 'COMPLETED' ? 'Hoàn Thành' :
                                        order.status === 'CANCELLED' ? 'Đã Hủy' : order.status
                        }</div>
                    </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '1rem' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                            <th style={{ border: '1px solid #cbd5e1', padding: '12px 6px', textAlign: 'center', width: '5%' }}>STT</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '12px 6px', textAlign: 'left', width: '57%' }}>Sản Phẩm / Dịch Vụ</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '12px 6px', textAlign: 'center', width: '5%' }}>SL</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '12px 6px', textAlign: 'right', width: '13%', whiteSpace: 'nowrap' }}>Đơn Giá (VNĐ)</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '12px 6px', textAlign: 'center', width: '6%' }}>Thuế (%)</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '12px 6px', textAlign: 'right', width: '14%', whiteSpace: 'nowrap' }}>Thành Tiền (VNĐ)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items?.map((item: any, index: number) => (
                            <tr key={item.id}>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'center' }}>{index + 1}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px' }}>
                                    <strong style={{ display: 'block' }}>{item.customName || item.product?.name || 'Sản phẩm tự do'}</strong>
                                    {item.product?.sku && <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block' }}>SKU: {item.product.sku}</span>}
                                    {item.description && <span style={{ fontSize: '0.9rem', color: '#475569', display: 'block', whiteSpace: 'pre-wrap', marginTop: '4px' }}>{item.description}</span>}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'center' }}>{item.quantity} {item.unit || item.product?.unit || ''}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'center' }}>{item.taxRate}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.totalPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền trước thuế:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(order.subTotal || 0)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền thuế:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(order.taxAmount || 0)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>TỔNG CỘNG:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '12px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>{formatMoney(order.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Notes */}
                {order.notes && (
                    <div style={{ marginBottom: '3rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem 0', textDecoration: 'underline' }}>Ghi chú:</h4>
                        <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-line', fontStyle: 'italic', padding: '10px 15px', backgroundColor: '#f8fafc', borderLeft: '4px solid #94a3b8' }}>
                            {order.notes}
                        </div>
                    </div>
                )}

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2rem', marginTop: '4rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '1.1rem' }}>ĐẠI DIỆN KHÁCH HÀNG</strong>
                        <i style={{ fontSize: '0.9rem', color: '#64748b' }}>(Ký và ghi rõ họ tên)</i>
                        <div style={{ height: '100px' }}></div>
                        <strong>{order.customer?.name}</strong>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '1.1rem' }}>NGƯỜI LẬP ĐƠN HÀNG</strong>
                        <i style={{ fontSize: '0.9rem', color: '#64748b' }}>(Ký và ghi rõ họ tên)</i>
                        <div style={{ height: '100px' }}></div>
                        <strong>{order.creator?.name}</strong>
                    </div>
                </div>

            </div>
        </div>
    );
}
