'use client';
import { Plus, Search, Edit2, Trash2, ExternalLink, ArrowLeft, Save, Eye } from 'lucide-react';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { updateEcatalog } from '../actions';


export default function EcatalogDetailClient({
    initialEcatalog,
    products,
    currentUserId,
    isAdminOrManager
}: any) {
    const router = useRouter();
    const [ecatalog, setEcatalog] = useState(initialEcatalog);
    const [name, setName] = useState(ecatalog.name);
    const [description, setDescription] = useState(ecatalog.description || '');
    const [isPublic, setIsPublic] = useState(ecatalog.isPublic);
    const [items, setItems] = useState<any[]>(ecatalog.items);
    
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

    const handleSave = async () => {
        const res = await updateEcatalog(ecatalog.id, {
            name,
            description,
            isPublic,
            items: items.map(item => ({
                productId: item.productId || item.product?.id,
                customName: item.customName || item.product?.name,
                customPrice: item.customPrice || item.product?.salePrice,
                imageUrl: item.imageUrl || item.product?.imageUrl
            }))
        }, currentUserId);

        if (res.success) {
            alert();
            setEcatalog(res.data);
            router.refresh();
        } else {
            alert();
        }
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleAddSelectedProducts = () => {
        const newItems = selectedProducts.map(p => ({
            productId: p.id,
            product: p,
            customName: p.name,
            customPrice: p.salePrice,
            imageUrl: p.imageUrl
        }));
        setItems([...items, ...newItems]);
        setSelectedProducts([]);
        setIsAddProductModalOpen(false);
    };

    const toggleProductSelect = (product: any) => {
        if (selectedProducts.find(p => p.id === product.id)) {
            setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
        } else {
            setSelectedProducts([...selectedProducts, product]);
        }
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
                        <ExternalLink /> Xem public
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm transition-colors"
                    >
                        <Save /> Lưu thay đổi
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
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

                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-800">Danh sách Sản phẩm ({items.length})</h2>
                            <button 
                                onClick={() => setIsAddProductModalOpen(true)}
                                className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                            >
                                <Plus /> Thêm sản phẩm
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {items.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    Chưa có sản phẩm nào trong Catalog này.
                                </div>
                            ) : items.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:border-blue-200 hover:shadow-sm transition-all bg-gray-50/50 group">
                                    <div className="w-12 h-12 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {item.imageUrl || item.product?.imageUrl ? (
                                            <img src={item.imageUrl || item.product?.imageUrl} alt={item.customName || item.product?.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs text-gray-400">No Img</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <input 
                                            type="text"
                                            value={item.customName || item.product?.name || ''}
                                            onChange={(e) => {
                                                const newItems = [...items];
                                                newItems[index].customName = e.target.value;
                                                setItems(newItems);
                                            }}
                                            className="font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none w-full truncate"
                                            placeholder="Tên sản phẩm"
                                        />
                                        <div className="flex items-center gap-4 mt-1">
                                            <div className="text-sm text-gray-500">{item.product?.sku}</div>
                                            <div className="flex items-center gap-1 text-sm">
                                                <span className="text-gray-500">Giá:</span>
                                                <input 
                                                    type="number"
                                                    value={item.customPrice || item.product?.salePrice || 0}
                                                    onChange={(e) => {
                                                        const newItems = [...items];
                                                        newItems[index].customPrice = Number(e.target.value);
                                                        setItems(newItems);
                                                    }}
                                                    className="w-24 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none text-blue-600 font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveItem(index)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isAddProductModalOpen && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4"><div className="p-4 border-b border-gray-100 flex justify-between items-center"><h2 className="text-lg font-bold">Thêm Sản Phẩm Vào Catalog</h2><button onClick={() => setIsAddProductModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button></div><div className="p-4">
                <div className="space-y-4">
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                        {products.map((p: any) => {
                            const isSelected = !!selectedProducts.find(sp => sp.id === p.id);
                            const isAlreadyInCatalog = !!items.find(i => i.productId === p.id);
                            
                            return (
                                <label key={p.id} className={`flex items-center gap-3 p-3 rounded cursor-pointer ${isAlreadyInCatalog ? 'opacity-50 bg-gray-50' : 'hover:bg-blue-50'}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={isSelected || isAlreadyInCatalog}
                                        disabled={isAlreadyInCatalog}
                                        onChange={() => toggleProductSelect(p)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">{p.name} <span className="text-gray-500 font-normal">({p.sku})</span></div>
                                        <div className="text-xs text-blue-600 font-medium mt-0.5">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.salePrice)}</div>
                                    </div>
                                    {isAlreadyInCatalog && <span className="text-xs text-gray-500 font-medium bg-gray-200 px-2 py-1 rounded">Đã thêm</span>}
                                </label>
                            );
                        })}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button onClick={() => setIsAddProductModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Hủy</button>
                        <button onClick={handleAddSelectedProducts} disabled={selectedProducts.length === 0} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 rounded-lg font-medium transition-colors">
                            Thêm {selectedProducts.length > 0 ? `(${selectedProducts.length})` : ''}
                        </button>
                    </div>
                </div>
            </div></div></div>)}
        </div>
    );
}
