'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Web } from 'sip.js';
import { createLead } from '@/app/sales/leads/actions';
import { getSoftphoneCredentials, lookupContactByPhone } from './actions';
import { Phone, PhoneOff, Mic, MicOff, X, CircleDot, User as UserIcon, PlusCircle, CheckCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';

export function WebRTCDialer() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [extension, setExtension] = useState<string | null>(null);
    const [sipPassword, setSipPassword] = useState<string | null>(null);
    const [canUseSoftphone, setCanUseSoftphone] = useState<boolean>(true);
    
    const [simpleUser, setSimpleUser] = useState<Web.SimpleUser | null>(null);
    const [registrationState, setRegistrationState] = useState<string>('Offline / Init');
    const [callState, setCallState] = useState<'Idle'|'Calling'|'Ringing'|'InCall'>('Idle');
    const [targetNumber, setTargetNumber] = useState('');
    const [remoteNumber, setRemoteNumber] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [contactInfo, setContactInfo] = useState<{type: string, id: string, name: string} | null>(null);
    
    // Quick Add Lead state
    const [quickName, setQuickName] = useState('');
    const [quickNote, setQuickNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [isOpen, setIsOpen] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [callStartedAt, setCallStartTime] = useState<number>(0);

    // Dynamic contact lookup
    useEffect(() => {
        const queryNum = remoteNumber || targetNumber;
        if (!queryNum || queryNum.length < 8) {
            setContactInfo(null);
            setIsSuccess(false);
            setQuickName('');
            setQuickNote('');
            return;
        }

        const timeout = setTimeout(() => {
            lookupContactByPhone(queryNum).then(res => setContactInfo(res)).catch(console.error);
        }, 500);

        return () => clearTimeout(timeout);
    }, [remoteNumber, targetNumber]);

    const handleAddLead = async () => {
        const phoneToSave = remoteNumber || targetNumber;
        if (!quickName.trim() || !phoneToSave) return;
        setIsSubmitting(true);
        try {
            const newLead = await createLead({
                name: quickName,
                phone: phoneToSave,
                notes: quickNote,
                status: 'NEW',
                source: 'Inbound Call'
            });
            setIsSuccess(true);
            setContactInfo({ type: 'lead', id: newLead.id, name: quickName });
            setQuickName('');
            setQuickNote('');
            router.refresh();
        } catch (error) {
            console.error('Error quick creating lead:', error);
            alert('Không thể tạo Lead.');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (status === 'authenticated') {
            getSoftphoneCredentials().then(res => {
                if (res.extension && res.sipPassword) {
                    setExtension(res.extension);
                    setSipPassword(res.sipPassword);
                }
                if (res.canUseSoftphone !== undefined) {
                     setCanUseSoftphone(res.canUseSoftphone);
                }
            }).catch(console.error);
        }
    }, [status]);

    useEffect(() => {
        if (!extension || !sipPassword) return;

        const initSIP = async () => {
            const server = "wss://vcwebrtc.voicecloud.vn:9443";
            const aor = `sip:${extension}@trinhgia.incall.vn`;
            
            setRegistrationState('Registering');
            
            try {
                const user = new Web.SimpleUser(server, {
                    aor,
                    media: {
                        remote: {
                            audio: audioRef.current!
                        }
                    },
                    userAgentOptions: {
                        authorizationUsername: extension,
                        authorizationPassword: sipPassword,
                        logLevel: "error"
                    }
                });

                user.delegate = {
                    onCallReceived: () => {
                        // Extract caller ID dynamically from private session
                        const session = (user as any).session;
                        if (session?.remoteIdentity?.uri) {
                             const remoteUser = session.remoteIdentity.uri.user;
                             if (remoteUser) {
                                 setRemoteNumber(remoteUser);
                                 setTargetNumber(''); // Reset Outbound context to prefer Inbound Identity
                             }
                        }
                        setCallState('Ringing');
                        setIsOpen(true);
                    },
                    onCallCreated: () => {},
                    onCallAnswered: () => {
                        setCallState('InCall');
                        setIsMuted(false);
                        setCallStartTime(Date.now());
                    },
                    onCallHangup: () => {
                        // Log the call if it was answered
                        setCallState(prev => {
                             if (prev === 'InCall') {
                                 const duration = Math.round((Date.now() - callStartedAt) / 1000);
                                 const phoneToLog = remoteNumber || targetNumber;
                                 if (phoneToLog && duration > 0) {
                                      fetch('/api/callcenter/webrtc_logging', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ phone: phoneToLog, type: targetNumber ? 'OUTBOUND' : 'INBOUND', duration, status: 'ANSWER' })
                                      }).catch(() => {});
                                 }
                             } else if (prev === 'Calling') {
                                 // Missed Outbound
                                 const phoneToLog = targetNumber;
                                 if (phoneToLog) {
                                      fetch('/api/callcenter/webrtc_logging', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ phone: phoneToLog, type: 'OUTBOUND', duration: 0, status: 'NOANSWER' })
                                      }).catch(() => {});
                                 }
                             } else if (prev === 'Ringing') {
                                 // Missed Inbound
                                 const phoneToLog = remoteNumber;
                                 if (phoneToLog) {
                                      fetch('/api/callcenter/webrtc_logging', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ phone: phoneToLog, type: 'INBOUND', duration: 0, status: 'NOANSWER' })
                                      }).catch(() => {});
                                 }
                             }
                             return 'Idle';
                        });
                        setRemoteNumber('');
                    },
                    onServerConnect: () => {
                        console.log("SIP Connected");
                    },
                    onServerDisconnect: (err) => {
                        console.log("SIP Disconnect:", err);
                        setRegistrationState(err ? `DC Err: ${err.message}` : 'Disconnected');
                    },
                    onRegistered: () => {
                        setRegistrationState('Registered');
                    },
                    onUnregistered: () => {
                        setRegistrationState('Unregistered');
                    }
                };

                setRegistrationState('Connecting WSS...');
                await user.connect();
                
                setRegistrationState('Registering SIP...');
                await user.register();
                
                setSimpleUser(user);
            } catch (err: any) {
                console.error("SIP Setup error", err);
                setRegistrationState(`Err: ${err?.message || 'Crash'}`);
            }
        };

        // Delay initialization slightly to ensure audioRef is tightly bound
        setTimeout(() => {
             if (audioRef.current) {
                 initSIP();
             } else {
                 setRegistrationState('Err: No Audio Ref');
             }
        }, 500);

        return () => {
            if (simpleUser) {
                simpleUser.unregister()
                    .then(() => simpleUser.disconnect())
                    .catch(() => {});
            }
        };
    }, [extension, sipPassword]);

    const handleCall = async () => {
        if (!simpleUser || !targetNumber) return;
        setCallState('Calling');
        setRemoteNumber(targetNumber);
        try {
            await simpleUser.call(`sip:${targetNumber}@vcwebrtc.voicecloud.vn`);
        } catch (e) {
            console.error("Call failed", e);
            
            // Log failed call immediately
            fetch('/api/callcenter/webrtc_logging', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: targetNumber, type: 'OUTBOUND', duration: 0, status: 'FAILED' })
            }).catch(() => {});

            setCallState('Idle');
            setRemoteNumber('');
        }
    };

    const handleAnswer = async () => {
        if (!simpleUser) return;
        try {
            await simpleUser.answer();
            setCallState('InCall');
        } catch (e) {
            console.error("Answer failed", e);
            setCallState('Idle');
        }
    };

    const handleHangup = async () => {
        if (!simpleUser) return;
        try {
            await simpleUser.hangup();
        } catch (e) {
            // Already hung up or failed
        }
        setCallState('Idle');
        setRemoteNumber('');
    };

    const toggleMute = () => {
        if (!simpleUser || callState !== 'InCall') return;
        if (isMuted) {
            simpleUser.unmute();
            setIsMuted(false);
        } else {
            simpleUser.mute();
            setIsMuted(true);
        }
    };

    if (!canUseSoftphone) return null;

    if (!extension || !sipPassword) {
        if (session?.user?.role === 'ADMIN') {
            return (
                <button 
                    onClick={() => alert("Tổng đài WebRTC đã sẵn sàng! Vui lòng vào mục Quản lý Người Dùng -> 'Sửa thông tin' tài khoản của bạn để cấu hình số nội bộ (Ext) và Mật khẩu SIP. Tính năng gọi sẽ mở ngay sau khi lưu.")}
                    className="web-rtc-hide-print fixed bottom-6 right-6 z-[99999] w-14 h-14 bg-gray-400 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-500 transition-all cursor-help print:hidden no-print"
                    title="Softphone (Chưa thiết lập)"
                >
                    <PhoneOff className="text-white" size={24} />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full" />
                </button>
            );
        }
        return null;
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: '@media print { .web-rtc-hide-print { display: none !important; visibility: hidden !important; opacity: 0 !important; z-index: -9999 !important; } }' }} />
            <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
            
            {/* Action Widget Bubble */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="web-rtc-hide-print fixed bottom-6 right-6 z-[99999] w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform print:hidden no-print"
                >
                    <Phone className="text-white" size={24} />
                    {callState === 'Ringing' && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                    )}
                </button>
            )}

            {/* Softphone Dialer Interface */}
            {isOpen && (
                <div className="web-rtc-hide-print fixed bottom-6 right-6 z-[99999] w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col font-sans print:hidden no-print">
                    <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="font-semibold flex items-center gap-2">
                                <Phone size={16} /> WebRTC Phone
                            </span>
                            <span className="text-xs text-indigo-200 mt-1 flex items-center gap-1">
                                <CircleDot size={10} className={registrationState === 'Registered' ? "text-green-400" : "text-gray-400"} />
                                Ext {extension} • {registrationState}
                            </span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-indigo-700 p-1 rounded transition text-indigo-100">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex flex-col p-5 items-center">
                        {/* Status Label */}
                        <div className="text-sm font-medium text-gray-500 mb-2 h-5">
                            {callState === 'Calling' && 'Đang gọi...'}
                            {callState === 'Ringing' && 'Có cuộc gọi đến...'}
                            {callState === 'InCall' && 'Đang đàm thoại'}
                            {callState === 'Idle' && 'Sẵn sàng'}
                        </div>

                        {/* Number Display */}
                        <div className="w-full text-center text-2xl font-bold text-gray-800 tracking-wider h-10 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                            {remoteNumber || targetNumber || "..."}
                        </div>
                        
                        {/* Contact Name & Link */}
                        <div className="w-full text-center h-6 mb-3">
                             {contactInfo ? (
                                  <a href={`/${contactInfo.type === 'customer' ? 'customers' : 'sales/leads'}/${contactInfo.id}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex justify-center items-center gap-1">
                                      <UserIcon size={14} /> {contactInfo.name}
                                  </a>
                             ) : (
                                  (remoteNumber || targetNumber?.length > 8) && <span className="text-sm text-gray-400">Chưa lưu trên hệ thống</span>
                             )}
                        </div>

                        {/* Quick Create Lead Form */}
                        {!contactInfo && (remoteNumber || targetNumber?.length > 8) && (
                            <div className="w-full bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
                                {isSuccess ? (
                                    <div className="text-sm text-green-600 flex justify-center items-center gap-1 font-medium">
                                        <CheckCircle size={14} /> Đã lưu Lead
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-xs text-gray-500 mb-2 flex items-center gap-1 font-semibold">
                                            <PlusCircle size={12} /> LƯU NHANH LEAD
                                        </div>
                                        <input 
                                             placeholder="Tên khách / Lead..." 
                                             value={quickName}
                                             onChange={e => setQuickName(e.target.value)}
                                             className="w-full text-sm p-2 mb-2 border border-gray-200 rounded focus:border-indigo-400 outline-none"
                                         />
                                         <textarea 
                                             placeholder="Ghi chú (tuỳ chọn)..." 
                                             value={quickNote}
                                             onChange={e => setQuickNote(e.target.value)}
                                             rows={1}
                                             className="w-full text-sm p-2 mb-2 border border-gray-200 rounded focus:border-indigo-400 outline-none resize-none"
                                         />
                                         <button 
                                             onClick={handleAddLead}
                                             disabled={isSubmitting || !quickName.trim()}
                                             className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold py-2 rounded transition-colors disabled:opacity-50"
                                         >
                                             {isSubmitting ? 'Đang phân tích...' : 'Tạo Lead Mới'}
                                         </button>
                                    </>
                                )}
                            </div>
                        )}

                        {callState === 'Idle' && (
                            <div className="w-full mb-6">
                                <input 
                                    type="text"
                                    value={targetNumber}
                                    onChange={e => setTargetNumber(e.target.value)}
                                    placeholder="Nhập số điện thoại"
                                    className="w-full text-center text-lg border-b-2 border-gray-200 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                                    onKeyDown={e => { if (e.key === 'Enter') handleCall(); }}
                                />
                            </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-6 w-full mt-2">
                            {callState === 'Idle' ? (
                                <button 
                                    onClick={handleCall}
                                    disabled={!targetNumber}
                                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-lg disabled:opacity-50 disabled:hover:bg-green-500 transition-all"
                                >
                                    <Phone size={28} />
                                </button>
                            ) : (
                                <>
                                    {callState === 'InCall' && (
                                        <button 
                                            onClick={toggleMute}
                                            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        >
                                            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                                        </button>
                                    )}

                                    {callState === 'Ringing' && (
                                        <button 
                                            onClick={handleAnswer}
                                            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-lg transition-all animate-bounce"
                                        >
                                            <Phone size={24} />
                                        </button>
                                    )}

                                    <button 
                                        onClick={handleHangup}
                                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg transition-all"
                                    >
                                        <PhoneOff size={28} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
