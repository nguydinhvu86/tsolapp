const fs = require('fs');
let f = 'app/ecatalogs/[id]/EcatalogDetailClient.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
    /<div className="sm:col-span-8">\s*<input\s*type="text"\s*value=\{item\.customName \|\| ''\}\s*onChange=\{\(e\) => \{\s*const newItems = \[\.\.\.items\];\s*newItems\[index\]\.customName = e\.target\.value;\s*setItems\(newItems\);\s*\}\}\s*className="w-full font-bold text-gray-900 border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"\s*placeholder="Tên sản phẩm \*"\s*\/>\s*<\/div>\s*<div className="sm:col-span-4">\s*<input\s*type="text"\s*value=\{item\.customSku \|\| ''\}\s*onChange=\{\(e\) => \{\s*const newItems = \[\.\.\.items\];\s*newItems\[index\]\.customSku = e\.target\.value;\s*setItems\(newItems\);\s*\}\}\s*className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"\s*placeholder="Mã SKU \(tùy chọn\)"\s*\/>\s*<\/div>\s*<div className="sm:col-span-8">\s*<textarea\s*value=\{item\.customDesc \|\| ''\}\s*onChange=\{\(e\) => \{\s*const newItems = \[\.\.\.items\];\s*newItems\[index\]\.customDesc = e\.target\.value;\s*setItems\(newItems\);\s*\}\}\s*className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-600"\s*placeholder="Mô tả sản phẩm \(tùy chọn\)"\s*rows=\{2\}\s*\/>\s*<\/div>\s*<div className="sm:col-span-4 space-y-4">\s*<div className="relative">\s*<span className="absolute left-3 top-1\/2 transform -translate-y-1\/2 text-gray-500 font-medium">đ<\/span>\s*<input\s*type="number"\s*value=\{item\.customPrice \|\| 0\}\s*onChange=\{\(e\) => \{\s*const newItems = \[\.\.\.items\];\s*newItems\[index\]\.customPrice = Number\(e\.target\.value\);\s*setItems\(newItems\);\s*\}\}\s*className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-blue-600 font-bold"\s*placeholder="Giá tham khảo"\s*\/>\s*<\/div>\s*<input\s*type="text"\s*value=\{item\.imageUrl \|\| ''\}\s*onChange=\{\(e\) => \{\s*const newItems = \[\.\.\.items\];\s*newItems\[index\]\.imageUrl = e\.target\.value;\s*setItems\(newItems\);\s*\}\}\s*className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"\s*placeholder="URL Hình ảnh \(https:\/\/...\)"\s*\/>\s*<\/div>/,
    `<div className="sm:col-span-4">
                                            <input 
                                                type="text"
                                                value={item.customSku || ''}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[index].customSku = e.target.value;
                                                    setItems(newItems);
                                                }}
                                                className="w-full font-bold text-gray-900 border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="Part. Number Model *"
                                            />
                                        </div>
                                        <div className="sm:col-span-4">
                                            <input 
                                                type="text"
                                                value={item.customOrigin || ''}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[index].customOrigin = e.target.value;
                                                    setItems(newItems);
                                                }}
                                                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="Xuất xứ"
                                            />
                                        </div>
                                        <div className="sm:col-span-4">
                                            <input 
                                                type="text"
                                                value={item.imageUrl || ''}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[index].imageUrl = e.target.value;
                                                    setItems(newItems);
                                                }}
                                                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="Link Hình ảnh (URL)"
                                            />
                                        </div>

                                        <div className="sm:col-span-12">
                                            <textarea 
                                                value={item.customDesc || ''}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[index].customDesc = e.target.value;
                                                    setItems(newItems);
                                                }}
                                                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-600"
                                                placeholder="Mô tả sản phẩm"
                                                rows={2}
                                            />
                                        </div>

                                        <div className="sm:col-span-4 relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">đ</span>
                                            <input 
                                                type="number"
                                                value={item.customDealerPrice || 0}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[index].customDealerPrice = Number(e.target.value);
                                                    setItems(newItems);
                                                }}
                                                className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-orange-600 font-bold"
                                                placeholder="Giá đại lý VNĐ"
                                            />
                                            <label className="text-xs text-gray-500 mt-1 block">Giá đại lý VNĐ</label>
                                        </div>
                                        
                                        <div className="sm:col-span-4 relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">đ</span>
                                            <input 
                                                type="number"
                                                value={item.customRetailPrice || 0}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[index].customRetailPrice = Number(e.target.value);
                                                    setItems(newItems);
                                                }}
                                                className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-blue-600 font-bold"
                                                placeholder="Giá bán lẻ VNĐ"
                                            />
                                            <label className="text-xs text-gray-500 mt-1 block">Giá bán lẻ VNĐ</label>
                                        </div>

                                        <div className="sm:col-span-4">
                                            <input 
                                                type="text"
                                                value={item.customNote || ''}
                                                onChange={(e) => {
                                                    const newItems = [...items];
                                                    newItems[index].customNote = e.target.value;
                                                    setItems(newItems);
                                                }}
                                                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="Ghi chú"
                                            />
                                            <label className="text-xs text-gray-500 mt-1 block">Ghi chú</label>
                                        </div>`
);

fs.writeFileSync(f, c);
