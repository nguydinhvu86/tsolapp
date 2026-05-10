'use client';

import { Plus, Edit2, Trash2, ExternalLink, ArrowLeft, Save, Upload, Download } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateEcatalog } from '../actions';
import * as XLSX from 'xlsx';

export default function EcatalogDetailClient({
    initialEcatalog,
    currentUserId,
    isAdminOrManager
}: any) {
    const router = useRouter();
    const [ecatalog, setEcatalog] = useState(initialEcatalog);
    const [name, setName] = useState(ecatalog.name);
    const [description, setDescription] = useState(ecatalog.description || '');
    const [isPublic, setIsPublic] = useState(ecatalog.isPublic);
    const [items, setItems] = useState<any[]>(ecatalog.items);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        const res = await updateEcatalog(ecatalog.id, {
            name,
            description,
            isPublic,
            items: items.map(item => ({
                customSku: item.customSku || item.product?.sku || '',
                customName: item.customName || item.product?.name || '',
                customDesc: item.customDesc || item.product?.description || '',
                customPrice: item.customPrice || item.product?.salePrice || 0,
                imageUrl: item.imageUrl || item.product?.imageUrl || ''
            }))
        }, currentUserId);

        if (res.success) {
            alert("Đã lưu thay đổi");
            setEcatalog(res.data);
            router.refresh();
        } else {
            alert(res.error || "Lỗi lưu dữ liệu");
        }
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleAddManualProduct = () => {
        setItems([
            ...items, 
            {
                customSku: '',
                customName: 'Sản phẩm mới',
                customDesc: '',
                customPrice: 0,
                imageUrl: ''
            }
        ]);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                // Expecting Header in Row 1: SKU, Tên SP, Mô tả, Giá, Link ảnh
                if (data.length <= 1) {
                    alert("File Excel trống hoặc không đúng định dạng!");
                    return;
                }

                const newItems: any[] = [];
                // Start from row index 1 (skip header)
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length === 0 || !row[1]) continue; // skip empty or no name

                    newItems.push({
                        customSku: row[0] ? String(row[0]) : '',
                        customName: row[1] ? String(row[1]) : '',
                        customDesc: row[2] ? String(row[2]) : '',
                        customPrice: row[3] ? Number(row[3]) : 0,
                        imageUrl: row[4] ? String(row[4]) : ''
                    });
                }

                setItems([...items, ...newItems]);
                alert(`Đã nhập thành công ${newItems.length} sản phẩm từ file Excel! Đừng quên ấn Lưu thay đổi.`);
            } catch (error) {
                console.error(error);
                alert("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
            }
        };
        reader.readAsBinaryString(file);
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const downloadSampleExcel = () => {
        const headers = [['Mã SKU', 'Tên sản phẩm', 'Mô tả', 'Giá', 'Link hình ảnh (URL)']];
        const sampleData = [
            ['SW-01', 'Phần mềm ERP Pro', 'Giải pháp quản trị doanh nghiệp toàn diện', 15000000, 'https://example.com/erp.png'],
            ['SEC-02', 'Antivirus Security 2026', 'Phần mềm diệt virus bản quyền 1 năm', 350000, '']
        ];
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
        XLSX.utils.book_append_sheet(wb, ws, "DanhSachSP");
        XLSX.writeFile(wb, "Ecatalog_Sample_Import.xlsx");
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/ecatalogs')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{ecatalog.code} - {ecatalog.name}</h1>
                        <p className="text-sm text-gray-500">Người tạo: {ecatalog.creator.name} • Cập nhật: {new Date(ecatalog.updatedAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => window.open(`/public/ecatalog/${ecatalog.id}`, '_blank')}
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" /> Xem public
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm transition-colors"
                    >
                        <Save className="w-4 h-4" /> Lưu thay đổi
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Thông tin Catalog</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Catalog <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    rows={4}
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-700">Công khai (Public)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-gray-100 pb-4">
                            <h2 className="text-lg font-semibold text-gray-800">Danh sách Sản phẩm ({items.length})</h2>
                            
                            <div className="flex flex-wrap gap-2">
                                <input 
                                    type="file" 
                                    accept=".xlsx, .xls" 
                                    className="hidden" 
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                                <button 
                                    onClick={downloadSampleExcel}
                                    className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                >
                                    <Download className="w-4 h-4" /> File Mẫu
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                >
                                    <Upload className="w-4 h-4" /> Nhập Excel
                                </button>
                                <button 
                                    onClick={handleAddManualProduct}
                                    className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Thêm thủ công
                                </button>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {items.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    Chưa có sản phẩm nào. Bạn có thể thêm thủ công hoặc nhập từ file Excel.
                                </div>
                            ) : items.map((item, index) => (
                                <div key={index} className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all bg-white relative group">
                                    {/* Delete Button */}
                                    <button 
                                        onClick={() => handleRemoveItem(index)}
                                        className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 border border-gray-200 rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                                        title="Xóa sản phẩm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    {/* Image Preview */}
                                    <div className="w-24 h-24 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center overflow-hidden flex-shrink-0">
                                        {item.imageUrl || item.product?.imageUrl ? (
                                            <img src={item.imageUrl || item.product?.imageUrl} alt={item.customName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] text-gray-400 font-medium text-center px-2">No Image</span>
                                        )}
                                    </div>
                                    
                                    {/* Product Details Form */}
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-4">
                                        <div className="sm:col-span-8">
                                            <input 
                                                type="text"
                                                value={item.customName || ''}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[index].customName = e.target.value;
                                                    setItems(newItems);
                                                }}
                                                className="w-full font-bold text-gray-900 border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="Tên sản phẩm *"
                                            />
                                        </div>
                                        <div className="sm:col-span-4">
                                            <input 
                                                type="text"
                                                value={item.customSku || ''}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[index].customSku = e.target.value;
                                                    setItems(newItems);
                                                }}
                                                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="Mã SKU (tùy chọn)"
                                            />
                                        </div>
                                        <div className="sm:col-span-8">
                                            <textarea 
                                                value={item.customDesc || ''}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[index].customDesc = e.target.value;
                                                    setItems(newItems);
                                                }}
                                                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-600"
                                                placeholder="Mô tả sản phẩm (tùy chọn)"
                                                rows={2}
                                            />
                                        </div>
                                        <div className="sm:col-span-4 space-y-4">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">đ</span>
                                                <input 
                                                    type="number"
                                                    value={item.customPrice || 0}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[index].customPrice = Number(e.target.value);
                                                        setItems(newItems);
                                                    }}
                                                    className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-blue-600 font-bold"
                                                    placeholder="Giá tham khảo"
                                                />
                                            </div>
                                            <input 
                                                type="text"
                                                value={item.imageUrl || ''}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[index].imageUrl = e.target.value;
                                                    setItems(newItems);
                                                }}
                                                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="URL Hình ảnh (https://...)"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
