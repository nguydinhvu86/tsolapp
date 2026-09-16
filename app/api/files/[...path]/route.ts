import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
    try {
        const uploadsDir = path.join(process.cwd(), 'uploads_data');
        const publicUploadsDir = path.join(process.cwd(), 'public', 'uploads');

        let filePath = path.join(uploadsDir, ...params.path);

        // Security check: ensure path is within allowed directories
        if (!fs.existsSync(filePath)) {
            // Check fallback in public/uploads (for legacy uploaded files)
            const fallbackPath = path.join(publicUploadsDir, ...params.path);
            if (fs.existsSync(fallbackPath) && fallbackPath.startsWith(publicUploadsDir)) {
                filePath = fallbackPath;
            } else {
                return new NextResponse('File Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
            }
        } else if (!filePath.startsWith(uploadsDir)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const stats = fs.statSync(filePath);
        const fileBuffer = fs.readFileSync(filePath);

        const ext = path.extname(filePath).toLowerCase();
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
            headers.set('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
            headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
        } else {
            headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(filePath))}"`);
        }

        headers.set('Content-Length', stats.size.toString());
        // Cache control to help browsers
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
