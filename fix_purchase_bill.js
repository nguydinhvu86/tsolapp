const fs = require('fs');
const filePath = 'app/purchasing/bills/PurchaseBillClient.tsx';
let lines = fs.readFileSync(filePath, 'utf8').split(/\\r?\\n/);

for (let i = 0; i < lines.length; i++) {
    // 1. orders map
    if (lines[i].includes('productId: item.productId,')) {
        lines[i] = lines[i].replace('productId: item.productId,', "productId: item.productId || 'EXTERNAL',");
        lines.splice(i + 1, 0, "                        productName: item.productName || '',");
        i++;
    }
    // 2. bills map
    if (lines[i].includes('productId: i.productId,')) {
        lines[i] = lines[i].replace('productId: i.productId,', "productId: i.productId || 'EXTERNAL',");
        lines.splice(i + 1, 0, "            productName: i.productName || '',");
        i++;
    }
    // 3. handleAddItem
    if (lines[i].includes("setBillItems([...billItems, { productId: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);")) {
        lines[i] = lines[i].replace("setBillItems([...billItems, { productId: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);", "setBillItems([...billItems, { productId: '', productName: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);");
    }

    // 4. Validation
    if (lines[i].trim() === 'if (billItems.length === 0) {') {
        let n = i + 1;
        while (n < lines.length && !lines[n].trim().startsWith('}')) n++;
        if (n < lines.length && !lines[n + 1].includes('for (let i = 0; i < billItems.length; i++) {')) {
            lines.splice(n + 1, 0, "", "        for (let i = 0; i < billItems.length; i++) {", "            if (billItems[i].productId === 'EXTERNAL' && !billItems[i].productName?.trim()) {", "                alert(`Vui lòng nhập tên sản phẩm cho dòng ${i + 1}`);", "                return;", "            }", "        }");
        }
    }

    // 5. handleItemChange
    if (lines[i].includes("const handleItemChange = (index: number, field: string, value: any) => {")) {
        let endIdx = i + 1;
        while (endIdx < lines.length && !lines[endIdx].includes("};")) endIdx++;

        // Ensure it contains the old pattern
        let blockText = lines.slice(i, endIdx + 1).join('\\n');
        if (blockText.includes("const product = products.find(p => p.id === value);") && !blockText.includes("if (value === 'EXTERNAL') {")) {
            lines.splice(i, endIdx - i + 1,
                \`    const handleItemChange = (index: number, field: string, value: any) => {
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
    };\`);
        }
    }
    
    // 6. Table HTML
    if (lines[i].includes('<td className="p-2">') && lines[i+1] && lines[i+1].includes('<SearchableSelect')) {
        let endIdx = i + 1;
        while (endIdx < lines.length && !lines[endIdx].includes('</td>')) endIdx++;
        lines.splice(i, endIdx - i + 1,
\`                                                        <td className="p-2 align-top">
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
                                                        </td>\`);
    }

    lines[i] = lines[i].replace('<td className="p-2"><input type="number" required min="1" value={item.quantity}', '<td className="p-2 align-top"><input type="number" required min="1" value={item.quantity}');
    lines[i] = lines[i].replace('<td className="p-2"><input type="number" required min="0" value={item.unitPrice}', '<td className="p-2 align-top"><input type="number" required min="0" value={item.unitPrice}');
    lines[i] = lines[i].replace('<td className="p-2"><input type="number" required min="0" max="100" value={item.taxRate}', '<td className="p-2 align-top"><input type="number" required min="0" max="100" value={item.taxRate}');
    lines[i] = lines[i].replace('<td className="p-2 text-right font-medium">{formatMoney', '<td className="p-2 text-right font-medium align-top pt-4">{formatMoney');
    lines[i] = lines[i].replace('<td className="p-2 text-center"><button type="button" onClick={() => handleRemoveItem', '<td className="p-2 text-center align-top pt-3"><button type="button" onClick={() => handleRemoveItem');
}

fs.writeFileSync(filePath, lines.join('\\n'), 'utf8');
console.log('Fixed PurchaseBillClient line-by-line');
