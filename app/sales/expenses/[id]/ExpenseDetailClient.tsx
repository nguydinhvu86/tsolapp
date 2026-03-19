'use client'

import React, { useState } from 'react';
import { Expense, ExpenseCategory, Customer, Supplier, User, ExpenseNote, Task } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { ArrowLeft, User as UserIcon, Calendar, CheckCircle2, DollarSign, Tag, FileText, Plus, MapPin, Phone, Building2, CreditCard, Clock, Link as LinkIcon, Download, Printer } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatMoney, formatDate, autoLinkText } from '@/lib/utils/formatters';
import { addExpenseNote } from '../actions';
import { useRouter } from 'next/navigation';

type ExpenseNoteWithUser = ExpenseNote & { user: { name: string | null } };

type ExpenseWithRelations = Expense & {
    category: ExpenseCategory;
    customer: Pick<Customer, 'id' | 'name' | 'phone'> | null;
    supplier: Pick<Supplier, 'id' | 'name' | 'phone'> | null;
    creator: Pick<User, 'id' | 'name' | 'email'>;
    notes: ExpenseNoteWithUser[];
    tasks: Task[];
};

export function ExpenseDetailClient({ initialData }: { initialData: ExpenseWithRelations }) {
    const router = useRouter();
    const { data: session } = useSession();

    const [noteContent, setNoteContent] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    // Optimistic UI state
    const [notes, setNotes] = useState<ExpenseNoteWithUser[]>(initialData.notes);

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim()) return;

        setIsSubmittingNote(true);
        const res = await addExpenseNote(initialData.id, noteContent);
        if (res.success && res.data) {
            const newNote: ExpenseNoteWithUser = {
                ...res.data,
                user: { name: session?.user?.name || 'Tôi' }
            };
            setNotes([newNote, ...notes]);
            setNoteContent('');
        } else {
            alert(res.error || 'Có lỗi khi thêm ghi chú');
        }
        setIsSubmittingNote(false);
    };

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <Link href="/sales/expenses" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-2 transition-colors">
                        <ArrowLeft size={16} className="mr-1" />
                        Quay lại danh sách Phiếu Chi
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Chi tiết Phiếu Chi</h1>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-semibold rounded-md border border-emerald-200 shadow-sm flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Hoàn Thành
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" className="flex items-center gap-2 border-slate-300 text-slate-700 bg-white hover:bg-slate-50">
                        <Printer size={16} /> In Phiếu Chi
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (Main Info) */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* General Info Card */}
                    <Card className="p-6 shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5 flex items-center gap-2">
                            <FileText size={20} className="text-indigo-500" />
                            Thông tin chung
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Mã Phiếu Chi</h3>
                                <p className="text-base font-medium text-slate-900">{initialData.code}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Calendar size={14} /> Ngày Chi</h3>
                                <p className="text-base font-medium text-slate-900">{formatDate(new Date(initialData.date))}</p>
                            </div>

                            <div className="md:col-span-2">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><UserIcon size={14} /> Đối tượng nhận tiền</h3>
                                {initialData.customer ? (
                                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                                        <p className="font-semibold text-blue-900 mb-1">{initialData.customer.name}</p>
                                        <div className="flex items-center gap-4 text-sm text-blue-700">
                                            <span className="flex items-center gap-1"><Building2 size={14} /> Khách hàng</span>
                                            {initialData.customer.phone && <span className="flex items-center gap-1"><Phone size={14} /> {initialData.customer.phone}</span>}
                                        </div>
                                    </div>
                                ) : initialData.supplier ? (
                                    <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg">
                                        <p className="font-semibold text-orange-900 mb-1">{initialData.supplier.name}</p>
                                        <div className="flex items-center gap-4 text-sm text-orange-700">
                                            <span className="flex items-center gap-1"><Building2 size={14} /> Nhà cung cấp</span>
                                            {initialData.supplier.phone && <span className="flex items-center gap-1"><Phone size={14} /> {initialData.supplier.phone}</span>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                                        <p className="font-semibold text-slate-800">{initialData.payee || "---"}</p>
                                        <span className="text-sm text-slate-500">Đối tượng ngoại bộ / Khác</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Financial Info Card */}
                    <Card className="p-6 shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5 flex items-center gap-2">
                            <DollarSign size={20} className="text-emerald-500" />
                            Chi tiết Khoản Chi
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Tag size={14} /> Danh mục chi phí</h3>
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
                                    {initialData.category.name}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><CreditCard size={14} /> P.Thức Thanh Toán</h3>
                                <p className="text-base font-medium text-slate-900 items-center flex gap-2">
                                    {initialData.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản (Bank Transfer)' :
                                        initialData.paymentMethod === 'CREDIT_CARD' ? 'Thẻ tín dụng (Credit Card)' :
                                            'Tiền mặt (Cash)'}
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Số tiền chi</h3>
                                <div className="text-3xl font-bold text-red-600 font-mono tracking-tight">
                                    - {formatMoney(initialData.amount)}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Diễn giải / Nội dung chi</h3>
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-900 font-medium whitespace-pre-wrap leading-relaxed shadow-inner">
                                    {initialData.description}
                                </div>
                            </div>

                            {initialData.reference && (
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Mã tham chiếu / Số hóa đơn gốc</h3>
                                    <p className="text-sm font-mono bg-slate-100 p-2 rounded text-slate-800 font-medium inline-block">{initialData.reference}</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Attachments Card */}
                    {initialData.attachment && (
                        <Card className="p-6 shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4 mb-4 flex items-center gap-2">
                                <LinkIcon size={20} className="text-blue-500" />
                                File đính kèm / Chứng từ
                            </h2>
                            <a
                                href={initialData.attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                            >
                                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="font-semibold text-slate-800 text-base truncate group-hover:text-blue-700 transition-colors">Xem chứng từ đính kèm</h4>
                                    <p className="text-sm text-slate-500 truncate">{initialData.attachment}</p>
                                </div>
                                <Button variant="secondary" className="bg-white group-hover:bg-blue-50 border-slate-300">
                                    <Download size={16} /> Mở file
                                </Button>
                            </a>
                        </Card>
                    )}
                </div>

                {/* Right Column (Sidebar) */}
                <div className="flex flex-col gap-6">

                    {/* Creator Info */}
                    <Card className="p-5 shadow-sm border border-slate-200 bg-slate-50/50">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <UserIcon size={16} className="text-slate-500" />
                            Người lập phiếu
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                                {initialData.creator.name ? initialData.creator.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{initialData.creator.name || 'Người dùng'}</p>
                                <p className="text-sm text-slate-500">{initialData.creator.email}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Notes Section */}
                    <Card className="p-0 shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={18} className="text-amber-500" />
                                Ghi chú nội bộ
                            </h3>
                            <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">{notes.length}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50/30">
                            {notes.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <FileText size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Chưa có ghi chú nào</p>
                                </div>
                            ) : (
                                notes.map((note) => (
                                    <div key={note.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <span className="font-semibold text-sm text-slate-800">{note.user?.name || "Người dùng"}</span>
                                            <span className="text-xs text-slate-400 font-medium" title={new Date(note.createdAt).toLocaleString('vi-VN')}>
                                                {formatDate(new Date(note.createdAt))}
                                            </span>
                                        </div>
                                        <div
                                            className="text-sm text-slate-700 whitespace-pre-wrap"
                                            dangerouslySetInnerHTML={{ __html: autoLinkText(note.content) }}
                                        />
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-white">
                            <form onSubmit={handleAddNote} className="flex flex-col gap-2">
                                <textarea
                                    className="w-full text-sm p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-shadow"
                                    placeholder="Viết ghi chú mới..."
                                    rows={3}
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    disabled={isSubmittingNote}
                                />
                                <Button
                                    type="submit"
                                    disabled={!noteContent.trim() || isSubmittingNote}
                                    className="w-full flex justify-center py-2 bg-slate-800 hover:bg-slate-900 text-white"
                                >
                                    {isSubmittingNote ? 'Đang lưu...' : 'Lưu Ghi Chú'}
                                </Button>
                            </form>
                        </div>
                    </Card>

                    {/* Tasks Integration */}
                    {initialData.tasks && initialData.tasks.length > 0 && (
                        <Card className="p-5 shadow-sm border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-indigo-500" />
                                    Công Việc Liên Quan
                                </div>
                                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">{initialData.tasks.length}</span>
                            </h3>
                            <div className="flex flex-col gap-3">
                                {initialData.tasks.map(task => (
                                    <Link href={`/tasks/${task.id}`} key={task.id} className="group block">
                                        <div className="border border-slate-200 rounded-lg p-3 hover:border-indigo-300 hover:shadow-md transition-all bg-white cursor-pointer">
                                            <p className="font-semibold text-sm text-slate-800 group-hover:text-indigo-700 transition-colors mb-1 truncate">{task.title}</p>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className={`px-2 py-0.5 rounded font-medium ${task.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' :
                                                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {task.status}
                                                </span>
                                                {task.dueDate && (
                                                    <span className="text-slate-500 font-medium">Hạn: {formatDate(new Date(task.dueDate))}</span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}
