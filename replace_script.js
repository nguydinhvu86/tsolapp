const fs = require('fs');
const filePath = 'app/purchasing/bills/PurchaseBillClient.tsx';
let content = fs.readFileSync(filePath, 'utf8');

function replaceExact(oldStr, newStr) {
    if (content.indexOf(oldStr) !== -1) {
        content = content.replace(oldStr, newStr);
        console.log("Success replacing snippet");
    } else {
        console.log("Snippet not found:");
        console.log("---");
        console.log(oldStr);
        console.log("---");
    }
}

const str1_old = \`        setBillItems(bill.items?.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0
        })) || []);\`;

const str1_new = \`        setBillItems(bill.items?.map((i: any) => ({
            productId: i.productId || 'EXTERNAL',
            productName: i.productName || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0
        })) || []);\`;


const str2_old = \`                    const mappedItems = order.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0
                    }));
                    setBillItems(mappedItems);\`;

const str2_new = \`                    const mappedItems = order.items.map((item: any) => ({
                        productId: item.productId || 'EXTERNAL',
                        productName: item.productName || '',
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0
                    }));
                    setBillItems(mappedItems);\`;


const str3_old = \`    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...billItems];
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            newItems[index] = { ...newItems[index], [field]: value, unitPrice: product?.importPrice || 0, taxRate: product?.taxRate || 0 };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setBillItems(newItems);
    };\`;

const str3_new = \`    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...billItems];
        if (field === 'productId') {
            if (value === 'EXTERNAL') {
                newItems[index] = { ...newItems[index], [field]: value, productName: newItems[index].productName || '', unitPrice: 0, taxRate: 0 };
            } else {
                const product = products.find(p => p.id === value);
                newItems[index] = { ...newItems[index], [field]: value, productName: '', unitPrice: product?.importPrice || 0, taxRate: product?.taxRate || 0 };
            }
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setBillItems(newItems);
    };\`;

const str4_old = \`        if (billItems.length === 0) {
            alert("Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn");
            return;
        }\`;

const str4_new = \`        if (billItems.length === 0) {
            alert("Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn");
            return;
        }

        for (let i = 0; i < billItems.length; i++) {
            if (billItems[i].productId === 'EXTERNAL' && !billItems[i].productName?.trim()) {
                alert(\\\`Vui lòng nhập tên sản phẩm cho dòng \\\${i + 1}\\\`);
                return;
            }
        }\`;

const str5_old = \`<td className="p-2">
                                                            <SearchableSelect
                                                                value={item.productId}
                                                                onChange={(val) => handleItemChange(index, 'productId', val)}
                                                                options={productOptions}
                                                                placeholder="Lựa chọn..."
                                                            />
                                                        </td>\`;

const str5_new = \`<td className="p-2 align-top">
                                                            <div className="space-y-2">
                                                                <SearchableSelect
                                                                    value={item.productId}
                                                                    onChange={(val) => handleItemChange(index, 'productId', val)}
                                                                    options={productOptions}
                                                                    placeholder="Lựa chọn..."
                                                                />
                                                                {item.productId === 'EXTERNAL' && (
                                                                    <input
                                                                        type="text"
                                                                        required
                                                                        placeholder="Nhập tên sản phẩm/dịch vụ..."
                                                                        value={item.productName || ''}
                                                                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                                                        className="w-full rounded bg-white dark:bg-gray-700 border p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                                                    />
                                                                )}
                                                            </div>
                                                        </td>\`;

const str6_old = "productId: item.productId,\\n                        quantity: item.quantity";
const str6_new = "productId: item.productId || 'EXTERNAL',\\n                        productName: item.productName || '',\\n                        quantity: item.quantity";

replaceExact(str1_old, str1_new);
replaceExact(str2_old, str2_new);
replaceExact(str3_old, str3_new);
replaceExact(str4_old, str4_new);
replaceExact(str5_old, str5_new);
replaceExact(str6_old, str6_new);

// handle the small replaces
content = content.replace('<td className="p-2"><input type="number" required min="1" value={item.quantity}', '<td className="p-2 align-top"><input type="number" required min="1" value={item.quantity}');
content = content.replace('<td className="p-2"><input type="number" required min="0" value={item.unitPrice}', '<td className="p-2 align-top"><input type="number" required min="0" value={item.unitPrice}');
content = content.replace('<td className="p-2"><input type="number" required min="0" max="100" value={item.taxRate}', '<td className="p-2 align-top"><input type="number" required min="0" max="100" value={item.taxRate}');
content = content.replace('<td className="p-2 text-right font-medium">{formatMoney', '<td className="p-2 text-right font-medium align-top pt-4">{formatMoney');
content = content.replace('<td className="p-2 text-center"><button type="button" onClick={() => handleRemoveItem', '<td className="p-2 text-center align-top pt-3"><button type="button" onClick={() => handleRemoveItem');

fs.writeFileSync(filePath, content, 'utf8');
console.log("JS replace script finished.");
