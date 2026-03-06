const fs = require('fs');
const filePath = 'app/purchasing/bills/PurchaseBillClient.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/productId:\s*i\.productId,\s*quantity:\s*i\.quantity,/, "productId: i.productId || 'EXTERNAL',\\n            productName: i.productName || '',\\n            quantity: i.quantity,");

content = content.replace(/productId:\s*item\.productId,\s*quantity:\s*item\.quantity,/, "productId: item.productId || 'EXTERNAL',\\n                        productName: item.productName || '',\\n                        quantity: item.quantity,");

content = content.replace(/if\s*\(field === 'productId'\)\s*\{\s*const product = products\.find\(p => p\.id === value\);\s*newItems\[index\] = \{ \.\.\.newItems\[index\], \[field\]: value, unitPrice: product\?\.importPrice \|\| 0, taxRate: product\?\.taxRate \|\| 0 \};\s*\}/,
    \`if (field === 'productId') {
            if (value === 'EXTERNAL') {
                newItems[index] = { ...newItems[index], [field]: value, productName: newItems[index].productName || '', unitPrice: 0, taxRate: 0 };
            } else {
                const product = products.find(p => p.id === value);
                newItems[index] = { ...newItems[index], [field]: value, productName: '', unitPrice: product?.importPrice || 0, taxRate: product?.taxRate || 0 };
            }
        }\`);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Regex replaces complete");
