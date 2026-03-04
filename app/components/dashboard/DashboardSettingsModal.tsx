import React from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';

interface WidgetConfig {
    id: string;
    title: string;
    visible: boolean;
    order: number;
}

interface DashboardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    widgets: WidgetConfig[];
    onToggleWidget: (id: string, visible: boolean) => void;
    onSave: () => void;
}

export function DashboardSettingsModal({ isOpen, onClose, widgets, onToggleWidget, onSave }: DashboardSettingsModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tùy chỉnh Bảng điều khiển">
            <div className="flex flex-col gap-4 py-4">
                <p className="text-sm text-gray-500 mb-2">
                    Bật hoặc tắt các khối nội dung hiển thị trên bảng điều khiển của bạn.
                </p>
                <div className="flex flex-col gap-3">
                    {widgets.map(widget => (
                        <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                            <div>
                                <p className="font-medium text-gray-900">{widget.title}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={widget.visible}
                                    onChange={(e) => onToggleWidget(widget.id, e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="secondary" onClick={onClose}>Hủy</Button>
                <Button variant="primary" onClick={() => { onSave(); onClose(); }}>Lưu cấu hình</Button>
            </div>
        </Modal>
    );
}
