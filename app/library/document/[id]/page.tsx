import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getDocumentById, getDocumentComments, getMyDocumentNotes, getLibraryCategories } from '../../actions';
import { ArrowLeft, Clock, Download, File, Video, MessageSquare, BookOpen, Share2, Shield, Lock, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DocumentSidebar from './DocumentSidebar';
import { ShareButton } from './ShareButton';
import { MoveDocumentButton } from '../../MoveDocumentButton';
import { DeleteDocumentButton } from '../../DeleteDocumentButton';
import styles from '../../library.module.css';
import { AvatarImage } from '@/app/components/ui/AvatarImage';

export async function generateMetadata({ params }: { params: { id: string } }) {
    const doc = await getDocumentById(params.id);
    return { title: doc?.title ? `${doc.title} | T-Drive` : "Chi tiết Tài liệu" };
}

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div style={{ padding: '2rem' }}>Chưa đăng nhập</div>;

    const document = await getDocumentById(params.id);
    if (!document) return notFound();

    // Fetch related data
    const [comments, notes, categories] = await Promise.all([
        getDocumentComments(params.id),
        getMyDocumentNotes(params.id),
        getLibraryCategories()
    ]);

    const canManage = ['ADMIN', 'MANAGER'].includes(session.user.role);
    const isConfidential = document.securityLevel === 'CONFIDENTIAL' || document.category?.securityLevel === 'CONFIDENTIAL';
    const canDownload = document.isDownloadable !== false;

    // Determine viewer type
    const isVideo = document.fileType === 'VIDEO' || document.fileUrl?.includes('youtube') || document.fileUrl?.includes('mp4');
    const isPDF = document.fileType === 'PDF' || document.fileUrl?.endsWith('.pdf');
    const isImage = document.fileType === 'IMAGE' || document.fileUrl?.match(/\.(jpeg|jpg|gif|png|webp)$/) != null;

    const watermarkText = `${session.user.name || session.user.email} • ${session.user.email} • ${new Date().toLocaleString('vi-VN')} • T-SOLUTIONS CONFIDENTIAL`;

    return (
        <div className={styles.libraryWrapper}>
            {/* Cột Trái: Trình Xem Tài Liệu (70%) */}
            <div className={styles.viewerMain}>
                {/* Header (Back button & Meta) */}
                <div style={{ height: '64px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', flexShrink: 0, zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link href={`/library${document.categoryId ? `?category=${document.categoryId}` : ''}`} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: '#cbd5e1', background: 'rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                            <ArrowLeft size={18} />
                        </Link>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h1 style={{ fontWeight: 600, color: '#f8fafc', fontSize: '1rem', margin: 0 }}>{document.title}</h1>
                                {isConfidential && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, background: '#e11d48', color: '#ffffff', letterSpacing: '0.05em' }}>
                                        <Lock size={10} /> MẬT LÃNH ĐẠO
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.125rem' }}>
                                <span style={{ textTransform: 'uppercase', fontWeight: 600, color: '#38bdf8' }}>{document.fileType || 'LINK'}</span>
                                {document.version && <span>• Phiên bản: <span style={{ color: '#cbd5e1' }}>v{document.version}</span></span>}
                                {document.category && <span>• Thư mục: <span style={{ color: '#cbd5e1' }}>{document.category.name}</span></span>}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {canManage && (
                            <>
                                <MoveDocumentButton documentId={document.id} currentCategoryId={document.categoryId} categories={categories} />
                                <DeleteDocumentButton documentId={document.id} />
                            </>
                        )}
                        <ShareButton documentId={document.id} />
                        {canDownload && document.fileUrl && !document.fileUrl.includes('youtube') ? (
                            <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', height: '36px', fontSize: '0.875rem', fontWeight: 500, padding: '0 1rem', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', textDecoration: 'none' }}>
                                <Download size={15} /> Tải về
                            </a>
                        ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', height: '36px', fontSize: '0.75rem', fontWeight: 600, padding: '0 0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                                <EyeOff size={14} /> Chế độ chỉ xem
                            </span>
                        )}
                    </div>
                </div>

                {/* Main Viewer Area */}
                <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {/* Watermark overlay for confidential files */}
                    {isConfidential && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 5,
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}
                        >
                            <div
                                style={{
                                    transform: 'rotate(-25deg)',
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    color: 'rgba(255, 255, 255, 0.08)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.15em',
                                    userSelect: 'none',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center',
                                    lineHeight: 3
                                }}
                            >
                                <div>{watermarkText}</div>
                                <div>{watermarkText}</div>
                                <div>{watermarkText}</div>
                            </div>
                        </div>
                    )}

                    {/* Viewer Container */}
                    <div className={styles.viewerContent}>
                        {isVideo ? (
                            <div className={styles.viewerBoxVideo}>
                                {document.fileUrl?.includes('youtube.com/watch?v=') ? (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${document.fileUrl.split('v=')[1]}`}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                        allowFullScreen
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                ) : (
                                    <video controls style={{ width: '100%', height: '100%' }} src={document.fileUrl || ''} poster={document.thumbnail || ''}>
                                        Trình duyệt của bạn không hỗ trợ thẻ video.
                                    </video>
                                )}
                            </div>
                        ) : isImage ? (
                            <div className={styles.viewerBoxWrap} style={{ background: 'transparent', boxShadow: 'none' }}>
                                <img src={document.fileUrl!} alt={document.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} />
                            </div>
                        ) : isPDF ? (
                            <div className={styles.viewerBoxWrap}>
                                <iframe src={`${document.fileUrl}#toolbar=0`} style={{ width: '100%', height: '100%', flex: 1, border: 'none' }} />
                            </div>
                        ) : (
                            <div className={styles.emptyState} style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                                <div className={styles.emptyStateIcon} style={{ background: '#334155', color: '#94a3b8' }}>
                                    <File size={32} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: '#f8fafc', marginBottom: '0.5rem', marginTop: 0 }}>Không có bản xem trước trực tiếp</h3>
                                <p style={{ marginBottom: '1.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                                    {canDownload 
                                        ? 'Định dạng file này chưa được hỗ trợ xem trực tiếp. Bạn có thể tải file về máy tính.'
                                        : 'Tài liệu này được bảo mật ở chế độ Chỉ Xem và không cho phép tải về máy tính.'}
                                </p>
                                {canDownload && document.fileUrl && (
                                    <a href={document.fileUrl!} target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>
                                        <Download size={16} /> Tải xuống
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Metadata Overview Panel */}
                    <div style={{ background: '#1e293b', padding: '1.5rem', borderTop: '1px solid #334155', flexShrink: 0 }}>
                        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '1.5rem', flexDirection: 'row' }}>
                            <div style={{ flexShrink: 0 }}>
                                <AvatarImage src={document.creator?.avatar} name={document.creator?.name} size={48} className="border-2 border-[#334155]" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.125rem', fontWeight: 500, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>{document.title}</h2>
                                <p style={{ color: '#94a3b8', margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.6, maxWidth: '800px' }}>{document.description || "Tài liệu này không có mô tả chi tiết."}</p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', fontSize: '0.875rem', color: '#64748b', flexShrink: 0 }}>
                                <div><span style={{ color: '#475569' }}>Đăng bởi:</span> <span style={{ fontWeight: 500, color: '#cbd5e1' }}>{document.creator.name}</span></div>
                                <div><span style={{ color: '#475569' }}>Ngày đăng:</span> <span style={{ fontWeight: 500, color: '#cbd5e1' }}>{document.createdAt ? new Date(document.createdAt).toLocaleDateString('vi-VN') : ''}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cột Phải: Sidebar Thảo luận & Ghi chú (30%) */}
            <DocumentSidebar documentId={document.id} initialComments={comments} initialNotes={notes} currentUser={session.user} />
        </div>
    );
}
