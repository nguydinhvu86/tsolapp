import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import EmployeesClient from "./EmployeesClient";
import { Users } from "lucide-react";

export const metadata = { title: "Quản lý Hồ sơ Nhân sự" };

export default async function EmployeesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'HR'].includes(session.user.role)) return <div>Unauthorized</div>;

    const employees = await prisma.user.findMany({
        where: { isActive: true }, // or all if we want inactive too. For now get all.
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeProfile: true,
            laborContracts: {
                where: { status: "ACTIVE" }
            }
        },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
            <div className="flex justify-between items-center bg-white p-4 sm:p-6 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Hồ Sơ Nhân Sự</h1>
                        <p className="text-sm text-slate-500">Quản lý căn cước, lương biên chế và hợp đồng của nhân sự</p>
                    </div>
                </div>
            </div>

            <EmployeesClient initialData={employees} />
        </div>
    );
}
