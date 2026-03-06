import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getHRAttendanceMatrix } from "@/app/hr/attendance/actions";
import { Calendar, Users } from "lucide-react";

export const metadata = { title: "Bảng Công HR" };

export default async function HRAttendancePage({
    searchParams,
}: {
    searchParams: { month?: string, year?: string }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'HR'].includes(session.user.role)) return <div>Unauthorized</div>;

    const now = new Date();
    const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;
    const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

    const matrix = await getHRAttendanceMatrix(month, year);
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <div className="p-6 max-w-[100vw] overflow-x-hidden space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-6 h-6 text-indigo-600" /> Bảng Chấm Công Toàn Công Ty
                </h1>

                <form className="flex gap-2">
                    <select name="month" defaultValue={month} className="border border-slate-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>Tháng {m}</option>
                        ))}
                    </select>
                    <select name="year" defaultValue={year} className="border border-slate-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-indigo-500">
                        {[year - 1, year, year + 1].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-1.5 rounded font-medium hover:bg-indigo-700">Xem</button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse border border-slate-200" style={{ minWidth: `${800 + daysInMonth * 40}px` }}>
                    <thead>
                        <tr>
                            <th colSpan={3} className="p-3 bg-slate-100 border border-slate-200 text-slate-700 font-bold text-center">Thông tin Nhân sự</th>
                            <th colSpan={daysInMonth} className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-800 font-bold text-center">Chi tiết chấm công tháng {month}/{year}</th>
                        </tr>
                        <tr className="bg-slate-50 text-slate-600 font-medium text-xs">
                            <th className="p-3 border border-slate-200 sticky left-0 bg-slate-50 z-10 w-48">Họ Tên</th>
                            <th className="p-3 border border-slate-200 text-center w-16" title="Tổng Công Đi Làm">Công</th>
                            <th className="p-3 border border-slate-200 text-center w-16" title="Số Phút Đi Muộn">Muộn</th>
                            {daysArray.map(day => {
                                const date = new Date(year, month - 1, day);
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                return (
                                    <th key={day} className={`p-2 border border-slate-200 text-center w-10 ${isWeekend ? 'bg-rose-50/50 text-rose-500' : ''}`}>
                                        <div className="flex flex-col items-center">
                                            <span>{day}</span>
                                            <span className="text-[9px] font-normal uppercase opacity-70">
                                                {date.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('Th ', 'T')}
                                            </span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {matrix.map((row: any) => (
                            <tr key={row.user.id} className="hover:bg-slate-50/50">
                                <td className="p-3 border border-slate-200 font-medium text-slate-800 sticky left-0 bg-white z-10 truncate" title={row.user.name}>
                                    {row.user.name || 'Người dùng vô danh'}
                                </td>
                                <td className="p-3 border border-slate-200 text-center font-bold text-emerald-600 bg-emerald-50/30">
                                    {row.totalPresent + (row.records && Object.values(row.records).filter((r: any) => r.status === 'LATE').length || 0)}
                                </td>
                                <td className="p-3 border border-slate-200 text-center font-bold text-red-500 bg-red-50/30">
                                    {row.totalLate}
                                </td>
                                {daysArray.map(day => {
                                    const record = row.records[day];
                                    let content = '-';
                                    let className = "text-slate-300 p-2 border border-slate-200 text-center";

                                    const date = new Date(year, month - 1, day);
                                    if (date.getDay() === 0) className += " bg-rose-50/30";

                                    if (record) {
                                        if (record.status === 'PRESENT') { content = 'X'; className = "p-2 border border-slate-200 text-center text-emerald-600 font-bold bg-emerald-50/30"; }
                                        else if (record.status === 'LATE') { content = 'M'; className = "p-2 border border-slate-200 text-center text-red-600 font-bold bg-red-50/30"; }
                                        else if (record.status === 'HALF_DAY') { content = 'H'; className = "p-2 border border-slate-200 text-center text-amber-600 font-bold bg-amber-50/30"; }
                                        else if (record.status === 'ABSENT') { content = 'V'; className = "p-2 border border-slate-200 text-center text-slate-500 font-bold bg-slate-100"; }
                                    }

                                    return (
                                        <td key={day} className={className} title={record ? `Vào: ${record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('vi-VN') : '-'} | Trạng thái: ${record.status}` : 'Không làm việc'}>
                                            {content}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {matrix.length === 0 && (
                            <tr>
                                <td colSpan={3 + daysInMonth} className="p-8 text-center text-slate-500">
                                    Không có dữ liệu nhân sự
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex gap-6 text-sm text-slate-600 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <span className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded"></div> X: Đủ công</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div> M: Đi muộn</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div> H: Nửa buổi</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-100 border border-slate-300 rounded"></div> V: Vắng mặt</span>
            </div>
        </div>
    );
}
