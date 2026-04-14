export const RESOURCES = [
    { id: 'USERS', name: 'Người dùng' },
    { id: 'CONTRACTS', name: 'Hợp đồng' },
    { id: 'CUSTOMERS', name: 'Khách hàng' },
    { id: 'QUOTES', name: 'Báo giá' },
    { id: 'HANDOVERS', name: 'Biên bản bàn giao' },
    { id: 'PAYMENTS', name: 'Thanh toán' },
    { id: 'DISPATCHES', name: 'Công văn' },
    { id: 'TEMPLATES', name: 'Biểu mẫu' },
    { id: 'TASKS', name: 'Công việc' },
    { id: 'PRODUCTS', name: 'Sản phẩm & Dịch vụ' },
    { id: 'WAREHOUSES', name: 'Kho hàng' },
    { id: 'INVENTORY_TX', name: 'Giao dịch kho' },
    { id: 'SUPPLIERS', name: 'Nhà cung cấp' },
    { id: 'PURCHASE_REQUISITIONS', name: 'Yêu cầu mua hàng' },
    { id: 'PURCHASE_ORDERS', name: 'Đơn mua hàng' },
    { id: 'PURCHASE_BILLS', name: 'Hóa đơn mua hàng' },
    { id: 'PURCHASE_PAYMENTS', name: 'Thanh toán mua hàng' },
    { id: 'SALES_ESTIMATES', name: 'Báo giá / Ước tính' },
    { id: 'SALES_ORDERS', name: 'Đơn bán hàng' },
    { id: 'SALES_INVOICES', name: 'Hóa đơn bán hàng' },
    { id: 'SALES_PAYMENTS', name: 'Thanh toán bán hàng' },
    { id: 'SALES_EXPENSES', name: 'Chi phí' },
    { id: 'CALL_CENTER', name: 'Tổng Đài PBX' },
    { id: 'ACCOUNTING', name: 'Kế toán' },
    { id: 'SETTINGS', name: 'Cài đặt hệ thống' },
    { id: 'PROJECTS', name: 'Dự án' },
    { id: 'ROLES', name: 'Quản lý Nhóm Quyền' },
    { id: 'ATTENDANCE', name: 'Chấm Công & Nghỉ Phép' },
    { id: 'EMPLOYEES', name: 'Hồ Sơ Nhân Sự' },
    { id: 'PAYROLL', name: 'Bảng Lương' },
    { id: 'RECRUITMENT', name: 'Tuyển Dụng' },
    { id: 'MONITORING', name: 'Giám Sát Ping' },
] as const;

export const ACTIONS = [
    { id: 'VIEW_ALL', name: 'Xem Toàn Bộ' },
    { id: 'VIEW_OWN', name: 'Xem Của Tôi' },
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
    static readonly USE_SOFTPHONE = 'USE_SOFTPHONE';

    // Generates a flat list of all possible permission strings
    static getAllPermissions(): string[] {
        const perms: string[] = [this.VIEW_DASHBOARD, this.USE_SOFTPHONE];
        for (const r of RESOURCES) {
            for (const a of ACTIONS) {
                perms.push(this.generateCode(r.id, a.id));
            }
        }
        return perms;
    }
}

// Helper to quickly apply View All / View Own matrix
export function buildViewFilter(
    userId: string,
    permissions: string[],
    resource: ResourceId,
    creatorField: string = 'creatorId',
    includeManagers: boolean = false
): any {
    if (permissions.includes(`${resource}_VIEW_ALL`)) {
        return {}; // Can view everything
    }
    if (permissions.includes(`${resource}_VIEW_OWN`)) {
        if (includeManagers) {
            return {
                OR: [
                    { [creatorField]: userId },
                    { managers: { some: { id: userId } } }
                ]
            };
        }
        return { [creatorField]: userId }; // Can only view own
    }
    // If no view permission
    return { id: 'UNAUTHORIZED_NO_ACCESS' };
}

// ---------------------------------------------------------------------------
// SERVER ACTION AUTHORIZATION HELPERS
// ---------------------------------------------------------------------------

import { getServerSession } from "next-auth/next";
import { authOptions } from "./authOptions";

/**
 * Validates if the current user has the required permission string.
 * @param requiredPermission e.g., "SUPPLIERS_CREATE"
 * @param throwError If true, throws Error if unauthorized. If false, returns a boolean.
 */
export async function verifyActionPermission(requiredPermission: string, throwError: boolean = true) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        if (throwError) throw new Error("Unauthorized: Phiên đăng nhập không hợp lệ");
        return false;
    }
    
    // ADMIN has universal permission
    if (session.user.role === 'ADMIN') return session.user;

    const permissions = session.user.permissions as string[] || [];
    if (!permissions.includes(requiredPermission)) {
        if (throwError) throw new Error(`Forbidden: Bạn không có quyền thực hiện thao tác này (${requiredPermission})`);
        return false;
    }
    
    return session.user;
}

/**
 * Validates ownership logic for EDIT/DELETE actions.
 * First checks for _EDIT_ALL or _DELETE_ALL. If present, passes.
 * If not, checks for _EDIT_OWN or _DELETE_OWN. If present, verifies ownership.
 * @param actionType 'EDIT' | 'DELETE'
 * @param resourceId e.g., 'SUPPLIERS'
 * @param recordCreatorId The ID of the user who created the record
 * @param recordManagerIds (Optional) Array of manager IDs associated with this record
 */
export async function verifyActionOwnership(
    resourceId: ResourceId,
    actionType: 'EDIT' | 'DELETE',
    recordCreatorId: string,
    recordManagerIds: string[] = []
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        throw new Error("Unauthorized: Phiên đăng nhập không hợp lệ");
    }
    
    // ADMIN has universal permission
    if (session.user.role === 'ADMIN') return session.user;

    const permissions = session.user.permissions as string[] || [];
    const allPerm = `${resourceId}_${actionType}_ALL`;
    const ownPerm = `${resourceId}_${actionType}_OWN`;

    // 1. Has ALL permission?
    if (permissions.includes(allPerm)) {
        return session.user;
    }

    // 2. Has OWN permission?
    if (permissions.includes(ownPerm)) {
        if (session.user.id === recordCreatorId || recordManagerIds.includes(session.user.id)) {
            return session.user;
        } else {
             throw new Error(`Forbidden: Bản ghi này thuộc về người khác, bạn chỉ có quyền thao tác trên dữ liệu của mình (${ownPerm})`);
        }
    }

    // 3. Intrinsic Ownership fallback
    // Even if the user lacks the explicit string permission, if they are recorded as the creator or an explicit manager/participant, they are granted OWN access.
    if (session.user.id === recordCreatorId || recordManagerIds.includes(session.user.id)) {
        return session.user;
    }

    // 4. No permission at all
    throw new Error(`Forbidden: Bạn không có quyền thao tác trên tài nguyên này (${allPerm} / ${ownPerm})`);
}
