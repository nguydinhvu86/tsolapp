'use client';
import React, { useState } from 'react';
import { MarketingForm } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { updateForm } from '../actions';
import { Save, Plus, Trash2, GripVertical, Settings2, ArrowLeft, Eye, Type, AlignLeft, CheckSquare, List, Phone, Mail, FileDigit } from 'lucide-react';
import Link from 'next/link';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type FieldType = 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'radio' | 'checkbox' | 'select';

interface FormField {
    id: string;
    name: string;
    type: FieldType;
    required: boolean;
    options?: string[]; // for radio, select
}

export type FormBuilderData = MarketingForm & {
    campaign: { id: string, name: string, creatorId: string };
};

function SortableField({ field, onEdit, onDelete }: { field: FormField, onEdit: () => void, onDelete: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const getIcon = (type: FieldType) => {
        switch (type) {
            case 'text': return <Type size={16} />;
            case 'textarea': return <AlignLeft size={16} />;
            case 'email': return <Mail size={16} />;
            case 'phone': return <Phone size={16} />;
            case 'number': return <FileDigit size={16} />;
            case 'radio': return <CheckSquare size={16} className="rounded-full" />;
            case 'checkbox': return <CheckSquare size={16} />;
            case 'select': return <List size={16} />;
            default: return <Type size={16} />;
        }
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm mb-3 group hover:border-blue-300 transition-colors">
            <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing p-1">
                <GripVertical size={20} />
            </div>
            
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex flex-shrink-0 items-center justify-center">
                {getIcon(field.type)}
            </div>

            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{field.name}</span>
                    {field.required && <span className="text-red-500 text-sm font-bold">*</span>}
                </div>
                <span className="text-xs text-slate-500 uppercase font-medium tracking-wide mt-1">{field.type}</span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" onClick={onEdit} className="h-8 w-8 p-0" title="Cài đặt">
                    <Settings2 size={16} className="text-slate-600" />
                </Button>
                <Button variant="danger" onClick={onDelete} className="h-8 w-8 p-0 border-0 hover:bg-red-50" title="Xóa">
                    <Trash2 size={16} className="text-red-600" />
                </Button>
            </div>
        </div>
    );
}

export default function FormBuilderClient({
    initialData,
    isAdmin,
    permissions,
}: {
    initialData: FormBuilderData;
    isAdmin: boolean;
    permissions: string[];
}) {
    const [fields, setFields] = useState<FormField[]>((initialData.fields as any) || []);
    const [isSaving, setIsSaving] = useState(false);
    
    // Edit state
    const [editingField, setEditingField] = useState<FormField | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const canEdit = isAdmin || permissions.includes('MARKETING_EDIT');

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addField = () => {
        const newField: FormField = {
            id: `field_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: 'Trường mới',
            type: 'text',
            required: false
        };
        setFields([...fields, newField]);
        setEditingField(newField);
    };

    const deleteField = (id: string) => {
        setFields(fields.filter(f => f.id !== id));
        if (editingField?.id === id) setEditingField(null);
    };

    const saveForm = async () => {
        setIsSaving(true);
        try {
            const res = await updateForm(initialData.id, { fields });
            if (res.success) {
                alert('Lưu biểu mẫu thành công!');
            } else {
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi kết nối khi lưu!');
        } finally {
            setIsSaving(false);
        }
    };

    const updateEditingField = (key: keyof FormField, value: any) => {
        if (!editingField) return;
        
        const updated = { ...editingField, [key]: value };
        setEditingField(updated);
        setFields(fields.map(f => f.id === updated.id ? updated : f));
    };

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Topbar */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-full shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/marketing/forms">
                        <Button variant="secondary" className="p-2 h-9 w-9 rounded-full flex justify-center items-center">
                            <ArrowLeft size={18} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            {initialData.title}
                        </h1>
                        <div className="text-xs text-slate-500">Thuộc {initialData.campaign.name}</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <a target="_blank" href={`/public/marketing/register/${initialData.slug}`}>
                        <Button variant="secondary" className="flex items-center gap-2 h-9">
                            <Eye size={16} /> Xem trước
                        </Button>
                    </a>
                    {canEdit && (
                        <Button variant="primary" onClick={saveForm} disabled={isSaving} className="flex items-center gap-2 h-9">
                            <Save size={16} /> {isSaving ? 'Đang lưu...' : 'Lưu Form'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Builder Area */}
            <div className="flex flex-1 flex-col md:flex-row gap-6 overflow-hidden pb-4">
                {/* Left Panel: Field List */}
                <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800">
                    <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm z-10 shrink-0">
                        <h2 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide text-sm flex items-center gap-2">
                            <List size={16} /> Các trường thông tin
                        </h2>
                        {canEdit && (
                            <Button onClick={addField} variant="secondary" className="h-8 shadow-sm px-2 py-1 text-sm">
                                <Plus size={14} className="mr-1" /> Thêm trường
                            </Button>
                        )}
                    </div>
                    
                    <div className="p-4 flex-1 overflow-y-auto">
                        <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext 
                                items={fields.map(f => f.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {fields.length > 0 ? fields.map(field => (
                                    <div key={field.id} onClick={() => setEditingField(field)}>
                                        <SortableField 
                                            field={field} 
                                            onEdit={() => setEditingField(field)}
                                            onDelete={() => deleteField(field.id)}
                                        />
                                    </div>
                                )) : (
                                    <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <List size={32} className="mx-auto mb-3 opacity-20" />
                                        <p>Chưa có trường nào.</p>
                                        <p className="text-sm mt-1">Bấm "Thêm trường" để bắt đầu.</p>
                                    </div>
                                )}
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>

                {/* Right Panel: Field Settings */}
                {editingField && (
                    <Card className="w-full md:w-96 flex flex-col shadow-lg border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                <Settings2 size={18} /> Cài đặt trường
                            </h2>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto space-y-5">
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Tên trường (Label) <span className="text-red-500">*</span></label>
                                <Input 
                                    value={editingField.name} 
                                    onChange={(e) => updateEditingField('name', e.target.value)} 
                                    placeholder="Ví dụ: Họ và tên"
                                    className="h-10"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Loại hiển thị</label>
                                <select 
                                    className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                                    value={editingField.type}
                                    onChange={(e) => updateEditingField('type', e.target.value as FieldType)}
                                >
                                    <optgroup label="Văn bản">
                                        <option value="text">Chữ ngắn (Text)</option>
                                        <option value="textarea">Chữ dài (Textarea)</option>
                                    </optgroup>
                                    <optgroup label="Định dạng">
                                        <option value="email">Email</option>
                                        <option value="phone">Số điện thoại</option>
                                        <option value="number">Số</option>
                                    </optgroup>
                                    <optgroup label="Lựa chọn">
                                        <option value="select">Dropdown (Select list)</option>
                                        <option value="radio">Chỉ chọn một (Radio)</option>
                                        <option value="checkbox">Nhiều lựa chọn (Checkbox)</option>
                                    </optgroup>
                                </select>
                            </div>

                            {['select', 'radio', 'checkbox'].includes(editingField.type) && (
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                                        Danh sách tùy chọn
                                    </label>
                                    <textarea
                                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 min-h-[100px]"
                                        placeholder="Mỗi dòng 1 tùy chọn..."
                                        value={(editingField.options || []).join('\n')}
                                        onChange={(e) => updateEditingField('options', e.target.value.split('\n').filter(Boolean))}
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Mỗi dòng 1 tùy chọn.</p>
                                </div>
                            )}

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <label htmlFor="requiredField" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Bắt buộc nhập
                                </label>
                                <input
                                    type="checkbox"
                                    id="requiredField"
                                    checked={editingField.required}
                                    onChange={(e) => updateEditingField('required', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 cursor-pointer"
                                />
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
