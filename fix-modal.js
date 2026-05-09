const fs = require('fs');

let f1 = 'app/ecatalogs/EcatalogClient.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/import Modal from '@\/app\/components\/Modal';\r?\n/g, '');
c1 = c1.replace(/<Modal isOpen=\{isCreateModalOpen\} onClose=\{\(\) => setIsCreateModalOpen\(false\)\} title="Tạo E-Catalog Mới">/g, '{isCreateModalOpen && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4"><div className="p-4 border-b border-gray-100 flex justify-between items-center"><h2 className="text-lg font-bold">Tạo E-Catalog Mới</h2><button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button></div><div className="p-4">');
c1 = c1.replace(/<\/Modal>/g, '</div></div></div>)}');
fs.writeFileSync(f1, c1);

let f2 = 'app/ecatalogs/[id]/EcatalogDetailClient.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/import Modal from '@\/app\/components\/Modal';\r?\n/g, '');
c2 = c2.replace(/<Modal isOpen=\{isAddProductModalOpen\} onClose=\{\(\) => setIsAddProductModalOpen\(false\)\} title="Thêm Sản Phẩm Vào Catalog">/g, '{isAddProductModalOpen && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4"><div className="p-4 border-b border-gray-100 flex justify-between items-center"><h2 className="text-lg font-bold">Thêm Sản Phẩm Vào Catalog</h2><button onClick={() => setIsAddProductModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button></div><div className="p-4">');
c2 = c2.replace(/<\/Modal>/g, '</div></div></div>)}');
fs.writeFileSync(f2, c2);
