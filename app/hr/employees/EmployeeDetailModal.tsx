'use client';

import React, { useState } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { updateEmployeeProfile, createLaborContract } from './actions';
import { Save, FileText, UserPlus, CreditCard, CalendarDays, UploadCloud, Briefcase, Wallet } from 'lucide-react';

export default function EmployeeDetailModal({ employee, isOpen, onClose, onUpdated }: any) {
    const [tab, setTab] = useState<'PROFILE' | 'CONTRACTS'>('PROFILE');
    const [loading, setLoading] = useState(false);

    // Profile Form
    const [profile, setProfile] = useState({
        identityNumber: employee.employeeProfile?.identityNumber || '',
        taxCode: employee.employeeProfile?.taxCode || '',
        bankAccount: employee.employeeProfile?.bankAccount || '',
        bankName: employee.employeeProfile?.bankName || '',
        dob: employee.employeeProfile?.dob ? new Date(employee.employeeProfile.dob).toISOString().split('T')[0] : '',
        gender: employee.employeeProfile?.gender || 'MALE',
        address: employee.employeeProfile?.address || '',
        phoneNumber: employee.employeeProfile?.phoneNumber || '',
        department: employee.employeeProfile?.department || employee.department || '',
        position: employee.employeeProfile?.position || '',
        startDate: employee.employeeProfile?.startDate ? new Date(employee.employeeProfile.startDate).toISOString().split('T')[0] : '',
        baseSalary: employee.employeeProfile?.baseSalary || 0
    });

    // Contract Form
    const [showAddContract, setShowAddContract] = useState(false);
    const [contract, setContract] = useState({
        contractNumber: '',
        type: 'PROBATION',
        startDate: '',
        endDate: '',
        fileUrl: ''
    });

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await updateEmployeeProfile(employee.id, {
            ...profile,
            baseSalary: parseFloat(profile.baseSalary.toString() || '0')
        });
        setLoading(false);
        if (res.success) {
            alert('Đã cập nhật hồ sơ thành công!');
            onUpdated({ ...employee, employeeProfile: res.data, department: res.data.department });
        } else {
            alert('Lỗi: ' + res.error);
        }
    };

    const handleAddContract = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createLaborContract(employee.id, contract);
        setLoading(false);
        if (res.success) {
            alert('Đã thêm hợp đồng!');
            setShowAddContract(false);
            const currentContracts = employee.laborContracts || [];
            onUpdated({ ...employee, laborContracts: [...currentContracts, res.data] });
        } else {
            alert('Lỗi: ' + res.error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Hồ sơ Nhân sự: ${employee.name}`} maxWidth="max-w-4xl">
            <div className="flex border-b border-gray-200">
                <button 
                    className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${tab === 'PROFILE' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setTab('PROFILE')}
                >
                    <UserPlus size={16}/> Sơ yếu lý lịch
                </button>
                <button 
                    className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${tab === 'CONTRACTS' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setTab('CONTRACTS')}
                >
                    <FileText size={16}/> Hợp đồng lao động
                </button>
            </div>

            <div className="p-4 bg-gray-50 min-h-[400px]">
                {tab === 'PROFILE' && (
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded shadow-sm border border-gray-100">
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700 flex items-center gap-2 border-b pb-2"><UserPlus size={16}/> Thông tin Cơ bản</h4>
                                <Input label="CMND / CCCD" value={profile.identityNumber} onChange={e => setProfile({...profile, identityNumber: e.target.value})} />
                                <Input label="Mã số thuế" value={profile.taxCode} onChange={e => setProfile({...profile, taxCode: e.target.value})} />
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Ngày sinh</label>
                                    <input type="date" className="w-full border p-2 rounded" value={profile.dob} onChange={e => setProfile({...profile, dob: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Giới tính</label>
                                    <select className="w-full border p-2 rounded" value={profile.gender} onChange={e => setProfile({...profile, gender: e.target.value})}>
                                        <option value="MALE">Nam</option>
                                        <option value="FEMALE">Nữ</option>
                                        <option value="OTHER">Khác</option>
                                    </select>
                                </div>
                                <Input label="Địa chỉ" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} />
                                <Input label="Điện thoại di động" value={profile.phoneNumber} onChange={e => setProfile({...profile, phoneNumber: e.target.value})} />
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700 flex items-center gap-2 border-b pb-2"><Briefcase size={16}/> Công việc & Lương</h4>
                                <Input label="Phòng ban" value={profile.department} onChange={e => setProfile({...profile, department: e.target.value})} />
                                <Input label="Chức vụ" value={profile.position} onChange={e => setProfile({...profile, position: e.target.value})} />
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Ngày vào làm</label>
                                    <input type="date" className="w-full border p-2 rounded" value={profile.startDate} onChange={e => setProfile({...profile, startDate: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><CreditCard size={14}/> Lương cơ bản (Biên chế)</label>
                                    <input type="number" className="w-full border p-2 rounded bg-emerald-50 text-emerald-800 font-bold" value={profile.baseSalary} onChange={e => setProfile({...profile, baseSalary: parseFloat(e.target.value) || 0})} />
                                    <p className="text-xs text-slate-500 italic">Áp dụng mặc định để tính Payroll hàng tháng</p>
                                </div>
                                
                                <h4 className="font-semibold text-gray-700 mt-6 pt-4 flex items-center gap-2 border-t"><Wallet size={16}/> Thanh toán</h4>
                                <Input label="Số tài khoản Ngân hàng" value={profile.bankAccount} onChange={e => setProfile({...profile, bankAccount: e.target.value})} />
                                <Input label="Tên Ngân hàng / Chi nhánh" value={profile.bankName} onChange={e => setProfile({...profile, bankName: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <Button type="submit" disabled={loading} className="flex items-center gap-2">
                                <Save size={16} /> Lưu Thông Tin
                            </Button>
                        </div>
                    </form>
                )}

                {tab === 'CONTRACTS' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm">
                            <h3 className="font-bold text-slate-800">Danh sách Hợp đồng</h3>
                            <Button onClick={() => setShowAddContract(!showAddContract)}>+ Thêm Hợp đồng</Button>
                        </div>

                        {showAddContract && (
                            <form onSubmit={handleAddContract} className="bg-indigo-50 border border-indigo-100 p-4 rounded space-y-4 shadow-sm">
                                <h4 className="font-bold text-indigo-800">Soạn hợp đồng mới</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input required label="Số hợp đồng" value={contract.contractNumber} onChange={e => setContract({...contract, contractNumber: e.target.value})} />
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Loại Hợp đồng</label>
                                        <select className="w-full border p-2 rounded" value={contract.type} onChange={e => setContract({...contract, type: e.target.value})}>
                                            <option value="PROBATION">Thử việc</option>
                                            <option value="FULL_TIME">Chính thức (Có thời hạn)</option>
                                            <option value="PART_TIME">Bán thời gian</option>
                                            <option value="INDEFINITE">Vô thời hạn</option>
                                            <option value="TEMPORARY">Thời vụ / Khoán</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Ngày Bắt đầu</label>
                                        <input required type="date" className="w-full border p-2 rounded" value={contract.startDate} onChange={e => setContract({...contract, startDate: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Ngày Kết thúc</label>
                                        <input type="date" className="w-full border p-2 rounded" value={contract.endDate} onChange={e => setContract({...contract, endDate: e.target.value})} />
                                    </div>
                                </div>
                                <Input label="Đường dẫn File scan (URL, Drive PDF...)" value={contract.fileUrl} onChange={e => setContract({...contract, fileUrl: e.target.value})} />
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={loading} className="w-full max-w-xs">Tạo Hợp đồng</Button>
                                    <Button type="button" onClick={() => setShowAddContract(false)} className="w-full max-w-xs bg-gray-200 text-gray-800 hover:bg-gray-300">Hủy</Button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-2">
                            {employee.laborContracts && employee.laborContracts.length > 0 ? (
                                employee.laborContracts.map((c: any) => (
                                    <div key={c.id} className="bg-white p-4 rounded border-l-4 border-emerald-500 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800">{c.contractNumber} <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{c.type}</span></h4>
                                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                                <CalendarDays size={14}/> 
                                                {new Date(c.startDate).toLocaleDateString('vi-VN')} 
                                                {c.endDate ? ` - ${new Date(c.endDate).toLocaleDateString('vi-VN')}` : ' - Vô thời hạn'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {c.fileUrl && (
                                                <a href={c.fileUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded hover:bg-slate-200 flex items-center gap-1">
                                                    <UploadCloud size={14} /> Xem File HĐ
                                                </a>
                                            )}
                                            <div className="px-3 py-1 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded text-sm font-bold">ACTIVE</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-500 py-10 bg-white border border-dashed rounded">
                                    Chưa có hợp đồng nào
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
