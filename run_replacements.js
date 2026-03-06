const fs = require('fs');
let s = fs.readFileSync('app/purchasing/bills/PurchaseBillClient.tsx', 'utf8');

s = s.replace(`        setBillItems(bill.items?.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0
        })) || []);`, `        setBillItems(bill.items?.map((i: any) => ({
            productId: i.productId || 'EXTERNAL',
            productName: i.productName || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0
        })) || []);`);

s = s.replace(`                    const mappedItems = order.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0
                    }));`, `                    const mappedItems = order.items.map((item: any) => ({
                        productId: item.productId || 'EXTERNAL',
                        productName: item.productName || '',
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0
                    }));`);

s = s.replace(`    const handleAddItem = () => {
        setBillItems([...billItems, { productId: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);
    };`, `    const handleAddItem = () => {
        setBillItems([...billItems, { productId: '', productName: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);
    };`);

s = s.replace(`    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...billItems];
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            newItems[index] = { ...newItems[index], [field]: value, unitPrice: product?.importPrice || 0, taxRate: product?.taxRate || 0 };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setBillItems(newItems);
    };`, `    const handleItemChange = (index: number, field: string, value: any) => {
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
    };`);

s = s.replace(`        if (billItems.length === 0) {
            alert("Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn");
            return;
        }`, `        if (billItems.length === 0) {
            alert("Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn");
            return;
        }

        for (let i = 0; i < billItems.length; i++) {
            if (billItems[i].productId === 'EXTERNAL' && !billItems[i].productName?.trim()) {
                alert(\`Vui lòng nhập tên sản phẩm cho dòng \${i + 1}\`);
                return;
            }
        }`);

s = s.replace(`<td className="p-2">
                                                            <SearchableSelect
                                                                value={item.productId}
                                                                onChange={(val) => handleItemChange(index, 'productId', val)}
                                                                options={productOptions}
                                                                placeholder="Lựa chọn..."
                                                            />
                                                        </td>`, `<td className="p-2 align-top">
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
                                                        </td>`);

s = s.replaceAll('<td className="p-2"><input type="number" required min="1" value={item.quantity}', '<td className="p-2 align-top"><input type="number" required min="1" value={item.quantity}');
s = s.replaceAll('<td className="p-2"><input type="number" required min="0" value={item.unitPrice}', '<td className="p-2 align-top"><input type="number" required min="0" value={item.unitPrice}');
s = s.replaceAll('<td className="p-2"><input type="number" required min="0" max="100" value={item.taxRate}', '<td className="p-2 align-top"><input type="number" required min="0" max="100" value={item.taxRate}');
s = s.replaceAll('<td className="p-2 text-right font-medium">{formatMoney', '<td className="p-2 text-right font-medium align-top pt-4">{formatMoney');
s = s.replaceAll('<td className="p-2 text-center"><button type="button" onClick={() => handleRemoveItem(index)', '<td className="p-2 text-center align-top pt-3"><button type="button" onClick={() => handleRemoveItem(index)');

fs.writeFileSync('app/purchasing/bills/PurchaseBillClient.tsx', s, 'utf8');
console.log('Final text replace attempt finished');
