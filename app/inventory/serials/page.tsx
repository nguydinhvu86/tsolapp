import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import SerialManagementClient from './SerialManagementClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Quản Lý Serial / IMEI & Bảo Hành | TSOL ERP',
    description: 'Quản lý vòng đời Serial/IMEI, xuất bán và tra cứu bảo hành điện tử'
};

export default async function SerialsPage() {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role || 'USER';
    const permissions = (session?.user as any)?.permissions as string[] || [];

    // Kiểm tra quyền truy cập phân hệ Serial / Kho / Sản phẩm
    const canView = permissions.includes('WAREHOUSES_VIEW_ALL') || 
                    permissions.includes('WAREHOUSES_VIEW_OWN') || 
                    permissions.includes('INVENTORY_TX_VIEW_ALL') || 
                    permissions.includes('INVENTORY_TX_VIEW_OWN') ||
                    permissions.includes('PRODUCTS_VIEW_ALL') || 
                    permissions.includes('PRODUCTS_VIEW_OWN') ||
                    userRole === 'ADMIN' || 
                    userRole === 'MANAGER';

    if (!canView) {
        redirect('/dashboard');
    }

    return <SerialManagementClient userRole={userRole} userPermissions={permissions} />;
}
