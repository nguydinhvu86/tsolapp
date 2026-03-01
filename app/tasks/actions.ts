'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getTasks(filters?: any) {
    // Optionally apply filters in future iterations
    const tasks = await (prisma.task as any).findMany({
        include: {
            creator: true,
            assignees: { include: { user: true } },
            observers: { include: { user: true } },
            checklists: { include: { completedBy: true } },
            comments: { include: { user: true } },
            customer: true,
            contract: true,
            quote: true,
            handover: true,
            paymentReq: true,
            dispatch: true,
            appendix: true,
            activityLogs: { include: { user: true } },
            parentTask: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    return tasks;
}

// Helper to add frequency to date
const addFrequency = (date: Date, freq: string, step: number) => {
    const d = new Date(date);
    switch (freq) {
        case 'DAILY': d.setDate(d.getDate() + step); break;
        case 'MONTHLY': d.setMonth(d.getMonth() + step); break;
        case 'QUARTERLY': d.setMonth(d.getMonth() + 3 * step); break; // 3 months
        case 'BIANNUALLY': d.setMonth(d.getMonth() + 6 * step); break; // 6 months
        case 'YEARLY': d.setFullYear(d.getFullYear() + step); break; // 1 year
    }
    return d;
};

export async function createTask(data: any, creatorId: string) {
    const { assignees, observers, recurrence, ...restData } = data;

    const isRecurringMode = recurrence && recurrence.isRecurring && recurrence.count > 1;
    const taskCount = isRecurringMode ? recurrence.count : 1;
    const frequency = isRecurringMode ? recurrence.frequency : null;
    let baseDueDate = restData.dueDate ? new Date(restData.dueDate) : null;

    const createdTasks: any[] = [];
    let firstTaskId: string | null = null;

    for (let i = 0; i < taskCount; i++) {
        let currentDueDate = baseDueDate;
        if (isRecurringMode && baseDueDate && i > 0) {
            currentDueDate = addFrequency(baseDueDate, frequency, i);
        }

        // Add suffix to title if recurring
        const titleSuffix = isRecurringMode ? ` (Lần ${i + 1}/${taskCount})` : '';

        // Create base task
        const newTask: any = await (prisma.task as any).create({
            data: {
                ...restData,
                title: restData.title + titleSuffix,
                dueDate: currentDueDate,
                isRecurring: isRecurringMode,
                recurrenceRule: frequency,
                creatorId,
                parentTaskId: i > 0 ? firstTaskId : null
            }
        });

        if (i === 0) {
            firstTaskId = newTask.id;
        }

        // Handle Assignees
        if (assignees && assignees.length > 0) {
            await prisma.taskAssignee.createMany({
                data: assignees.map((userId: string) => ({ taskId: newTask.id, userId }))
            });
        }

        // Handle Observers (including the creator by default)
        const observerSet = new Set<string>();
        observerSet.add(creatorId);
        if (observers) observers.forEach((id: string) => observerSet.add(id));

        await prisma.taskObserver.createMany({
            data: Array.from(observerSet).map((userId: string) => ({ taskId: newTask.id, userId }))
        });

        logActivity(newTask.id, creatorId, 'CREATED_TASK', isRecurringMode ? 'Tạo tự động theo chu kỳ' : undefined);

        createdTasks.push(newTask);
    }

    // Notify Assignees (only once per assignee, for the first task or in general)
    if (assignees && assignees.length > 0 && createdTasks.length > 0) {
        const firstTask = createdTasks[0];
        const creator = await prisma.user.findUnique({ where: { id: creatorId }, select: { name: true } });
        const notifications = assignees
            .filter((userId: string) => userId !== creatorId)
            .map((userId: string) => ({
                userId,
                message: `${creator?.name || 'Ai đó'} đã giao cho bạn ${isRecurringMode ? taskCount + ' công việc định kỳ' : 'một công việc'}: "${firstTask.title}".`,
                link: `/tasks/${firstTask.id}`
            }));
        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }
    }

    revalidatePath('/tasks');
    return createdTasks[0]; // Return the first created task
}

export async function updateTask(id: string, data: any, userId: string) {
    const { assignees, observers, recurrence, ...restData } = data;

    const oldTask = await prisma.task.findUnique({
        where: { id },
        include: { assignees: true, observers: true }
    });

    const changes = [];
    if (oldTask) {
        if (restData.title && oldTask.title !== restData.title) changes.push(`Tên: "${oldTask.title}" -> "${restData.title}"`);
        if ('description' in restData && oldTask.description !== restData.description) changes.push(`Mô tả bị thay đổi`);
        if (restData.priority && oldTask.priority !== restData.priority) changes.push(`Mức độ: ${oldTask.priority} -> ${restData.priority}`);
        if ('dueDate' in restData) {
            const oldDate = oldTask.dueDate ? oldTask.dueDate.toISOString().split('T')[0] : 'None';
            const newDate = restData.dueDate ? new Date(restData.dueDate).toISOString().split('T')[0] : 'None';
            if (oldDate !== newDate) changes.push(`Hạn chót: ${oldDate} -> ${newDate}`);
        }
        if (assignees) {
            const oldAssignedIds = oldTask.assignees.map((a: any) => a.userId).sort().join(',');
            const newAssignedIds = [...assignees].sort().join(',');
            if (oldAssignedIds !== newAssignedIds) changes.push('Cập nhật Người phụ trách');
        }
        if (observers) {
            const oldObserverIds = oldTask.observers.map((o: any) => o.userId).sort().join(',');
            const newObserverIds = [...observers].sort().join(',');
            if (oldObserverIds !== newObserverIds) changes.push('Cập nhật Người theo dõi');
        }

        // Recurrence changes
        if (recurrence && recurrence.isRecurring && !oldTask.isRecurring) {
            changes.push('Bật lặp lại định kỳ');
        } else if (recurrence && !recurrence.isRecurring && oldTask.isRecurring) {
            changes.push('Tắt lặp lại định kỳ');
        }
    }

    // Process Recurrence Toggle Off
    if (oldTask && oldTask.isRecurring && recurrence && !recurrence.isRecurring) {
        // Find and delete future incomplete child tasks generated from this parent
        await (prisma.task as any).deleteMany({
            where: {
                parentTaskId: id,
                status: { not: 'DONE' }
            }
        });

        // Remove tracking fields on the current task
        restData.isRecurring = false;
        restData.recurrenceRule = null;
        restData.parentTaskId = null; // Unlink if it was a child itself
    }
    // Process Recurrence Toggle On
    else if (oldTask && !oldTask.isRecurring && recurrence && recurrence.isRecurring) {
        restData.isRecurring = true;
        restData.recurrenceRule = recurrence.frequency;
    }

    // Update base fields
    const updated = await prisma.task.update({
        where: { id },
        data: restData
    });

    // Re-sync Assignees if provided
    if (assignees) {
        await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
        await prisma.taskAssignee.createMany({
            data: assignees.map((uId: string) => ({ taskId: id, userId: uId }))
        });
    }

    // Re-sync Observers if provided
    if (observers) {
        await prisma.taskObserver.deleteMany({ where: { taskId: id } });
        await prisma.taskObserver.createMany({
            data: observers.map((uId: string) => ({ taskId: id, userId: uId }))
        });
    }

    // Process Recurrence Toggle On -> generate child tasks (only after update succeeds)
    if (oldTask && !oldTask.isRecurring && recurrence && recurrence.isRecurring) {
        const taskCount = recurrence.count || 1;
        const frequency = recurrence.frequency;
        const baseDueDate = restData.dueDate ? new Date(restData.dueDate) : (oldTask.dueDate || new Date());

        const childTasksData = [];
        for (let i = 1; i < taskCount; i++) {
            let nextDueDate = addFrequency(baseDueDate, frequency, i);
            childTasksData.push({
                ...restData,
                title: restData.title + ` (Lần ${i + 1}/${taskCount})`,
                dueDate: nextDueDate,
                isRecurring: true,
                recurrenceRule: frequency,
                creatorId: oldTask.creatorId,
                parentTaskId: id, // Linking to current task as parent
                status: 'TODO'
            });
        }

        for (const childData of childTasksData) {
            const childTask: any = await prisma.task.create({ data: childData });
            // Copy relations for children
            if (assignees && assignees.length > 0) {
                await prisma.taskAssignee.createMany({
                    data: assignees.map((userId: string) => ({ taskId: childTask.id, userId }))
                });
            }
            if (observers && observers.length > 0) {
                await prisma.taskObserver.createMany({
                    data: observers.map((userId: string) => ({ taskId: childTask.id, userId }))
                });
            }
        }
    }

    if (changes.length > 0) {
        logActivity(id, userId, 'UPDATED_TASK', JSON.stringify({ summary: changes.join(' | ') }));
    }

    revalidatePath('/tasks');
    revalidatePath(`/tasks/${id}`);
    return updated;
}

export async function updateTaskStatus(id: string, status: string, userId: string) {
    await prisma.task.update({ where: { id }, data: { status } });
    logActivity(id, userId, 'STATUS_CHANGED', JSON.stringify({ to: status }));
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${id}`);
}

export async function deleteTask(id: string) {
    await prisma.task.delete({ where: { id } });
    revalidatePath('/tasks');
}

// Sub-features
export async function addChecklist(taskId: string, title: string, userId: string) {
    const cl = await prisma.taskChecklist.create({
        data: { taskId, title }
    });
    logActivity(taskId, userId, 'CHECKLIST_ADDED', JSON.stringify({ item: title }));
    revalidatePath(`/tasks/${taskId}`);
    return cl;
}

export async function toggleChecklist(checklistId: string, isCompleted: boolean, userId: string) {
    const cl = await prisma.taskChecklist.update({
        where: { id: checklistId },
        data: {
            isCompleted,
            completedById: isCompleted ? userId : null,
            completedAt: isCompleted ? new Date() : null
        }
    });
    logActivity(cl.taskId, userId, isCompleted ? 'CHECKLIST_COMPLETED' : 'CHECKLIST_UNCHECKED', JSON.stringify({ item: cl.title }));
    revalidatePath(`/tasks/${cl.taskId}`);
}

export async function editChecklist(checklistId: string, title: string, userId: string) {
    const oldCl = await prisma.taskChecklist.findUnique({ where: { id: checklistId } });
    const cl = await prisma.taskChecklist.update({
        where: { id: checklistId },
        data: { title }
    });
    if (oldCl && oldCl.title !== title) {
        logActivity(cl.taskId, userId, 'CHECKLIST_EDITED', JSON.stringify({ old: oldCl.title, new: title }));
    }
    revalidatePath(`/tasks/${cl.taskId}`);
}

export async function deleteChecklist(checklistId: string, userId: string) {
    const oldCl = await prisma.taskChecklist.findUnique({ where: { id: checklistId } });
    const cl = await prisma.taskChecklist.delete({
        where: { id: checklistId }
    });
    if (oldCl) {
        logActivity(cl.taskId, userId, 'CHECKLIST_DELETED', JSON.stringify({ item: oldCl.title }));
    }
    revalidatePath(`/tasks/${cl.taskId}`);
}

export async function addComment(taskId: string, content: string, userId: string, parentId?: string) {
    const comment = await prisma.taskComment.create({
        data: { taskId, content, userId, parentId }
    });

    // Parse Mentions
    // Strip HTML to plain text for easier searching, or just search raw HTML
    // Since we know the users, let's fetch all users to see if `@UserName` is in the content
    const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
    const mentionedUsers = allUsers.filter(u => u.name && content.includes(`@${u.name}`));

    if (mentionedUsers.length > 0) {
        const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        const notifications = mentionedUsers
            .filter(mu => mu.id !== userId) // don't notify self
            .map(mu => ({
                userId: mu.id,
                message: `${sender?.name || 'Ai đó'} đã nhắc đến bạn trong một bình luận ở công việc này.`,
                link: `/tasks/${taskId}`
            }));

        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }
    }

    logActivity(taskId, userId, 'COMMENT_ADDED', JSON.stringify({ summary: parentId ? 'Đã trả lời một bình luận' : 'Đã thêm bình luận mới' }));

    revalidatePath(`/tasks/${taskId}`);
}

export async function toggleReaction(commentId: string, emoji: string, userId: string) {
    const existing = await prisma.taskCommentReaction.findUnique({
        where: {
            commentId_userId_emoji: { commentId, userId, emoji }
        }
    });

    if (existing) {
        await prisma.taskCommentReaction.delete({ where: { id: existing.id } });
    } else {
        await prisma.taskCommentReaction.create({
            data: { commentId, userId, emoji }
        });
    }

    // We need to revalidate the task page, but we only have commentId. 
    // Find the taskId:
    const comment = await prisma.taskComment.findUnique({ where: { id: commentId }, select: { taskId: true } });
    if (comment) {
        logActivity(comment.taskId, userId, existing ? 'REACTION_REMOVED' : 'REACTION_ADDED', JSON.stringify({ item: emoji }));
        revalidatePath(`/tasks/${comment.taskId}`);
    }
}

export async function updateTaskLinks(taskId: string, linkData: { customerId?: string | null, contractId?: string | null, quoteId?: string | null, handoverId?: string | null, paymentReqId?: string | null, dispatchId?: string | null }, userId: string) {
    const oldTask = await prisma.task.findUnique({ where: { id: taskId } });

    await prisma.task.update({
        where: { id: taskId },
        data: linkData
    });

    if (oldTask) {
        const changes: string[] = [];
        const keysMap: any = { customerId: 'Khách hàng', contractId: 'Hợp đồng', quoteId: 'Báo giá', handoverId: 'Biên bản bàn giao', paymentReqId: 'Đề nghị thanh toán', dispatchId: 'Công văn' };

        for (const key of Object.keys(linkData)) {
            const oldVal = (oldTask as any)[key];
            const newVal = (linkData as any)[key] ?? null;
            if (oldVal !== newVal) {
                if (newVal) changes.push(`Gắn liên kết ${keysMap[key]}`);
                else changes.push(`Gỡ liên kết ${keysMap[key]}`);
            }
        }

        if (changes.length > 0) {
            logActivity(taskId, userId, 'UPDATED_TASK', JSON.stringify({ summary: changes.join(' | ') }));
        }
    }

    revalidatePath(`/tasks/${taskId}`);
}

export async function searchEntities(type: string, query: string = '') {
    const q = query.toLowerCase();
    switch (type) {
        case 'CUSTOMER':
            return prisma.customer.findMany({ where: { name: { contains: q } }, take: 5, select: { id: true, name: true } });
        case 'CONTRACT':
            return prisma.contract.findMany({ where: { title: { contains: q } }, take: 5, select: { id: true, title: true } });
        case 'QUOTE':
            return prisma.quote.findMany({ where: { title: { contains: q } }, take: 5, select: { id: true, title: true } });
        case 'HANDOVER':
            return prisma.handover.findMany({ where: { title: { contains: q } }, take: 5, select: { id: true, title: true } });
        case 'PAYMENT_REQ':
            return prisma.paymentRequest.findMany({ where: { title: { contains: q } }, take: 5, select: { id: true, title: true } });
        case 'DISPATCH':
            return prisma.dispatch.findMany({ where: { title: { contains: q } }, take: 5, select: { id: true, title: true } });
        default:
            return [];
    }
}

// KPI Logging Server Utility
export async function logActivity(taskId: string, userId: string, action: string, details?: string) {
    await prisma.taskActivityLog.create({
        data: {
            taskId,
            userId,
            action,
            details
        }
    });
}

// Clone Task Utility
export async function cloneTask(taskId: string, userId: string, keepAssignees: boolean = true) {
    const original = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
            assignees: true,
            observers: true,
            checklists: true,
        }
    });

    if (!original) throw new Error("Task not found");

    const { id, createdAt, updatedAt, status, completedById, completedAt, ...baseData } = original;

    const cloned = await prisma.task.create({
        data: {
            ...baseData,
            title: baseData.title + ' (Copy)',
            creatorId: userId, // The person cloning becomes the new creator
            status: 'TODO',
            assignees: keepAssignees ? {
                create: original.assignees.map(a => ({ userId: a.userId }))
            } : undefined,
            observers: keepAssignees ? {
                create: original.observers.map(o => ({ userId: o.userId }))
            } : {
                create: [{ userId }] // Default to the person cloning as observer
            },
            checklists: {
                create: original.checklists.map(c => ({
                    title: c.title,
                    isCompleted: false
                }))
            }
        }
    });

    logActivity(cloned.id, userId, 'CREATED_TASK', JSON.stringify({ summary: 'Cloned from an existing task' }));
    logActivity(original.id, userId, 'CLONED_TASK', JSON.stringify({ cloneId: cloned.id }));

    revalidatePath('/tasks');
    return cloned;
}
