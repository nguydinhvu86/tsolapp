const fs = require('fs');
const file = 'app/public/sales/estimate/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix print-wrapper maxWidth
content = content.replace(
    /maxWidth: '210mm' }}/g,
    `maxWidth: estimate.templateType === 'PROJECT_BREAKDOWN' ? '297mm' : '210mm' }}`
);

// 2. Fix @page size
content = content.replace(
    /size: A4;/g,
    "size: A4 ${estimate.templateType === 'PROJECT_BREAKDOWN' ? 'landscape' : 'portrait'};"
);

// 3. Fix a4-document wrapper dimensions (regex to ignore whitespace)
content = content.replace(
    /maxWidth:\s*'210mm',\s*minHeight:\s*'297mm',/g,
    `maxWidth: estimate.templateType === 'PROJECT_BREAKDOWN' ? '297mm' : '210mm',\n                minHeight: estimate.templateType === 'PROJECT_BREAKDOWN' ? '210mm' : '297mm',`
);

fs.writeFileSync(file, content, 'utf8');
console.log("REPLACED DIMENSIONS SUCCESSFULLY!");
