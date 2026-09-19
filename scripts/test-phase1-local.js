const { encryptSensitive, decryptSensitive, createSignedDocToken, verifySignedDocToken } = require('../lib/crypto.ts');

async function runLocalTests() {
    console.log('--- BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 1 (CHỈ TRÊN LOCAL) ---\n');
    let passCount = 0;
    let failCount = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passCount++;
        } else {
            console.error(`❌ [FAIL] ${testName}`);
            failCount++;
        }
    }

    // Test 1: AES-256-GCM Encryption & Decryption
    const samplePassword = 'P@ssw0rd_SIP_Secret_123456!';
    const encrypted = encryptSensitive(samplePassword);
    assert(encrypted && encrypted.startsWith('enc:v1:'), 'Chuỗi mã hóa phải có tiền tố enc:v1:');
    assert(encrypted !== samplePassword, 'Chuỗi mã hóa không được trùng với plain text');
    
    const decrypted = decryptSensitive(encrypted);
    assert(decrypted === samplePassword, 'Giải mã phải khôi phục 100% mật khẩu gốc');

    // Test 2: Idempotent Encryption & Legacy Plain-text Fallback
    const doubleEncrypted = encryptSensitive(encrypted);
    assert(doubleEncrypted === encrypted, 'Mã hóa lại chuỗi đã mã hóa không bị lồng hai lần (idempotent)');

    const legacyText = 'plaintext_legacy_pass_999';
    const decryptedLegacy = decryptSensitive(legacyText);
    assert(decryptedLegacy === legacyText, 'Hỗ trợ tương thích ngược dữ liệu cũ chưa mã hóa');

    // Test 3: Null & Undefined Handling
    assert(encryptSensitive(null) === null, 'Encrypt null trả về null');
    assert(decryptSensitive(undefined) === null, 'Decrypt undefined trả về null');

    // Test 4: HMAC Signed Tokens (Doc Security & Anti-IDOR)
    const docId = 'cuid_sales_estimate_987654';
    const docType = 'SALES_ESTIMATE';
    const token = createSignedDocToken(docId, docType, 7); // 7 days
    assert(typeof token === 'string' && token.length > 20, 'Tạo token chữ ký HMAC thành công');

    const verifyResult = verifySignedDocToken(token, docId);
    assert(verifyResult.isValid === true, 'Xác thực token hợp lệ thành công');
    assert(verifyResult.docId === docId, 'Token trích xuất đúng docId');
    assert(verifyResult.docType === docType, 'Token trích xuất đúng docType');
    assert(verifyResult.isExpired === false, 'Token chưa hết hạn');

    // Test 5: Tamper Resistance (Chống Giả Mạo)
    const tamperedToken = token.slice(0, -4) + 'AAAA';
    const tamperedResult = verifySignedDocToken(tamperedToken, docId);
    assert(tamperedResult.isValid === false, 'Phát hiện và chặn đứng token bị can thiệp/sửa đổi');

    // Test 6: ID Mismatch Resistance
    const mismatchResult = verifySignedDocToken(token, 'another_doc_id_9999');
    assert(mismatchResult.isValid === false, 'Chặn truy cập nếu docId không khớp với chữ ký token');

    console.log(`\n========================================`);
    console.log(`TỔNG KẾT KIỂM THỬ LOCAL: ${passCount} PASSED / ${failCount} FAILED`);
    console.log(`========================================\n`);

    if (failCount > 0) process.exit(1);
}

runLocalTests().catch(err => {
    console.error('Lỗi khi chạy test local:', err);
    process.exit(1);
});
