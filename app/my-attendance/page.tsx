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
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={24} style={{ color: 'var(--primary)' }} />
                    Bảng Công Của Tôi
                </h1>

                <form className="flex items-center gap-2" style={{ background: '#fff', padding: '0.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 pl-2">
                        <Filter size={16} color="var(--text-muted)" />
                    </div>
                    <select name="month" defaultValue={month} style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {months.map(m => (
                            <option key={m} value={m}>Tháng {m}</option>
                        ))}
                    </select>
                    <div style={{ width: '1px', height: '1.25rem', backgroundColor: 'var(--border)' }}></div>
                    <select name="year" defaultValue={year} style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button type="submit" style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.375rem 1rem', borderRadius: 'calc(var(--radius) - 2px)', fontWeight: 500, cursor: 'pointer' }}>
                        Tra Cứu
                    </button>
                </form>
            </div>

            {/* Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Card className="summary-card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', backgroundColor: '#d1fae5', color: '#059669' }}>
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#064e3b', margin: 0 }}>Ngày Công Chuẩn</h3>
                            <p style={{ fontSize: '0.875rem', color: '#10b981', margin: 0, marginTop: '4px' }}>{totalPresent} công</p>
                        </div>
                    </div>
                </Card>

                <Card className="summary-card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', backgroundColor: '#fee2e2', color: '#dc2626' }}>
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#7f1d1d', margin: 0 }}>Số Lần Đi Muộn</h3>
                            <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0, marginTop: '4px' }}>{totalLate} lần</p>
                        </div>
                    </div>
                </Card>

                <Card className="summary-card" style={{ padding: '1.25rem', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', backgroundColor: '#fef3c7', color: '#d97706' }}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#78350f', margin: 0 }}>Nửa Buổi</h3>
                            <p style={{ fontSize: '0.875rem', color: '#d97706', margin: 0, marginTop: '4px' }}>{totalHalfDay} buổi</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Attendance Table */}
            <Card>
                <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Chi Tiết Điểm Danh</h2>
                </div>
                <Table>
                    <thead>
                        <tr>
                            <th>Ngày</th>
                            <th>Trạng Thái</th>
                            <th style={{ textAlign: 'center' }}>Giờ Vào (In)</th>
                            <th style={{ textAlign: 'center' }}>Giờ Ra (Out)</th>
                            <th>Vị Trí (Location)</th>
                            <th style={{ textAlign: 'center' }}>Ảnh Xác Minh</th>
                            <th>Ghi Chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Không có dữ liệu điểm danh tháng này.
                                </td>
                            </tr>
                        ) : records.map(r => (
                            <tr key={r.id}>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{r.date.toLocaleDateString('vi-VN')}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.date.toLocaleDateString('vi-VN', { weekday: 'short' })}</div>
                                </td>
                                <td>
                                    {r.status === 'PRESENT' && <span className="p-1 px-2 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">ĐÚNG GIỜ</span>}
                                    {r.status === 'LATE' && <span className="p-1 px-2 rounded-full text-xs font-medium bg-rose-100 text-rose-800">ĐI MUỘN</span>}
                                    {r.status === 'HALF_DAY' && <span className="p-1 px-2 rounded-full text-xs font-medium bg-amber-100 text-amber-800">NỬA BUỔI</span>}
                                    {r.status === 'ABSENT' && <span className="p-1 px-2 rounded-full text-xs font-medium bg-slate-100 text-slate-800">VẮNG MẶT</span>}
                                </td>
                                <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                                    {r.checkInTime ? r.checkInTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </td>
                                <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                                    {r.checkOutTime ? r.checkOutTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </td>
                                <td style={{ fontSize: '0.875rem' }}>
                                    {(r.checkInLocation || r.checkOutLocation) ? (
                                        <div className="flex flex-col gap-1 text-slate-600">
                                            {r.checkInLocation && <div><MapPin size={12} className="inline mr-1 text-emerald-600" />{r.checkInLocation}</div>}
                                            {r.checkOutLocation && <div><MapPin size={12} className="inline mr-1 text-rose-600" />{r.checkOutLocation}</div>}
                                        </div>
                                    ) : '-'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <div className="flex flex-col items-center gap-2">
                                        {r.checkInPhotoUrl && (
                                            <VerificationImageLink url={r.checkInPhotoUrl} type="IN" />
                                        )}
                                        {r.checkOutPhotoUrl && (
                                            <VerificationImageLink url={r.checkOutPhotoUrl} type="OUT" />
                                        )}
                                        {(!r.checkInPhotoUrl && !r.checkOutPhotoUrl) && <span className="text-slate-300">-</span>}
                                    </div>
                                </td>
                                <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    {r.notes || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card>
        </div>
    );
}
