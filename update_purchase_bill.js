const fs = require('fs');
let content = fs.readFileSync('app/purchasing/bills/PurchaseBillClient.tsx', 'utf8');

function replaceStr(target, replacement) {
    content = content.split(target).join(replacement);
}

replaceStr(
    "const productOptions = [{ value: '', label: 'Lựa chọn...' }, ...products.map((p: any) => ({ value: p.id, label: p.code ? `[${p.code}] ${p.name}` : p.name }))];",
    "const productOptions = [\n        { value: '', label: 'Lựa chọn...' },\n        { value: 'EXTERNAL', label: '+ Nhập Sản Phẩm ngoài hệ thống...' },\n        ...products.map((p: any) => ({ value: p.id, label: p.code ? `[${p.code}] ${p.name}` : p.name }))\n    ];"
);

replaceStr(
    "const [billItems, setBillItems] = useState<Array<{ productId: string, quantity: number, unitPrice: number, taxRate: number }>>([]);",
    "const [billItems, setBillItems] = useState<Array<{ productId: string, productName?: string, quantity: number, unitPrice: number, taxRate: number }>>([]);"
);

replaceStr(
    "productId: item.productId,\n                        quantity: item.quantity,",
    "productId: item.productId || 'EXTERNAL',\n                        productName: item.productName || '',\n                        quantity: item.quantity,"
);

replaceStr(
    "productId: i.productId,\n            quantity: i.quantity,",
    "productId: i.productId || 'EXTERNAL',\n            productName: i.productName || '',\n            quantity: i.quantity,"
);

replaceStr(
    "setBillItems([...billItems, { productId: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);",
    "setBillItems([...billItems, { productId: '', productName: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);"
);

replaceStr(
    "    const handleItemChange = (index: number, field: string, value: any) => {\n        const newItems = [...billItems];\n        if (field === 'productId') {\n            const product = products.find(p => p.id === value);\n            newItems[index] = { ...newItems[index], [field]: value, unitPrice: product?.importPrice || 0, taxRate: product?.taxRate || 0 };\n        } else {\n            newItems[index] = { ...newItems[index], [field]: value };\n        }\n        setBillItems(newItems);\n    };",
    "    const handleItemChange = (index: number, field: string, value: any) => {\n        const newItems = [...billItems];\n        if (field === 'productId') {\n            if (value === 'EXTERNAL') {\n                newItems[index] = { ...newItems[index], [field]: value, productName: newItems[index].productName || '', unitPrice: 0, taxRate: 0 };\n            } else {\n                const product = products.find(p => p.id === value);\n                newItems[index] = { ...newItems[index], [field]: value, productName: '', unitPrice: product?.importPrice || 0, taxRate: product?.taxRate || 0 };\n            }\n        } else {\n            newItems[index] = { ...newItems[index], [field]: value };\n        }\n        setBillItems(newItems);\n    };"
);

replaceStr(
    "        if (billItems.length === 0) {\n            alert(\"Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn\");\n            return;\n        }",
    "        if (billItems.length === 0) {\n            alert(\"Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn\");\n            return;\n        }\n\n        for (let i = 0; i < billItems.length; i++) {\n            if (billItems[i].productId === 'EXTERNAL' && !billItems[i].productName?.trim()) {\n                alert(`Vui lòng nhập tên sản phẩm cho dòng ${i + 1}`);\n                return;\n            }\n        }"
);

replaceStr(
    "<td className=\"p-2\">\n                                                            <SearchableSelect\n                                                                value={item.productId}\n                                                                onChange={(val) => handleItemChange(index, 'productId', val)}\n                                                                options={productOptions}\n                                                                placeholder=\"Lựa chọn...\"\n                                                            />\n                                                        </td>",
    "<td className=\"p-2 align-top\">\n                                                            <div className=\"space-y-2\">\n                                                                <SearchableSelect\n                                                                    value={item.productId}\n                                                                    onChange={(val) => handleItemChange(index, 'productId', val)}\n                                                                    options={productOptions}\n                                                                    placeholder=\"Lựa chọn...\"\n                                                                />\n                                                                {item.productId === 'EXTERNAL' && (\n                                                                    <input\n                                                                        type=\"text\"\n                                                                        required\n                                                                        placeholder=\"Nhập tên sản phẩm/dịch vụ...\"\n                                                                        value={item.productName || ''}\n                                                                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}\n                                                                        className=\"w-full rounded bg-white dark:bg-gray-700 border p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary\"\n                                                                    />\n                                                                )}\n                                                            </div>\n                                                        </td>"
);

replaceStr("<td className=\"p-2\"><input type=\"number\" required min=\"1\" value={item.quantity}", "<td className=\"p-2 align-top\"><input type=\"number\" required min=\"1\" value={item.quantity}");
replaceStr("<td className=\"p-2\"><input type=\"number\" required min=\"0\" value={item.unitPrice}", "<td className=\"p-2 align-top\"><input type=\"number\" required min=\"0\" value={item.unitPrice}");
replaceStr("<td className=\"p-2\"><input type=\"number\" required min=\"0\" max=\"100\" value={item.taxRate}", "<td className=\"p-2 align-top\"><input type=\"number\" required min=\"0\" max=\"100\" value={item.taxRate}");
replaceStr("<td className=\"p-2 text-right font-medium\">{formatMoney", "<td className=\"p-2 text-right font-medium align-top pt-4\">{formatMoney");
replaceStr("<td className=\"p-2 text-center\"><button type=\"button\" onClick={() => handleRemoveItem(index)", "<td className=\"p-2 text-center align-top pt-3\"><button type=\"button\" onClick={() => handleRemoveItem(index)");

fs.writeFileSync('app/purchasing/bills/PurchaseBillClient.tsx', content);
console.log('Successfully completed regex replacements using precise split/join arrays in Javascript script.');
