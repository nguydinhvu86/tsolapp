const fs = require('fs');
const file = 'app/public/sales/estimate/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix maxWidth in print-wrapper
content = content.replace(
    `maxWidth: '210mm' }}>`,
    `maxWidth: estimate.templateType === 'PROJECT_BREAKDOWN' ? '297mm' : '210mm' }}>`
);

// 2. Fix @page size
content = content.replace(
    `size: A4;`,
    "size: A4 ${estimate.templateType === 'PROJECT_BREAKDOWN' ? 'landscape' : 'portrait'};"
);

// 3. Fix inline dimensions of a4-document
content = content.replace(
    `maxWidth: '210mm',
                minHeight: '297mm',`,
    `maxWidth: estimate.templateType === 'PROJECT_BREAKDOWN' ? '297mm' : '210mm',
                minHeight: estimate.templateType === 'PROJECT_BREAKDOWN' ? '210mm' : '297mm',`
);

// 4. Update the Table Render Logic
const tableReplacement = `                {/* Items Table */}
                {estimate.templateType === 'PROJECT_BREAKDOWN' ? (() => {
                    let sumVatTu = 0;
                    let sumNhanCong = 0;
                    estimate.items?.forEach((item: any) => {
                        sumVatTu += item.quantity * item.unitPrice;
                        sumNhanCong += item.quantity * (item.laborPrice || 0);
                    });
                    
                    return (
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.95rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center' }}>S.Ảnh</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'left' }}>Sản Phẩm</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center' }}>Hãng SX</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center' }}>Bảo Hành</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center' }}>SL</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>Đ.Giá V.Tư</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>Đ.Giá N.Công</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>Tiền V.Tư</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>Tiền N.Công</th>
                                </tr>
                            </thead>
                            <tbody>
                                {estimate.items?.map((item: any) => {
                                    const tienVatTu = item.quantity * item.unitPrice;
                                    const tienNhanCong = item.quantity * (item.laborPrice || 0);
                                    return (
                                        <tr key={item.id} style={{ backgroundColor: item.isSubItem ? '#f8fafc' : 'transparent' }}>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'center' }}>
                                                {item.imageUrl ? <img src={item.imageUrl} alt="img" style={{ maxWidth: '40px', maxHeight: '40px', objectFit: 'contain' }} /> : '-'}
                                            </td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', paddingLeft: item.isSubItem ? '30px' : '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                    {item.isSubItem && <span style={{ color: '#94a3b8' }}>↳</span>}
                                                    <div>
                                                        <strong style={{ display: 'block', color: item.isSubItem ? '#475569' : '#0f172a' }}>{item.customName || item.product?.name || 'Sản phẩm tự do'}</strong>
                                                        {item.description && <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'pre-line', display: 'block', marginTop: '2px' }}>{item.description}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'center' }}>{item.manufacture || '-'}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'center' }}>{item.warranty || '-'}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'center' }}>{item.quantity} {item.unit || item.product?.unit || ''}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'right' }}>{formatMoney(item.laborPrice || 0)}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(tienVatTu)}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(tienNhanCong)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng Cộng Vật Tư:</td>
                                    <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(sumVatTu)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng Cộng Nhân Công:</td>
                                    <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(sumNhanCong)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>VAT Tax:</td>
                                    <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(estimate.taxAmount || 0)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>TỔNG CỘNG (GHI CODE):</td>
                                    <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{formatMoney(estimate.totalAmount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    );
                })() : estimate.templateType === 'WITH_IMAGES' ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.95rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9' }}>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '7%' }}>S.Ảnh</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'left', width: '38%' }}>Sản Phẩm</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '10%' }}>Xuất Xứ</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '10%' }}>Bảo Hành</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '5%' }}>SL</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'right', width: '10%', whiteSpace: 'nowrap' }}>Đơn Giá</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '5%' }}>Thuế</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'right', width: '15%', whiteSpace: 'nowrap' }}>Thành Tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estimate.items?.map((item: any) => (
                                <tr key={item.id} style={{ backgroundColor: item.isSubItem ? '#f8fafc' : 'transparent' }}>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>
                                        {item.imageUrl ? <img src={item.imageUrl} alt="img" style={{ maxWidth: '40px', maxHeight: '40px', objectFit: 'contain' }} /> : '-'}
                                    </td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', paddingLeft: item.isSubItem ? '30px' : '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                            {item.isSubItem && <span style={{ color: '#94a3b8' }}>↳</span>}
                                            <div>
                                                <strong style={{ display: 'block', color: item.isSubItem ? '#475569' : '#0f172a' }}>{item.customName || item.product?.name || 'Sản phẩm tự do'}</strong>
                                                {item.product?.sku && <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '2px' }}>SKU: {item.product.sku}</span>}
                                                {item.manufacture && <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Hãng: {item.manufacture}</span>}
                                                {item.description && <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'pre-line', display: 'block', marginTop: '2px' }}>{item.description}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.origin || '-'}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.warranty || '-'}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.quantity} {item.unit || item.product?.unit || ''}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.taxRate}%</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.totalPrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền trước thuế:</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(estimate.subTotal || 0)}</td>
                            </tr>
                            <tr>
                                <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền thuế:</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(estimate.taxAmount || 0)}</td>
                            </tr>
                            <tr>
                                <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>TỔNG CỘNG:</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{formatMoney(estimate.totalAmount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.95rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9' }}>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '5%' }}>STT</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'left', width: '57%' }}>Sản Phẩm / Dịch Vụ</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '5%' }}>SL</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'right', width: '13%', whiteSpace: 'nowrap' }}>Đơn Giá</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '6%' }}>Thuế (%)</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'right', width: '14%', whiteSpace: 'nowrap' }}>Thành Tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estimate.items?.map((item: any, index: number) => (
                                <tr key={item.id} style={{ backgroundColor: item.isSubItem ? '#f8fafc' : 'transparent' }}>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.isSubItem ? '-' : (index + 1)}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', paddingLeft: item.isSubItem ? '30px' : '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                            {item.isSubItem && <span style={{ color: '#94a3b8' }}>↳</span>}
                                            <div>
                                                <strong style={{ display: 'block', color: item.isSubItem ? '#475569' : '#0f172a' }}>{item.customName || item.product?.name || 'Sản phẩm tự do'}</strong>
                                                {item.product?.sku && <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '2px' }}>SKU: {item.product.sku}</span>}
                                                {item.description && <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'pre-line', display: 'block', marginTop: '2px' }}>{item.description}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.quantity} {item.product?.unit || item.unit || ''}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.taxRate}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.totalPrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền trước thuế:</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(estimate.subTotal || 0)}</td>
                            </tr>
                            <tr>
                                <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền thuế:</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(estimate.taxAmount || 0)}</td>
                            </tr>
                            <tr>
                                <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>TỔNG CỘNG:</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{formatMoney(estimate.totalAmount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                )}`;

const startIndex = content.indexOf("{/* Items Table */}");
const endIndex = content.indexOf("{/* Notes */}");
if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, Math.max(0, startIndex)) + tableReplacement + "                " + content.substring(endIndex);
    fs.writeFileSync(file, content, 'utf8');
    console.log("SUCCESS");
} else {
    console.error("Could not find start or end index.");
}
