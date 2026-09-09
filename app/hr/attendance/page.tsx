import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getHRAttendanceMatrix } from "@/app/hr/attendance/actions";
import { Users } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { AttendanceExportButtons } from "./AttendanceExportButtons";

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
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50"></span>
                        Bảng Chấm Công Toàn Công Ty
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Tổng hợp và theo dõi chi tiết chuyên cần tháng {month}/{year} ({matrix.length} nhân sự)
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <form className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <select 
                            name="month" 
                            defaultValue={month} 
                            className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer px-2 py-1"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>Tháng {m}</option>
                            ))}
                        </select>
                        <div className="w-[1px] h-4 bg-slate-300"></div>
                        <select 
                            name="year" 
                            defaultValue={year} 
                            className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer px-2 py-1"
                        >
                            {[year - 1, year, year + 1].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <Button type="submit" className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Tra cứu</Button>
                    </form>

                    <AttendanceExportButtons matrix={matrix} month={month} year={year} daysInMonth={daysInMonth} />
                </div>
            </div>

            {/* Matrix Card */}
            <div id="attendance-matrix-table" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Ma Trận Chấm Công</h2>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full">{matrix.length} nhân sự</span>
                </div>

                <div className="custom-scrollbar overflow-x-auto">
                    <table style={{ width: `${800 + daysInMonth * 40}px`, minWidth: '100%', borderCollapse: 'collapse' }} className="text-left border-slate-200">
                        <thead>
                            <tr>
                                <th colSpan={3} className="px-3 py-2 bg-slate-50 border-b border-r border-slate-200 text-slate-700 text-xs font-bold text-center sticky left-0 z-20 shadow-[1px_0_0_0_#e2e8f0]">Thông tin Nhân sự</th>
                                <th colSpan={daysInMonth} className="px-3 py-2 bg-indigo-50/50 border-b border-slate-200 text-indigo-800 text-xs font-bold text-center">Chi tiết chấm công tháng {month}/{year}</th>
                            </tr>
                            <tr className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                                <th className="px-4 py-2.5 border-b border-r border-slate-200 sticky left-0 bg-slate-50 z-20 w-56 shadow-[1px_0_0_0_#e2e8f0]">Họ Tên</th>
                                <th className="px-2 py-2.5 border-b border-r border-slate-200 text-center w-16" title="Tổng Công Đi Làm">Công</th>
                                <th className="px-2 py-2.5 border-b border-r border-slate-200 text-center w-16" title="Số Lần Đi Muộn">Muộn</th>
                                {
                                    daysArray.map(day => {
                                        const date = new Date(year, month - 1, day);
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        return (
                                            <th key={day} className={`p-1.5 border-b border-r border-slate-200 text-center w-12 ${isWeekend ? 'bg-rose-50/50 text-rose-600' : ''}`}>
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-xs">{day}</span>
                                                    <span className="text-[9px] font-semibold uppercase opacity-70">
                                                        {date.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('Th ', 'T')}
                                                    </span>
                                                </div>
                                            </th>
                                        );
                                    })
                                }
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {matrix.map((row: any) => (
                                <tr key={row.user.id} className="group hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-2.5 border-b border-r border-slate-200 font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 w-56 truncate shadow-[1px_0_0_0_#e2e8f0]" title={row.user.name}>
                                        <div className="flex flex-col">
                                            <span className="text-xs">{row.user.name || 'Người dùng vô danh'}</span>
                                            {row.user.email && <span className="text-[10px] text-slate-400 font-normal truncate mt-0.5">{row.user.email}</span>}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2.5 border-b border-r border-slate-200 text-center font-bold text-emerald-700 bg-emerald-50/50 group-hover:bg-emerald-50 transition-colors font-mono">
                                        {row.totalPresent + (row.records && Object.values(row.records).filter((r: any) => r.status === 'LATE').length || 0)}
                                    </td>
                                    <td className="px-2 py-2.5 border-b border-r border-slate-200 text-center font-bold text-rose-600 bg-rose-50/50 group-hover:bg-rose-50 transition-colors font-mono">
                                        {row.totalLate}
                                    </td>
                                    {daysArray.map(day => {
                                        const record = row.records[day];
                                        let content = '-';
                                        let className = "text-slate-300 p-2 border-b border-r border-slate-200 text-center text-[11px] font-semibold";

                                        const date = new Date(year, month - 1, day);
                                        if (date.getDay() === 0) className += " bg-slate-50/80";

                                        if (record) {
                                            if (record.status === 'PRESENT') { content = 'X'; className = "p-2 border-b border-r border-emerald-100 text-center text-emerald-700 font-bold bg-emerald-50/60"; }
                                            else if (record.status === 'LATE') { content = 'M'; className = "p-2 border-b border-r border-amber-100 text-center text-amber-600 font-bold bg-amber-50/60"; }
                                            else if (record.status === 'HALF_DAY') { content = 'H'; className = "p-2 border-b border-r border-sky-100 text-center text-sky-600 font-bold bg-sky-50/60"; }
                                            else if (record.status === 'ABSENT') { content = 'V'; className = "p-2 border-b border-r border-rose-100 text-center text-rose-600 font-bold bg-rose-50/60"; }
                                        }

                                        return (
                                            <td key={day} className={`${className} group-hover:brightness-95 transition-all`} title={record ? `Vào: ${record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'} | Trạng thái: ${record.status}` : 'Không làm việc'}>
                                                {content}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {matrix.length === 0 && (
                                <tr>
                                    <td colSpan={3 + daysInMonth} className="p-16 text-center text-slate-500 bg-slate-50/50">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="w-10 h-10 text-slate-300 mb-2" strokeWidth={1.5} />
                                            <h3 className="text-sm font-bold text-slate-700">Chưa có dữ liệu</h3>
                                            <p className="text-xs text-slate-400 mt-0.5">Không tìm thấy bản ghi chấm công nào phù hợp với điều kiện tìm kiếm.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap gap-4 items-center">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="w-5 h-5 bg-emerald-50 border border-emerald-500 rounded flex items-center justify-center text-[10px] font-bold text-emerald-700">X</span> 
                    Đủ công (Đúng giờ)
                </span>
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="w-5 h-5 bg-amber-50 border border-amber-500 rounded flex items-center justify-center text-[10px] font-bold text-amber-700">M</span> 
                    Đi muộn
                </span>
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="w-5 h-5 bg-sky-50 border border-sky-500 rounded flex items-center justify-center text-[10px] font-bold text-sky-700">H</span> 
                    Nửa buổi (Cáo lui)
                </span>
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <span className="w-5 h-5 bg-rose-50 border border-rose-500 rounded flex items-center justify-center text-[10px] font-bold text-rose-700">V</span> 
                    Vắng mặt (Không Lương)
                </span>
            </div>
        </div>
    );
}
