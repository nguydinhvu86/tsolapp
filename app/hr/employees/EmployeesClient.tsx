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
            <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-lg border border-slate-200">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo tên hoặc email..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select 
                        className="px-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400"
                        value={departmentFilter}
                        onChange={e => setDepartmentFilter(e.target.value)}
                    >
                        <option value="ALL">Tất cả phòng ban</option>
                        {departments.map((d: any) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredEmployees.map((emp) => (
                    <Card key={emp.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setSelectedEmployee(emp)}>
                        <div className="p-5 flex flex-col items-center text-center border-b border-slate-100 pt-6">
                            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-105 transition-transform">
                                <UserCircle size={32} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg">{emp.name || 'Chưa cập nhật'}</h3>
                            <p className="text-sm text-slate-500 mb-2">{emp.email}</p>
                            
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                {emp.department || 'Chưa phân ban'}
                            </span>
                        </div>
                        <div className="bg-slate-50 p-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <div className="flex flex-col gap-1 items-center justify-center p-2 rounded bg-white border border-slate-100">
                                <span className="text-slate-400"><Briefcase size={14}/></span>
                                <span className="font-semibold">{emp.laborContracts?.length || 0} HĐ</span>
                            </div>
                            <div className="flex flex-col gap-1 items-center justify-center p-2 rounded bg-white border border-slate-100">
                                <span className="text-slate-400"><Wallet size={14}/></span>
                                <span className="font-semibold text-emerald-600">
                                    {emp.employeeProfile?.baseSalary ? new Intl.NumberFormat('vi-VN').format(emp.employeeProfile.baseSalary) + 'đ' : 'Chưa nhập'}
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}

                {filteredEmployees.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500">
                        Không tìm thấy nhân sự phù hợp.
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
