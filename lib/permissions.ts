export const RESOURCES = [
    { id: 'USERS', name: 'Người dùng' },
    { id: 'CONTRACTS', name: 'Hợp đồng' },
    { id: 'CUSTOMERS', name: 'Khách hàng' },
    { id: 'QUOTES', name: 'Báo giá' },
    { id: 'HANDOVERS', name: 'Biên bản bàn giao' },
    { id: 'PAYMENTS', name: 'Thanh toán' },
    { id: 'DISPATCHES', name: 'Công văn' },
    { id: 'TEMPLATES', name: 'Biểu mẫu' },
    { id: 'TASKS', name: 'Công việc' }
] as const;

export const ACTIONS = [
    { id: 'VIEW', name: 'Xem' },
    { id: 'CREATE', name: 'Thêm mới' },
    { id: 'EDIT', name: 'Sửa' },
    { id: 'DELETE', name: 'Xóa' }
] as const;

export type ResourceId = typeof RESOURCES[number]['id'];
export type ActionId = typeof ACTIONS[number]['id'];

// Helper class to generate and check permissions
export class PermissionHelper {
    static generateCode(resource: ResourceId, action: ActionId): string {
        return `${resource}_${action}`;
    }

    // Special standalone permissions that don't fit the CRUD matrix
    static readonly VIEW_DASHBOARD = 'VIEW_DASHBOARD';

    // Generates a flat list of all possible permission strings
    static getAllPermissions(): string[] {
        const perms: string[] = [this.VIEW_DASHBOARD];
        for (const r of RESOURCES) {
            for (const a of ACTIONS) {
                perms.push(this.generateCode(r.id, a.id));
            }
        }
        return perms;
    }
}
