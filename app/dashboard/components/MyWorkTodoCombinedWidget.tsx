'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Briefcase,
    CheckCircle2,
    Circle,
    Plus,
    Clock,
    Pencil,
    Trash2,
    GripVertical,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';
import { Modal } from '@/app/components/ui/Modal';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { getTodos, addTodo, toggleTodo, deleteTodo, updateTodoText } from '@/app/actions/todo';

interface MyWorkTodoProps {
    tasks: any[];
    onTaskStatusChange?: (taskId: string, newStatus: string) => Promise<void>;
}

export function MyWorkTodoCombinedWidget({ tasks = [], onTaskStatusChange }: MyWorkTodoProps) {
    const router = useRouter();

    // Internal task list for optimistic updates
    const [taskList, setTaskList] = useState<any[]>(tasks);
    useEffect(() => {
        setTaskList(tasks);
    }, [tasks]);

    // Todo List state
    const [todos, setTodos] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [showAllTodos, setShowAllTodos] = useState(false);
    const [isLoadedTodos, setIsLoadedTodos] = useState(false);
    const [isSubmittingTodo, setIsSubmittingTodo] = useState(false);
    const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
    const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Fetch todos
    useEffect(() => {
        const fetchTodos = async () => {
            try {
                const res = await getTodos();
                if (res.status === 'success') {
                    let fetched = res.todos || [];
                    try {
                        const savedOrderStr = localStorage.getItem('dashboard_todos_order');
                        if (savedOrderStr) {
                            const savedOrder: string[] = JSON.parse(savedOrderStr);
                            const orderMap = new Map(savedOrder.map((id, idx) => [id, idx]));
                            fetched.sort((a: any, b: any) => {
                                const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
                                const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
                                return orderA - orderB;
                            });
                        }
                    } catch (_) {}
                    setTodos(fetched);
                }
            } catch (error) {
                console.error('Failed to fetch todos', error);
            } finally {
                setIsLoadedTodos(true);
            }
        };

        fetchTodos();
    }, []);

    const saveOrderToStorage = (updatedTodos: any[]) => {
        try {
            const orderIds = updatedTodos.map(t => t.id);
            localStorage.setItem('dashboard_todos_order', JSON.stringify(orderIds));
        } catch (_) {}
    };

    const handleAddTodo = async (e?: React.FormEvent | React.KeyboardEvent) => {
        if (e) e.preventDefault();
        if (!inputValue.trim() || isSubmittingTodo) return;

        setIsSubmittingTodo(true);
        const tempId = 'temp-' + Date.now();
        const newTempTodo = {
            id: tempId,
            text: inputValue.trim(),
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const nextTodos = [newTempTodo, ...todos];
        setTodos(nextTodos);
        saveOrderToStorage(nextTodos);
        setInputValue('');

        try {
            const res = await addTodo(newTempTodo.text);
            if (res.status === 'success' && res.todo) {
                setTodos(prev => {
                    const replaced = prev.map(t => t.id === tempId ? res.todo : t);
                    saveOrderToStorage(replaced);
                    return replaced;
                });
                setIsAddTodoModalOpen(false);
            } else {
                setTodos(prev => prev.filter(t => t.id !== tempId));
            }
        } catch (error) {
            console.error('Failed to add todo', error);
            setTodos(prev => prev.filter(t => t.id !== tempId));
        } finally {
            setIsSubmittingTodo(false);
        }
    };

    const handleToggleTodo = async (id: string, currentStatus: boolean) => {
        const backupTodos = [...todos];
        setTodos(prev => prev.map(todo => todo.id === id ? { ...todo, completed: !currentStatus } : todo));

        try {
            const res = await toggleTodo(id, currentStatus);
            if (res.status === 'error') {
                setTodos(backupTodos);
            }
        } catch (error) {
            console.error('Failed to toggle todo', error);
            setTodos(backupTodos);
        }
    };

    const handleRemoveTodo = async (id: string) => {
        const backupTodos = [...todos];
        const nextTodos = todos.filter(todo => todo.id !== id);
        setTodos(nextTodos);
        saveOrderToStorage(nextTodos);

        try {
            const res = await deleteTodo(id);
            if (res.status === 'error') {
                setTodos(backupTodos);
            }
        } catch (error) {
            console.error('Failed to remove todo', error);
            setTodos(backupTodos);
        }
    };

    const handleUpdateTodo = async (id: string) => {
        if (!editValue.trim()) {
            setEditingTodoId(null);
            return;
        }

        const backupTodos = [...todos];
        setTodos(prev => prev.map(todo => todo.id === id ? { ...todo, text: editValue.trim() } : todo));
        setEditingTodoId(null);

        try {
            const res = await updateTodoText(id, editValue.trim());
            if (res.status === 'error') {
                setTodos(backupTodos);
            }
        } catch (error) {
            console.error('Failed to update todo', error);
            setTodos(backupTodos);
        }
    };

    // Drag handlers for Todo
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const activeT = todos.filter(t => !t.completed);
        const completedT = todos.filter(t => t.completed);
        const displayedList = showAllTodos ? [...activeT, ...completedT] : activeT.slice(0, 5);

        const updatedDisplayed = [...displayedList];
        const [movedItem] = updatedDisplayed.splice(draggedIndex, 1);
        updatedDisplayed.splice(dropIndex, 0, movedItem);

        const remainingTodos = todos.filter(t => !updatedDisplayed.some(d => d.id === t.id));
        const newFullTodos = [...updatedDisplayed, ...remainingTodos];
        setTodos(newFullTodos);
        saveOrderToStorage(newFullTodos);

        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);
    const displayedTodos = showAllTodos ? [...activeTodos, ...completedTodos] : activeTodos.slice(0, 6);

    return (
        <div className="flex flex-col xl:flex-row gap-4 w-full mb-2 items-stretch">
            {/* Left: My Work Tasks (65%) */}
            <div className="w-full xl:w-[65%] flex flex-col">
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col h-full">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-500/20 shrink-0">
                                <Briefcase size={16} />
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Công việc của tôi ({taskList.length})
                            </h3>
                        </div>

                        <Link
                            href="/tasks"
                            className="text-xs text-primary hover:text-emerald-700 font-semibold flex items-center gap-1 group/link transition-colors py-1 px-2 rounded-lg hover:bg-emerald-50/60"
                        >
                            <span>Xem tất cả công việc</span>
                            <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-0.5" />
                        </Link>
                    </div>

                    {taskList.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400 text-xs">
                            <Briefcase size={24} className="mb-2 text-slate-300" />
                            <span>Bạn không có công việc nào đang mở. Thật tuyệt vời!</span>
                        </div>
                    ) : (
                        <div className="table-wrapper custom-scrollbar" style={{ flex: 1, maxHeight: '280px', overflowY: 'auto' }}>
                            <table style={{ minWidth: '100%' }}>
                                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="text-left py-2 px-3 border-b border-slate-100">Tên công việc</th>
                                        <th className="text-center py-2 px-3 border-b border-slate-100">Ưu tiên</th>
                                        <th className="text-left py-2 px-3 border-b border-slate-100">Hạn chót</th>
                                        <th className="text-left py-2 px-3 border-b border-slate-100">Liên quan</th>
                                        <th className="text-center py-2 px-3 border-b border-slate-100">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {taskList.map(task => {
                                        const overdue = task.dueDate && task.status !== 'DONE' && task.status !== 'CANCELLED' && new Date(task.dueDate).getTime() < new Date().getTime();
                                        const relatedEntityName = task.customer?.name || task.contract?.title || task.quote?.title || task.project?.name || task.lead?.name || '';

                                        return (
                                            <tr
                                                key={task.id}
                                                className={`hover:bg-slate-50/70 transition-colors group ${
                                                    overdue ? 'bg-rose-50/40 border-l-4 border-l-rose-500' : ''
                                                }`}
                                            >
                                                <td className="py-2.5 px-3 border-b border-slate-100">
                                                    <div className="flex items-center gap-1.5">
                                                        <Link
                                                            href={`/tasks/${task.id}`}
                                                            className={`text-xs font-semibold truncate max-w-[220px] hover:underline ${
                                                                overdue ? 'text-rose-950 font-bold' : 'text-blue-600'
                                                            }`}
                                                            title={task.title}
                                                        >
                                                            {task.title}
                                                        </Link>
                                                        {overdue && (
                                                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-rose-100 text-rose-700 border border-rose-300 shrink-0">
                                                                QUÁ HẠN
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-2.5 px-3 border-b border-slate-100 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                        task.priority === 'URGENT'
                                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                            : task.priority === 'HIGH'
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                        {task.priority === 'URGENT' ? 'GẤP' : task.priority === 'HIGH' ? 'CAO' : task.priority === 'MEDIUM' ? 'TRUNG BÌNH' : 'THẤP'}
                                                    </span>
                                                </td>

                                                <td className="py-2.5 px-3 border-b border-slate-100 text-xs">
                                                    {task.dueDate ? (
                                                        <span className={overdue ? 'text-rose-700 font-bold' : 'text-slate-600'}>
                                                            {formatDate(new Date(task.dueDate))}
                                                        </span>
                                                    ) : '-'}
                                                </td>

                                                <td className="py-2.5 px-3 border-b border-slate-100 text-xs text-slate-500 truncate max-w-[150px]" title={relatedEntityName}>
                                                    {relatedEntityName || '-'}
                                                </td>

                                                <td className="py-2.5 px-3 border-b border-slate-100 text-center">
                                                    <select
                                                        value={task.status}
                                                        onChange={async (e) => {
                                                            const newStatus = e.target.value;
                                                            const prevStatus = task.status;
                                                            setTaskList(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

                                                            try {
                                                                const { updateDashboardTaskStatus } = await import('@/app/dashboard/actions');
                                                                const res = await updateDashboardTaskStatus(task.id, newStatus);
                                                                if (!res?.success) {
                                                                    setTaskList(prev => prev.map(t => t.id === task.id ? { ...t, status: prevStatus } : t));
                                                                } else {
                                                                    router.refresh();
                                                                }
                                                            } catch (err) {
                                                                setTaskList(prev => prev.map(t => t.id === task.id ? { ...t, status: prevStatus } : t));
                                                            }
                                                        }}
                                                        className="px-2 py-1 rounded-md border border-slate-200 text-xs font-medium bg-transparent cursor-pointer outline-none focus:border-blue-500"
                                                    >
                                                        <option value="TODO">Cần làm</option>
                                                        <option value="IN_PROGRESS">Đang làm</option>
                                                        <option value="REVIEW">Chờ duyệt</option>
                                                        <option value="DONE">Hoàn thành</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Todo List Widget (35%) */}
            <div className="w-full xl:w-[35%] flex flex-col">
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col h-full min-h-[300px]">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-500/20 shrink-0">
                                <CheckCircle2 size={16} />
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Việc cần làm (Todo)
                            </h3>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setIsAddTodoModalOpen(true)}
                                className="inline-flex items-center gap-1 h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
                            >
                                <Plus size={13} strokeWidth={2.5} />
                                <span>Thêm</span>
                            </button>
                            <button
                                onClick={() => setShowAllTodos(!showAllTodos)}
                                disabled={todos.length === 0}
                                className="h-7 px-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium border border-slate-200 transition-all disabled:opacity-50"
                            >
                                {showAllTodos ? 'Thu gọn' : `Tất cả (${todos.length})`}
                            </button>
                        </div>
                    </div>

                    {/* Todo Items */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: showAllTodos ? '320px' : '220px' }}>
                        {!isLoadedTodos ? (
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        ) : todos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs">
                                <CheckCircle2 size={24} className="mb-2 text-slate-300" />
                                <span>Ghi chú việc cần làm cá nhân tại đây.</span>
                            </div>
                        ) : (
                            <ul className="space-y-1.5">
                                {displayedTodos.map((todo, index) => {
                                    const isDragging = draggedIndex === index;
                                    const isDragOver = dragOverIndex === index && draggedIndex !== index;

                                    return (
                                        <li
                                            key={todo.id}
                                            draggable={!editingTodoId}
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDrop={(e) => handleDrop(e, index)}
                                            onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                                            className={`flex items-start gap-2 p-2 rounded-xl group transition-all select-none border ${
                                                isDragging
                                                    ? 'opacity-40 border-dashed border-emerald-400 bg-emerald-50/20'
                                                    : isDragOver
                                                    ? 'ring-2 ring-emerald-500/40 border-emerald-400 bg-emerald-50/40'
                                                    : todo.completed
                                                    ? 'bg-slate-50/60 opacity-75 border-slate-200/50'
                                                    : 'bg-white border-slate-200/80 hover:border-emerald-300 shadow-2xs'
                                            }`}
                                        >
                                            {editingTodoId === todo.id ? (
                                                <div className="flex-1 w-full">
                                                    <textarea
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="w-full border border-emerald-400 rounded-md p-2 text-xs outline-none resize-y min-h-[50px]"
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-1.5 mt-1.5">
                                                        <button onClick={() => setEditingTodoId(null)} className="text-xs text-slate-500">{`Hủy`}</button>
                                                        <button onClick={() => handleUpdateTodo(todo.id)} className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded">{`Lưu`}</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="text-slate-300 group-hover:text-slate-500 cursor-grab p-0.5 shrink-0 mt-0.5">
                                                        <GripVertical size={13} />
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleTodo(todo.id, todo.completed)}
                                                        className="mt-0.5 text-slate-400 hover:text-emerald-600 shrink-0"
                                                    >
                                                        {todo.completed ? (
                                                            <CheckCircle2 size={15} className="text-emerald-600" />
                                                        ) : (
                                                            <Circle size={15} className="hover:text-emerald-600" />
                                                        )}
                                                    </button>
                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <span
                                                            onDoubleClick={() => {
                                                                if (!todo.completed) {
                                                                    setEditingTodoId(todo.id);
                                                                    setEditValue(todo.text);
                                                                }
                                                            }}
                                                            className={`text-xs font-medium whitespace-pre-wrap break-words ${
                                                                todo.completed ? 'text-slate-400 line-through' : 'text-slate-800'
                                                            }`}
                                                        >
                                                            {todo.text}
                                                        </span>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                                                        {!todo.completed && (
                                                            <button
                                                                onClick={() => { setEditingTodoId(todo.id); setEditValue(todo.text); }}
                                                                className="text-slate-400 hover:text-blue-600 p-1 rounded"
                                                            >
                                                                <Pencil size={12} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemoveTodo(todo.id)}
                                                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Todo Modal */}
            <Modal isOpen={isAddTodoModalOpen} onClose={() => setIsAddTodoModalOpen(false)} title="Thêm việc cần làm" maxWidth="480px">
                <form onSubmit={handleAddTodo} className="flex flex-col gap-3.5">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Nội dung công việc <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Nhập nội dung việc cần làm..."
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500 min-h-[90px]"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsAddTodoModalOpen(false)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isSubmittingTodo}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                            {isSubmittingTodo ? 'Đang tạo...' : 'Tạo mới'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
