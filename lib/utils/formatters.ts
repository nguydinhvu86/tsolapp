import { format as dateFnsFormat } from 'date-fns';

export const formatMoney = (amount: number) => { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount); };

export const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return dateFnsFormat(date, 'dd/MM/yyyy');
};

export const formatDateTime = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return dateFnsFormat(date, 'dd/MM/yyyy HH:mm');
};

/**
 * Escapes HTML characters in a plain text string to prevent XSS.
 */
export function escapeHtml(text: string): string {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Finds URLs in a mixed HTML/Text string and converts them to clickable <a> tags.
 * Safely ignores URLs that are already part of existing HTML tags (like href="..." or src="...").
 */
export function autoLinkHtml(htmlOrText: string): string {
    if (!htmlOrText) return '';

    // URL Regex: Matches http://, https://, or www.
    // We want to avoid trailing punctuation like dot or comma at the end of a URL.
    const urlRegex = /(?:https?:\/\/|www\.)[^\s<]+(?=[\s<]|$)/gi;

    const parts = htmlOrText.split(/(<[^>]+>)/g);
    let insideAnchor = false;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        // If it's an HTML tag, pass through
        if (part.startsWith('<')) {
            const lowerPart = part.toLowerCase();
            if (lowerPart.startsWith('<a ') || lowerPart === '<a>') {
                insideAnchor = true;
            } else if (lowerPart === '</a>') {
                insideAnchor = false;
            }
            continue;
        }

        // If it's text and we aren't inside an existing <a> link
        if (!insideAnchor) {
            parts[i] = part.replace(urlRegex, (url) => {
                // Strip trailing punctuation often accidentally included in plain text URLs
                let cleanUrl = url;
                let trailingPunctuation = '';
                if (/[.,;!?\)]$/.test(cleanUrl)) {
                    trailingPunctuation = cleanUrl.charAt(cleanUrl.length - 1);
                    cleanUrl = cleanUrl.slice(0, -1);
                }

                const href = cleanUrl.toLowerCase().startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
                // Important: adding 'auto-linked' class or inline styles to make it identifiable
                return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${cleanUrl}</a>${trailingPunctuation}`;
            });
        }
    }

    return parts.join('');
}

/**
 * Convenience function: Escapes plain text for XSS safety, then auto-links URLs, and returns an HTML string.
 * This is safe to use within dangerouslySetInnerHTML for raw text inputs like notes.
 */
export function autoLinkText(plainText: string): string {
    if (!plainText) return '';
    return autoLinkHtml(escapeHtml(plainText));
}
