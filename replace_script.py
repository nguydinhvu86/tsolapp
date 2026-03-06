import os

file_path = 'app/purchasing/bills/PurchaseBillClient.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def replace_exact(old_str, new_str):
    global content
    if old_str in content:
        content = content.replace(old_str, new_str)
        print("Success replacing snippet")
    else:
        print("Snippet not found:")
        print("---")
        print(old_str)
        print("---")

str1_old = """        setBillItems(bill.items?.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0
        })) || []);"""

str1_new = """        setBillItems(bill.items?.map((i: any) => ({
            productId: i.productId || 'EXTERNAL',
            productName: i.productName || '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate || 0
        })) || []);"""


str2_old = """                    const mappedItems = order.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0
                    }));
                    setBillItems(mappedItems);"""

str2_new = """                    const mappedItems = order.items.map((item: any) => ({
                        productId: item.productId || 'EXTERNAL',
                        productName: item.productName || '',
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0
                    }));
                    setBillItems(mappedItems);"""


str3_old = """    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...billItems];
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            newItems[index] = { ...newItems[index], [field]: value, unitPrice: product?.importPrice || 0, taxRate: product?.taxRate || 0 };
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setBillItems(newItems);
    };"""

str3_new = """    const handleItemChange = (index: number, field: string, value: any) => {
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
    };"""

str4_old = """        if (billItems.length === 0) {
            alert("Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn");
            return;
        }"""

str4_new = """        if (billItems.length === 0) {
            alert("Vui lòng thêm ít nhất 1 sản phẩm vào hóa đơn");
            return;
        }

        for (let i = 0; i < billItems.length; i++) {
            if (billItems[i].productId === 'EXTERNAL' && !billItems[i].productName?.trim()) {
                alert(`Vui lòng nhập tên sản phẩm cho dòng ${i + 1}`);
                return;
            }
        }"""

str5_old = """<td className="p-2">
                                                            <SearchableSelect
                                                                value={item.productId}
                                                                onChange={(val) => handleItemChange(index, 'productId', val)}
                                                                options={productOptions}
                                                                placeholder="Lựa chọn..."
                                                            />
                                                        </td>"""

str5_new = """<td className="p-2 align-top">
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
                                                        </td>"""

content = content.replace("productId: item.productId,\n                        quantity: item.quantity", "productId: item.productId || 'EXTERNAL',\n                        productName: item.productName || '',\n                        quantity: item.quantity")

replace_exact(str1_old, str1_new)
replace_exact(str2_old, str2_new)
replace_exact(str3_old, str3_new)
replace_exact(str4_old, str4_new)
replace_exact(str5_old, str5_new)

# handle the small replaces
content = content.replace('<td className="p-2"><input type="number" required min="1" value={item.quantity}', '<td className="p-2 align-top"><input type="number" required min="1" value={item.quantity}')
content = content.replace('<td className="p-2"><input type="number" required min="0" value={item.unitPrice}', '<td className="p-2 align-top"><input type="number" required min="0" value={item.unitPrice}')
content = content.replace('<td className="p-2"><input type="number" required min="0" max="100" value={item.taxRate}', '<td className="p-2 align-top"><input type="number" required min="0" max="100" value={item.taxRate}')
content = content.replace('<td className="p-2 text-right font-medium">{formatMoney', '<td className="p-2 text-right font-medium align-top pt-4">{formatMoney')
content = content.replace('<td className="p-2 text-center"><button type="button" onClick={() => handleRemoveItem', '<td className="p-2 text-center align-top pt-3"><button type="button" onClick={() => handleRemoveItem')


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Python replace script finished.")
