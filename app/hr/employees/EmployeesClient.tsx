// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Search, UserCircle, Briefcase, DollarSign, Wallet } from 'lucide-react';
import EmployeeDetailModal from './EmployeeDetailModal';

export default function EmployeesClient({ initialData }: { initialData: any[] }) {
    const [employees, setEmployees] = useState(initialData);
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('ALL');
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              emp.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = departmentFilter === 'ALL' || emp.department === departmentFilter;
        return matchesSearch && matchesDept;
    });

    const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50"></span>
                        Hồ Sơ Nhân Sự
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Quản lý căn cước công dân, mức lương cơ bản và hợp đồng lao động ({filteredEmployees.length} nhân sự)
                    </p>
                </div>
            </div>

            {/* Filter Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo họ tên hoặc email..." 
                        className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select 
                        className="px-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium"
                        value={departmentFilter}
                        onChange={e => setDepartmentFilter(e.target.value)}
                    >
                        <option value="ALL">Tất cả phòng ban</option>
                        {departments.map((d: any) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredEmployees.map((emp) => (
                    <div 
                        key={emp.id} 
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group overflow-hidden flex flex-col justify-between"
                        onClick={() => setSelectedEmployee(emp)}
                    >
                        <div className="p-5 flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-105 transition-transform">
                                <UserCircle size={28} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm tracking-tight">{emp.name || 'Chưa cập nhật'}</h3>
                            <p className="text-xs text-slate-500 mb-2.5 font-medium truncate max-w-[200px]">{emp.email}</p>
                            
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                                {emp.department || 'Chưa phân ban'}
                            </span>
                        </div>
                        <div className="bg-slate-50/70 p-3.5 grid grid-cols-2 gap-2 text-xs border-t border-slate-100">
                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-200/60">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Hợp đồng</span>
                                <span className="font-bold text-slate-800 mt-0.5 font-mono">{emp.laborContracts?.length || 0} HĐ</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-200/60">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Lương cơ bản</span>
                                <span className="font-bold text-emerald-600 mt-0.5 font-mono text-[11px] truncate max-w-[90px]">
                                    {emp.employeeProfile?.baseSalary ? new Intl.NumberFormat('vi-VN').format(emp.employeeProfile.baseSalary) + 'đ' : 'Chưa nhập'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredEmployees.length === 0 && (
                    <div className="col-span-full py-16 text-center text-xs font-medium text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                        Không tìm thấy nhân sự nào phù hợp với từ khóa tìm kiếm.
                    </div>
                )}
            </div>

            {selectedEmployee && (
                <EmployeeDetailModal 
                    employee={selectedEmployee} 
                    isOpen={!!selectedEmployee} 
                    onClose={() => setSelectedEmployee(null)} 
                    onUpdated={(updatedEmp) => {
                        setEmployees(employees.map(e => e.id === updatedEmp.id ? updatedEmp : e));
                        setSelectedEmployee(updatedEmp);
                    }}
                />
            )}
        </div>
    );
}
