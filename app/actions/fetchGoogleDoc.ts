'use server';

import * as cheerio from 'cheerio';

export async function fetchGoogleDocHTML(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
    try {
        // 1. Validate and extract Document ID
        // Expected formats:
        // https://docs.google.com/document/d/1ABC123.../edit
        // https://docs.google.com/document/d/1ABC123.../view
        const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
        if (!match || !match[1]) {
            return {
                success: false,
                error: 'Link Google Docs không hợp lệ. Vui lòng đảm bảo link có định dạng hợp lệ (có chứa /document/d/...)'
            };
        }

        const docId = match[1];

        // 2. Construct the export URL
        // We export as html to get the raw document structure and formatting
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;

        // 3. Fetch from Google
        const response = await fetch(exportUrl, {
            method: 'GET',
            headers: {
                // Mimic a standard browser to avoid basic blocks if any, though public exports shouldn't strictly require it
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
            // We shouldn't cache this strictly if users are updating docs frequently, but revalidate is okay
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                return {
                    success: false,
                    error: 'Không thể truy cập tài liệu. Vui lòng đảm bảo bạn đã bật quyền "Bất kỳ ai có liên kết đều có thể xem" trong cài đặt Chia sẻ của Google Docs.'
                };
            }
            if (response.status === 404) {
                return {
                    success: false,
                    error: 'Không tìm thấy tài liệu. Link có thể bị sai hoặc tài liệu đã bị xóa.'
                };
            }
            throw new Error(`Google trả về mã lỗi: ${response.status} ${response.statusText}`);
        }

        const htmlRaw = await response.text();

        // 4. Sanitize and Extract the Core Body (Optional, but highly recommended for TinyMCE)
        // Google Docs wraps the content in <html><body>...</body></html> with an inline <style> block affecting the whole page.
        // We use cheerio to extract just the body contents and inline styles to inject cleanly.
        const $ = cheerio.load(htmlRaw);

        // Google docs puts critical styles in the head. We need them.
        const styles = $('head style').html();
        const bodyContent = $('body').html();

        if (!bodyContent) {
            return {
                success: false,
                error: 'Tài liệu trống hoặc không thể phân tích định dạng.'
            };
        }

        // We wrap it in a div and inject the style so TinyMCE has scope context without destroying its own iframe document styles
        const finalHtml = `
            <div class="google-doc-import">
                ${styles ? `<style>${styles}</style>` : ''}
                ${bodyContent}
            </div>
        `;

        return {
            success: true,
            html: finalHtml
        };

    } catch (error: any) {
        console.error('Error fetching Google Doc:', error);
        return {
            success: false,
            error: error.message || 'Đã xảy ra lỗi không xác định khi tải dữ liệu từ Google Docs.'
        };
    }
}
