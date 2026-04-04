import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
    try {
        const filePath = path.join(process.cwd(), 'uploads_data', ...params.path);

        // Security check: ensure path is within uploads_data
        const uploadsDir = path.join(process.cwd(), 'uploads_data');
        if (!filePath.startsWith(uploadsDir)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
            return new NextResponse('Not Found', { status: 404 });
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
            case '.mp4': mimeType = 'video/mp4'; break;
            case '.webm': mimeType = 'video/webm'; break;
        }

        const headers = new Headers();
        headers.set('Content-Type', mimeType);
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
