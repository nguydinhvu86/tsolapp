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

    // canDelete allows removing documents, links, etc. (Strictly Admin / TASKS_DELETE)
    const canDelete = isAdmin || permissions.includes('TASKS_DELETE');

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
    const [commentFiles, setCommentFiles] = useState<{ url: string, name: string, file: File }[]>([]);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');

    // Lightbox State
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string } | null>(null);

    // Upload Progress State
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

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
            if (file.size > 52428800) {
                alert(`File ${file.name} quá lớn (Tối đa 50MB)`);
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

    const handleCommentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        Array.from(e.target.files).forEach(file => {
            if (file.size > 52428800) { // 50MB max for files
                alert(`File ${file.name} quá lớn (Tối đa 50MB)`);
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const url = event.target.result as string;
                    setCommentFiles(prev => [...prev, { url, name: file.name, file }]);
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = ''; // Reset input
    };

    const removeCommentFile = (index: number) => {
        setCommentFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !session?.user?.id) return;
        setIsSaving(true);
        try {
            for (const file of Array.from(e.target.files)) {
                if (file.size > 50 * 1024 * 1024) {
                    alert(`Tài liệu ${file.name} quá lớn (Tối đa 50MB)`);
                    continue;
                }
                
                setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
                
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                    const url = await new Promise<string>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', '/api/upload', true);
                        
                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable) {
                                const percentComplete = Math.round((event.loaded / event.total) * 100);
                                setUploadProgress(prev => ({ ...prev, [file.name]: percentComplete }));
                            }
                        };
                        
                        xhr.onload = () => {
                            if (xhr.status === 200) {
                                try {
                                    const response = JSON.parse(xhr.responseText);
                                    if (response.url) {
                                        resolve(response.url);
                                    } else {
                                        reject(new Error(response.error || 'Upload failed'));
                                    }
                                } catch (e) {
                                    reject(new Error('Invalid response'));
                                }
                            } else {
                                reject(new Error('Upload failed'));
                            }
                        };
                        
                        xhr.onerror = () => reject(new Error('Network error'));
                        xhr.send(formData);
                    });
                    
                    await uploadTaskAttachment(task.id, file.name, url, file.type, session.user.id);
                } catch (err: any) {
                    console.error("Upload failed for", file.name, err);
                    alert(`Tải lên thất bại: ${file.name}`);
                } finally {
                    setUploadProgress(prev => { 
                        const next = { ...prev }; 
                        delete next[file.name]; 
                        return next; 
                    });
                }
            }
            setTimeout(() => router.refresh(), 500);
        } catch (error) {
            console.error(error);
            alert("Lỗi quá trình tải lên");
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
            'LEAD': { leadId: entityId },
            'PROJECT': { projectId: entityId }
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
        else if (typeLabel === 'Dự án') linkKey = 'PROJECT';

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
            'LEAD': { leadId: null },
            'PROJECT': { projectId: null }
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
                title: task.title,
                assignees: editAssignees,
                observers: editObservers
            }, session.user.id);
            setIsParticipantModalOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Lỗi khi lưu người tham gia");
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

        if (commentFiles.length > 0) {
            const fileTags = commentFiles.map(f => `<br/><a href="${f.url}" download="${f.name}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;text-decoration:none;color:#475569;font-size:0.85rem;margin-top:6px;margin-right:6px;font-weight:500;" onmouseover="this.style.borderColor='#94a3b8'" onmouseout="this.style.borderColor='#e2e8f0'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> ${f.name}</a>`).join(' ');
            finalHtml += `<div>${fileTags}</div>`;
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
        setCommentFiles([]);
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

    const isTaskOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELLED';
    const daysOverdue = task.dueDate && isTaskOverdue ? Math.max(1, Math.floor((new Date().getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const completedChecklistCount = task.checklists?.filter((c: any) => c.isCompleted).length || 0;
    const totalChecklistCount = task.checklists?.length || 0;
    const checklistPercent = totalChecklistCount > 0 ? Math.round((completedChecklistCount / totalChecklistCount) * 100) : 0;

    return (
        <div className="w-full space-y-5 pb-10">

            {/* TOP HEADER CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                        <button
                            onClick={() => router.back()}
                            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all shrink-0 cursor-pointer shadow-2xs"
                            title="Quay lại"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase border shadow-2xs ${
                                    task.priority === 'URGENT' 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                        : task.priority === 'HIGH' 
                                            ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                            : task.priority === 'MEDIUM' 
                                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                    Ưu tiên: {task.priority}
                                </span>
                                {isTaskOverdue && (
                                    <span className="animate-overdue-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-300">
                                        <AlertTriangle size={11} className="text-rose-600 animate-pulse" />
                                        QUÁ HẠN {daysOverdue} NGÀY
                                    </span>
                                )}
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap break-words">
                                {task.title}
                                {canEdit && (
                                    <button
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-emerald-50 transition-colors cursor-pointer"
                                        title="Chỉnh sửa thông tin công việc"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                )}
                            </h1>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                                <span>Tạo bởi: <strong className="text-slate-700">{task.creator?.name || task.creator?.email}</strong></span>
                                <span>•</span>
                                <span>{new Date(task.createdAt).toLocaleString('vi-VN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Header Controls */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <select
                            value={task.status}
                            onChange={handleStatusChange}
                            disabled={!canEdit}
                            className={`text-xs font-bold px-3 py-2 rounded-xl border shadow-2xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                task.status === 'DONE' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : task.status === 'IN_PROGRESS'
                                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                                        : task.status === 'REVIEW'
                                            ? 'bg-sky-50 text-sky-700 border-sky-300'
                                            : task.status === 'PAUSED'
                                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                                : 'bg-amber-50 text-amber-700 border-amber-300'
                            }`}
                        >
                            <option value="TODO">Cần Làm</option>
                            <option value="IN_PROGRESS">Đang Xử Lý</option>
                            <option value="REVIEW">Chờ Duyệt</option>
                            <option value="DONE">Hoàn Thành</option>
                            <option value="PAUSED">Tạm Ngưng</option>
                            <option value="CANCELLED">Đã Hủy</option>
                        </select>

                        {canEdit && (
                            <button
                                onClick={() => setIsEmailModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-semibold text-xs transition-all shadow-2xs cursor-pointer"
                                title="Gửi Email Thông Báo"
                            >
                                <Mail size={14} className="text-blue-600" />
                                <span>Gửi Email</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* PROMINENT OVERDUE BANNER */}
            {isTaskOverdue && (
                <div 
                    className="animate-overdue-banner relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-xl transition-all"
                    style={{
                        background: 'linear-gradient(135deg, #e11d48 0%, #be123c 50%, #9f1239 100%)',
                        border: '2px solid #fecdd3',
                        color: '#ffffff'
                    }}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div 
                                className="p-3 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-md"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)' }}
                            >
                                <AlertOctagon size={28} className="animate-pulse stroke-[2.5]" style={{ color: '#ffffff' }} />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span 
                                        className="animate-pulse px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-md inline-flex items-center gap-1"
                                        style={{ backgroundColor: '#ffffff', color: '#be123c' }}
                                    >
                                        <AlertTriangle size={13} style={{ color: '#be123c' }} />
                                        CẢNH BÁO QUÁ HẠN XỬ LÝ
                                    </span>
                                    <span 
                                        className="text-xs font-bold px-2.5 py-1 rounded-md shadow-inner"
                                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', color: '#ffffff' }}
                                    >
                                        Hạn chót: {new Date(task.dueDate).toLocaleDateString('vi-VN')} (Trễ {daysOverdue} ngày)
                                    </span>
                                </div>
                                <h3 
                                    className="text-base sm:text-lg font-black tracking-tight uppercase"
                                    style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                                >
                                    CÔNG VIỆC NÀY ĐÃ QUÁ HẠN — VUI LÒNG ƯU TIÊN XỬ LÝ NGAY!
                                </h3>
                                <p 
                                    className="text-xs sm:text-sm font-semibold mt-1"
                                    style={{ color: '#ffe4e6', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                                >
                                    Công việc đã vượt quá thời hạn cam kết. Nhân sự được phân công vui lòng khẩn trương hoàn thành checklist và cập nhật kết quả xử lý.
                                </p>
                            </div>
                        </div>

                        {canEdit && task.status !== 'IN_PROGRESS' && (
                            <button
                                onClick={async () => {
                                    if (!session?.user?.id) return;
                                    setTask({ ...task, status: 'IN_PROGRESS' });
                                    await updateTaskStatus(task.id, 'IN_PROGRESS', session.user.id);
                                    router.refresh();
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition-transform active:scale-95 shrink-0 cursor-pointer hover:brightness-105"
                                style={{ backgroundColor: '#ffffff', color: '#be123c', border: '1px solid #ffffff' }}
                            >
                                <Clock size={14} style={{ color: '#be123c' }} />
                                <span>Chuyển Đang Xử Lý</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Informational Banners */}
            {task.parentTask && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-center gap-3 text-sky-800 text-xs shadow-2xs">
                    <Info size={18} className="text-sky-600 shrink-0" />
                    <span>
                        Công việc này được tạo tự động theo chu kỳ lặp lại từ gốc:{' '}
                        <Link href={`/tasks/${task.parentTask.id}`} className="font-bold underline hover:text-sky-950">
                            {task.parentTask.title}
                        </Link>
                    </span>
                </div>
            )}

            {task.priority === 'URGENT' && !isTaskOverdue && task.status !== 'DONE' && task.status !== 'CANCELLED' && (
                <div className="animate-priority-urgent-bg border-2 border-rose-400 rounded-xl p-3.5 flex items-center gap-3 text-rose-900 shadow-sm">
                    <AlertOctagon size={24} className="text-rose-600 shrink-0" />
                    <div>
                        <h4 className="font-black text-xs uppercase">Công Việc Khẩn Cấp Quan Trọng</h4>
                        <p className="text-xs text-rose-800 font-medium">Đây là công việc ưu tiên hàng đầu, hãy luôn chú ý hoàn thành đúng thời hạn.</p>
                    </div>
                </div>
            )}

            {task.priority === 'HIGH' && !isTaskOverdue && task.status !== 'DONE' && task.status !== 'CANCELLED' && (
                <div className="animate-priority-high-bg border border-emerald-400 rounded-xl p-3.5 flex items-center gap-3 text-emerald-900 shadow-sm">
                    <AlertTriangle size={22} className="text-emerald-700 shrink-0" />
                    <div>
                        <h4 className="font-bold text-xs uppercase">Công Việc Ưu Tiên Cao</h4>
                        <p className="text-xs text-emerald-800 font-medium">Công việc có mức độ quan trọng cao, vui lòng chú ý xử lý đúng tiến độ.</p>
                    </div>
                </div>
            )}

            {task.status === 'PAUSED' && !pausedPopupDismissed && (
                <div className="animate-pulse bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-rose-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={22} className="text-rose-600 shrink-0" />
                        <div>
                            <h4 className="font-bold text-xs uppercase text-rose-900">Công Việc Đang Tạm Ngưng</h4>
                            <p className="text-xs text-rose-700">Công việc này hiện đang bị tạm dừng. Vui lòng liên hệ Ban Quản Lý để nắm thông tin chi tiết.</p>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={() => setPausedPopupDismissed(true)} className="text-xs h-8 text-rose-700 border-rose-300 bg-white hover:bg-rose-100">
                        Đã Hiểu
                    </Button>
                </div>
            )}

            {/* MAIN 2-COLUMN BALANCED GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

                {/* LEFT COLUMN: Core Task Content & Comments */}
                <div className="lg:col-span-8 flex flex-col gap-5">

                    {/* Task Details Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-6">
                        
                        {/* Meta Info Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Deadline Pill */}
                                {task.dueDate ? (
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                        isTaskOverdue 
                                            ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse' 
                                            : 'bg-slate-50 text-slate-700 border-slate-200'
                                    }`}>
                                        <Clock size={14} className={isTaskOverdue ? 'text-rose-600' : 'text-slate-400'} />
                                        <span>Hạn chót: <strong>{new Date(task.dueDate).toLocaleDateString('vi-VN')}</strong></span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 bg-slate-50 border border-slate-200">
                                        <Clock size={14} />
                                        <span>Không có hạn chót</span>
                                    </div>
                                )}

                                {/* Start Date Pill */}
                                {task.startDate && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-600 bg-slate-50 border border-slate-200">
                                        <span>Bắt đầu: <strong>{new Date(task.startDate).toLocaleDateString('vi-VN')}</strong></span>
                                    </div>
                                )}
                            </div>

                            {/* Checklist Progress Summary */}
                            {totalChecklistCount > 0 && (
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xs font-bold text-slate-600">
                                        Tiến độ: {completedChecklistCount}/{totalChecklistCount}
                                    </span>
                                    <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                                completedChecklistCount === totalChecklistCount ? 'bg-emerald-500' : 'bg-primary'
                                            }`}
                                            style={{ width: `${checklistPercent}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-mono font-bold text-slate-500">{checklistPercent}%</span>
                                </div>
                            )}
                        </div>

                        {/* Task Description */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mô tả công việc</h3>
                            {task.description ? (
                                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                                    {task.description}
                                </div>
                            ) : (
                                <div className="bg-slate-50/50 rounded-xl p-4 border border-dashed border-slate-200 text-slate-400 text-xs italic text-center">
                                    Chưa có mô tả chi tiết cho công việc này.
                                </div>
                            )}
                        </div>

                        {/* Checklist Section */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-primary" />
                                    <span>Danh sách công việc con (Checklist)</span>
                                    {totalChecklistCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                            {completedChecklistCount}/{totalChecklistCount}
                                        </span>
                                    )}
                                </h3>
                            </div>

                            {/* Checklist items list */}
                            {task.checklists && task.checklists.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {task.checklists.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                                item.isCompleted 
                                                    ? 'bg-slate-50/80 border-slate-200 text-slate-400' 
                                                    : 'bg-white border-slate-200/90 text-slate-800 shadow-2xs hover:border-slate-300'
                                            }`}
                                        >
                                            <button
                                                onClick={() => handleToggleChecklist(item.id, item.isCompleted)}
                                                disabled={!canEdit}
                                                className={`mt-0.5 shrink-0 transition-colors cursor-pointer ${
                                                    item.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-primary'
                                                }`}
                                            >
                                                {item.isCompleted ? <CheckCircle2 size={20} className="fill-emerald-50 text-emerald-600" /> : <Circle size={20} />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                {editingChecklistId === item.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editChecklistTitle}
                                                            onChange={e => setEditChecklistTitle(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleSaveEditChecklist(item.id);
                                                                if (e.key === 'Escape') setEditingChecklistId(null);
                                                            }}
                                                            className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-primary rounded-lg focus:outline-none"
                                                        />
                                                        <button onClick={() => handleSaveEditChecklist(item.id)} className="px-2.5 py-1.5 bg-primary text-white rounded-lg text-xs font-bold">Lưu</button>
                                                        <button onClick={() => setEditingChecklistId(null)} className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs">Hủy</button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className={`text-xs sm:text-sm font-medium leading-normal break-words ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                                            {item.title}
                                                        </p>
                                                        {item.isCompleted && item.completedBy && (
                                                            <span className="text-[11px] text-slate-400 block mt-0.5">
                                                                Hoàn thành bởi <strong>{item.completedBy.name}</strong> • {new Date(item.completedAt).toLocaleString('vi-VN')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            {canEdit && editingChecklistId !== item.id && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!item.isCompleted && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingChecklistId(item.id);
                                                                setEditChecklistTitle(item.title);
                                                            }}
                                                            className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                                                            title="Sửa"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteChecklist(item.id)}
                                                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Checklist Input */}
                            {canEdit && (
                                <form onSubmit={handleAddChecklist} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newChecklist}
                                        onChange={e => setNewChecklist(e.target.value)}
                                        placeholder="Thêm mục checklist mới (nhấn Enter để thêm)..."
                                        className="flex-1 h-9 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-2xs"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={isSaving || !newChecklist.trim()}
                                        className="h-9 px-4 text-xs font-bold rounded-xl shadow-2xs"
                                    >
                                        <Plus size={14} /> Thêm
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Comments & Discussion Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <MessageSquare size={18} className="text-primary" />
                                <span>Bình luận &amp; Thảo luận</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                    {task.comments?.length || 0}
                                </span>
                            </h3>
                        </div>

                        {/* Comments Stream */}
                        <div className="space-y-4">
                            {rootComments.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs">
                                    <MessageSquare size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                                    Chưa có bình luận nào. Hãy bắt đầu cuộc thảo luận bên dưới!
                                </div>
                            ) : (
                                rootComments.map((comment: any) => {
                                    const replies = getReplies(comment.id);

                                    const renderComment = (c: any, isReply = false) => {
                                        const reactionCounts = c.reactions?.reduce((acc: any, r: any) => {
                                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                            return acc;
                                        }, {}) || {};
                                        const userReactions = c.reactions?.filter((r: any) => r.user?.id === session?.user?.id).map((r: any) => r.emoji) || [];

                                        return (
                                            <div key={c.id} className={`flex gap-3 ${isReply ? 'mt-3' : ''}`}>
                                                <div className={`rounded-full bg-gradient-to-br from-primary to-emerald-700 text-white font-bold flex items-center justify-center shrink-0 shadow-xs ${
                                                    isReply ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs'
                                                }`}>
                                                    {c.user?.name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2 mb-1">
                                                        <span className="text-xs font-bold text-slate-900">{c.user?.name || c.user?.email}</span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: vi }) : 'Vừa xong'}
                                                        </span>
                                                    </div>

                                                    <div
                                                        className={`p-3.5 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed break-words sun-editor-output custom-comment-content ${
                                                            isReply ? 'bg-slate-50 border border-slate-100' : 'bg-slate-100/70 border border-slate-200/50'
                                                        }`}
                                                        dangerouslySetInnerHTML={{ __html: autoLinkHtml(c.content) }}
                                                        onClick={handleCommentClick}
                                                    />

                                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                        {/* Reaction Summary */}
                                                        {Object.keys(reactionCounts).length > 0 && (
                                                            <div className="flex gap-1">
                                                                {Object.entries(reactionCounts).map(([emoji, count]) => (
                                                                    <button
                                                                        key={emoji}
                                                                        onClick={() => handleToggleReaction(c.id, emoji)}
                                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-pointer border transition-all ${
                                                                            userReactions.includes(emoji)
                                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                                                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                                                        }`}
                                                                    >
                                                                        <span>{emoji}</span>
                                                                        <span className="text-[10px]">{count as number}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Emojis Quick Picker */}
                                                        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                                                            {EMOJIS.slice(0, 3).map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => handleToggleReaction(c.id, emoji)}
                                                                    className="text-xs hover:scale-125 transition-transform p-0.5 cursor-pointer"
                                                                    title="Thả biểu cảm"
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                            {!isReply && (
                                                                <button
                                                                    onClick={() => setReplyTo(c.id)}
                                                                    className="text-[11px] font-semibold text-slate-500 hover:text-primary ml-1 cursor-pointer"
                                                                >
                                                                    Trả lời
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Replies Nested */}
                                                    {!isReply && replies.length > 0 && (
                                                        <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-2">
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

                        {/* Comment Composer */}
                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/90 relative">
                            {replyTo && (
                                <div className="flex items-center justify-between mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                                    <span className="font-semibold">Đang trả lời bình luận...</span>
                                    <button
                                        onClick={() => setReplyTo(null)}
                                        className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                                    >
                                        Hủy
                                    </button>
                                </div>
                            )}

                            <div className="relative">
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
                                    className="w-full min-h-[95px] p-3 pr-20 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-2xs resize-y"
                                    placeholder="Gõ phím @ để nhắc tên ai đó, hoặc chia sẻ hình ảnh (Ctrl+V)..."
                                />

                                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-white/80 backdrop-blur-xs p-1 rounded-lg border border-slate-200/60 shadow-2xs">
                                    <label className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-md cursor-pointer transition-colors" title="Đính kèm tài liệu">
                                        <Paperclip size={16} />
                                        <input type="file" hidden multiple onChange={handleCommentFileSelect} disabled={isSaving} />
                                    </label>
                                    <label className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-md cursor-pointer transition-colors" title="Đính kèm hình ảnh">
                                        <ImageIcon size={16} />
                                        <input type="file" hidden multiple accept="image/*" onChange={handleCommentImageSelect} disabled={isSaving} />
                                    </label>
                                </div>
                            </div>

                            {/* Mentions Dropdown */}
                            {mentionQuery !== null && (
                                <div className="absolute bottom-full left-3 w-64 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 mb-2 py-1">
                                    {users.filter(u => u.name && u.name.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 ? (
                                        <div className="p-2.5 text-xs text-slate-400 text-center">Không tìm thấy người dùng</div>
                                    ) : (
                                        users.filter(u => u.name && u.name.toLowerCase().includes(mentionQuery.toLowerCase())).map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => handleInsertMention(u.name)}
                                                className="px-3 py-2 text-xs hover:bg-emerald-50 hover:text-primary cursor-pointer flex items-center gap-2 transition-colors"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-emerald-100 text-primary flex items-center justify-center font-bold text-[10px]">
                                                    {u.name[0].toUpperCase()}
                                                </div>
                                                <span className="font-medium">{u.name}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Attached Images Preview */}
                            {commentImages.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                    {commentImages.map((img, i) => (
                                        <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shadow-2xs group">
                                            <img src={img.url} alt={`preview-${i}`} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removeCommentImage(i)}
                                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] cursor-pointer hover:bg-rose-600"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Attached Files Preview */}
                            {commentFiles.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                    {commentFiles.map((file, i) => (
                                        <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 shadow-2xs">
                                            <Paperclip size={12} className="text-slate-400" />
                                            <span className="max-w-[120px] truncate">{file.name}</span>
                                            <button onClick={() => removeCommentFile(i)} className="text-slate-400 hover:text-rose-600 cursor-pointer">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end mt-2.5">
                                <Button
                                    onClick={() => handleAddComment()}
                                    disabled={isSaving || (!newComment.trim() && commentImages.length === 0 && commentFiles.length === 0)}
                                    className="h-8 px-4 text-xs font-bold rounded-xl shadow-2xs"
                                >
                                    {isSaving ? 'Đang gửi...' : 'Gửi bình luận'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Sidebar Info Cards */}
                <div className="lg:col-span-4 flex flex-col gap-5">

                    {/* Card 1: Participants */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <UserIcon size={14} className="text-slate-500" />
                                <span>Người tham gia</span>
                            </h4>
                            {canEdit && (
                                <button
                                    onClick={() => {
                                        setEditAssignees(task.assignees?.map((a: any) => a.userId) || []);
                                        setEditObservers(task.observers?.map((o: any) => o.userId) || []);
                                        setIsParticipantModalOpen(true);
                                    }}
                                    className="text-xs font-bold text-primary hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                                >
                                    <Edit2 size={12} /> Chỉnh sửa
                                </button>
                            )}
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Assignees */}
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Người phụ trách</span>
                                {task.assignees && task.assignees.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {task.assignees.map((a: any) => (
                                            <div key={a.userId} className="flex items-center gap-2.5 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                                    {a.user?.name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <span className="text-xs font-semibold text-slate-800 truncate">{a.user?.name || a.user?.email}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Chưa phân công</span>
                                )}
                            </div>

                            {/* Observers */}
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Người theo dõi</span>
                                {task.observers && task.observers.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {task.observers.map((o: any) => (
                                            <div key={o.userId} className="flex items-center gap-2.5 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                    {o.user?.name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <span className="text-xs font-medium text-slate-700 truncate">{o.user?.name || o.user?.email}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Chưa có người theo dõi</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Card 2: System Links */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Info size={14} className="text-slate-500" />
                                <span>Liên kết hệ thống</span>
                            </h4>
                            {canEdit && (
                                <button
                                    onClick={() => setIsLinkModalOpen(true)}
                                    className="text-xs font-bold text-primary hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus size={12} /> Thêm / Cập nhật
                                </button>
                            )}
                        </div>
                        <div className="p-4">
                            {relatedLinks.length === 0 ? (
                                <div className="text-xs text-slate-400 text-center py-2 italic">Chưa có liên kết với dữ liệu nào</div>
                            ) : (
                                <div className="space-y-2">
                                    {relatedLinks.map((link, i) => (
                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{link.label}</span>
                                                <Link href={link.href} className="text-xs font-bold text-primary hover:underline truncate block">
                                                    {link.value}
                                                </Link>
                                            </div>
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleRemoveLink(link.label)}
                                                    disabled={isSaving}
                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                                    title="Gỡ liên kết"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 3: Attachments & Notes */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Paperclip size={14} className="text-slate-500" />
                                <span>Tài liệu &amp; Ghi chú</span>
                            </h4>
                            {canEdit && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsAddingNote(!isAddingNote)}
                                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs"
                                    >
                                        <Plus size={11} /> Ghi chú
                                    </button>
                                    <label className="text-xs font-semibold text-primary hover:text-emerald-700 flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                                        <Plus size={11} /> Tài liệu
                                        <input type="file" multiple hidden onChange={handleDocUpload} disabled={isSaving} />
                                    </label>
                                </div>
                            )}
                        </div>
                        <div className="p-4 space-y-3">
                            {isAddingNote && (
                                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2">
                                    <textarea
                                        value={newNoteContent}
                                        onChange={(e) => setNewNoteContent(e.target.value)}
                                        placeholder="Nhập nội dung ghi chú..."
                                        className="w-full min-h-[70px] p-2 text-xs bg-white border border-amber-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setIsAddingNote(false); setNewNoteContent(''); }} className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg">Hủy</button>
                                        <button onClick={handleNoteSave} disabled={isSaving || !newNoteContent.trim()} className="px-2.5 py-1 text-xs font-bold text-white bg-amber-600 rounded-lg">Lưu</button>
                                    </div>
                                </div>
                            )}

                            {(!task.attachments || task.attachments.length === 0) && Object.keys(uploadProgress).length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-400 italic">
                                    <FileIcon size={24} className="mx-auto mb-1 opacity-30" />
                                    Chưa có tài liệu nào
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Upload Progress */}
                                    {Object.entries(uploadProgress).map(([fileName, progress]) => (
                                        <div key={fileName} className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
                                            <div className="flex justify-between font-semibold text-emerald-800 mb-1">
                                                <span className="truncate max-w-[180px]">{fileName}</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="w-full bg-emerald-200 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    ))}

                                    {/* Attachments List */}
                                    {task.attachments?.map((doc: any) => {
                                        const isImage = doc.fileType?.startsWith('image/');
                                        const isNote = doc.fileType === 'TEXT_NOTE';

                                        if (isNote) {
                                            return (
                                                <div key={doc.id} className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/70 text-xs space-y-1">
                                                    <div className="flex items-center justify-between text-amber-900 font-bold">
                                                        <span className="flex items-center gap-1">
                                                            <Type size={12} /> {doc.uploadedBy?.name || 'Ghi chú'}
                                                        </span>
                                                        {canDelete && (
                                                            <button onClick={() => handleDocDelete(doc.id)} className="text-amber-600 hover:text-rose-600 cursor-pointer">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="text-slate-800 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: autoLinkText(doc.fileUrl) }} />
                                                    <span className="text-[10px] text-amber-700/70 block">
                                                        {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: vi })}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={doc.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {isImage ? (
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 cursor-pointer" onClick={() => setLightboxImage(doc.fileUrl)}>
                                                            <img src={doc.fileUrl} alt={doc.fileName} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-slate-200/80 text-slate-600 flex items-center justify-center shrink-0">
                                                            <FileIcon size={14} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <button
                                                            onClick={() => setPreviewDoc({ url: doc.fileUrl, name: doc.fileName })}
                                                            className="text-xs font-semibold text-slate-800 hover:text-primary truncate block text-left cursor-pointer max-w-[170px]"
                                                        >
                                                            {doc.fileName}
                                                        </button>
                                                        <span className="text-[10px] text-slate-400 block truncate">
                                                            {doc.uploadedBy?.name || 'Hệ thống'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <a href={doc.fileUrl} download={doc.fileName} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-primary rounded">
                                                        <Download size={13} />
                                                    </a>
                                                    {canDelete && (
                                                        <button onClick={() => handleDocDelete(doc.id)} className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 4: Activity Log (KPI) */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Clock size={14} className="text-slate-500" />
                                <span>Nhật ký hoạt động</span>
                            </h4>
                            <button
                                onClick={handleExportActivityLog}
                                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs cursor-pointer"
                            >
                                Xuất CSV
                            </button>
                        </div>
                        <div className="p-4">
                            {task.activityLogs.length === 0 ? (
                                <div className="text-xs text-slate-400 text-center py-2 italic">Không có lịch sử hoạt động</div>
                            ) : (
                                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                    {task.activityLogs.map((log: any) => {
                                        let actionText = 'Đã cập nhật';
                                        if (log.action === 'CREATED_TASK') actionText = 'Tạo công việc';
                                        else if (log.action === 'STATUS_CHANGED') actionText = 'Đổi trạng thái';
                                        else if (log.action === 'CHECKLIST_COMPLETED') actionText = 'Đánh dấu xong mục';
                                        else if (log.action === 'CHECKLIST_UNCHECKED') actionText = 'Bỏ xong mục';
                                        else if (log.action === 'CHECKLIST_ADDED') actionText = 'Thêm mục con';
                                        else if (log.action === 'CHECKLIST_EDITED') actionText = 'Sửa mục con';
                                        else if (log.action === 'CHECKLIST_DELETED') actionText = 'Xóa mục con';
                                        else if (log.action === 'COMMENT_ADDED') actionText = 'Bình luận';
                                        else if (log.action === 'UPDATED_TASK') actionText = 'Cập nhật';

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
                                            <div key={log.id} className="flex gap-2.5 text-xs">
                                                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-slate-800 leading-snug">
                                                        <strong className="font-semibold text-slate-900">{log.user?.name || log.user?.email}</strong> {actionText}
                                                        {detailsText && <span className="text-slate-500 font-mono text-[11px]"> {detailsText}</span>}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 5: Email Logs (if any) */}
                    {task.emailLogs && task.emailLogs.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Mail size={14} className="text-slate-500" />
                                    <span>Nhật ký gửi Email ({task.emailLogs.length})</span>
                                </h4>
                            </div>
                            <div className="p-3">
                                <div className="space-y-2 max-h-56 overflow-y-auto">
                                    {task.emailLogs.map((log: any) => (
                                        <div key={log.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-slate-800 truncate max-w-[150px]">{log.toEmail}</span>
                                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                    log.status === 'OPENED' ? 'bg-emerald-50 text-emerald-700' : (log.status === 'SENT' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700')
                                                }`}>
                                                    {log.status === 'OPENED' ? 'Đã mở' : (log.status === 'SENT' ? 'Đã gửi' : 'Thất bại')}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 truncate" title={log.subject}>{log.subject}</p>
                                            <span className="text-[10px] text-slate-400 block mt-1">{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

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
