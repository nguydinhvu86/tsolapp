"use client";

import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DashboardCalendarProps {
    tasks: any[];
    onDateClick: (date: Date, dayTasks: any[]) => void;
}

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ tasks, onDateClick }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const renderHeader = () => {
        return (
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                    Lịch Biểu Kế Hoạch - {format(currentMonth, 'MMMM yyyy', { locale: vi })}
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1 rounded-md hover:bg-gray-100 transition-colors" title="Tháng trước">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button onClick={nextMonth} className="p-1 rounded-md hover:bg-gray-100 transition-colors" title="Tháng sau">
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="ml-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50"
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
                <div className="text-center font-medium text-xs text-gray-500 py-2 uppercase tracking-wider" key={i}>
                    {format(addDays(startDate, i), dateFormat, { locale: vi }).substring(0, 4)}
                </div>
            );
        }

        return <div className="grid grid-cols-7 mb-2 border-b border-gray-100">{days}</div>;
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

                // Check for tasks on this day
                const dayTasks = tasks.filter(task => {
                    if (!task.dueDate) return false;
                    return isSameDay(new Date(task.dueDate), cloneDay);
                });

                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());

                days.push(
                    <div
                        className={`min-h-[80px] sm:min-h-[100px] p-1.5 sm:p-2 border border-gray-100 bg-white transition-all cursor-pointer hover:bg-indigo-50/50 flex flex-col 
                            ${!isCurrentMonth ? "text-gray-300 bg-gray-50/30" : "text-gray-700"}
                            ${isToday ? "ring-1 ring-inset ring-indigo-500 bg-indigo-50/20" : ""}
                        `}
                        key={day.toString()}
                        onClick={() => onDateClick(cloneDay, dayTasks)}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm font-medium ${isToday ? "bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center" : "w-6 h-6 flex items-center justify-center"}`}>
                                {formattedDate}
                            </span>
                            {dayTasks.length > 0 && (
                                <span className="text-[10px] sm:hidden font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                                    {dayTasks.length}
                                </span>
                            )}
                        </div>

                        {/* Task Indicators */}
                        <div className="flex-1 overflow-y-auto mt-1 space-y-1 custom-scrollbar pr-1 hidden sm:block">
                            {dayTasks.slice(0, 3).map(task => (
                                <div key={task.id} className="text-xs truncate px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 font-medium shadow-sm border border-indigo-100">
                                    {task.title}
                                </div>
                            ))}
                            {dayTasks.length > 3 && (
                                <div className="text-[10px] text-gray-500 font-medium pl-1">
                                    +{dayTasks.length - 3} công việc
                                </div>
                            )}
                        </div>

                        {/* Mobile dot indicators */}
                        <div className="flex gap-1 mt-1 sm:hidden flex-wrap">
                            {dayTasks.slice(0, 5).map((_, idx) => (
                                <div key={idx} className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            ))}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="overflow-hidden rounded-lg border border-gray-200">{rows}</div>;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 w-full h-full flex flex-col">
            {renderHeader()}
            <div className="flex-1">
                {renderDays()}
                {renderCells()}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                <div>Mẹo: Trỏ vào từng ngày để xem công việc / thêm kế hoạch.</div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm bg-indigo-100 border border-indigo-200"></span>
                    <span>Có công việc</span>
                </div>
            </div>
        </div>
    );
};
