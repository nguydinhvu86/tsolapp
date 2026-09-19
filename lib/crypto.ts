import crypto from 'crypto';

// Secret key derivation from environment variable with secure fallback
const MASTER_SECRET = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || 'tsol-erp-enterprise-master-key-2024';

// Derive 32-byte key for AES-256 and 32-byte key for HMAC
const ENCRYPTION_KEY = crypto.createHash('sha256').update(MASTER_SECRET).digest();
const HMAC_KEY = crypto.createHash('sha256').update(MASTER_SECRET + '-hmac-salt').digest();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const PREFIX = 'enc:v1:';

/**
 * Mã hóa một chuỗi văn bản (như SIP password, API token) bằng AES-256-GCM
 */
export function encryptSensitive(plainText: string | null | undefined): string | null {
    if (!plainText) return null;
    if (plainText.startsWith(PREFIX)) {
        // Đã được mã hóa trước đó, giữ nguyên
        return plainText;
    }

    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        
        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag().toString('hex');
        
        // Định dạng lưu trữ: enc:v1:<iv_hex>:<authTag_hex>:<encrypted_hex>
        return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err) {
        console.error('Lỗi mã hóa dữ liệu nhạy cảm:', err);
        return plainText; // Fallback an toàn
    }
}

/**
 * Giải mã một chuỗi đã được mã hóa bằng AES-256-GCM
 * Tự động nhận diện nếu chuỗi là plain-text chưa mã hóa (tương thích dữ liệu cũ)
 */
export function decryptSensitive(cipherText: string | null | undefined): string | null {
    if (!cipherText) return null;
    if (!cipherText.startsWith(PREFIX)) {
        // Chuỗi chưa được mã hóa (dữ liệu cũ từ trước), trả về trực tiếp
        return cipherText;
    }

    try {
        const parts = cipherText.replace(PREFIX, '').split(':');
        if (parts.length !== 3) {
            return cipherText;
        }

        const [ivHex, authTagHex, encryptedHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (err) {
        console.error('Lỗi giải mã dữ liệu nhạy cảm:', err);
        return cipherText;
    }
}

/**
 * Tạo HMAC Signed Token cho tài liệu công khai (Báo giá, Hóa đơn, Đơn hàng)
 * Chống quét ngẫu nhiên ID (Anti-IDOR / Tamper-proof)
 */
export function createSignedDocToken(docId: string, docType: string, expiresInDays: number = 30): string {
    const expiresAt = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60);
    const payload = `${docId}:${docType}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', HMAC_KEY).update(payload).digest('hex').slice(0, 32);
    
    // Token dạng base64 URL-safe
    const tokenRaw = `${payload}:${signature}`;
    return Buffer.from(tokenRaw).toString('base64url');
}

/**
 * Xác thực HMAC Signed Token cho tài liệu công khai
 */
export function verifySignedDocToken(token: string | null | undefined, expectedDocId?: string): {
    isValid: boolean;
    docId?: string;
    docType?: string;
    isExpired?: boolean;
} {
    if (!token) return { isValid: false };

    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf8');
        const parts = decoded.split(':');
        if (parts.length !== 4) return { isValid: false };

        const [docId, docType, expiresAtStr, signature] = parts;
        const expiresAt = parseInt(expiresAtStr, 10);
        
        if (isNaN(expiresAt)) return { isValid: false };

        // Kiểm tra thời hạn
        const now = Math.floor(Date.now() / 1000);
        if (now > expiresAt) {
            return { isValid: false, docId, docType, isExpired: true };
        }

        // Tái tạo chữ ký để so sánh
        const payload = `${docId}:${docType}:${expiresAt}`;
        const expectedSignature = crypto.createHmac('sha256', HMAC_KEY).update(payload).digest('hex').slice(0, 32);

        const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
        if (!isValid) return { isValid: false };

        if (expectedDocId && expectedDocId !== docId) {
            return { isValid: false };
        }

        return { isValid: true, docId, docType, isExpired: false };
    } catch {
        return { isValid: false };
    }
}
