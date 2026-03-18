"use client";

import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, addYears, subYears, addWeeks, subWeeks, subDays } from 'date-fns';
import { vi, enUS, zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/app/i18n/LanguageContext';

interface DashboardCalendarProps {
    tasks?: any[];
    quotes?: any[];
    invoices?: any[];
    onDateClick: (date: Date, dayTasks: any[], dayQuotes: any[], dayInvoices: any[]) => void;
}

type ViewMode = 'day' | 'week' | 'month' | 'year';

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ tasks = [], quotes = [], invoices = [], onDateClick }) => {
    const { t, locale } = useTranslation();
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDateLocale = () => {
        if (locale === 'en') return enUS;
        if (locale === 'zh') return zhCN;
        return vi;
    };

    const nextPeriod = () => {
        if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
        else if (viewMode === 'year') setCurrentDate(addYears(currentDate, 1));
    };

    const prevPeriod = () => {
        if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
        else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
        else if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
        else if (viewMode === 'year') setCurrentDate(subYears(currentDate, 1));
    };

    const getItemsForDay = (day: Date) => {
        const dayTasks = tasks.filter(task => {
            if (!task.dueDate) return false;
            return isSameDay(new Date(task.dueDate), day);
        });

        const dayQuotes = quotes.filter(quote => {
            const checkDate = quote.validUntil || quote.date || quote.createdAt;
            if (!checkDate) return false;
            return isSameDay(new Date(checkDate), day);
        });

        const dayInvoices = invoices.filter(invoice => {
            const checkDate = invoice.dueDate || invoice.date || invoice.createdAt;
            if (!checkDate) return false;
            return isSameDay(new Date(checkDate), day);
        });

        return { dayTasks, dayQuotes, dayInvoices, total: dayTasks.length + dayQuotes.length + dayInvoices.length };
    };

    const renderHeader = () => {
        const getTitle = () => {
            if (viewMode === 'year') return `${t("dashboard.calendar.titleYear")} ${format(currentDate, 'yyyy')}`;
            if (viewMode === 'month') return `${t("dashboard.calendar.titleMonth")} ${format(currentDate, 'MM yyyy')}`;
            if (viewMode === 'week') return `${t("dashboard.calendar.titleWeek")} ${format(currentDate, 'ww')} ${t("dashboard.calendar.viewYear").toLowerCase()} ${format(currentDate, 'yyyy')}`;
            return `${t("dashboard.calendar.titleDay")} ${format(currentDate, 'dd/MM/yyyy')}`;
        };

        return (
            <div className="cal-header">
                <h3 className="cal-title xl:text-lg">
                    <CalendarIcon className="cal-icon" />
                    {getTitle()}
                </h3>

                <div className="cal-view-modes hidden sm:flex">
                    <button className={`cal-view-btn ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>{t("dashboard.calendar.viewDay")}</button>
                    <button className={`cal-view-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>{t("dashboard.calendar.viewWeek")}</button>
                    <button className={`cal-view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>{t("dashboard.calendar.viewMonth")}</button>
                    <button className={`cal-view-btn ${viewMode === 'year' ? 'active' : ''}`} onClick={() => setViewMode('year')}>{t("dashboard.calendar.viewYear")}</button>
                </div>

                <div className="cal-nav">
                    <button onClick={prevPeriod} className="cal-btn" title="Trước">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextPeriod} className="cal-btn" title="Sau">
                        <ChevronRight size={20} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="cal-btn-text"
                    >
                        {t("dashboard.calendar.today")}
                    </button>
                    {/* Mobile select */}
                    <select
                        className="cal-view-select sm:hidden ml-2"
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as ViewMode)}
                    >
                        <option value="day">{t("dashboard.calendar.viewDay")}</option>
                        <option value="week">{t("dashboard.calendar.viewWeek")}</option>
                        <option value="month">{t("dashboard.calendar.viewMonth")}</option>
                        <option value="year">{t("dashboard.calendar.viewYear")}</option>
                    </select>
                </div>
            </div>
        );
    };

    const renderDaysHeader = () => {
        if (viewMode === 'year' || viewMode === 'day') return null;

        const dayNames = [t("dashboard.calendar.days.0"), t("dashboard.calendar.days.1"), t("dashboard.calendar.days.2"), t("dashboard.calendar.days.3"), t("dashboard.calendar.days.4"), t("dashboard.calendar.days.5"), t("dashboard.calendar.days.6")];
        const days = [];
        for (let i = 0; i < 7; i++) {
            days.push(
                <div className="cal-day-name" key={i}>
                    {dayNames[i]}
                </div>
            );
        }

        return <div className="cal-days-grid">{days}</div>;
    };

    const renderCell = (day: Date, isCurrentMonth: boolean, stretch: boolean = false) => {
        const { dayTasks, dayQuotes, dayInvoices, total } = getItemsForDay(day);
        const isToday = isSameDay(day, new Date());

        let cellClass = `cal-cell ${stretch ? 'cal-cell-stretch' : ''}`;
        if (!isCurrentMonth) cellClass += " cal-cell-inactive";
        if (isToday) cellClass += " cal-cell-today";

        return (
            <div
                className={cellClass}
                key={day.toString()}
                onClick={() => onDateClick(day, dayTasks, dayQuotes, dayInvoices)}
            >
                <div className="cal-cell-header">
                    <span className={isToday ? "cal-date cal-date-today" : "cal-date"}>
                        {format(day, 'd')}
                    </span>
                    {total > 0 && (
                        <span className="cal-task-count-mobile">
                            {total}
                        </span>
                    )}
                </div>

                <div className="cal-task-list custom-scrollbar">
                    {dayInvoices.slice(0, stretch ? 10 : 3).map(inv => (
                        <div key={`inv-${inv.id}`} className="cal-task-item cal-item-orange">
                            {t("dashboard.calendar.invoiceShort")} {inv.code}
                        </div>
                    ))}
                    {dayQuotes.slice(0, stretch ? 10 : 3).map(quo => (
                        <div key={`quo-${quo.id}`} className="cal-task-item cal-item-green">
                            {t("dashboard.calendar.quoteShort")} {quo.code}
                        </div>
                    ))}
                    {dayTasks.slice(0, stretch ? 10 : 3).map(task => (
                        <div key={`tsk-${task.id}`} className="cal-task-item cal-item-indigo">
                            {task.title}
                        </div>
                    ))}
                    {!stretch && total > 9 && (
                        <div className="cal-task-more">
                            +{total - 9} {t("dashboard.calendar.others")}
                        </div>
                    )}
                </div>

                {/* Mobile dot indicators */}
                <div className="cal-dot-list">
                    {dayInvoices.slice(0, 3).map((_, idx) => (
                        <div key={`dot-inv-${idx}`} className="cal-dot cal-dot-orange"></div>
                    ))}
                    {dayQuotes.slice(0, 3).map((_, idx) => (
                        <div key={`dot-quo-${idx}`} className="cal-dot cal-dot-green"></div>
                    ))}
                    {dayTasks.slice(0, 3).map((_, idx) => (
                        <div key={`dot-tsk-${idx}`} className="cal-dot cal-dot-indigo"></div>
                    ))}
                    {total > 9 && <div className="cal-dot cal-dot-more"></div>}
                </div>
            </div>
        );
    };

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                days.push(renderCell(day, isSameMonth(day, monthStart)));
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

    const renderWeekView = () => {
        const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });

        let days = [];
        for (let i = 0; i < 7; i++) {
            days.push(renderCell(addDays(startDate, i), true, true));
        }

        return (
            <div className="cal-body cal-week-body">
                <div className="cal-grid cal-grid-stretch">
                    {days}
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const { dayTasks, dayQuotes, dayInvoices, total } = getItemsForDay(currentDate);

        return (
            <div className="cal-body cal-day-body p-6">
                <h4 className="text-xl font-bold mb-6 text-gray-800 border-b pb-3 capitalize">
                    {format(currentDate, 'EEEE, dd MMMM yyyy', { locale: getDateLocale() })}
                </h4>

                {total === 0 ? (
                    <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                        <CheckCircle2 className="mx-auto h-16 w-16 text-gray-200 mb-4" />
                        <p className="text-xl font-medium text-gray-400">{t("dashboard.calendar.emptyEvents")}</p>
                        <p className="text-gray-400 mt-2">{t("dashboard.calendar.emptyEventsDesc")}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {dayInvoices.length > 0 && (
                            <div>
                                <h5 className="font-bold text-orange-600 mb-3 uppercase tracking-wider text-sm flex items-center gap-2">
                                    {t("dashboard.calendar.invoicesToday")} <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{dayInvoices.length}</span>
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {dayInvoices.map(inv => (
                                        <div key={inv.id} className="p-4 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer hover:shadow-md hover:border-orange-300 transition" onClick={() => onDateClick(currentDate, dayTasks, dayQuotes, dayInvoices)}>
                                            <div className="font-bold text-orange-900">{inv.code}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {dayQuotes.length > 0 && (
                            <div className="mt-2">
                                <h5 className="font-bold text-green-600 mb-3 uppercase tracking-wider text-sm flex items-center gap-2">
                                    {t("dashboard.calendar.quotesToday")} <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{dayQuotes.length}</span>
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {dayQuotes.map(quo => (
                                        <div key={quo.id} className="p-4 bg-green-50 border border-green-100 rounded-xl cursor-pointer hover:shadow-md hover:border-green-300 transition" onClick={() => onDateClick(currentDate, dayTasks, dayQuotes, dayInvoices)}>
                                            <div className="font-bold text-green-900">{quo.code}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {dayTasks.length > 0 && (
                            <div className="mt-2">
                                <h5 className="font-bold text-indigo-600 mb-3 uppercase tracking-wider text-sm flex items-center gap-2">
                                    {t("dashboard.calendar.tasksToday")} <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{dayTasks.length}</span>
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {dayTasks.map(task => (
                                        <div key={task.id} className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer hover:shadow-md hover:border-indigo-300 transition" onClick={() => onDateClick(currentDate, dayTasks, dayQuotes, dayInvoices)}>
                                            <div className="font-bold text-indigo-900 mb-1">{task.title}</div>
                                            <div className="text-sm text-indigo-700 opacity-80 line-clamp-2">{task.description || t("dashboard.calendar.noDescription")}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderYearView = () => {
        const months = [];
        for (let i = 0; i < 12; i++) {
            const tempDate = new Date(currentDate.getFullYear(), i, 1);

            // Tally counts per month
            const monthTasks = tasks.filter(task => task.dueDate && isSameMonth(new Date(task.dueDate), tempDate)).length;
            const monthQuotes = quotes.filter(quote => {
                const checkDate = quote.validUntil || quote.date || quote.createdAt;
                return checkDate && isSameMonth(new Date(checkDate), tempDate);
            }).length;
            const monthInvoices = invoices.filter(invoice => {
                const checkDate = invoice.dueDate || invoice.date || invoice.createdAt;
                return checkDate && isSameMonth(new Date(checkDate), tempDate);
            }).length;

            const total = monthTasks + monthQuotes + monthInvoices;

            months.push(
                <div
                    key={i}
                    className="cal-year-month p-6 bg-white border border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow transition-all rounded-2xl cursor-pointer flex flex-col items-center justify-center text-center h-40"
                    onClick={() => {
                        setCurrentDate(tempDate);
                        setViewMode('month');
                    }}
                >
                    <div className="text-lg font-bold text-gray-800 mb-3 uppercase tracking-wider">
                        {format(tempDate, 'MMMM', { locale: getDateLocale() })}
                    </div>
                    {total > 0 ? (
                        <div className="flex flex-col gap-1 items-center">
                            <span className="text-2xl font-black text-indigo-600">{total}</span>
                            <span className="text-xs font-semibold text-gray-500 uppercase">{t("dashboard.calendar.eventsTasks")}</span>
                        </div>
                    ) : (
                        <div className="text-sm font-medium text-gray-300">{t("dashboard.calendar.noData")}</div>
                    )}
                </div>
            );
        }

        return (
            <div className="cal-body border-0 bg-transparent shadow-none">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6">
                    {months}
                </div>
            </div>
        );
    };

    return (
        <div className="cal-container">
            <style>{`
                .cal-container { background: #fff; padding: 1.5rem; width: 100%; height: 100%; display: flex; flex-direction: column; }
                .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
                .cal-title { font-size: 1.125rem; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 0.5rem; margin: 0; min-width: 250px; }
                .cal-icon { width: 1.25rem; height: 1.25rem; color: #4f46e5; }
                .cal-nav { display: flex; align-items: center; gap: 0.5rem; }
                .cal-btn { background: none; border: none; padding: 0.25rem; border-radius: 0.375rem; cursor: pointer; color: #4b5563; display: flex; align-items: center; justify-content: center; }
                .cal-btn:hover { background: #f3f4f6; }
                .cal-btn-text { background: none; border: none; font-size: 0.875rem; font-weight: 500; color: #4f46e5; padding: 0.25rem 0.5rem; border-radius: 0.375rem; cursor: pointer; margin-left: 0.5rem; }
                .cal-btn-text:hover { background: #eef2ff; color: #3730a3; }
                
                .cal-view-modes { display: flex; background: #f1f5f9; padding: 4px; border-radius: 10px; border: 1px solid #e2e8f0; }
                .cal-view-btn { padding: 6px 16px; font-size: 0.875rem; font-weight: 500; color: #64748b; border-radius: 8px; transition: all 0.2s ease; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px; }
                .cal-view-btn:hover { color: #0f172a; background: rgba(255,255,255,0.5); }
                .cal-view-btn.active { background: #fff; color: #4f46e5; box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1); font-weight: 600; }
                .cal-view-select { background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; font-size: 0.875rem; color: #334155; font-weight: 500; outline: none; }

                .cal-days-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border-bottom: 2px solid #f1f5f9; margin-bottom: 0.5rem; }
                .cal-day-name { text-align: center; font-weight: 700; font-size: 0.75rem; color: #64748b; padding: 0.75rem 0; text-transform: uppercase; letter-spacing: 0.05em; }

                .cal-body { border: 1px solid #e2e8f0; border-radius: 0.75rem; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
                .cal-week-body { min-height: 500px; display: flex; flex-direction: column; }
                .cal-day-body { border: 1px solid #e2e8f0; border-radius: 0.75rem; background: #fff; width: 100%; min-height: 500px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
                
                .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); flex: 1; }
                .cal-grid-stretch { grid-template-rows: 1fr; }

                .cal-cell { min-height: 100px; padding: 0.5rem; border: 1px solid #f1f5f9; background: #fff; cursor: pointer; display: flex; flex-direction: column; transition: background-color 0.2s; }
                .cal-cell-stretch { min-height: auto; }
                .cal-cell:hover { background-color: #f8fafc; }
                .cal-cell-inactive { color: #d1d5db; background-color: #fafafa; }
                .cal-cell-inactive .cal-task-item { opacity: 0.5; filter: grayscale(1); }
                .cal-cell-inactive .cal-date { color: #cbd5e1; }
                .cal-cell-today { box-shadow: inset 0 0 0 1px #8b5cf6; background-color: #f5f3ff; }

                .cal-cell-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem; }
                .cal-date { font-size: 0.875rem; font-weight: 700; width: 1.5rem; height: 1.5rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #475569; transition: all 0.2s; }
                .cal-date-today { background-color: #4f46e5; color: #fff; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3); }

                .cal-task-count-mobile { display: none; }

                .cal-task-list { flex: 1; overflow-y: auto; margin-top: 0.25rem; padding-right: 0.25rem; display: flex; flex-direction: column; gap: 4px; }
                .cal-task-item { font-size: 0.725rem; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-weight: 600; border: 1px solid transparent; line-height: 1.3; word-break: break-word; transition: transform 0.1s; }
                .cal-task-item:hover { transform: translateY(-1px); }

                .cal-item-indigo { background-color: #eef2ff; color: #4338ca; border-color: #c7d2fe; }
                .cal-item-orange { background-color: #fff7ed; color: #c2410c; border-color: #fed7aa; }
                .cal-item-green { background-color: #f0fdf4; color: #15803d; border-color: #bbf7d0; }

                .cal-task-more { font-size: 0.65rem; color: #64748b; font-weight: 600; padding: 0.25rem; text-align: center; border-radius: 0.375rem; background: #f1f5f9; display: inline-block; margin-top: 2px; }

                .cal-dot-list { display: none; }

                .cal-footer { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
                .cal-legend { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
                .cal-legend-item { display: flex; align-items: center; gap: 0.5rem; font-weight: 500; color: #475569; }
                .cal-legend-box { width: 0.625rem; height: 0.625rem; border-radius: 0.125rem; border: 1px solid transparent; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05); }

                .cal-box-indigo { background-color: #eef2ff; border-color: #818cf8; }
                .cal-box-orange { background-color: #fff7ed; border-color: #fb923c; }
                .cal-box-green { background-color: #f0fdf4; border-color: #4ade80; }

                @media (max-width: 640px) {
                    .cal-cell { min-height: 70px; padding: 0.25rem; }
                    .cal-task-list { display: none; }
                    .cal-task-count-mobile { display: block; font-size: 0.65rem; font-weight: 700; color: #4f46e5; background-color: #e0e7ff; padding: 0.125rem 0.375rem; border-radius: 9999px; }
                    .cal-dot-list { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.375rem; justify-content: center; }
                    .cal-dot { width: 0.375rem; height: 0.375rem; border-radius: 50%; }
                    .cal-dot-more { background-color: #94a3b8; }
                    .cal-dot-indigo { background-color: #6366f1; }
                    .cal-dot-orange { background-color: #f97316; }
                    .cal-dot-green { background-color: #22c55e; }
                    .cal-footer { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
                    .cal-day-name { font-size: 0.65rem; padding: 0.5rem 0; }
                    .cal-nav { margin-left: auto; width: 100%; justify-content: space-between; margin-top: 0.5rem; }
                    .cal-view-select { flex-grow: 1; margin-left: 0; }
                }
            `}</style>
            {renderHeader()}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {renderDaysHeader()}
                {viewMode === 'month' && renderMonthView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'day' && renderDayView()}
                {viewMode === 'year' && renderYearView()}
            </div>

            {(viewMode === 'month' || viewMode === 'week') && (
                <div className="cal-footer">
                    <div>{t("dashboard.calendar.tip")}</div>
                    <div className="cal-legend">
                        <div className="cal-legend-item">
                            <span className="cal-legend-box cal-box-indigo"></span>
                            <span>{t("dashboard.calendar.legendTask")}</span>
                        </div>
                        <div className="cal-legend-item">
                            <span className="cal-legend-box cal-box-green"></span>
                            <span>{t("dashboard.calendar.legendQuote")}</span>
                        </div>
                        <div className="cal-legend-item">
                            <span className="cal-legend-box cal-box-orange"></span>
                            <span>{t("dashboard.calendar.legendInvoice")}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
