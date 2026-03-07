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
        <div style={{ display: 'block', maxWidth: '100%', overflow: 'hidden' }}>
            <div className="flex flex-col gap-6 w-full">
                <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={24} style={{ color: 'var(--primary)' }} />
                        Bảng Chấm Công Toàn Công Ty
                    </h1>

                    <div className="flex items-center gap-4 flex-wrap">
                        <form className="flex items-center gap-2" style={{ background: 'var(--bg-primary)', padding: '0.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <select name="month" defaultValue={month} style={{ background: 'transparent', border: 'none', fontSize: '0.875rem', fontWeight: 500, outline: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>Tháng {m}</option>
                                ))}
                            </select>
                            <div style={{ width: '1px', height: '1.25rem', background: 'var(--border)' }}></div>
                            <select name="year" defaultValue={year} style={{ background: 'transparent', border: 'none', fontSize: '0.875rem', fontWeight: 500, outline: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem' }}>
                                {[year - 1, year, year + 1].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <Button type="submit" style={{ marginLeft: '0.25rem', padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>Tra cứu</Button>
                        </form>

                        <AttendanceExportButtons matrix={matrix} month={month} year={year} daysInMonth={daysInMonth} />
                    </div>
                </div>

                <Card id="attendance-matrix-table" style={{ padding: 0, width: '100%', display: 'block', overflow: 'hidden' }}>
                    <div className="flex items-center justify-between z-20 sticky left-0 min-w-full p-4 sm:p-6 border-b border-slate-100">
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Ma Trận Chấm Công</h2>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '0.125rem 0.5rem', borderRadius: '1rem' }}>{matrix.length} nhân sự</div>
                    </div>
                    <div className="custom-scrollbar" style={{ width: '100%', overflowX: 'auto', display: 'block', paddingBottom: '0.5rem' }}>
                        <table style={{ width: `${800 + daysInMonth * 40}px`, minWidth: '100%', borderCollapse: 'collapse' }} className="text-left border-slate-200">
                            <thead>
                                <tr>
                                    <th colSpan={3} className="px-3 bg-slate-50 border-b border-r border-slate-200 text-slate-700 font-bold text-center sticky left-0 z-20 shadow-[1px_0_0_0_#e2e8f0]">Thông tin Nhân sự</th>
                                    <th colSpan={daysInMonth} className="p-3 bg-indigo-50/50 border-b border-slate-200 text-indigo-800 font-bold text-center">Chi tiết chấm công tháng {month}/{year}</th>
                                </tr>
                                <tr className="bg-slate-50 text-slate-600 font-medium text-xs">
                                    <th className="px-4 py-3 border-b border-r border-slate-200 sticky left-0 bg-slate-50 z-20 w-56 shadow-[1px_0_0_0_#e2e8f0]">Họ Tên</th>
                                    <th className="px-2 py-3 border-b border-r border-slate-200 text-center w-16" title="Tổng Công Đi Làm">Công</th>
                                    <th className="px-2 py-3 border-b border-r border-slate-200 text-center w-16" title="Số Lần Đi Muộn">Muộn</th>
                                    {
                                        daysArray.map(day => {
                                            const date = new Date(year, month - 1, day);
                                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                            return (
                                                <th key={day} className={`p-2 border-b border-r border-slate-200 text-center w-12 ${isWeekend ? 'bg-rose-50/50 text-rose-600' : ''}`}>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="font-bold text-sm tracking-tight">{day}</span>
                                                        <span className="text-[10px] font-semibold uppercase opacity-70">
                                                            {date.toLocaleDateString('vi-VN', { weekday: 'short' }).replace('Th ', 'T')}
                                                        </span>
                                                    </div>
                                                </th>
                                            );
                                        })
                                    }
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {matrix.map((row: any) => (
                                    <tr key={row.user.id} className="group">
                                        <td className="px-4 py-3 border-b border-r border-slate-200 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 w-56 truncate shadow-[1px_0_0_0_#e2e8f0]" title={row.user.name}>
                                            <div className="flex flex-col">
                                                <span>{row.user.name || 'Người dùng vô danh'}</span>
                                                {row.user.email && <span className="text-xs text-slate-400 font-normal truncate mt-0.5">{row.user.email}</span>}
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 border-b border-r border-slate-200 text-center font-bold text-emerald-700 bg-emerald-50/50 group-hover:bg-emerald-50 transition-colors">
                                            {row.totalPresent + (row.records && Object.values(row.records).filter((r: any) => r.status === 'LATE').length || 0)}
                                        </td>
                                        <td className="px-2 py-3 border-b border-r border-slate-200 text-center font-bold text-rose-600 bg-rose-50/50 group-hover:bg-rose-50 transition-colors">
                                            {row.totalLate}
                                        </td>
                                        {daysArray.map(day => {
                                            const record = row.records[day];
                                            let content = '-';
                                            let className = "text-slate-300 p-2 border-b border-r border-slate-200 text-center text-xs";

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
                                        <td colSpan={3 + daysInMonth} className="p-20 text-center text-slate-500 bg-slate-50/50">
                                            <div className="flex flex-col items-center justify-center">
                                                <Users className="w-12 h-12 text-slate-300 mb-4" strokeWidth={1.5} />
                                                <h3 className="text-lg font-bold text-slate-700">Chưa có dữ liệu</h3>
                                                <p className="text-sm">Không tìm thấy bản ghi chấm công nào phù hợp với điều kiện tìm kiếm.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', rowGap: '0.5rem', alignItems: 'center' }}>
                    <span className="flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}><div style={{ width: '1.25rem', height: '1.25rem', background: 'var(--success-muted)', border: '1px solid var(--success)', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 'bold', color: 'var(--success)' }}>X</div> Đủ công (Đúng giờ)</span>
                    <span className="flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}><div style={{ width: '1.25rem', height: '1.25rem', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 'bold', color: '#d97706' }}>M</div> Đi muộn</span>
                    <span className="flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}><div style={{ width: '1.25rem', height: '1.25rem', background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 'bold', color: '#0284c7' }}>H</div> Nửa buổi (Cáo lui)</span>
                    <span className="flex items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}><div style={{ width: '1.25rem', height: '1.25rem', background: 'var(--danger-muted)', border: '1px solid var(--danger)', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 'bold', color: 'var(--danger)' }}>V</div> Vắng mặt (Không Lương/KLD)</span>
                </Card>
            </div>
        </div>
    );
}
