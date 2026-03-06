const fs = require('fs');

function processFile() {
    const filePath = 'app/purchasing/bills/PurchaseBillClient.tsx';
    let content = fs.readFileSync(filePath, 'utf8');
    let lines = content.split('\\n');

    let newLines = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.includes('const productOptions = [')) {
            newLines.push(line);
            newLines.push("        { value: '', label: 'Lựa chọn...' },");
            newLines.push("        { value: 'EXTERNAL', label: '+ Nhập Sản Phẩm ngoài hệ thống...' },");

            // skip the old first option
            while (!lines[i + 1].includes('...products.map')) {
                i++;
            }
            continue;
        }

        if (line.includes('const [billItems, setBillItems] = useState')) {
            line = line.replace('productId: string, quantity: number', 'productId: string, productName?: string, quantity: number');
        }

        if (line.includes('productId: item.productId,')) {
            newLines.push(line.replace('productId: item.productId,', "productId: item.productId || 'EXTERNAL',"));
            // extract whitespace prefix
            const prefix = line.substring(0, line.indexOf('productId:'));
            newLines.push(prefix + "productName: item.productName || '',");
            continue;
        }

        if (line.includes('productId: i.productId,')) {
            newLines.push(line.replace('productId: i.productId,', "productId: i.productId || 'EXTERNAL',"));
            const prefix = line.substring(0, line.indexOf('productId:'));
            newLines.push(prefix + "productName: i.productName || '',");
            continue;
        }

        if (line.includes("setBillItems([...billItems, { productId: '', quantity: 1")) {
            line = line.replace("productId: '',", "productId: '', productName: '',");
        }

        if (line.includes("const handleItemChange = (index: number, field: string, value: any) => {")) {
            newLines.push(line);
            let blockStr = "";
            let blockLinesCount = 0;
            for (let j = i + 1; j < lines.length; j++) {
                blockStr += lines[j] + "\\n";
                blockLinesCount++;
                if (lines[j].includes("setBillItems(newItems);")) {
                    blockLinesCount++; // include the closing brace
                    break;
                }
            }

            newLines.push("        const newItems = [...billItems];");
            newLines.push("        if (field === 'productId') {");
            newLines.push("            if (value === 'EXTERNAL') {");
            newLines.push("                newItems[index] = { ...newItems[index], [field]: value, productName: newItems[index].productName || '', unitPrice: 0, taxRate: 0 };");
            newLines.push("            } else {");
            newLines.push("                const product = products.find(p => p.id === value);");
            newLines.push("                newItems[index] = { ...newItems[index], [field]: value, productName: '', unitPrice: product?.importPrice || 0, taxRate: product?.taxRate || 0 };");
            newLines.push("            }");
            newLines.push("        } else {");
            newLines.push("            newItems[index] = { ...newItems[index], [field]: value };");
            newLines.push("        }");
            newLines.push("        setBillItems(newItems);");
            newLines.push("    };");
            i += blockLinesCount;
            continue;
        }

        if (line.includes('if (billItems.length === 0) {') && lines[i + 4] && !lines[i + 4].includes('for (let')) {
            newLines.push(line);
            newLines.push(lines[i + 1]);
            newLines.push(lines[i + 2]);
            newLines.push(lines[i + 3]);
            newLines.push("");
            newLines.push("        for (let i = 0; i < billItems.length; i++) {");
            newLines.push("            if (billItems[i].productId === 'EXTERNAL' && !billItems[i].productName?.trim()) {");
            newLines.push("                alert(`Vui lòng nhập tên sản phẩm cho dòng ${i + 1}`);");
            newLines.push("                return;");
            newLines.push("            }");
            newLines.push("        }");
            i += 3;
            continue;
        }

        if (line.includes('<td className="p-2">')) {
            if (lines[i + 1] && lines[i + 1].includes('<SearchableSelect')) {
                newLines.push('                                                        <td className="p-2 align-top">');
                newLines.push('                                                            <div className="space-y-2">');
                newLines.push('                                                                <SearchableSelect');
                newLines.push('                                                                    value={item.productId}');
                newLines.push("                                                                    onChange={(val) => handleItemChange(index, 'productId', val)}");
                newLines.push('                                                                    options={productOptions}');
                newLines.push('                                                                    placeholder="Lựa chọn..."');
                newLines.push('                                                                />');
                newLines.push("                                                                {item.productId === 'EXTERNAL' && (");
                newLines.push('                                                                    <input');
                newLines.push('                                                                        type="text"');
                newLines.push('                                                                        required');
                newLines.push('                                                                        placeholder="Nhập tên sản phẩm/dịch vụ..."');
                newLines.push("                                                                        value={item.productName || ''}");
                newLines.push("                                                                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}");
                newLines.push('                                                                        className="w-full rounded bg-white dark:bg-gray-700 border p-2 text-sm focus:border-primary focus:outline-none"');
                newLines.push('                                                                    />');
                newLines.push('                                                                )}');
                newLines.push('                                                            </div>');
                newLines.push('                                                        </td>');
                i += 7; // skip old dropdown lines
                continue;
            }
        }

        if (line.includes('<td className="p-2"><input type="number" required min="1" value={item.quantity}')) {
            line = line.replace('<td className="p-2"><input type="number" required min="1" value={item.quantity}', '<td className="p-2 align-top"><input type="number" required min="1" value={item.quantity}');
        }
        if (line.includes('<td className="p-2"><input type="number" required min="0" value={item.unitPrice}')) {
            line = line.replace('<td className="p-2"><input type="number" required min="0" value={item.unitPrice}', '<td className="p-2 align-top"><input type="number" required min="0" value={item.unitPrice}');
        }
        if (line.includes('<td className="p-2"><input type="number" required min="0" max="100" value={item.taxRate}')) {
            line = line.replace('<td className="p-2"><input type="number" required min="0" max="100" value={item.taxRate}', '<td className="p-2 align-top"><input type="number" required min="0" max="100" value={item.taxRate}');
        }
        if (line.includes('<td className="p-2 text-right font-medium">{formatMoney')) {
            line = line.replace('<td className="p-2 text-right font-medium">{formatMoney', '<td className="p-2 text-right font-medium align-top pt-4">{formatMoney');
        }
        if (line.includes('<td className="p-2 text-center"><button type="button" onClick={() => handleRemoveItem')) {
            line = line.replace('<td className="p-2 text-center"><button type="button" onClick={() => handleRemoveItem', '<td className="p-2 text-center align-top pt-3"><button type="button" onClick={() => handleRemoveItem');
        }

        newLines.push(line);
    }

    fs.writeFileSync(filePath, newLines.join('\\n'), 'utf8');
    console.log("File rewrite complete!");
}

processFile();
