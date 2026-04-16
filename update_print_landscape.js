const fs = require('fs');
const file = 'app/print/sales/estimate/[id]/PrintSalesEstimateClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix @page size
content = content.replace(
    `size: A4;`,
    "size: A4 ${estimate.templateType === 'PROJECT_BREAKDOWN' ? 'landscape' : 'portrait'};"
);

// 2. Fix inline dimensions of print-container
content = content.replace(
    `maxWidth: '800px',`,
    `maxWidth: estimate.templateType === 'PROJECT_BREAKDOWN' ? '1122px' : '800px',`
);

content = content.replace(
    `minHeight: '1122px' // A4 approx height`,
    `minHeight: estimate.templateType === 'PROJECT_BREAKDOWN' ? '800px' : '1122px' // A4 approx height`
);

fs.writeFileSync(file, content, 'utf8');
console.log("SUCCESS");
