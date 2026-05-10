const fs = require('fs');
let f = 'app/public/ecatalog/[id]/page.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
    /const name = item\.customName \|\| item\.product\?\.name;\s*const desc = item\.customDesc \|\| item\.product\?\.description;\s*const price = item\.customPrice \?\? item\.product\?\.salePrice \?\? 0;\s*const image = item\.imageUrl \|\| item\.product\?\.imageUrl;\s*const sku = item\.customSku \|\| item\.product\?\.sku;/g,
    `const name = item.customName || item.product?.name;
                        const desc = item.customDesc || item.product?.description;
                        const retailPrice = item.customRetailPrice ?? item.customPrice ?? item.product?.salePrice ?? 0;
                        const dealerPrice = item.customDealerPrice ?? 0;
                        const origin = item.customOrigin || '';
                        const note = item.customNote || '';
                        const image = item.imageUrl || item.product?.imageUrl;
                        const sku = item.customSku || item.product?.sku;`
);

c = c.replace(
    /\{\/\* Content Box \*\/\}\s*<div className="p-5 flex flex-col flex-1">\s*<h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">\s*\{name\}\s*<\/h3>\s*<p className="text-sm text-gray-500 mb-4 line-clamp-3 flex-1">\s*\{desc \|\| 'Chưa có mô tả chi tiết cho sản phẩm này\.'\}\s*<\/p>\s*\{\/\* Footer attributes \*\/\}\s*<div className="pt-4 border-t border-gray-100 mt-auto">\s*\{price > 0 \? \(\s*<div className="flex items-end justify-between">\s*<div className="text-xs text-gray-500 font-medium mb-1">Giá tham khảo<\/div>\s*<div className="text-xl font-extrabold text-blue-600">\s*\{new Intl\.NumberFormat\('vi-VN', \{ style: 'currency', currency: 'VND' \}\)\.format\(price\)\}\s*<\/div>\s*<\/div>\s*\) : \(\s*<div className="flex items-center gap-2 text-blue-600 font-medium">\s*<CheckCircle \/>\s*<span>Liên hệ nhận báo giá<\/span>\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>/,
    `{/* Content Box */}
                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                        {name}
                                    </h3>
                                    
                                    <div className="text-sm text-gray-600 mb-3 space-y-1">
                                        {origin && (
                                            <p><span className="font-semibold text-gray-700">Xuất xứ:</span> {origin}</p>
                                        )}
                                        {note && (
                                            <p><span className="font-semibold text-gray-700">Ghi chú:</span> {note}</p>
                                        )}
                                    </div>
                                    
                                    <p className="text-sm text-gray-500 mb-4 line-clamp-3 flex-1 border-t border-gray-50 pt-3">
                                        {desc || 'Chưa có mô tả chi tiết.'}
                                    </p>
                                    
                                    {/* Footer attributes */}
                                    <div className="pt-4 border-t border-gray-100 mt-auto space-y-2">
                                        {dealerPrice > 0 && (
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-500 font-medium">Giá đại lý</div>
                                                <div className="text-md font-bold text-orange-600">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dealerPrice)}
                                                </div>
                                            </div>
                                        )}
                                        {retailPrice > 0 ? (
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-500 font-medium">Giá bán lẻ</div>
                                                <div className="text-lg font-extrabold text-blue-600">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(retailPrice)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-500 font-medium">Giá bán lẻ</div>
                                                <div className="text-sm font-medium text-blue-600 flex items-center gap-1">
                                                    <CheckCircle size={14} /> Liên hệ báo giá
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>`
);

fs.writeFileSync(f, c);
