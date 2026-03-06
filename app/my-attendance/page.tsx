import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getMyAttendanceHistory } from "@/app/hr/attendance/actions";
import { Clock, CheckCircle, AlertCircle, Calendar, Filter, MapPin } from "lucide-react";

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
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="bg-indigo-100 p-2.5 rounded-xl">
                            <Calendar className="w-6 h-6 text-indigo-600" />
                        </div>
                        Bảng Công Của Tôi
                    </h1>
                    <p className="text-slate-500 mt-1.5 ml-12 text-sm">Theo dõi lịch sử chấm công và điểm danh hàng ngày</p>
                </div>

                <form className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100 w-full md:w-auto">
                    <div className="flex items-center gap-2 pl-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                    </div>
                    <select name="month" defaultValue={month} className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer pr-6 py-1.5 hover:text-indigo-600 transition-colors">
                        {months.map(m => (
                            <option key={m} value={m}>Tháng {m}</option>
                        ))}
                    </select>
                    <div className="w-px h-5 bg-slate-200"></div>
                    <select name="year" defaultValue={year} className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer pr-6 py-1.5 hover:text-indigo-600 transition-colors">
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm hover:shadow active:scale-95 ml-1">
                        Tra Cứu
                    </button>
                </form>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-emerald-100/50 p-3 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-slate-500 font-medium text-sm mb-1">Ngày Công Chuẩn</h3>
                        <p className="text-4xl font-bold text-slate-800 tracking-tight">{totalPresent} <span className="text-base font-normal text-slate-400">công</span></p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-amber-100/50 p-3 rounded-xl">
                            <AlertCircle className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-slate-500 font-medium text-sm mb-1">Số Lần Đi Muộn</h3>
                        <p className="text-4xl font-bold text-slate-800 tracking-tight">{totalLate} <span className="text-base font-normal text-slate-400">lần</span></p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-indigo-100/50 p-3 rounded-xl">
                            <Clock className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-slate-500 font-medium text-sm mb-1">Nửa Buổi</h3>
                        <p className="text-4xl font-bold text-slate-800 tracking-tight">{totalHalfDay} <span className="text-base font-normal text-slate-400">buổi</span></p>
                    </div>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Chi Tiết Điểm Danh</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Ngày</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng Thái</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Giờ Vào (In)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Giờ Ra (Out)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vị Trí (Location)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ghi Chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <Calendar className="w-10 h-10 opacity-20" />
                                            <p className="text-sm font-medium">Không có dữ liệu chấm công tháng này</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : records.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-700">{r.date.toLocaleDateString('vi-VN')}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{r.date.toLocaleDateString('vi-VN', { weekday: 'long' })}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {r.status === 'PRESENT' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium text-xs rounded-lg shadow-sm"><CheckCircle className="w-3.5 h-3.5" /> ĐÚNG GIỜ</span>}
                                        {r.status === 'LATE' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/60 font-medium text-xs rounded-lg shadow-sm"><AlertCircle className="w-3.5 h-3.5" /> ĐI MUỘN</span>}
                                        {r.status === 'HALF_DAY' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200/60 font-medium text-xs rounded-lg shadow-sm"><Clock className="w-3.5 h-3.5" /> NỬA BUỔI</span>}
                                        {r.status === 'ABSENT' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200/60 font-medium text-xs rounded-lg shadow-sm">VẮNG MẶT</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-block font-mono text-sm ${r.checkInTime ? 'text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded' : 'text-slate-300'}`}>
                                            {r.checkInTime ? r.checkInTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-block font-mono text-sm ${r.checkOutTime ? 'text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded' : 'text-slate-300'}`}>
                                            {r.checkOutTime ? r.checkOutTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {(r.checkInLocation || r.checkOutLocation) ? (
                                            <div className="flex flex-col gap-1.5 text-xs text-slate-500">
                                                {r.checkInLocation && <div className="flex items-start gap-1.5 group-hover:text-slate-700 transition-colors"><MapPin className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" /> <span className="line-clamp-1" title={r.checkInLocation}>In: {r.checkInLocation}</span></div>}
                                                {r.checkOutLocation && <div className="flex items-start gap-1.5 group-hover:text-slate-700 transition-colors"><MapPin className="w-3.5 h-3.5 mt-0.5 text-rose-400 shrink-0" /> <span className="line-clamp-1" title={r.checkOutLocation}>Out: {r.checkOutLocation}</span></div>}
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        <div className="max-w-[200px] truncate" title={r.notes || ''}>
                                            {r.notes || <span className="text-slate-300">-</span>}
                                        </div>
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
