import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getHRAttendanceMatrix } from "@/app/hr/attendance/actions";
import HRAttendanceClient from "./HRAttendanceClient";

export const metadata = { title: "Bảng Chấm Công Toàn Công Ty - HR" };

export default async function HRAttendancePage({
    searchParams,
}: {
    searchParams: { month?: string, year?: string }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'HR'].includes(session.user.role)) {
        return <div className="p-8 text-center text-slate-500">Bạn không có quyền truy cập trang này.</div>;
    }

    const now = new Date();
    const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;
    const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

    const matrix = await getHRAttendanceMatrix(month, year);
    const daysInMonth = new Date(year, month, 0).getDate();

    return (
        <HRAttendanceClient 
            initialMatrix={matrix as any}
            month={month}
            year={year}
            daysInMonth={daysInMonth}
        />
    );
}
