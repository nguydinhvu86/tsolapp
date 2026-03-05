"use client";

import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DashboardCalendarProps {
    tasks?: any[];
    quotes?: any[];
    invoices?: any[];
    onDateClick: (date: Date, dayTasks: any[], dayQuotes: any[], dayInvoices: any[]) => void;
}

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ tasks = [], quotes = [], invoices = [], onDateClick }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const renderHeader = () => {
        return (
            <div className="cal-header">
                <h3 className="cal-title">
                    <CalendarIcon className="cal-icon" />
                    Lịch Biểu Kế Hoạch - {format(currentMonth, 'MMMM yyyy', { locale: vi })}
                </h3>
                <div className="cal-nav">
                    <button onClick={prevMonth} className="cal-btn" title="Tháng trước">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextMonth} className="cal-btn" title="Tháng sau">
                        <ChevronRight size={20} />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="cal-btn-text"
                    >
                        Hôm nay
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const dateFormat = "eeee";
        let startDate = startOfWeek(currentMonth, { weekStartsOn: 1 }); // Monday

        for (let i = 0; i < 7; i++) {
            days.push(
                <div className="cal-day-name" key={i}>
                    {format(addDays(startDate, i), dateFormat, { locale: vi }).substring(0, 4)}
                </div>
            );
        }

        return <div className="cal-days-grid">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;

                // Check for items on this day
                const dayTasks = tasks.filter(task => {
                    if (!task.dueDate) return false;
                    return isSameDay(new Date(task.dueDate), cloneDay);
                });

                const dayQuotes = quotes.filter(quote => {
                    if (!quote.createdAt) return false;
                    return isSameDay(new Date(quote.createdAt), cloneDay);
                });

                const dayInvoices = invoices.filter(invoice => {
                    if (!invoice.dueDate) return false;
                    return isSameDay(new Date(invoice.dueDate), cloneDay);
                });

                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());

                let cellClass = "cal-cell";
                if (!isCurrentMonth) cellClass += " cal-cell-inactive";
                if (isToday) cellClass += " cal-cell-today";

                const totalItems = dayTasks.length + dayQuotes.length + dayInvoices.length;

                days.push(
                    <div
                        className={cellClass}
                        key={day.toString()}
                        onClick={() => onDateClick(cloneDay, dayTasks, dayQuotes, dayInvoices)}
                    >
                        <div className="cal-cell-header">
                            <span className={isToday ? "cal-date cal-date-today" : "cal-date"}>
                                {formattedDate}
                            </span>
                            {totalItems > 0 && (
                                <span className="cal-task-count-mobile">
                                    {totalItems}
                                </span>
                            )}
                        </div>

                        {/* Task Indicators */}
                        <div className="cal-task-list custom-scrollbar">
                            {dayInvoices.slice(0, 2).map(inv => (
                                <div key={`inv-${inv.id}`} className="cal-task-item cal-item-orange">
                                    HĐ: {inv.code}
                                </div>
                            ))}
                            {dayQuotes.slice(0, 2).map(quo => (
                                <div key={`quo-${quo.id}`} className="cal-task-item cal-item-green">
                                    BG: {quo.title}
                                </div>
                            ))}
                            {dayTasks.slice(0, 3).map(task => (
                                <div key={`tsk-${task.id}`} className="cal-task-item cal-item-indigo">
                                    {task.title}
                                </div>
                            ))}
                            {totalItems > 4 && (
                                <div className="cal-task-more">
                                    +{totalItems - 4} mục khác
                                </div>
                            )}
                        </div>

                        {/* Mobile dot indicators */}
                        <div className="cal-dot-list">
                            {dayInvoices.slice(0, 2).map((_, idx) => (
                                <div key={`dot-inv-${idx}`} className="cal-dot cal-dot-orange"></div>
                            ))}
                            {dayQuotes.slice(0, 2).map((_, idx) => (
                                <div key={`dot-quo-${idx}`} className="cal-dot cal-dot-green"></div>
                            ))}
                            {dayTasks.slice(0, 3).map((_, idx) => (
                                <div key={`dot-tsk-${idx}`} className="cal-dot cal-dot-indigo"></div>
                            ))}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="cal-grid" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="cal-body">{rows}</div>;
    };

    return (
        <div className="cal-container">
            <style>{`
                .cal-container { background: #fff; padding: 1.5rem; width: 100%; height: 100%; display: flex; flex-direction: column; }
                .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .cal-title { font-size: 1.125rem; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; margin: 0; }
                .cal-icon { width: 1.25rem; height: 1.25rem; color: #4f46e5; }
                .cal-nav { display: flex; align-items: center; gap: 0.5rem; }
                .cal-btn { background: none; border: none; padding: 0.25rem; border-radius: 0.375rem; cursor: pointer; color: #4b5563; display: flex; align-items: center; justify-content: center; }
                .cal-btn:hover { background: #f3f4f6; }
                .cal-btn-text { background: none; border: none; font-size: 0.875rem; font-weight: 500; color: #4f46e5; padding: 0.25rem 0.5rem; border-radius: 0.375rem; cursor: pointer; margin-left: 0.5rem; }
                .cal-btn-text:hover { background: #eef2ff; color: #3730a3; }

                .cal-days-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border-bottom: 1px solid #f3f4f6; margin-bottom: 0.5rem; }
                .cal-day-name { text-align: center; font-weight: 500; font-size: 0.75rem; color: #6b7280; padding: 0.5rem 0; text-transform: uppercase; letter-spacing: 0.05em; }

                .cal-body { border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden; }
                .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }

                .cal-cell { min-height: 100px; padding: 0.5rem; border: 1px solid #f3f4f6; background: #fff; cursor: pointer; display: flex; flex-direction: column; transition: background-color 0.2s; }
                .cal-cell:hover { background-color: #f5f3ff; }
                .cal-cell-inactive { color: #d1d5db; background-color: #fafafa; }
                .cal-cell-today { box-shadow: inset 0 0 0 1px #8b5cf6; background-color: #faf5ff; }

                .cal-cell-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem; }
                .cal-date { font-size: 0.875rem; font-weight: 500; width: 1.5rem; height: 1.5rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
                .cal-date-today { background-color: #4f46e5; color: #fff; }

                .cal-task-count-mobile { display: none; }

                .cal-task-list { flex: 1; overflow-y: auto; margin-top: 0.25rem; padding-right: 0.25rem; }
                .cal-task-item { font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-weight: 500; margin-bottom: 0.25rem; border: 1px solid transparent; }

                .cal-item-indigo { background-color: #eef2ff; color: #4338ca; border-color: #e0e7ff; }
                .cal-item-orange { background-color: #fff7ed; color: #c2410c; border-color: #ffedd5; }
                .cal-item-green { background-color: #f0fdf4; color: #15803d; border-color: #dcfce7; }

                .cal-task-more { font-size: 0.625rem; color: #6b7280; font-weight: 500; padding-left: 0.25rem; }

                .cal-dot-list { display: none; }

                .cal-footer { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #f3f4f6; font-size: 0.75rem; color: #6b7280; display: flex; align-items: center; justify-content: space-between; }
                .cal-legend { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
                .cal-legend-item { display: flex; align-items: center; gap: 0.375rem; }
                .cal-legend-box { width: 0.5rem; height: 0.5rem; border-radius: 0.125rem; border: 1px solid transparent; }

                .cal-box-indigo { background-color: #eef2ff; border-color: #c7d2fe; }
                .cal-box-orange { background-color: #fff7ed; border-color: #fed7aa; }
                .cal-box-green { background-color: #f0fdf4; border-color: #bbf7d0; }

                @media (max-width: 640px) {
                    .cal-cell { min-height: 80px; padding: 0.375rem; }
                    .cal-task-list { display: none; }
                    .cal-task-count-mobile { display: block; font-size: 0.625rem; font-weight: 700; color: #4f46e5; background-color: #e0e7ff; padding: 0.125rem 0.375rem; border-radius: 9999px; }
                    .cal-dot-list { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem; }
                    .cal-dot { width: 0.375rem; height: 0.375rem; border-radius: 50%; }
                    .cal-dot-indigo { background-color: #6366f1; }
                    .cal-dot-orange { background-color: #f97316; }
                    .cal-dot-green { background-color: #22c55e; }
                    .cal-footer { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
                }
            `}</style>
            {renderHeader()}
            <div style={{ flex: 1 }}>
                {renderDays()}
                {renderCells()}
            </div>
            <div className="cal-footer">
                <div>Mẹo: Trỏ vào từng ngày để xem chi tiết / thêm kế hoạch.</div>
                <div className="cal-legend">
                    <div className="cal-legend-item">
                        <span className="cal-legend-box cal-box-indigo"></span>
                        <span>Công việc</span>
                    </div>
                    <div className="cal-legend-item">
                        <span className="cal-legend-box cal-box-green"></span>
                        <span>Báo giá</span>
                    </div>
                    <div className="cal-legend-item">
                        <span className="cal-legend-box cal-box-orange"></span>
                        <span>Hóa đơn</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
