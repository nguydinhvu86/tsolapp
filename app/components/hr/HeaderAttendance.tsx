'use client';

import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, CheckCircle, Camera, MapPin } from 'lucide-react';
import { getTodayAttendance, checkIn, checkOut } from '@/app/hr/attendance/actions';
import { Modal } from '../ui/Modal';

export function HeaderAttendance() {
    const [record, setRecord] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Modal & Webcam states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionType, setActionType] = useState<'IN' | 'OUT' | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getTodayAttendance();
            setRecord(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            setStream(null);
        }
    };

    const startCamera = async () => {
        try {
            stopCamera(); // Ensure any existing stream is stopped
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: any) {
            console.warn("Lỗi mở camera mặc định, thử lại với cấu hình fallback...", err);
            try {
                // Fallback configuration for restrictive hardware
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
                });
                setStream(fallbackStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                }
            } catch (fallbackErr: any) {
                setErrorMsg('Không thể mở Camera (Có thể do thiết bị đang được sử dụng ở ứng dụng khác, ví dụ: Zoom, OBS, hoặc tab khác). Lỗi: ' + fallbackErr.message);
            }
        }
    };

    const openModal = (type: 'IN' | 'OUT') => {
        setActionType(type);
        setErrorMsg('');
        setIsModalOpen(true);
        // Delay camera start slightly to ensure Modal DOM + video ref is fully mounted
        setTimeout(() => {
            startCamera();
        }, 500);
    };

    const closeModal = () => {
        stopCamera();
        setIsModalOpen(false);
    };

    const captureImage = (): string | null => {
        if (!videoRef.current) return null;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.5);
    };

    const getLocation = (): Promise<string> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve('Không hỗ trợ GPS');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve(`${pos.coords.latitude}, ${pos.coords.longitude}`),
                (err) => resolve(`Lỗi GPS: ${err.message}`),
                { timeout: 5000 }
            );
        });
    };

    const handleAction = async () => {
        setIsActionLoading(true);
        setErrorMsg('');

        try {
            const photoUrl = captureImage() || '';
            const location = await getLocation();

            let res;
            if (actionType === 'IN') {
                res = await checkIn({ photoUrl, location, notes: "App-Check-in" });
            } else {
                res = await checkOut({ photoUrl, location, notes: "App-Check-out" });
            }

            if (res.success) {
                setRecord(res.data);
                closeModal();
            } else {
                setErrorMsg(res.error || 'Có lỗi xảy ra');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Lỗi không xác định');
        } finally {
            setIsActionLoading(false);
        }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (isLoading) return <div className="animate-pulse w-24 h-9 bg-slate-100 rounded-lg"></div>;

    const hasCheckedIn = !!record?.checkInTime;
    const hasCheckedOut = !!record?.checkOutTime;

    return (
        <>
            <div className="flex items-center gap-2 mr-2">
                {(!hasCheckedIn || hasCheckedOut) && (
                    <button
                        onClick={() => openModal('IN')}
                        disabled={hasCheckedOut}
                        title={hasCheckedOut ? "Đã hoàn thành công việc hôm nay!" : "Chấm công vào làm"}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${hasCheckedOut ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}
                    >
                        <LogIn className="w-4 h-4" /> Check In
                    </button>
                )}

                {hasCheckedIn && !hasCheckedOut && (
                    <button
                        onClick={() => openModal('OUT')}
                        title="Chấm công tan làm"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-sm font-medium transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Check Out
                    </button>
                )}

                {hasCheckedOut && (
                    <div title="Đã hoàn thành điểm danh" className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <CheckCircle className="w-4 h-4" />
                    </div>
                )}
            </div>

            {mounted && isModalOpen && typeof document !== 'undefined' && require('react-dom').createPortal(
                <Modal isOpen={isModalOpen} onClose={closeModal} title={actionType === 'IN' ? 'CHECK IN BIỂU MẪU' : 'CHECK OUT BIỂU MẪU'} maxWidth="450px">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Trạng thái hiện tại */}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, margin: '0 0 0.25rem 0' }}>Giờ Vào (In)</p>
                                <p style={{ fontWeight: 600, margin: 0, color: record?.checkInTime ? '#4338ca' : '#94a3b8' }}>
                                    {record?.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </p>
                            </div>
                            <div style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, margin: '0 0 0.25rem 0' }}>Giờ Ra (Out)</p>
                                <p style={{ fontWeight: 600, margin: 0, color: record?.checkOutTime ? '#4338ca' : '#94a3b8' }}>
                                    {record?.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </p>
                            </div>
                        </div>

                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155', textAlign: 'center', margin: 0 }}>
                            Vui lòng chụp ảnh Selfie để xác nhận <br />
                            <span style={{ color: '#4f46e5', fontWeight: 700 }}>{actionType === 'IN' ? 'CHECK IN' : 'CHECK OUT'}</span>
                        </p>

                        <div style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: 'black', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)' }}>
                            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
                            <div style={{ position: 'absolute', left: 0, right: 0, bottom: '0.5rem', textAlign: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '9999px', backdropFilter: 'blur(4px)' }}>
                                    <MapPin style={{ width: '0.75rem', height: '0.75rem' }} /> Tọa độ GPS & Hình ảnh
                                </span>
                            </div>
                        </div>

                        {errorMsg && <p style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: 500, textAlign: 'center', margin: 0 }}>{errorMsg}</p>}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button
                                onClick={closeModal}
                                style={{ flex: 1, backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#334155', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={isActionLoading}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'white', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontWeight: 500, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', cursor: isActionLoading ? 'not-allowed' : 'pointer', backgroundColor: actionType === 'IN' ? '#4f46e5' : '#e11d48', opacity: isActionLoading ? 0.7 : 1, border: 'none' }}
                            >
                                <Camera style={{ width: '1.25rem', height: '1.25rem' }} /> {isActionLoading ? 'Đang xử lý...' : 'Chụp Ảnh'}
                            </button>
                        </div>
                    </div>
                </Modal>,
                document.body
            )}
        </>
    );
}
