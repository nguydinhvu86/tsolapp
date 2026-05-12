import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../Modal';
import { Upload, Image as ImageIcon, Search, X, Check, Loader2 } from 'lucide-react';
import { listServerImages } from '@/app/ecatalogs/actions';

interface MediaPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}

export function MediaPickerModal({ isOpen, onClose, onSelect }: MediaPickerModalProps) {
    const [activeTab, setActiveTab] = useState<'upload' | 'server'>('server');
    const [images, setImages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && activeTab === 'server') {
            fetchServerImages();
        }
    }, [isOpen, activeTab]);

    const fetchServerImages = async () => {
        setIsLoading(true);
        try {
            const res = await listServerImages();
            if (res.success && res.data) {
                setImages(res.data);
            }
        } catch (error) {
            console.error('Error fetching images:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            
            const data = await res.json();
            if (data.url) {
                onSelect(data.url);
                onClose();
            }
        } catch (error) {
            alert('Lỗi khi tải ảnh lên!');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const filteredImages = images.filter(img => img.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Chọn hình ảnh">
            <div className="flex flex-col h-[600px] max-h-[80vh]">
                <div className="flex border-b border-gray-200">
                    <button
                        type="button"
                        onClick={() => setActiveTab('server')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'server' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <ImageIcon size={18} /> Thư viện máy chủ
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('upload')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'upload' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <Upload size={18} /> Tải lên từ thiết bị
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {activeTab === 'upload' && (
                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors p-8 text-center cursor-pointer relative" onClick={() => fileInputRef.current?.click()}>
                            {isUploading ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                                    <p className="text-gray-600 font-medium">Đang tải lên...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                        <Upload size={32} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Click để tải ảnh lên</h3>
                                    <p className="text-sm text-gray-500 max-w-sm">
                                        Hỗ trợ định dạng JPG, PNG, WEBP, GIF. Kích thước tối đa 5MB.
                                    </p>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleUpload} 
                                        accept="image/png, image/jpeg, image/jpg, image/gif, image/webp" 
                                        className="hidden" 
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'server' && (
                        <div className="flex flex-col h-full">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm hình ảnh..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>

                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                </div>
                            ) : filteredImages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                                    <ImageIcon size={48} className="text-gray-300 mb-4" />
                                    <p>Không tìm thấy hình ảnh nào</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4">
                                    {filteredImages.map((img, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => {
                                                onSelect(img.url);
                                                onClose();
                                            }}
                                            className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 hover:ring-2 hover:ring-blue-200 transition-all aspect-square flex items-center justify-center"
                                        >
                                            <img 
                                                src={img.url} 
                                                alt={img.name} 
                                                className="max-w-full max-h-full object-contain p-2"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="bg-white text-blue-600 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
                                                    <Check size={16} /> Chọn ảnh
                                                </div>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-[10px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                {img.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
