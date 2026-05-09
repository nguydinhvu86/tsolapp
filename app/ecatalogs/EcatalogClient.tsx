'use client';
import { Plus, Search, Edit2, Trash2, ExternalLink } from 'lucide-react';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { submitEcatalog, deleteEcatalog } from './actions';


export default function EcatalogClient({
    initialEcatalogs,
    products,
    users,
    currentUserId,
    isAdminOrManager
}: any) {
    const router = useRouter();
    const [ecatalogs, setEcatalogs] = useState(initialEcatalogs);
    const [search, setSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Create form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

    const filteredCatalogs = ecatalogs.filter((c: any) => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async () => {
        if (!name) {
            alert();
            return;
        }

        const res = await submitEcatalog(currentUserId, {
            name,
            description,
            items: selectedProducts.map(p => ({
                productId: p.id,
                customName: p.name,
                customPrice: p.salePrice,
                imageUrl: p.imageUrl || null
            }))
        });

        if (res.success) {
            alert();
            router.push(`/ecatalogs/${res.data.id}`);
        } else {
            alert();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa E-Catalog này?")) return;
        const res = await deleteEcatalog(id, currentUserId);
        if (res.success) {
            alert();
            setEcatalogs(ecatalogs.filter((c: any) => c.id !== id));
        } else {
            alert();
        }
    };

    const toggleProduct = (product: any) => {
        if (selectedProducts.find(p => p.id === product.id)) {
            setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
        } else {
            setSelectedProducts([...selectedProducts, product]);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-lg">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm catalog..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
                >
                    <Plus /> Tạo Catalog Mới
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Mã Catalog</th>
                            <th className="px-6 py-3 font-semibold">Tên Catalog</th>
                            <th className="px-6 py-3 font-semibold">Sản phẩm</th>
                            <th className="px-6 py-3 font-semibold">Trạng thái</th>
                            <th className="px-6 py-3 font-semibold">Ngày tạo</th>
                            <th className="px-6 py-3 font-semibold text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCatalogs.map((catalog: any) => (
                            <tr key={catalog.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    {catalog.code}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{catalog.name}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-xs">{catalog.description}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-100">
                                        {catalog._count?.items || 0} SP
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {catalog.isPublic ? (
                                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs border border-green-200 font-medium">Công khai</span>
                                    ) : (
                                        <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200 font-medium">Nội bộ</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    {new Date(catalog.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => window.open(`/public/ecatalog/${catalog.id}`, '_blank')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Xem Public">
                                            <ExternalLink />
                                        </button>
                                        <button onClick={() => router.push(`/ecatalogs/${catalog.id}`)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
                                            <Edit2 />
                                        </button>
                                        {(isAdminOrManager || catalog.creatorId === currentUserId) && (
                                            <button onClick={() => handleDelete(catalog.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                                                <Trash2 />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isCreateModalOpen && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4"><div className="p-4 border-b border-gray-100 flex justify-between items-center"><h2 className="text-lg font-bold">Tạo E-Catalog Mới</h2><button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button></div><div className="p-4">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên Catalog <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Vd: Bản quyền phần mềm 2026"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả (Tùy chọn)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chọn sản phẩm ({selectedProducts.length})</label>
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                            {products.map((p: any) => (
                                <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={!!selectedProducts.find(sp => sp.id === p.id)}
                                        onChange={() => toggleProduct(p)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{p.name} ({p.sku})</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Hủy</button>
                        <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium">Tạo Catalog</button>
                    </div>
                </div>
            </div></div></div>)}
        </div>
    );
}
