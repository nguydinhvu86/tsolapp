import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import PayrollClient from "./PayrollClient";
import { Calculator } from "lucide-react";

export const metadata = { title: "Quản lý Lương (Payroll)" };

export default async function PayrollPage({
    searchParams,
}: {
    searchParams: { month?: string, year?: string }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'HR'].includes(session.user.role)) return <div>Unauthorized</div>;

    const now = new Date();
    const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;
    const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

    const payrolls = await prisma.payroll.findMany({
        where: { month, year },
        include: {
            user: {
                select: { name: true, email: true, employeeProfile: true }
            }
        },
        orderBy: { user: { name: 'asc' } }
    });

    return (
        <div className="flex flex-col gap-6 w-full pb-10">
            <div className="flex justify-between items-center bg-white p-4 sm:p-6 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Quản lý Lương (Payroll)</h1>
                        <p className="text-sm text-slate-500">Kỳ tính lương: Tháng {month} / {year}</p>
                    </div>
                </div>
            </div>

            <PayrollClient initialData={payrolls} currentMonth={month} currentYear={year} />
        </div>
    );
}
