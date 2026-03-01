'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { ArrowLeft, User, Mail, Phone, MapPin, Building2, FileSpreadsheet, FileText, FileOutput, FilePlus2, Eye, Edit, FileStack, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function CustomerDetailClient({ customer }: { customer: any }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'quotes' | 'contracts' | 'handovers' | 'payments' | 'appendices' | 'dispatches'>('quotes');

    const tabs = [
        { id: 'quotes', name: 'Báo Giá', count: customer.quotes.length, icon: FileSpreadsheet },
        { id: 'contracts', name: 'Hợp Đồng', count: customer.contracts.length, icon: FileText },
        { id: 'appendices', name: 'Phụ Lục HĐ', count: customer.contracts.reduce((acc: number, c: any) => acc + (c.appendices?.length || 0), 0), icon: FileStack },
        { id: 'dispatches', name: 'Công Văn', count: customer.dispatches?.length || 0, icon: Mail },
        { id: 'handovers', name: 'Bàn Giao', count: customer.handovers.length, icon: FileOutput },
        { id: 'payments', name: 'Đề Nghị TT', count: customer.paymentRequests.length, icon: FilePlus2 },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return { bg: '#f1f5f9', color: '#64748b', text: 'Nháp' };
            case 'SENT': return { bg: '#dbeafe', color: '#3b82f6', text: 'Đã gửi' };
            case 'ACCEPTED': return { bg: '#dcfce7', color: '#16a34a', text: 'Đã duyệt' };
            case 'SIGNED': return { bg: '#dcfce7', color: '#16a34a', text: 'Đã ký' };
            case 'REJECTED': return { bg: '#fee2e2', color: '#ef4444', text: 'Từ chối' };
            case 'CANCELLED': return { bg: '#fee2e2', color: '#ef4444', text: 'Đã hủy' };
            default: return { bg: '#f1f5f9', color: '#64748b', text: status };
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header / Back Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <button onClick={() => router.push('/customers')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}>
                    <ArrowLeft size={18} color="var(--text-main)" />
                </button>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                        Chi tiết Khách hàng
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Quản lý thông tin và tài liệu liên kết.</p>
                </div>
            </div>

            {/* Customer Info Card */}
            <Card style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                        <User size={40} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.25rem 0', color: 'var(--text-main)' }}>{customer.name}</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Mail size={16} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</p>
                                    <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500 }}>{customer.email || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Phone size={16} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Số Điện Thoại</p>
                                    <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500 }}>{customer.phone || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Building2 size={16} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mã Số Thuế</p>
                                    <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500 }}>{customer.taxCode || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><MapPin size={16} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Địa Chỉ</p>
                                    <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500 }}>{customer.address || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tabs & Related Documents */}
            <Card style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#fafafa' }}>
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '1rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
                                    borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                    fontWeight: isActive ? 600 : 500, fontSize: '0.9375rem', transition: 'all 0.2s ease',
                                    outline: 'none'
                                }}
                            >
                                <Icon size={18} />
                                {tab.name}
                                <span style={{
                                    background: isActive ? 'rgba(79, 70, 229, 0.1)' : 'var(--border)',
                                    color: isActive ? 'var(--primary)' : 'var(--text-main)',
                                    padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700
                                }}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Danh sách hồ sơ</h3>

                        {/* Contextual Quick Actions */}
                        {activeTab === 'quotes' && (
                            <Link href={`/quotes/new?customerId=${customer.id}`}>
                                <Button className="gap-2" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}><Plus size={16} /> Tạo Báo Giá</Button>
                            </Link>
                        )}
                        {activeTab === 'contracts' && (
                            <Link href={`/contracts/new?customerId=${customer.id}`}>
                                <Button className="gap-2" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}><Plus size={16} /> Soạn Hợp Đồng</Button>
                            </Link>
                        )}
                        {activeTab === 'appendices' && (
                            <Link href="/contract-appendices/new">
                                <Button className="gap-2" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}><Plus size={16} /> Thêm Phụ Lục</Button>
                            </Link>
                        )}
                        {activeTab === 'dispatches' && (
                            <Link href={`/dispatches/new?customerId=${customer.id}`}>
                                <Button className="gap-2" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}><Plus size={16} /> Soạn Công Văn</Button>
                            </Link>
                        )}
                        {activeTab === 'handovers' && (
                            <Link href={`/handovers/new?customerId=${customer.id}`}>
                                <Button className="gap-2" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}><Plus size={16} /> Tạo Bàn Giao</Button>
                            </Link>
                        )}
                        {activeTab === 'payments' && (
                            <Link href={`/payment-requests/new?customerId=${customer.id}`}>
                                <Button className="gap-2" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}><Plus size={16} /> Tạo Đề Nghị TT</Button>
                            </Link>
                        )}
                    </div>

                    <Table>
                        <thead>
                            <tr>
                                <th>Mã HS</th>
                                <th>Tiêu đề</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo</th>
                                <th style={{ width: '100px', textAlign: 'right' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeTab === 'quotes' && customer.quotes.map((doc: any) => <DocumentRow key={doc.id} doc={doc} type="quotes" getStatusColor={getStatusColor} />)}
                            {activeTab === 'contracts' && customer.contracts.map((doc: any) => <DocumentRow key={doc.id} doc={doc} type="contracts" getStatusColor={getStatusColor} />)}
                            {activeTab === 'appendices' && customer.contracts.flatMap((c: any) => c.appendices || []).map((doc: any) => <DocumentRow key={doc.id} doc={doc} type="contract-appendices" getStatusColor={getStatusColor} />)}
                            {activeTab === 'dispatches' && customer.dispatches?.map((doc: any) => <DocumentRow key={doc.id} doc={doc} type="dispatches" getStatusColor={getStatusColor} />)}
                            {activeTab === 'handovers' && customer.handovers.map((doc: any) => <DocumentRow key={doc.id} doc={doc} type="handovers" getStatusColor={getStatusColor} />)}
                            {activeTab === 'payments' && customer.paymentRequests.map((doc: any) => <DocumentRow key={doc.id} doc={doc} type="payment-requests" getStatusColor={getStatusColor} />)}

                            {/* Empty state */}
                            {((activeTab === 'quotes' && customer.quotes.length === 0) ||
                                (activeTab === 'contracts' && customer.contracts.length === 0) ||
                                (activeTab === 'appendices' && customer.contracts.reduce((acc: number, c: any) => acc + (c.appendices?.length || 0), 0) === 0) ||
                                (activeTab === 'dispatches' && (!customer.dispatches || customer.dispatches.length === 0)) ||
                                (activeTab === 'handovers' && customer.handovers.length === 0) ||
                                (activeTab === 'payments' && customer.paymentRequests.length === 0)) && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                            Chưa có tài liệu nào trong mục này.
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}

function DocumentRow({ doc, type, getStatusColor }: { doc: any, type: string, getStatusColor: (s: string) => { bg: string, color: string, text: string } }) {
    const statusObj = getStatusColor(doc.status);
    return (
        <tr>
            <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>#{doc.id.slice(-6).toUpperCase()}</td>
            <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{doc.title}</td>
            <td>
                <span style={{
                    backgroundColor: statusObj.bg, color: statusObj.color,
                    padding: '0.25rem 0.75rem', borderRadius: '999px',
                    fontSize: '0.75rem', fontWeight: 600, display: 'inline-block'
                }}>
                    {statusObj.text}
                </span>
            </td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</td>
            <td>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <Link href={`/${type}/${doc.id}`} style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', transition: 'all 0.2s'
                    }} title="Xem chi tiết & In">
                        <Eye size={16} />
                    </Link>
                </div>
            </td>
        </tr>
    );
}
