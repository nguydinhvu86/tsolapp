const fs = require('fs');
const path = require('path');

const targetFiles = [
    'app/contracts/ContractDashboardClient.tsx',
    'app/quotes/QuoteDashboardClient.tsx',
    'app/handovers/HandoverDashboardClient.tsx',
    'app/payment-requests/PaymentRequestDashboardClient.tsx',
    'app/dispatches/DispatchListClient.tsx',
    'app/contract-appendices/AppendixListClient.tsx',
    'app/users/UserListClient.tsx',
    'app/projects/ProjectListClient.tsx',
    'app/tasks/TaskDashboardClient.tsx',
    'app/ecatalogs/EcatalogClient.tsx',
    'app/components/ClickToCallButton.tsx',
    'app/email-config/EmailConfigClient.tsx',
    'app/email-templates/EmailTemplateFormClient.tsx',
    'app/email-templates/EmailTemplateDashboardClient.tsx',
    'app/profile/ProfileClient.tsx',
    'app/settings/SettingsClient.tsx',
    'app/leave-requests/LeaveRequestClient.tsx',
    'app/library/DeleteDocumentButton.tsx',
    'app/library/LibraryActionButtons.tsx',
    'app/library/MoveDocumentButton.tsx',
    'app/templates/TemplateClient.tsx',
    'app/appendix-templates/AppendixTemplateClient.tsx',
    'app/dispatch-templates/DispatchTemplateClient.tsx',
    'app/handover-templates/HandoverTemplateClient.tsx',
    'app/payment-request-templates/PaymentRequestTemplateClient.tsx',
    'app/quote-templates/QuoteTemplateClient.tsx',
    'app/call-center/CallCenterClient.tsx',
    'app/components/CallListener.tsx'
];

let totalAlertsReplaced = 0;
let totalConfirmsReplaced = 0;

for (const relPath of targetFiles) {
    const fullPath = path.join(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) {
        console.log(`[SKIP] File not found: ${relPath}`);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    const hasAlert = content.includes('alert(');
    const hasConfirm = content.includes('confirm(');

    if (!hasAlert && !hasConfirm) continue;

    let needsToastImport = false;
    let needsConfirmImport = false;

    // 1. Replace alert('Đã copy link public: ' + url) or alert('Đã copy link: ' + url)
    content = content.replace(/alert\((['"`])Đã copy link.*?\1\s*\+\s*([^)]+)\)/g, (match, q, urlVar) => {
        needsToastImport = true;
        totalAlertsReplaced++;
        return `toast.success('Đã sao chép liên kết xem trước', ${urlVar.trim()})`;
    });

    // 2. Replace generic alert('...') or alert(msg)
    content = content.replace(/alert\(([^)]+)\)/g, (match, args) => {
        needsToastImport = true;
        totalAlertsReplaced++;
        const trimmed = args.trim();
        if (trimmed.toLowerCase().includes('lỗi') || trimmed.toLowerCase().includes('error') || trimmed.toLowerCase().includes('thất bại') || trimmed.includes('error.') || trimmed.includes('err.')) {
            return `toast.error(${trimmed})`;
        }
        if (trimmed.toLowerCase().includes('thành công') || trimmed.toLowerCase().includes('success')) {
            return `toast.success(${trimmed})`;
        }
        if (trimmed.toLowerCase().includes('cảnh báo') || trimmed.toLowerCase().includes('warning')) {
            return `toast.warning(${trimmed})`;
        }
        return `toast.info(${trimmed})`;
    });

    // 3. Replace confirm(...) with confirmModal(...)
    content = content.replace(/\bconfirm\(([^)]+)\)/g, (match, args) => {
        needsConfirmImport = true;
        totalConfirmsReplaced++;
        return `await confirmModal(${args.trim()})`;
    });

    // Add imports if needed
    if (needsToastImport && !content.includes("from '@/app/components/providers/ToastProvider'")) {
        content = `import { toast } from '@/app/components/providers/ToastProvider';\n` + content;
    }
    if (needsConfirmImport && !content.includes("from '@/app/components/providers/ConfirmProvider'")) {
        content = `import { confirmModal } from '@/app/components/providers/ConfirmProvider';\n` + content;
    }

    if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`[UPDATED] ${relPath}`);
    }
}

console.log(`\n=== KẾT QUẢ HIỆN ĐẠI HÓA UX ===`);
console.log(`- Đã thay thế ${totalAlertsReplaced} lệnh alert() -> Enterprise Toast`);
console.log(`- Đã thay thế ${totalConfirmsReplaced} lệnh confirm() -> Enterprise ConfirmModal`);
