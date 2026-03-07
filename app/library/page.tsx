import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { Folder, File, BookOpen, Search, PlayCircle, Layers, FileText, Image as ImageIcon, Link2, MessageSquare } from 'lucide-react';
import { getLibraryCategories, getLibraryDocuments } from './actions';
import Link from 'next/link';
import { LibraryActionButtons, CreateCategoryButton } from './LibraryActionButtons';
import { MoveDocumentButton } from './MoveDocumentButton';
import { ShareButton } from './document/[id]/ShareButton';
import styles from './library.module.css';

export const metadata = { title: "Thư Viện Điện Tử" };

// Helper format icon
const getFileIcon = (type: string, size = 64) => {
    switch (type) {
        case 'VIDEO': return <PlayCircle size={size} />;
        case 'PDF': return <FileText size={size} />;
        case 'LINK': return <Link2 size={size} />;
        default: return <File size={size} />;
    }
}

// A simple recursive component to render category tree
const CategoryTree = ({ categories, currentId, canManage }: { categories: any[], currentId?: string, canManage: boolean }) => {
    const rootCategories = categories.filter(c => !c.parentId);

    const renderNode = (node: any, depth: number) => {
        const hasChildren = categories.some(c => c.parentId === node.id);
        const isActive = currentId === node.id;

        return (
            <div key={node.id} style={{ paddingLeft: `${depth * 0.75}rem`, marginBottom: '0.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center' }} className={`group ${styles.sidebarItem} ${isActive ? styles.sidebarItemActive : ''}`}>
                    <Link href={`/library?category=${node.id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
                        <Folder size={16} />
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
                        {node._count?.documents > 0 && (
                            <span style={{ fontSize: '0.7rem', background: isActive ? '#dbeafe' : '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
                                {node._count.documents}
                            </span>
                        )}
                    </Link>
                    {canManage && (
                        <div style={{ paddingLeft: '0.5rem' }}>
                            <CreateCategoryButton parentId={node.id} iconOnly />
                        </div>
                    )}
                </div>
                {hasChildren && (
                    <div style={{ paddingLeft: '0.5rem', marginTop: '0.2rem' }}>
                        {categories.filter(c => c.parentId === node.id).map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ marginTop: '0.5rem' }}>
            <Link href={`/library`} className={`${styles.sidebarItem} ${!currentId ? styles.sidebarItemActive : ''}`}>
                <Layers size={16} />
                <span style={{ flex: 1 }}>Tất cả tài liệu</span>
            </Link>

            <div style={{ marginTop: '1.5rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', paddingLeft: '1.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '1.5rem' }}>
                    <span>Phân loại</span>
                    {canManage && <CreateCategoryButton parentId={undefined} iconOnly={false} compact />}
                </div>
                {rootCategories.map(root => renderNode(root, 0))}
            </div>
        </div>
    );
};

export default async function LibraryPage({
    searchParams,
}: {
    searchParams: { category?: string, search?: string }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div style={{ padding: '2rem' }}>Unauthorized</div>;

    const [categories, documents] = await Promise.all([
        getLibraryCategories(),
        getLibraryDocuments(searchParams.category, searchParams.search)
    ]);

    const activeCategory = searchParams.category ? categories.find((c: any) => c.id === searchParams.category) : null;
    const canManage = ['ADMIN', 'MANAGER'].includes(session.user.role);

    return (
        <div className={styles.libraryWrapper}>
            {/* Sidebar Cây Thư Mục */}
            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div style={{ background: '#2563eb', color: 'white', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
                        <BookOpen size={18} />
                    </div>
                    Thư Viện Điện Tử
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <CategoryTree categories={categories} currentId={searchParams.category} canManage={canManage} />
                </div>
            </div>

            {/* Vùng Chính: Tài Liệu */}
            <div className={styles.mainContent}>
                {/* Header Vùng Chính */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.headerTitle}>
                            {activeCategory ? activeCategory.name : 'Tất Cả Tài Liệu'}
                        </h1>
                        <p className={styles.headerSubtitle}>
                            {documents.length} tài liệu • {activeCategory?.description || 'Hệ thống lưu trữ và quản lý tri thức nội bộ'}
                        </p>
                    </div>

                    <div className={styles.actionsGroup}>
                        <div className={styles.searchContainer}>
                            <Search className={styles.searchIcon} size={16} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm tài liệu..."
                                className={styles.searchInput}
                                defaultValue={searchParams.search}
                            />
                        </div>
                        <LibraryActionButtons currentCategoryId={searchParams.category} canManage={canManage} categories={categories} />
                    </div>
                </div>

                {/* Grid Tài Liệu */}
                <div className={styles.libraryScrollArea}>
                    {documents.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                            <div style={{ width: '80px', height: '80px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                <File size={40} color="#94a3b8" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Không tìm thấy tài liệu</h3>
                            <p style={{ margin: 0 }}>Chưa có tài liệu nào trong khu vực này.</p>
                        </div>
                    ) : (
                        <div className={styles.bookGrid}>
                            {documents.map((doc: any, index: number) => {
                                let typeClass = styles.typeOther;
                                if (doc.fileType === 'PDF') typeClass = styles.typePdf;
                                if (doc.fileType === 'VIDEO') typeClass = styles.typeVideo;
                                if (doc.fileType === 'LINK') typeClass = styles.typeLink;

                                return (
                                    <Link key={doc.id} href={`/library/document/${doc.id}`} className={styles.bookCard}>
                                        <div className={styles.bookCover}>
                                            {doc.thumbnail ? (
                                                <img src={doc.thumbnail} alt={doc.title} className={styles.bookCoverImage} />
                                            ) : (
                                                <div style={{ color: '#94a3b8' }}>{getFileIcon(doc.fileType, 48)}</div>
                                            )}
                                            <div className={`${styles.bookTypeBadge} ${typeClass}`}>
                                                {doc.fileType || 'DOC'}
                                            </div>
                                            {doc.fileType === 'VIDEO' && (
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ width: '40px', height: '40px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <PlayCircle color="white" size={20} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.bookContent}>
                                            <h3 className={styles.bookTitle} title={doc.title}>{doc.title}</h3>
                                            <p className={styles.bookDesc}>{doc.description || "Không có mô tả chi tiết."}</p>
                                            <div className={styles.bookFooter}>
                                                <div className={styles.bookAuthor}>
                                                    {doc.creator.avatar ? (
                                                        <img src={doc.creator.avatar} className={styles.authorAvatar} alt="Author" style={{ border: 'none' }} />
                                                    ) : (
                                                        <div className={styles.authorAvatar}>{doc.creator.name?.charAt(0) || 'U'}</div>
                                                    )}
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569' }}>{doc.creator.name}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    {canManage && (
                                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc' }}>
                                                            <MoveDocumentButton documentId={doc.id} currentCategoryId={doc.categoryId} categories={categories} isIconOnly />
                                                        </div>
                                                    )}
                                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc' }}>
                                                        <ShareButton documentId={doc.id} isIconOnly />
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '0.5rem', color: '#64748b' }}>
                                                        <MessageSquare size={12} />
                                                        <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>{doc._count?.comments || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
