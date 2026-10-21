import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
    try {
        const uploadsDir = path.resolve(process.cwd(), 'uploads_data');
        const publicUploadsDir = path.resolve(process.cwd(), 'public', 'uploads');

        // Path Traversal Security: Prevent directory traversal outside uploadsDir
        const safeSegments = (params.path || []).filter(segment => segment !== '..' && segment !== '.' && !segment.includes('/\\'));
        let targetPath = path.resolve(uploadsDir, ...safeSegments);

        // Verify that resolved path is strictly within uploadsDir or publicUploadsDir
        const isInUploadsDir = targetPath.toLowerCase().startsWith(uploadsDir.toLowerCase());
        let finalPath = targetPath;

        if (!isInUploadsDir || !fs.existsSync(finalPath)) {
            // Check fallback in public/uploads (for legacy uploaded files)
            const fallbackPath = path.resolve(publicUploadsDir, ...safeSegments);
            const isInPublicUploads = fallbackPath.toLowerCase().startsWith(publicUploadsDir.toLowerCase());
            
            if (isInPublicUploads && fs.existsSync(fallbackPath)) {
                finalPath = fallbackPath;
            } else {
                return new NextResponse('File Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
            }
        }

        const stats = fs.statSync(finalPath);
        const fileBuffer = fs.readFileSync(finalPath);

        const ext = path.extname(finalPath).toLowerCase();
        let mimeType = 'application/octet-stream';
        
        switch (ext) {
            case '.png': mimeType = 'image/png'; break;
            case '.jpg':
            case '.jpeg': mimeType = 'image/jpeg'; break;
            case '.gif': mimeType = 'image/gif'; break;
            case '.webp': mimeType = 'image/webp'; break;
            case '.svg': mimeType = 'image/svg+xml'; break;
            case '.pdf': mimeType = 'application/pdf'; break;
            case '.xml': mimeType = 'application/xml; charset=utf-8'; break;
            case '.mp4': mimeType = 'video/mp4'; break;
            case '.webm': mimeType = 'video/webm'; break;
            case '.doc': mimeType = 'application/msword'; break;
            case '.docx': mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; break;
            case '.xls': mimeType = 'application/vnd.ms-excel'; break;
            case '.xlsx': mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; break;
            case '.ppt': mimeType = 'application/vnd.ms-powerpoint'; break;
            case '.pptx': mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'; break;
            case '.txt': case '.csv': mimeType = 'text/plain; charset=utf-8'; break;
            case '.zip': mimeType = 'application/zip'; break;
            case '.rar': mimeType = 'application/vnd.rar'; break;
        }

        const headers = new Headers();
        headers.set('Content-Type', mimeType);
        
        // Security check: Force download for vector formats explicitly to prevent inline JS execution
        if (ext === '.svg') {
            headers.set('Content-Disposition', `attachment; filename="${path.basename(finalPath)}"`);
            headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
        } else {
            headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(finalPath))}"`);
        }

        headers.set('Content-Length', stats.size.toString());
        headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');

        return new NextResponse(fileBuffer, {
            status: 200,
            headers,
        });
    } catch (e) {
        console.error('Error serving file:', e);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
