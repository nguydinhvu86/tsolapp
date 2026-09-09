import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getMyAttendanceHistory } from "@/app/hr/attendance/actions";
import { Clock, CheckCircle, AlertCircle, Calendar, Filter, MapPin, Image as ImageIcon } from "lucide-react";
import { Card } from "@/app/components/ui/Card";
import { Table } from "@/app/components/ui/Table";
import VerificationImageLink from "./VerificationImageLink";

export const metadata = { title: "Lịch Sử Chấm Công" };

export default async function MyAttendancePage({
    searchParams,
}: {
    searchParams: { month?: string, year?: string }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div>Unauthorized</div>;

    const now = new Date();
    const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;
    const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

    const records = await getMyAttendanceHistory(month, year);

    // Calculate sum logic
    const totalPresent = records.filter(r => r.status === 'PRESENT').length;
    const totalLate = records.filter(r => r.status === 'LATE').length;
    const totalHalfDay = records.filter(r => r.status === 'HALF_DAY').length;

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = [year - 1, year, year + 1];

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></span>
                        Bảng Công Của Tôi
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Theo dõi chi tiết dữ liệu điểm danh, ngày công thực tế và thời gian ra vào tháng {month}/{year}
                    </p>
                </div>

                <form className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <div className="flex items-center pl-2 text-slate-400">
                        <Filter size={14} />
                    </div>
                    <select 
                        name="month" 
                        defaultValue={month} 
                        className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer px-2 py-1"
                    >
                        {months.map(m => (
                            <option key={m} value={m}>Tháng {m}</option>
                        ))}
                    </select>
                    <div className="w-[1px] h-4 bg-slate-300"></div>
                    <select 
                        name="year" 
                        defaultValue={year} 
                        className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer px-2 py-1"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button 
                        type="submit" 
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-200 transition-all cursor-pointer"
                    >
                        Tra Cứu
                    </button>
                </form>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-emerald-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Ngày Công Chuẩn</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-emerald-600">{totalPresent}</span>
                            <span className="text-xs font-medium text-slate-400">công</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Đã chấm đủ & đúng giờ</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-rose-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Số Lần Đi Muộn</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-rose-600">{totalLate}</span>
                            <span className="text-xs font-medium text-slate-400">lần</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Vào sau giờ quy định</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                        <AlertCircle size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-amber-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nửa Buổi / Vắng</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-amber-600">{totalHalfDay}</span>
                            <span className="text-xs font-medium text-slate-400">buổi</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Có phép hoặc vắng mặt</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                        <Clock size={22} />
                    </div>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Chi Tiết Điểm Danh</h2>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                        {records.length} bản ghi
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Ngày</th>
                                <th className="px-4 py-3 text-left">Trạng Thái</th>
                                <th className="px-4 py-3 text-center">Giờ Vào (In)</th>
                                <th className="px-4 py-3 text-center">Giờ Ra (Out)</th>
                                <th className="px-4 py-3 text-left">Vị Trí (Location)</th>
                                <th className="px-4 py-3 text-center">Ảnh Xác Minh</th>
                                <th className="px-4 py-3 text-left">Ghi Chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-500 bg-slate-50/30">
                                        <div className="flex flex-col items-center justify-center">
                                            <Calendar className="w-10 h-10 text-slate-300 mb-2.5" strokeWidth={1.5} />
                                            <h3 className="text-sm font-bold text-slate-700">Không có dữ liệu điểm danh tháng này</h3>
                                            <p className="text-xs text-slate-400 mt-1">Các lượt chấm công trong tháng {month}/{year} sẽ được tổng hợp tự động tại đây.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : records.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-900">{r.date.toLocaleDateString('vi-VN')}</div>
                                        <div className="text-[11px] text-slate-400 font-medium capitalize mt-0.5">{r.date.toLocaleDateString('vi-VN', { weekday: 'long' })}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {r.status === 'PRESENT' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Đúng Giờ</span>}
                                        {r.status === 'LATE' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Đi Muộn</span>}
                                        {r.status === 'HALF_DAY' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Nửa Buổi</span>}
                                        {r.status === 'ABSENT' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">Vắng Mặt</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                                            {r.checkInTime ? r.checkInTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                                            {r.checkOutTime ? r.checkOutTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {(r.checkInLocation || r.checkOutLocation) ? (
                                            <div className="flex flex-col gap-1 text-[11px]">
                                                {r.checkInLocation && <div className="flex items-center gap-1 text-slate-700"><MapPin size={12} className="text-emerald-600 shrink-0" /><span className="truncate max-w-[220px]">{r.checkInLocation}</span></div>}
                                                {r.checkOutLocation && <div className="flex items-center gap-1 text-slate-500"><MapPin size={12} className="text-rose-500 shrink-0" /><span className="truncate max-w-[220px]">{r.checkOutLocation}</span></div>}
                                            </div>
                                        ) : <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {r.checkInPhotoUrl && (
                                                <VerificationImageLink url={r.checkInPhotoUrl} type="IN" />
                                            )}
                                            {r.checkOutPhotoUrl && (
                                                <VerificationImageLink url={r.checkOutPhotoUrl} type="OUT" />
                                            )}
                                            {(!r.checkInPhotoUrl && !r.checkOutPhotoUrl) && <span className="text-slate-300">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {r.notes || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
