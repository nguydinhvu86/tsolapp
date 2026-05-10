const fs = require('fs');
let f = 'app/ecatalogs/[id]/EcatalogDetailClient.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
    /customPrice: item\.customPrice \|\| item\.product\?\.salePrice \|\| 0,/g,
    `customRetailPrice: item.customRetailPrice || 0,
                customDealerPrice: item.customDealerPrice || 0,
                customOrigin: item.customOrigin || '',
                customNote: item.customNote || '',`
);

// Update add manual product
c = c.replace(
    /customPrice: 0,/g,
    `customRetailPrice: 0,
                customDealerPrice: 0,
                customOrigin: '',
                customNote: '',`
);

// Update excel header check
c = c.replace(
    /\/\/ Expecting Header in Row 1: SKU, Tên SP, Mô tả, Giá, Link ảnh/g,
    `// Expecting Header in Row 1: TT, Part. Number Model, Hình ảnh Ghi chú, Mô tả sản phẩm, Xuất xứ, Giá đại lý, Giá bán lẻ`
);

// Update excel parsing
c = c.replace(
    /newItems\.push\(\{[\s\S]*?imageUrl: row\[4\] \? String\(row\[4\]\) : ''\n\s*\}\);/g,
    `
                    let imageUrl = '';
                    let customNote = '';
                    let col2 = row[2] ? String(row[2]) : '';
                    if (col2.startsWith('http')) {
                        imageUrl = col2;
                    } else {
                        customNote = col2;
                    }

                    newItems.push({
                        customSku: row[1] ? String(row[1]) : '',
                        customDesc: row[3] ? String(row[3]) : '',
                        customName: row[3] ? String(row[3]).substring(0, 50) + '...' : 'Sản phẩm', // They only provide description, so we use it as name too, or a placeholder
                        customOrigin: row[4] ? String(row[4]) : '',
                        customDealerPrice: row[5] ? Number(row[5]) : 0,
                        customRetailPrice: row[6] ? Number(row[6]) : 0,
                        customNote: customNote,
                        imageUrl: imageUrl
                    });`
);

// Update sample excel
c = c.replace(
    /const headers = \[\['Mã SKU', 'Tên sản phẩm', 'Mô tả', 'Giá', 'Link hình ảnh \(URL\)'\]\];/g,
    `const headers = [['TT', 'Part. Number Model', 'Hình ảnh / Ghi chú', 'Mô tả sản phẩm', 'Xuất xứ', 'Giá đại lý VNĐ', 'Giá bán lẻ VNĐ']];`
);

c = c.replace(
    /const sampleData = \[\s*\['SW-01', 'Phần mềm ERP Pro', 'Giải pháp quản trị doanh nghiệp toàn diện', 15000000, 'https:\/\/example\.com\/erp\.png'\],\s*\['SEC-02', 'Antivirus Security 2026', 'Phần mềm diệt virus bản quyền 1 năm', 350000, ''\]\s*\];/g,
    `const sampleData = [
            [1, 'SW-01', 'https://example.com/erp.png', 'Phần mềm ERP Pro - Giải pháp quản trị toàn diện', 'Việt Nam', 10000000, 15000000],
            [2, 'SEC-02', 'Hàng đặt trước', 'Antivirus Security 2026', 'Mỹ', 250000, 350000]
        ];`
);

fs.writeFileSync(f, c);
