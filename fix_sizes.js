const fs = require('fs');
const file = 'app/public/sales/estimate/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file currently has:
// maxWidth: estimate.templateType === 'PROJECT_BREAKDOWN' ? '297mm' : '210mm'
// minHeight: estimate.templateType === 'PROJECT_BREAKDOWN' ? '210mm' : '297mm'

// Let's replace '297mm' with '1122px', and '210mm' with '800px' (the standard used in the internal print view).
content = content.replace(/'297mm'/g, "'1122px'");
content = content.replace(/'210mm'/g, "'800px'");

fs.writeFileSync(file, content, 'utf8');
console.log("REPLACED MM WITH PX");
