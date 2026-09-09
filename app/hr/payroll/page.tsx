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
        <div className="space-y-6 w-full">
            <PayrollClient initialData={payrolls} currentMonth={month} currentYear={year} />
        </div>
    );
}
