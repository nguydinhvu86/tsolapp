import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getMyAttendanceHistory } from "@/app/hr/attendance/actions";
import { Clock, CheckCircle, AlertCircle, Calendar, Filter, MapPin, Image as ImageIcon } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import VerificationImageLink from "./VerificationImageLink";

export const metadata = { title: "Bảng Công Của Tôi" };

export default async function MyAttendancePage({
    searchParams,
}: {
    searchParams: { month?: string, year?: string }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div className="p-8 text-center text-slate-500">Unauthorized</div>;

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
        <div className="space-y-5 w-full max-w-full">
            {/* Standard Page Header */}
            <PageHeader
                category="NHÂN SỰ & CHẤM CÔNG"
                categoryColor="emerald"
                title="Bảng Công Của Tôi"
                description={`Theo dõi chi tiết dữ liệu điểm danh, ngày công thực tế và thời gian ra vào tháng ${month}/${year}`}
                actions={
                    <form className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                            <div className="flex items-center pl-2 text-slate-400">
                                <Calendar size={14} />
                            </div>
                            <select 
                                name="month" 
                                defaultValue={month} 
                                className="h-[34px] px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer shadow-2xs hover:border-slate-300 transition-colors"
                            >
                                {months.map(m => (
                                    <option key={m} value={m}>Tháng {m}</option>
                                ))}
                            </select>
                            <select 
                                name="year" 
                                defaultValue={year} 
                                className="h-[34px] px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer shadow-2xs hover:border-slate-300 transition-colors"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <button 
                                type="submit" 
                                className="btn btn-primary h-[34px] px-4 text-xs font-bold rounded-xl shadow-xs hover:shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                <Filter size={13} />
                                <span>Tra Cứu</span>
                            </button>
                        </div>
                    </form>
                }
            />

            {/* Statistics Cards - Standardized Typography & Proportions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:border-emerald-300 transition-all hover:shadow-xs">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Ngày Công Chuẩn</div>
                        <div className="flex items-baseline gap-2 my-1">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">{totalPresent}</span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">công</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đã chấm đủ &amp; đúng giờ</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs shrink-0">
                        <CheckCircle size={22} className="stroke-[2.2]" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:border-rose-300 transition-all hover:shadow-xs">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Số Lần Đi Muộn</div>
                        <div className="flex items-baseline gap-2 my-1">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400 tabular-nums">{totalLate}</span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">lần</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Vào sau giờ quy định</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-2xs shrink-0">
                        <AlertCircle size={22} className="stroke-[2.2]" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:border-amber-300 transition-all hover:shadow-xs">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nửa Buổi / Vắng</div>
                        <div className="flex items-baseline gap-2 my-1">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 tabular-nums">{totalHalfDay}</span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">buổi</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Có phép hoặc vắng mặt</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs shrink-0">
                        <Clock size={22} className="stroke-[2.2]" />
                    </div>
                </div>
            </div>

            {/* Attendance Table - Standardized Typography & Responsive Scrolling */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>Chi Tiết Điểm Danh</span>
                        <span className="text-slate-400 text-[11px] font-normal lowercase">(Tháng {month}/{year})</span>
                    </h2>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/70 px-2.5 py-0.5 rounded-full font-mono">
                        {records.length} bản ghi
                    </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[880px]">
                        <thead>
                            <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                                <th className="px-4 py-3 text-left">Ngày</th>
                                <th className="px-4 py-3 text-left">Trạng Thái</th>
                                <th className="px-4 py-3 text-center">Giờ Vào (In)</th>
                                <th className="px-4 py-3 text-center">Giờ Ra (Out)</th>
                                <th className="px-4 py-3 text-left">Vị Trí (Location)</th>
                                <th className="px-4 py-3 text-center">Ảnh Xác Minh</th>
                                <th className="px-4 py-3 text-left">Ghi Chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-500 bg-slate-50/30 dark:bg-slate-800/20">
                                        <div className="flex flex-col items-center justify-center">
                                            <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2.5" strokeWidth={1.5} />
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Không có dữ liệu điểm danh tháng này</h3>
                                            <p className="text-xs text-slate-400 mt-1">Các lượt chấm công trong tháng {month}/{year} sẽ được tổng hợp tự động tại đây.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : records.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3.5">
                                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{r.date.toLocaleDateString('vi-VN')}</div>
                                        <div className="text-[11px] text-slate-400 font-medium capitalize mt-0.5">{r.date.toLocaleDateString('vi-VN', { weekday: 'long' })}</div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        {r.status === 'PRESENT' && <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">Đúng Giờ</span>}
                                        {r.status === 'LATE' && <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">Đi Muộn</span>}
                                        {r.status === 'HALF_DAY' && <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">Nửa Buổi</span>}
                                        {r.status === 'ABSENT' && <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">Vắng Mặt</span>}
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                        <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700">
                                            {r.checkInTime ? r.checkInTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                        <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700">
                                            {r.checkOutTime ? r.checkOutTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                                        {(r.checkInLocation || r.checkOutLocation) ? (
                                             <div className="flex flex-col gap-1 text-xs">
                                                {r.checkInLocation && <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300"><MapPin size={13} className="text-emerald-600 shrink-0" /><span className="truncate max-w-[220px]">{r.checkInLocation}</span></div>}
                                                {r.checkOutLocation && <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><MapPin size={13} className="text-rose-500 shrink-0" /><span className="truncate max-w-[220px]">{r.checkOutLocation}</span></div>}
                                            </div>
                                        ) : <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="px-4 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {r.checkInPhotoUrl && (
                                                <VerificationImageLink url={r.checkInPhotoUrl} type="IN" />
                                            )}
                                            {r.checkOutPhotoUrl && (
                                                <VerificationImageLink url={r.checkOutPhotoUrl} type="OUT" />
                                            )}
                                            {(!r.checkInPhotoUrl && !r.checkOutPhotoUrl) && <span className="text-slate-300 dark:text-slate-600">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 text-xs">
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
