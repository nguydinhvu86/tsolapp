'use client';
import React, { useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';

interface GanttTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies: string;
    custom_class?: string;
}

interface GanttChartProps {
    tasks: GanttTask[];
    viewMode?: 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month';
    onTaskClick?: (task: GanttTask) => void;
    onDateChange?: (task: GanttTask, start: string, end: string) => void;
    onProgressChange?: (task: GanttTask, progress: number) => void;
}

export default function GanttChart({ tasks, viewMode = 'Day', onTaskClick, onDateChange, onProgressChange }: GanttChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const ganttInstance = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current || tasks.length === 0) return;

        // Clean up previous instance
        if (ganttInstance.current) {
            containerRef.current.innerHTML = '';
        }

        const options = {
            header_height: 50,
            column_width: 30,
            step: 24,
            view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
            bar_height: 20,
            bar_corner_radius: 3,
            arrow_curve: 5,
            padding: 18,
            view_mode: viewMode,
            date_format: 'YYYY-MM-DD',
            custom_popup_html: function (task: any) {
                return `
                    <div class="details-container" style="padding: 10px; border-radius: 8px; font-family: sans-serif; min-width: 150px;">
                        <h5 style="margin: 0 0 5px 0; font-size: 14px;">${task.name}</h5>
                        <p style="margin: 0; font-size: 12px; color: #555;">Tiến độ: ${task.progress}%</p>
                    </div>
                `;
            },
            on_click: (task: any) => onTaskClick?.(task),
            on_date_change: (task: any, start: any, end: any) => {
                // frappe-gantt passes moment or custom date objects depending on version. We format to string.
                const startStr = typeof start === 'object' ? start.toISOString() : start;
                const endStr = typeof end === 'object' ? end.toISOString() : end;
                onDateChange?.(task, startStr, endStr);
            },
            on_progress_change: (task: any, progress: number) => onProgressChange?.(task, progress)
        };

        try {
            ganttInstance.current = new Gantt(containerRef.current, tasks, options);
        } catch (e) {
            console.error("Frappe Gantt Error:", e);
        }

        return () => {
            // Unmount safety
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [tasks, viewMode]);

    if (tasks.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Không có công việc nào để hiển thị trên biểu đồ Gantt.
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div ref={containerRef} style={{ width: '100%', minHeight: '300px' }}></div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .gantt .bar-wrapper { cursor: pointer; }
                .gantt .bar-progress { fill: var(--primary) !important; }
                .gantt .bar { fill: #f1f5f9; stroke: #cbd5e1; stroke-width: 1; }
                .gantt .grid-header { fill: #f8fafc; }
                .gantt .grid-row { stroke: #f1f5f9; }
                .gantt .tick line { stroke: #e2e8f0; }
                .gantt .tick text { fill: #64748b; font-size: 11px; }
            `}} />
        </div>
    );
}
