'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { ChevronLeft, CheckCircle2, Circle, MessageSquare, Clock, Plus, Trash2, User as UserIcon, Edit2, Info, Mail, Paperclip, Image as ImageIcon, X, FileIcon, Download, Type, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { updateTaskStatus, addChecklist, toggleChecklist, addComment, updateTask, editChecklist, deleteChecklist, sendTaskEmail, uploadTaskAttachment, deleteTaskAttachment } from '../actions';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { SendEmailModal } from '@/app/components/ui/modals/SendEmailModal';
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal';
import {
    toggleReaction, updateTaskLinks, searchEntities, getTaskComments
} from '../actions';
import { autoLinkHtml, autoLinkText } from '@/lib/utils/formatters';

const EMOJIS = ['👍', '❤️', '😂', '🔥', '👀', '🎉', '😢', '🚀'];

export function TaskDetailClient({ initialTask, users, emailTemplates = [] }: { initialTask: any, users: any[], emailTemplates?: any[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';
    const isAssignee = initialTask.assignees?.some((a: any) => a.userId === session?.user?.id);

    // canEdit allows changing task details/status (Assignees can do this)
    const canEdit = isAdmin || permissions.includes('TASKS_EDIT') || isAssignee;

    // canDelete allows removing documents, links, etc. (Strictly Admin / TASKS_EDIT)
    const canDelete = isAdmin || permissions.includes('TASKS_EDIT');

    const [task, setTask] = useState(initialTask);

    React.useEffect(() => {
        setTask(initialTask);
    }, [initialTask]);

    const [newChecklist, setNewChecklist] = useState('');
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
    const [editChecklistTitle, setEditChecklistTitle] = useState('');

    // Edit Task State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [editTaskTitle, setEditTaskTitle] = useState(initialTask.title || '');
    const [editTaskDesc, setEditTaskDesc] = useState(initialTask.description || '');
    const [editTaskPriority, setEditTaskPriority] = useState(initialTask.priority || 'MEDIUM');
    const [editTaskDueDate, setEditTaskDueDate] = useState<string>(initialTask.dueDate ? new Date(initialTask.dueDate).toISOString().split('T')[0] : '');

    // Edit Participants State
    const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
    const [editAssignees, setEditAssignees] = useState<string[]>(initialTask.assignees?.map((a: any) => a.userId) || []);
    const [editObservers, setEditObservers] = useState<string[]>(initialTask.observers?.map((o: any) => o.userId) || []);

    // Comment & Note Attachments State
    const [commentImages, setCommentImages] = useState<{ url: string, file: File }[]>([]);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');

    // Lightbox State
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string } | null>(null);

    const handleCommentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName.toLowerCase() === 'img') {
            setLightboxImage((target as HTMLImageElement).src);
        }
    };

    // Contextual references
    const relatedLinks = [];
    if (task.contract) relatedLinks.push({ label: 'Hợp đồng', value: task.contract.title, href: `/contracts/${task.contract.id}` });
    if (task.quote) relatedLinks.push({ label: 'Báo giá', value: task.quote.title, href: `/quotes/${task.quote.id}` });
    if (task.handover) relatedLinks.push({ label: 'Bàn giao', value: task.handover.title, href: `/handovers/${task.handover.id}` });
    if (task.paymentReq) relatedLinks.push({ label: 'Thanh toán', value: task.paymentReq.title, href: `/payment-requests/${task.paymentReq.id}` });
    if (task.dispatch) relatedLinks.push({ label: 'Công văn', value: task.dispatch.title, href: `/dispatches/${task.dispatch.id}` });
    if (task.customer) relatedLinks.push({ label: 'Khách hàng', value: task.customer.name, href: `/customers/${task.customer.id}` });
    if (task.salesOrder) relatedLinks.push({ label: 'Đơn hàng', value: task.salesOrder.code, href: `/sales/orders/${task.salesOrder.id}` });
    if (task.salesInvoice) relatedLinks.push({ label: 'Hóa đơn', value: task.salesInvoice.code, href: `/sales/invoices/${task.salesInvoice.id}` });
    if (task.salesEstimate) relatedLinks.push({ label: 'Báo giá (Sales)', value: task.salesEstimate.code, href: `/sales/estimates/${task.salesEstimate.id}` });
    if (task.salesPayment) relatedLinks.push({ label: 'Phiếu thu', value: task.salesPayment.code, href: `/sales/payments/${task.salesPayment.id}` });
    if (task.lead) relatedLinks.push({ label: 'Cơ hội bán hàng', value: task.lead.name, href: `/sales/leads/${task.lead.id}` });

    // Context Links Linker State
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkType, setLinkType] = useState('CUSTOMER');
    const [linkQuery, setLinkQuery] = useState('');
    const [linkResults, setLinkResults] = useState<any[]>([]);

    const [pausedPopupDismissed, setPausedPopupDismissed] = useState(false);

    React.useEffect(() => {
        setPausedPopupDismissed(false);
    }, [task.id]);

    React.useEffect(() => {
        const interval = setInterval(async () => {
            if (task?.id) {
                const updatedComments = await getTaskComments(task.id);
                setTask((prev: any) => {
                    const hasTemp = prev.comments?.some((c: any) => c.id.toString().startsWith('temp-'));
                    if (hasTemp) return prev;
                    if (JSON.stringify(prev.comments) !== JSON.stringify(updatedComments)) {
                        return { ...prev, comments: updatedComments };
                    }
                    return prev;
                });
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [task?.id]);

    // Quick search effect
    React.useEffect(() => {
        if (!isLinkModalOpen) return;
        const delay = setTimeout(async () => {
            const results = await searchEntities(linkType, linkQuery);
            setLinkResults(results);
        }, 500);
        return () => clearTimeout(delay);
    }, [linkQuery, linkType, isLinkModalOpen]);

    const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const content = e.target.value;
        setNewComment(content);
        const match = content.match(/@([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF ]*)$/);
        if (match && match[1].length < 20) {
            setMentionQuery(match[1]);
        } else {
            setMentionQuery(null);
        }
    };

    const handleInsertMention = (userName: string) => {
        if (mentionQuery === null) return;
        const escapedQuery = mentionQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`@${escapedQuery}(?!.*@${escapedQuery})`, 'i');
        const newText = newComment.replace(regex, `@${userName} `);
        setNewComment(newText);
        setMentionQuery(null);
    };

    const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        Array.from(e.target.files).forEach(file => {
            if (file.size > 5242880) {
                alert(`File ${file.name} quá lớn (Tối đa 5MB)`);
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const url = event.target.result as string;
                    setCommentImages(prev => [...prev, { url, file }]);
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = ''; // Reset input
    };

    const removeCommentImage = (index: number) => {
        setCommentImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !session?.user?.id) return;
        setIsSaving(true);
        try {
            for (const file of Array.from(e.target.files)) {
                if (file.size > 15 * 1024 * 1024) {
                    alert(`Tài liệu ${file.name} quá lớn (Tối đa 15MB)`);
                    continue;
                }
                const reader = new FileReader();
                reader.onload = async (event) => {
                    if (event.target?.result) {
                        await uploadTaskAttachment(task.id, file.name, event.target.result as string, file.type, session.user.id);
                    }
                };
                reader.readAsDataURL(file);
            }
            // Wait a moment for async readers to complete database actions
            setTimeout(() => router.refresh(), 1000);
        } catch (error) {
            console.error(error);
            alert("Lỗi tải lên tài liệu");
        } finally {
            setIsSaving(false);
            e.target.value = ''; // Reset
        }
    };

    const handleNoteSave = async () => {
        if (!newNoteContent.trim() || !session?.user?.id) return;
        setIsSaving(true);
        try {
            // we use uploadTaskAttachment but send plain text in fileUrl and 'TEXT_NOTE' as type
            await uploadTaskAttachment(task.id, 'Ghi chú văn bản', newNoteContent, 'TEXT_NOTE', session.user.id);
            setIsAddingNote(false);
            setNewNoteContent('');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Lỗi lưu ghi chú");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDocDelete = async (attachmentId: string) => {
        if (!confirm('Bạn có chắc muốn xóa tài liệu / ghi chú này?')) return;
        if (!session?.user?.id) return;
        setIsSaving(true);
        try {
            await deleteTaskAttachment(attachmentId, session.user.id);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    }

    const handleSaveLink = async (entityId: string) => {
        if (!session?.user?.id) return;
        setIsSaving(true);
        const linkMap: any = {
            'CUSTOMER': { customerId: entityId },
            'CONTRACT': { contractId: entityId },
            'QUOTE': { quoteId: entityId },
            'HANDOVER': { handoverId: entityId },
            'PAYMENT_REQ': { paymentReqId: entityId },
            'DISPATCH': { dispatchId: entityId },
            'SALES_ORDER': { salesOrderId: entityId },
            'SALES_INVOICE': { salesInvoiceId: entityId },
            'SALES_ESTIMATE': { salesEstimateId: entityId },
            'SALES_PAYMENT': { salesPaymentId: entityId },
            'LEAD': { leadId: entityId }
        };
        await updateTaskLinks(task.id, linkMap[linkType], session.user.id);
        setIsLinkModalOpen(false);
        setLinkQuery('');
        setIsSaving(false);
        router.refresh();
    };

    const handleRemoveLink = async (typeLabel: string) => {
        if (!session?.user?.id) return;
        if (!confirm(`Bạn có chắc muốn gỡ bỏ liên kết ${typeLabel}?`)) return;

        setIsSaving(true);
        let linkKey = '';
        if (typeLabel === 'Khách hàng') linkKey = 'CUSTOMER';
        else if (typeLabel === 'Hợp đồng') linkKey = 'CONTRACT';
        else if (typeLabel === 'Báo giá') linkKey = 'QUOTE';
        else if (typeLabel === 'Biên bản bàn giao') linkKey = 'HANDOVER';
        else if (typeLabel === 'Đề nghị thanh toán') linkKey = 'PAYMENT_REQ';
        else if (typeLabel === 'Công văn') linkKey = 'DISPATCH';
        else if (typeLabel === 'Đơn hàng') linkKey = 'SALES_ORDER';
        else if (typeLabel === 'Hóa đơn') linkKey = 'SALES_INVOICE';
        else if (typeLabel === 'Báo giá (Sales)') linkKey = 'SALES_ESTIMATE';
        else if (typeLabel === 'Phiếu thu') linkKey = 'SALES_PAYMENT';
        else if (typeLabel === 'Cơ hội bán hàng') linkKey = 'LEAD';

        const linkMap: any = {
            'CUSTOMER': { customerId: null },
            'CONTRACT': { contractId: null },
            'QUOTE': { quoteId: null },
            'HANDOVER': { handoverId: null },
            'PAYMENT_REQ': { paymentReqId: null },
            'DISPATCH': { dispatchId: null },
            'SALES_ORDER': { salesOrderId: null },
            'SALES_INVOICE': { salesInvoiceId: null },
            'SALES_ESTIMATE': { salesEstimateId: null },
            'SALES_PAYMENT': { salesPaymentId: null },
            'LEAD': { leadId: null }
        };

        if (linkKey && linkMap[linkKey]) {
            await updateTaskLinks(task.id, linkMap[linkKey], session.user.id);
            router.refresh();
        }
        setIsSaving(false);
    };

    const handleSaveEditTask = async () => {
        if (!editTaskTitle.trim() || !session?.user?.id) return;
        setIsSaving(true);
        const dueDateVal = editTaskDueDate ? new Date(editTaskDueDate) : null;
        try {
            await updateTask(task.id, {
                title: editTaskTitle,
                description: editTaskDesc,
                priority: editTaskPriority,
                dueDate: dueDateVal
            }, session.user.id);

            setTask((prev: any) => ({
                ...prev,
                title: editTaskTitle,
                description: editTaskDesc,
                priority: editTaskPriority,
                dueDate: dueDateVal ? dueDateVal.toISOString() : null
            }));

            setIsEditModalOpen(false);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveParticipants = async () => {
        if (!session?.user?.id) return;
        setIsSaving(true);
        try {
            await updateTask(task.id, {
                assignees: editAssignees,
                observers: editObservers
            }, session.user.id);
            setIsParticipantModalOpen(false);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!canEdit || !session?.user?.id) return;
        const newStatus = e.target.value;
        setTask({ ...task, status: newStatus });
        await updateTaskStatus(task.id, newStatus, session.user.id);
        router.refresh();
    };

    const handleAddChecklist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChecklist.trim() || !session?.user?.id) return;
        setIsSaving(true);

        // Optimistic UI
        const optimisticItem = {
            id: 'temp-' + Date.now(),
            title: newChecklist,
            isCompleted: false,
            completedBy: null,
            completedAt: null
        };
        setTask((prev: any) => ({ ...prev, checklists: [...prev.checklists, optimisticItem] }));
        const titleToSave = newChecklist;
        setNewChecklist('');

        try {
            await addChecklist(task.id, titleToSave, session.user.id);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleChecklist = async (checklistId: string, currentStatus: boolean) => {
        if (!canEdit || !session?.user?.id) return;

        // Optimistic UI
        setTask((prev: any) => {
            const newList = prev.checklists.map((c: any) => {
                if (c.id === checklistId) {
                    return {
                        ...c,
                        isCompleted: !currentStatus,
                        completedBy: !currentStatus ? { name: session.user?.name } : null,
                        completedAt: !currentStatus ? new Date().toISOString() : null
                    };
                }
                return c;
            });
            return { ...prev, checklists: newList };
        });

        await toggleChecklist(checklistId, !currentStatus, session.user.id);
        router.refresh();
    };

    const handleSaveEditChecklist = async (checklistId: string) => {
        if (!editChecklistTitle.trim() || !session?.user?.id) return;
        setIsSaving(true);

        // Optimistic UI
        setTask((prev: any) => {
            const newList = prev.checklists.map((c: any) =>
                c.id === checklistId ? { ...c, title: editChecklistTitle } : c
            );
            return { ...prev, checklists: newList };
        });

        const titleToSave = editChecklistTitle;
        setEditingChecklistId(null);
        setEditChecklistTitle('');

        try {
            await editChecklist(checklistId, titleToSave, session.user.id);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteChecklist = async (checklistId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa mục này?')) return;

        // Optimistic UI
        setTask((prev: any) => {
            const newList = prev.checklists.filter((c: any) => c.id !== checklistId);
            return { ...prev, checklists: newList };
        });

        if (!session?.user?.id) return;

        await deleteChecklist(checklistId, session.user.id);
        router.refresh();
    };

    const handleAddComment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!newComment.trim() && commentImages.length === 0 || !session?.user?.id) return;

        let finalHtml = newComment.replace(/\n/g, '<br/>');
        // Mention parsing
        finalHtml = finalHtml.replace(/@([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF ]+?)(?=\s|$|<)/g, '<strong style="color: #4f46e5;">@$1</strong>');

        if (commentImages.length > 0) {
            const imgTags = commentImages.map(img => `<img src="${img.url}" />`).join('');
            finalHtml += `<div>${imgTags}</div>`;
        }

        setIsSaving(true);
        // Optimistic Update
        const optimisticComment = {
            id: 'temp-' + Date.now(),
            content: finalHtml,
            userId: session.user.id,
            parentId: replyTo,
            createdAt: new Date().toISOString(),
            user: { id: session.user.id, name: session.user.name || session.user.email },
            reactions: []
        };
        setTask((prev: any) => ({ ...prev, comments: [...prev.comments, optimisticComment] }));

        // Clear input early
        setNewComment('');
        setCommentImages([]);
        const parentId = replyTo;
        setReplyTo(null);

        try {
            await addComment(task.id, finalHtml, session.user.id, parentId || undefined);
            router.refresh(); // Sync actual IDs from DB
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleReaction = async (commentId: string, emoji: string) => {
        if (!session?.user?.id) return;
        const uid = session.user.id;

        // Optimistic Update
        setTask((prev: any) => {
            const newComments = prev.comments.map((c: any) => {
                if (c.id === commentId) {
                    const existingIdx = c.reactions?.findIndex((r: any) => r.emoji === emoji && r.user?.id === uid);
                    const newReactions = [...(c.reactions || [])];
                    if (existingIdx !== undefined && existingIdx >= 0) {
                        newReactions.splice(existingIdx, 1); // Remove
                    } else {
                        newReactions.push({ emoji, user: { id: uid, name: session.user?.name } }); // Add
                    }
                    return { ...c, reactions: newReactions };
                }
                return c;
            });
            return { ...prev, comments: newComments };
        });

        await toggleReaction(commentId, emoji, uid);
        router.refresh();
    };

    // Prepare comment tree
    const rootComments = task.comments?.filter((c: any) => !c.parentId) || [];
    const getReplies = (parentId: string) => task.comments?.filter((c: any) => c.parentId === parentId) || [];

    const handleExportActivityLog = () => {
        if (!task.activityLogs || task.activityLogs.length === 0) return;
        const csvRows = [
            ['Thời gian', 'Người thực hiện', 'Hành động', 'Chi tiết']
        ];

        task.activityLogs.forEach((log: any) => {
            let actionText = 'Đã cập nhật';
            if (log.action === 'CREATED_TASK') actionText = 'Tạo công việc';
            else if (log.action === 'STATUS_CHANGED') actionText = 'Đổi trạng thái';
            else if (log.action === 'CHECKLIST_COMPLETED') actionText = 'Đánh dấu hoàn thành mục';
            else if (log.action === 'CHECKLIST_UNCHECKED') actionText = 'Bỏ đánh dấu hoàn thành mục';
            else if (log.action === 'CHECKLIST_ADDED') actionText = 'Thêm mục con';
            else if (log.action === 'CHECKLIST_EDITED') actionText = 'Sửa mục con';
            else if (log.action === 'CHECKLIST_DELETED') actionText = 'Xóa mục con';
            else if (log.action === 'CLONED_TASK') actionText = 'Nhân bản công việc';
            else if (log.action === 'UPDATED_TASK') actionText = 'Cập nhật công việc';
            else if (log.action === 'COMMENT_ADDED') actionText = 'Bình luận';
            else if (log.action === 'REACTION_ADDED') actionText = 'Thêm biểu cảm';
            else if (log.action === 'REACTION_REMOVED') actionText = 'Gỡ biểu cảm';

            let detailsText = '';
            if (log.details) {
                try {
                    const d = JSON.parse(log.details);
                    if (d.to) detailsText = `-> ${d.to}`;
                    else if (d.item) detailsText = `"${d.item}"`;
                    else if (d.summary) detailsText = `${d.summary}`;
                    else if (d.old && d.new) detailsText = `"${d.old}" -> "${d.new}"`;
                } catch (e) {
                    detailsText = log.details;
                }
            }

            const time = new Date(log.createdAt).toLocaleString('vi-VN');
            const user = log.user.name || log.user.email;

            // Escape quotes in CSV
            const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

            csvRows.push([escapeCsv(time), escapeCsv(user), escapeCsv(actionText), escapeCsv(detailsText)]);
        });

        const csvString = '\uFEFF' + csvRows.map(row => row.join(',')).join('\n'); // Ensure UTF-8 BOM for Excel
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nhat-ky-cong-viec-${task.id}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="w-full max-w-full mx-auto grid grid-cols-1 lg:grid-cols-3 lg:gap-6 gap-4 items-start">

            {/* LEFT COLUMN: Main Content */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Button variant="secondary" onClick={() => router.back()} style={{ padding: '0.5rem' }}>
                        <ChevronLeft size={20} />
                    </Button>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {task.title}
                                {canEdit && (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button onClick={() => setIsEditModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Sửa chi tiết chung">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => setIsEmailModalOpen(true)} style={{ background: 'none', border: '1px solid #bfdbfe', borderRadius: '4px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.85rem', gap: '4px', padding: '0.2rem 0.5rem', marginLeft: '0.5rem' }} title="Gửi Email Thông Báo">
                                            <Mail size={14} /> Gửi Email
                                        </button>
                                    </div>
                                )}
                            </h1>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Tạo bởi: {task.creator?.name || task.creator?.email} • {new Date(task.createdAt).toLocaleString('vi-VN')}
                            </span>
                        </div>
                    </div>
                </div>

                {task.parentTask && (
                    <div style={{ backgroundColor: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0369a1' }}>
                        <Info size={18} />
                        <span style={{ fontSize: '0.9rem' }}>
                            Công việc này được tạo theo chu kỳ tự động lặp lại từ gốc:{' '}
                            <Link href={`/tasks/${task.parentTask.id}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>{task.parentTask.title}</Link>
                        </span>
                    </div>
                )}

                {task.priority === 'URGENT' && task.status !== 'DONE' && task.status !== 'CANCELLED' && (
                    <div style={{ animation: 'priority-urgent-bg-blink 1.5s linear infinite', border: '2px solid #ef4444', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#991b1b', boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)' }}>
                        <AlertOctagon size={28} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>KHẨN CẤP QUAN TRỌNG</h3>
                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Đây là công việc cực kỳ quan trọng. Hãy luôn lưu ý để thực hiện đúng và đủ.</p>
                        </div>
                    </div>
                )}

                {task.priority === 'HIGH' && task.status !== 'DONE' && task.status !== 'CANCELLED' && (
                    <div style={{ animation: 'priority-high-bg-blink 2s ease-in-out infinite', border: '1px solid #4ade80', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', color: '#166534' }}>
                        <AlertTriangle size={24} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Ưu Tiên Cao</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Đây là công việc được ưu tiên cao, vui lòng thực hiện.</p>
                        </div>
                    </div>
                )}

                {task.status === 'PAUSED' && !pausedPopupDismissed && (
                    <div className="animate-pulse" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#dc2626' }}>
                            <AlertTriangle size={24} />
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Công Việc Ngưng Thực Hiện</h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#b91c1c' }}>Công việc này đang bị tạm ngưng. Vui lòng liên hệ với BQL (Ban Quản Lý) để biết thêm giải pháp và lý do.</p>
                            </div>
                        </div>
                        <Button variant="secondary" onClick={() => setPausedPopupDismissed(true)} style={{ color: '#dc2626', borderColor: '#fecaca', backgroundColor: 'white' }}>
                            Đã Hiểu và Đóng
                        </Button>
                    </div>
                )}

                <Card>
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span style={{
                                    padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 600,
                                    backgroundColor: task.priority === 'URGENT' ? 'var(--danger)' : (task.priority === 'HIGH' ? 'var(--warning)' : '#e2e8f0'),
                                    color: task.priority === 'URGENT' || task.priority === 'HIGH' ? '#fff' : '#000'
                                }}>
                                    {task.priority}
                                </span>
                                {task.dueDate && (
                                    <span style={{ fontSize: '0.9rem', color: new Date(task.dueDate) < new Date() ? 'var(--danger)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Clock size={16} /> Hạn chót: {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </div>

                            <div>
                                <select
                                    value={task.status}
                                    onChange={handleStatusChange}
                                    disabled={!canEdit}
                                    style={{
                                        padding: '6px 12px', borderRadius: 'var(--radius)',
                                        border: '1px solid var(--border)', fontSize: '0.9rem',
                                        backgroundColor: 'var(--surface)', fontWeight: 600
                                    }}
                                >
                                    <option value="TODO">Cần Làm</option>
                                    <option value="IN_PROGRESS">Đang Xử Lý</option>
                                    <option value="REVIEW">Chờ Duyệt</option>
                                    <option value="DONE">Hoàn Thành</option>
                                    <option value="PAUSED">Tạm Ngưng</option>
                                    <option value="CANCELLED">Đã Hủy</option>
                                </select>
                            </div>
                        </div>

                        {task.description && (
                            <div style={{ marginBottom: '2rem', lineHeight: 1.6, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                                {task.description}
                            </div>
                        )}

                        {/* CHECKLIST */}
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle2 size={18} color="var(--primary)" /> Danh sách công việc con (Checklist)
                            </h3>

                            {task.checklists.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                    {task.checklists.map((item: any) => (
                                        <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem', borderRadius: 'var(--radius)', backgroundColor: item.isCompleted ? 'var(--background)' : 'transparent' }}>
                                            <button
                                                onClick={() => handleToggleChecklist(item.id, item.isCompleted)}
                                                disabled={!canEdit}
                                                style={{ marginTop: '0.1rem', color: item.isCompleted ? 'var(--success)' : 'var(--text-muted)' }}
                                            >
                                                {item.isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                            </button>
                                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                {editingChecklistId === item.id ? (
                                                    <div style={{ flex: 1, display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editChecklistTitle}
                                                            onChange={e => setEditChecklistTitle(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleSaveEditChecklist(item.id);
                                                                if (e.key === 'Escape') setEditingChecklistId(null);
                                                            }}
                                                            style={{ flex: 1, padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--primary)', outline: 'none', fontSize: '0.9rem' }}
                                                        />
                                                        <Button onClick={() => handleSaveEditChecklist(item.id)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Lưu</Button>
                                                        <Button onClick={() => setEditingChecklistId(null)} variant="secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Hủy</Button>
                                                    </div>
                                                ) : (
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{
                                                            textDecoration: item.isCompleted ? 'line-through' : 'none',
                                                            color: item.isCompleted ? 'var(--text-muted)' : 'var(--text-main)'
                                                        }}>
                                                            {item.title}
                                                        </div>
                                                        {item.isCompleted && item.completedBy && (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                                Hoàn thành bởi: {item.completedBy.name} lúc {new Date(item.completedAt).toLocaleString('vi-VN')}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                {!item.isCompleted && canEdit && editingChecklistId !== item.id && (
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingChecklistId(item.id);
                                                                setEditChecklistTitle(item.title);
                                                            }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
                                                            className="hover:text-primary transition-colors"
                                                            title="Sửa"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteChecklist(item.id)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
                                                            className="hover:text-danger transition-colors"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {canEdit && (
                                <form onSubmit={handleAddChecklist} style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={newChecklist}
                                        onChange={e => setNewChecklist(e.target.value)}
                                        placeholder="Thêm mục checklist mới..."
                                        style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                                    />
                                    <Button type="submit" disabled={isSaving || !newChecklist.trim()} variant="secondary" style={{ padding: '0.5rem 1rem' }}>
                                        Thêm
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                </Card>

                {/* COMMENTS SECTION */}
                <Card>
                    <div style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MessageSquare size={18} color="var(--primary)" /> Bình luận & Thảo luận
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                            {rootComments.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>Chưa có bình luận nào.</p>
                            ) : (
                                rootComments.map((comment: any) => {
                                    const replies = getReplies(comment.id);

                                    const renderComment = (c: any, isReply = false) => {
                                        // Group reactions by emoji
                                        const reactionCounts = c.reactions?.reduce((acc: any, r: any) => {
                                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                            return acc;
                                        }, {}) || {};

                                        // Check if current user reacted
                                        const userReactions = c.reactions?.filter((r: any) => r.user?.id === session?.user?.id).map((r: any) => r.emoji) || [];

                                        return (
                                            <div key={c.id} style={{ display: 'flex', gap: '1rem', marginTop: isReply ? '1rem' : '0' }}>
                                                <div style={{ width: isReply ? '28px' : '36px', height: isReply ? '28px' : '36px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: isReply ? '0.75rem' : '1rem' }}>
                                                    {c.user.name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.user.name || c.user.email}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: vi }) : 'Vừa xong'}
                                                        </span>
                                                    </div>

                                                    <div
                                                        style={{ padding: '0.75rem', backgroundColor: isReply ? '#f8fafc' : 'var(--background)', borderRadius: '0.5rem', lineHeight: 1.5, fontSize: '0.95rem', overflowWrap: 'anywhere' }}
                                                        dangerouslySetInnerHTML={{ __html: autoLinkHtml(c.content) }}
                                                        className="sun-editor-output custom-comment-content"
                                                        onClick={handleCommentClick}
                                                    />

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                                        {/* Reaction Summary */}
                                                        {Object.keys(reactionCounts).length > 0 && (
                                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                {Object.entries(reactionCounts).map(([emoji, count]) => (
                                                                    <div key={emoji} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '2px 6px', backgroundColor: userReactions.includes(emoji) ? '#e0e7ff' : '#f1f5f9', borderRadius: '12px', fontSize: '0.8rem', cursor: 'pointer', border: userReactions.includes(emoji) ? '1px solid #c7d2fe' : '1px solid transparent' }} onClick={() => handleToggleReaction(c.id, emoji)}>
                                                                        <span>{emoji}</span>
                                                                        <span style={{ color: userReactions.includes(emoji) ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>{count as number}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Quick Emojis & Reply Actions */}
                                                        <div style={{ display: 'flex', gap: '0.5rem', opacity: 0.7 }}>
                                                            {EMOJIS.slice(0, 3).map(emoji => (
                                                                <button key={emoji} onClick={() => handleToggleReaction(c.id, emoji)} style={{ fontSize: '0.85rem', cursor: 'pointer', transition: 'transform 0.1s', border: 'none', background: 'none' }} title="Thả cảm xúc" className="hover:scale-110">
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                            {!isReply && (
                                                                <button onClick={() => setReplyTo(c.id)} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', textDecoration: 'underline' }}>
                                                                    Trả lời
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Render Replies (Nested 1 level only for simplicity) */}
                                                    {!isReply && replies.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0' }}>
                                                            {replies.map((r: any) => renderComment(r, true))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    };

                                    return renderComment(comment);
                                })
                            )}
                        </div>

                        {/* Comment Form */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            {replyTo && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: '#e2e8f0', borderRadius: '4px', fontSize: '0.85rem' }}>
                                    <span>Đang trả lời bình luận...</span>
                                    <button onClick={() => setReplyTo(null)} style={{ color: 'var(--danger)', cursor: 'pointer', background: 'none', border: 'none' }}>Hủy</button>
                                </div>
                            )}

                            <div style={{ position: 'relative' }}>
                                <textarea
                                    value={newComment}
                                    onChange={handleEditorChange}
                                    onPaste={async (e) => {
                                        const items = e.clipboardData.items;
                                        for (let i = 0; i < items.length; i++) {
                                            if (items[i].type.indexOf('image') !== -1) {
                                                const file = items[i].getAsFile();
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        if (event.target?.result) {
                                                            setCommentImages(prev => [...prev, {
                                                                file: file,
                                                                url: event.target!.result as string
                                                            }]);
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        minHeight: '100px',
                                        padding: '0.75rem',
                                        paddingRight: '2.5rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        resize: 'vertical',
                                        fontSize: '0.95rem',
                                        lineHeight: 1.5,
                                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                    placeholder="Gõ phím @ để nhắc tên ai đó, hoặc chia sẻ hình ảnh..."
                                />
                                <div style={{ position: 'absolute', bottom: '1rem', right: '0.75rem' }}>
                                    <label style={{ cursor: 'pointer', color: 'var(--text-muted)' }} title="Đính kèm ảnh">
                                        <ImageIcon size={20} className="hover:text-primary transition-colors" />
                                        <input type="file" hidden multiple accept="image/*" onChange={handleCommentImageSelect} disabled={isSaving} />
                                    </label>
                                </div>
                            </div>

                            {/* Mentions Dropdown */}
                            {
                                mentionQuery !== null && (
                                    <div style={{
                                        position: 'absolute', bottom: '100%', left: 0,
                                        width: '250px', maxHeight: '150px', overflowY: 'auto',
                                        backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                                        borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                        zIndex: 100, marginBottom: '0.5rem'
                                    }}>
                                        {users.filter(u => u.name && u.name.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 ? (
                                            <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Không tìm thấy người dùng</div>
                                        ) : (
                                            users.filter(u => u.name && u.name.toLowerCase().includes(mentionQuery.toLowerCase())).map(u => (
                                                <div
                                                    key={u.id}
                                                    onClick={() => handleInsertMention(u.name)}
                                                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                    className="hover:bg-slate-50"
                                                >
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                        {u.name[0].toUpperCase()}
                                                    </div>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{u.name}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                        </div>

                        {/* Image Preview List */}
                        {commentImages.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                {commentImages.map((img, i) => (
                                    <div key={i} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                        <img src={img.url} alt={`preview-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                            onClick={() => removeCommentImage(i)}
                                            style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.7rem' }}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <Button onClick={() => handleAddComment()} disabled={isSaving || (!newComment.trim() && commentImages.length === 0)}>
                                Gửi bình luận
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* RIGHT COLUMN: Sidebar Info */}
            <div className="lg:col-span-1 flex flex-col gap-6">

                {/* Related Links */}
                <Card>
                    <div style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem' }}>Liên kết hệ thống</h4>
                            {canEdit && (
                                <button onClick={() => setIsLinkModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                                    <Plus size={14} /> Thêm / Cập nhật
                                </button>
                            )}
                        </div>
                        {relatedLinks.length === 0 ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chưa có liên kết</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {relatedLinks.map((link, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{link.label}</span>
                                            <Link href={link.href} style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none' }} className="hover:underline">
                                                {link.value}
                                            </Link>
                                        </div>
                                        {canDelete && (
                                            <button onClick={() => handleRemoveLink(link.label)} disabled={isSaving} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.5rem', opacity: isSaving ? 0.5 : 1 }} title="Gỡ liên kết">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card >

                {/* Documents & Notes */}
                < Card >
                    <div style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Paperclip size={16} /> Tài liệu và Ghi chú
                            </h4>
                            {canEdit && (
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={() => setIsAddingNote(!isAddingNote)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                                        <Plus size={14} /> Ghi chú
                                    </button>
                                    <label style={{ cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                                        <Plus size={14} /> Tài liệu
                                        <input type="file" multiple hidden onChange={handleDocUpload} disabled={isSaving} />
                                    </label>
                                </div>
                            )}
                        </div>

                        {isAddingNote && (
                            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                <textarea
                                    value={newNoteContent}
                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                    placeholder="Nhập nội dung ghi chú..."
                                    style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', resize: 'vertical', fontSize: '0.9rem', marginBottom: '0.5rem' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <Button variant="secondary" onClick={() => { setIsAddingNote(false); setNewNoteContent(''); }}>Hủy</Button>
                                    <Button onClick={handleNoteSave} disabled={isSaving || !newNoteContent.trim()}>Lưu ghi chú</Button>
                                </div>
                            </div>
                        )}

                        {(!task.attachments || task.attachments.length === 0) ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                                <FileIcon size={32} opacity={0.2} style={{ margin: '0 auto 0.5rem' }} />
                                Chưa có tài liệu nào tải lên.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {task.attachments.map((doc: any) => {
                                    const isImage = doc.fileType?.startsWith('image/');
                                    const isNote = doc.fileType === 'TEXT_NOTE';

                                    if (isNote) {
                                        return (
                                            <div key={doc.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem', backgroundColor: '#fcf8e3', borderRadius: '6px', border: '1px solid #faebcc' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#8a6d3b' }}>
                                                        <Type size={14} />
                                                        <strong>Ghi chú từ {doc.uploadedBy?.name || 'Hệ thống'}</strong>
                                                        <span style={{ opacity: 0.7 }}>• {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: vi })}</span>
                                                    </div>
                                                    {canDelete && (
                                                        <button onClick={() => handleDocDelete(doc.id)} disabled={isSaving} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }} className="hover:opacity-70">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                <div
                                                    style={{ fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
                                                    dangerouslySetInnerHTML={{ __html: autoLinkText(doc.fileUrl) }}
                                                />
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                {isImage ? (
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }} onClick={() => setLightboxImage(doc.fileUrl)}>
                                                        <img src={doc.fileUrl} alt={doc.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#64748b' }}>
                                                        <FileIcon size={16} />
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                    <button
                                                        onClick={() => setPreviewDoc({ url: doc.fileUrl, name: doc.fileName })}
                                                        style={{
                                                            fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)',
                                                            textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                        }}
                                                        className="hover:text-primary transition-colors"
                                                    >
                                                        {doc.fileName}
                                                    </button>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        Bởi {doc.uploadedBy?.name || 'Hệ thống'} • {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: vi })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <a href={doc.fileUrl} download={doc.fileName} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', display: 'flex', padding: '4px' }} className="hover:text-primary">
                                                    <Download size={14} />
                                                </a>
                                                {canDelete && (
                                                    <button onClick={() => handleDocDelete(doc.id)} disabled={isSaving} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} className="hover:opacity-70">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Card >

                {/* People */}
                < Card >
                    <div style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <UserIcon size={16} /> Người tham gia
                            </h4>
                            {canEdit && (
                                <button
                                    onClick={() => {
                                        setEditAssignees(task.assignees?.map((a: any) => a.userId) || []);
                                        setEditObservers(task.observers?.map((o: any) => o.userId) || []);
                                        setIsParticipantModalOpen(true);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                                >
                                    <Edit2 size={14} /> Chỉnh sửa
                                </button>
                            )}
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Người phụ trách</div>
                            {task.assignees.length === 0 ? (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chưa phân công</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {task.assignees.map((a: any) => (
                                        <div key={a.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                {a.user.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <span style={{ fontSize: '0.9rem' }}>{a.user.name || a.user.email}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Người theo dõi</div>
                            {task.observers.length === 0 ? (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chưa có</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {task.observers.map((o: any) => (
                                        <div key={o.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'transparent', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {o.user.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{o.user.name || o.user.email}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </Card >

                {/* Activity Log KPI */}
                < Card >
                    <div style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={16} /> Nhật ký hoạt động (KPI)
                            </h4>
                            <Button variant="secondary" onClick={handleExportActivityLog} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', height: 'auto' }}>
                                Xuất CSV
                            </Button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {task.activityLogs.length === 0 ? (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Không có lịch sử</div>
                            ) : (
                                task.activityLogs.map((log: any) => {
                                    let actionText = 'Đã cập nhật';
                                    if (log.action === 'CREATED_TASK') actionText = 'Tạo công việc';
                                    else if (log.action === 'STATUS_CHANGED') actionText = 'Đổi trạng thái';
                                    else if (log.action === 'CHECKLIST_COMPLETED') actionText = 'Đánh dấu hoàn thành mục';
                                    else if (log.action === 'CHECKLIST_UNCHECKED') actionText = 'Bỏ đánh dấu hoàn thành mục';
                                    else if (log.action === 'CHECKLIST_ADDED') actionText = 'Thêm mục con';
                                    else if (log.action === 'CHECKLIST_EDITED') actionText = 'Sửa mục con';
                                    else if (log.action === 'CHECKLIST_DELETED') actionText = 'Xóa mục con';
                                    else if (log.action === 'CLONED_TASK') actionText = 'Nhân bản công việc';
                                    else if (log.action === 'UPDATED_TASK') actionText = 'Cập nhật công việc';
                                    else if (log.action === 'COMMENT_ADDED') actionText = 'Bình luận';
                                    else if (log.action === 'REACTION_ADDED') actionText = 'Thêm biểu cảm';
                                    else if (log.action === 'REACTION_REMOVED') actionText = 'Gỡ biểu cảm';

                                    let detailsText = '';
                                    if (log.details) {
                                        try {
                                            const d = JSON.parse(log.details);
                                            if (d.to) detailsText = `-> ${d.to}`;
                                            else if (d.item) detailsText = `"${d.item}"`;
                                            else if (d.summary) detailsText = `${d.summary}`;
                                            else if (d.old && d.new) detailsText = `"${d.old}" -> "${d.new}"`;
                                        } catch (e) {
                                            detailsText = log.details;
                                        }
                                    }

                                    return (
                                        <div key={log.id} style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '6px' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                                                    <strong>{log.user.name || log.user.email}</strong> {actionText}
                                                    {detailsText && <span style={{ color: 'var(--text-muted)' }}> {detailsText}</span>}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </Card >

            </div >

            {/* Link Modal */}
            {
                isLinkModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ width: '400px', backgroundColor: 'var(--surface)', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                            <h3 style={{ margin: '0 0 1rem 0' }}>Sửa đổi liên kết</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                * Lưu ý: Mỗi thẻ công việc chỉ có thể gắn với 1 đối tượng duy nhất cho mỗi loại. Chọn mới sẽ ghi đè lên liên kết cũ.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Loại liên kết</label>
                                    <select
                                        value={linkType}
                                        onChange={e => setLinkType(e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                                    >
                                        <option value="CUSTOMER">Khách hàng</option>
                                        <option value="CONTRACT">Hợp đồng</option>
                                        <option value="QUOTE">Báo giá</option>
                                        <option value="HANDOVER">Biên bản bàn giao</option>
                                        <option value="PAYMENT_REQ">Đề nghị thanh toán</option>
                                        <option value="DISPATCH">Công văn</option>
                                        <option value="SALES_ESTIMATE">Báo giá (Sales)</option>
                                        <option value="SALES_ORDER">Đơn hàng</option>
                                        <option value="SALES_INVOICE">Hóa đơn</option>
                                        <option value="SALES_PAYMENT">Phiếu thu</option>
                                        <option value="LEAD">Cơ hội bán hàng</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Tìm kiếm</label>
                                    <input
                                        type="text"
                                        value={linkQuery}
                                        onChange={e => setLinkQuery(e.target.value)}
                                        placeholder="Nhập từ khóa..."
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                                    />
                                </div>

                                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '0.5rem' }}>
                                    {linkResults.length === 0 ? (
                                        <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Không tìm thấy kết quả</div>
                                    ) : (
                                        linkResults.map(res => (
                                            <div
                                                key={res.id}
                                                onClick={() => handleSaveLink(res.id)}
                                                style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.9rem' }}
                                                className="hover:bg-gray-50 bg-white"
                                            >
                                                {res.title || res.name || res.code}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.75rem' }}>
                                <Button variant="secondary" onClick={() => setIsLinkModalOpen(false)}>Hủy</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Task Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Chỉnh sửa chi tiết">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Tên công việc <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input type="text" value={editTaskTitle} onChange={e => setEditTaskTitle(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Mô tả chi tiết</label>
                        <textarea value={editTaskDesc} onChange={e => setEditTaskDesc(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '100px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Mức độ ưu tiên</label>
                            <select value={editTaskPriority} onChange={e => setEditTaskPriority(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                <option value="LOW">Thấp (Low)</option>
                                <option value="MEDIUM">Trung Bình (Medium)</option>
                                <option value="HIGH">Cao (High)</option>
                                <option value="URGENT">Khẩn cấp (Urgent)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Hạn chót</label>
                            <input type="date" value={editTaskDueDate} onChange={e => setEditTaskDueDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveEditTask} disabled={isSaving || !editTaskTitle.trim()}>
                            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Participants Modal */}
            <Modal isOpen={isParticipantModalOpen} onClose={() => setIsParticipantModalOpen(false)} title="Chỉnh sửa người tham gia">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Người phụ trách</label>
                        <select
                            multiple
                            value={editAssignees}
                            onChange={e => {
                                const options = Array.from(e.target.selectedOptions);
                                setEditAssignees(options.map(o => o.value));
                            }}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '120px' }}>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name || u.email}</option>
                            ))}
                        </select>
                        <small style={{ color: 'var(--text-muted)' }}>Bấm <kbd>Ctrl</kbd> hoặc kéo thả để chọn nhiều người.</small>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Người theo dõi</label>
                        <select
                            multiple
                            value={editObservers}
                            onChange={e => {
                                const options = Array.from(e.target.selectedOptions);
                                setEditObservers(options.map(o => o.value));
                            }}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '120px' }}>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name || u.email}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setIsParticipantModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveParticipants} disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Email Modal */}
            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                templates={emailTemplates}
                moduleType="TASK"
                variablesData={{
                    taskTitle: task.title,
                    taskDescription: task.description || 'Không có mô tả',
                    dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : 'Không có hạn chót',
                    priority: task.priority === 'URGENT' ? 'Khẩn cấp' : task.priority === 'HIGH' ? 'Cao' : task.priority === 'MEDIUM' ? 'Trung bình' : 'Thấp',
                    assignerName: task.creator?.name || task.creator?.email || 'Hệ thống',
                    assigneeName: task.assignees?.map((a: any) => a.user?.name || a.user?.email || '').filter(Boolean).join(', ') || 'Chưa phân công',
                    link: typeof window !== 'undefined' ? `${window.location.origin}/tasks/${task.id}` : ''
                }}
                onSend={async (emailData) => {
                    const res = await sendTaskEmail(task.id, emailData.to, emailData.subject, emailData.htmlBody);
                    if (res?.success) alert("Đã gửi email thông báo công việc thành công!");
                    else alert("Lỗi khi gửi email: " + res?.error);
                }}
            />

            {/* Lightbox Overlay */}
            {
                lightboxImage && (
                    <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
                        <img src={lightboxImage} alt="Phóng to ảnh" className="lightbox-image" />
                        <button
                            onClick={() => setLightboxImage(null)}
                            style={{ position: 'absolute', top: '20px', right: '30px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            &times;
                        </button>
                    </div>
                )
            }

            {previewDoc && (
                <DocumentPreviewModal
                    isOpen={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    fileUrl={previewDoc.url}
                    fileName={previewDoc.name}
                />
            )}
        </div >
    );
}
