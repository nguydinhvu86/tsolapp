'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface DynamicTableBuilderProps {
    value: string; // The generated HTML string
    onChange: (html: string) => void;
    onTotalsChange?: (totals: { baseTotal: number, taxTotal: number, grandTotal: number }) => void;
    type?: 'quote' | 'handover';
}

type Cell = string;
type Row = Cell[];

const parseVNNumber = (str: string) => {
    if (!str) return 0;
    // Remove all commas (thousand separators), then parse
    const cleanStr = str.replace(/,/g, '');
    return parseFloat(cleanStr) || 0;
};

const formatVNNumber = (num: number) => {
    return num.toLocaleString('en-US'); // en-US uses comma for thousand separator
};

export function DynamicTableBuilder({ value, onChange, onTotalsChange, type = 'quote' }: DynamicTableBuilderProps) {
    // Attempt to parse existing HTML back into a matrix if possible
    // For simplicity, we initialize with a default matrix if empty or unparseable
    const initialHeaders = type === 'handover'
        ? ['STT', 'Tên Sản Phẩm/ Dịch Vụ', 'HSX', 'Bảo Hành', 'SL/DVT', 'Ghi Chú']
        : ['STT', 'Sản Phẩm', 'ĐVT', 'Số Lượng', 'Đơn Giá', 'Thành Tiền', 'Thuế (%)', 'Tiền Thuế', 'Tổng cộng'];

    const initialRows = type === 'handover'
        ? [['1', 'Tên thiết bị 1', 'Hãng A', '12 Tháng', '1 Cái', 'Mới 100%']]
        : [['1', 'Tên sản phẩm 1', 'Cái', '1', '1,000,000', '1,000,000', '8', '80,000', '1,080,000']];

    const [headers, setHeaders] = useState<string[]>(initialHeaders);
    const [rows, setRows] = useState<Row[]>(initialRows);

    // Re-generate HTML whenever headers or rows change
    useEffect(() => {
        const generateHTML = () => {
            let html = '<table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">\n';

            const getColIndex = (names: string[]) => headers.findIndex(h => names.includes(h.trim().toLowerCase()));
            const amountIdx = getColIndex(['thành tiền']);
            const taxRateIdx = getColIndex(['thuế', 'vat', 'thuế (%)', 'vat (%)', '% thuế', 'thuế suất', 'mức thuế', 'thuế suất (%)']);
            const taxAmountIdx = getColIndex(['tiền thuế', 'thuế (vnđ)', 'tiền vat', 'thuế vat']);
            const totalIdx = getColIndex(['tổng', 'tổng cộng', 'tổng tiền', 'tổng sau thuế']);

            const isFinancialTable = amountIdx !== -1 && taxAmountIdx !== -1 && totalIdx !== -1;

            const colsToOmit: number[] = [];
            if (isFinancialTable) {
                colsToOmit.push(taxAmountIdx);
                colsToOmit.push(totalIdx);
            }

            // Generate Headers
            html += '  <tr>\n';
            let visibleColCount = 0;
            let visibleAmountIdx = -1;

            headers.forEach((header, index) => {
                if (colsToOmit.includes(index)) return;
                if (index === amountIdx) visibleAmountIdx = visibleColCount;
                visibleColCount++;

                const widthStyle = index === 1 ? ' style="text-align: left;"' : (index === 0 ? ' style="width: 40px;"' : '');
                html += `    <th style="border: 1px solid #000; padding: 6px 8px; font-weight: bold;">${header}</th>\n`;
            });
            html += '  </tr>\n';

            // Generate Rows
            let baseTotal = 0;
            let taxTotal = 0;
            let grandTotal = 0;
            let repTaxRate = '';

            rows.forEach((row) => {
                if (amountIdx !== -1) baseTotal += parseVNNumber(row[amountIdx]);
                if (taxAmountIdx !== -1) taxTotal += parseVNNumber(row[taxAmountIdx]);
                if (totalIdx !== -1) grandTotal += parseVNNumber(row[totalIdx]);

                if (taxRateIdx !== -1 && !repTaxRate && parseVNNumber(row[taxRateIdx]) > 0) {
                    repTaxRate = row[taxRateIdx].trim();
                }

                html += '  <tr>\n';
                row.forEach((cell, index) => {
                    if (colsToOmit.includes(index)) return;

                    let cellText = cell;
                    if (index === taxRateIdx && cellText.trim() !== '' && !cellText.includes('%')) {
                        cellText += '%';
                    }

                    const cellAlign = index === 1 ? ' style="border: 1px solid #000; padding: 6px 8px; text-align: left;"' : ' style="border: 1px solid #000; padding: 6px 8px;"';
                    html += `    <td${cellAlign}>${cellText}</td>\n`;
                });
                html += '  </tr>\n';
            });

            // Auto sum at bottom for all money columns
            if (isFinancialTable && visibleAmountIdx > 0) {
                const taxLabel = repTaxRate ? `Thuế ${repTaxRate.includes('%') ? repTaxRate : repTaxRate + '%'}` : 'Thuế VAT';

                // Row 1: Tổng tạm tính chưa bao gồm thuế
                html += '  <tr>\n';
                html += `    <td colspan="${visibleAmountIdx}" style="border: 1px solid #000; padding: 6px 8px; text-align: right;">Tổng tạm tính chưa bao gồm thuế</td>\n`;
                html += `    <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${formatVNNumber(baseTotal)}</td>\n`;
                for (let i = visibleAmountIdx + 1; i < visibleColCount; i++) {
                    html += `    <td style="border: 1px solid #000; padding: 6px 8px;"></td>\n`;
                }
                html += '  </tr>\n';

                // Row 2: Thuế
                html += '  <tr>\n';
                html += `    <td colspan="${visibleAmountIdx}" style="border: 1px solid #000; padding: 6px 8px; text-align: right;">${taxLabel}</td>\n`;
                html += `    <td style="border: 1px solid #000; padding: 6px 8px; text-align: center;">${formatVNNumber(taxTotal)}</td>\n`;
                for (let i = visibleAmountIdx + 1; i < visibleColCount; i++) {
                    html += `    <td style="border: 1px solid #000; padding: 6px 8px;"></td>\n`;
                }
                html += '  </tr>\n';

                // Row 3: Tổng tạm tính đã bao gồm thuế VAT
                html += '  <tr>\n';
                html += `    <td colspan="${visibleAmountIdx}" style="border: 1px solid #000; padding: 6px 8px; text-align: right; font-weight: bold; background-color: #a9d08e;">Tổng tạm tính đã bao gồm thuế VAT</td>\n`;
                html += `    <td style="border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: bold; background-color: #a9d08e; color: #ff0000;">${formatVNNumber(grandTotal)}</td>\n`;
                for (let i = visibleAmountIdx + 1; i < visibleColCount; i++) {
                    html += `    <td style="border: 1px solid #000; padding: 6px 8px;"></td>\n`;
                }
                html += '  </tr>\n';

            } else {
                const colsToSum: number[] = [];
                headers.forEach((h, i) => {
                    const hl = h.trim().toLowerCase();
                    if (['thành tiền', 'tổng', 'tổng cộng', 'tổng tiền', 'tổng sau thuế'].includes(hl)) {
                        colsToSum.push(i);
                    }
                });

                if (colsToSum.length > 0) {
                    const firstSumCol = Math.min(...colsToSum);
                    let hasValue = false;
                    const sums: Record<number, number> = {};
                    colsToSum.forEach(col => {
                        sums[col] = 0;
                        rows.forEach(row => { sums[col] += parseVNNumber(row[col]); });
                        if (sums[col] > 0) hasValue = true;
                    });

                    if (hasValue) {
                        html += '  <tr>\n';
                        for (let i = 0; i < headers.length; i++) {
                            if (colsToOmit && colsToOmit.includes(i)) continue; // handle generic case if colsToOmit was scoped
                            if (i === 0 && firstSumCol > 0) {
                                html += `    <td colspan="${firstSumCol}" style="border: 1px solid #000; padding: 6px 8px; text-align: right; font-weight: bold; background-color: #f8fafc;">Tổng cộng:</td>\n`;
                                i = firstSumCol - 1;
                            } else if (colsToSum.includes(i)) {
                                html += `    <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; background-color: #f8fafc;">${formatVNNumber(sums[i])}</td>\n`;
                            } else {
                                html += `    <td style="border: 1px solid #000; padding: 6px 8px; background-color: #f8fafc;"></td>\n`;
                            }
                        }
                        html += '  </tr>\n';
                    }
                }
            }

            // Report exact totals up to parent if asked
            if (onTotalsChange) {
                const getColIndex = (names: string[]) => headers.findIndex(h => names.includes(h.trim().toLowerCase()));
                const amountIdx = getColIndex(['thành tiền']);
                const taxAmountIdx = getColIndex(['tiền thuế', 'thuế (vnđ)', 'tiền vat', 'thuế vat']);
                const totalIdx = getColIndex(['tổng', 'tổng cộng', 'tổng tiền', 'tổng sau thuế']);

                let baseTotal = 0;
                let taxTotal = 0;
                let grandTotal = 0;

                rows.forEach(row => {
                    if (amountIdx !== -1) baseTotal += parseVNNumber(row[amountIdx]);
                    if (taxAmountIdx !== -1) taxTotal += parseVNNumber(row[taxAmountIdx]);
                    if (totalIdx !== -1) grandTotal += parseVNNumber(row[totalIdx]);
                });

                // run on next tick to avoid React render loop complains
                setTimeout(() => {
                    onTotalsChange({ baseTotal, taxTotal, grandTotal });
                }, 0);
            }

            html += '</table>';
            return html;
        };

        onChange(generateHTML());
    }, [headers, rows]); // eslint-disable-line react-hooks/exhaustive-deps

    const addRow = () => {
        setRows([...rows, new Array(headers.length).fill('')]);
    };

    const removeRow = (index: number) => {
        if (rows.length <= 1) return;
        setRows(rows.filter((_, i) => i !== index));
    };

    const addColumn = () => {
        setHeaders([...headers, 'Cột Mới']);
        setRows(rows.map(row => [...row, '']));
    };

    const removeColumn = (index: number) => {
        if (headers.length <= 1) return;
        setHeaders(headers.filter((_, i) => i !== index));
        setRows(rows.map(row => row.filter((_, i) => i !== index)));
    };

    const updateHeader = (index: number, val: string) => {
        const newHeaders = [...headers];
        newHeaders[index] = val;
        setHeaders(newHeaders);
    };

    const updateCell = (rowIndex: number, colIndex: number, val: string) => {
        const newRows = [...rows];
        newRows[rowIndex][colIndex] = val;

        const getColIndex = (names: string[]) => headers.findIndex(h => names.includes(h.trim().toLowerCase()));

        const qtyIdx = getColIndex(['số lượng']);
        const priceIdx = getColIndex(['đơn giá']);
        const amountIdx = getColIndex(['thành tiền']);
        const taxRateIdx = getColIndex(['thuế', 'vat', 'thuế (%)', 'vat (%)', '% thuế', 'thuế suất', 'mức thuế', 'thuế suất (%)']);
        const taxAmountIdx = getColIndex(['tiền thuế', 'thuế (vnđ)', 'tiền vat', 'thuế vat']);
        const totalIdx = getColIndex(['tổng', 'tổng cộng', 'tổng tiền', 'tổng sau thuế']);

        // Check if we can calculate base amount
        let amount = 0;
        const hasQtyPrice = qtyIdx !== -1 && priceIdx !== -1;
        if (hasQtyPrice) {
            const qtyStr = newRows[rowIndex][qtyIdx];
            const priceStr = newRows[rowIndex][priceIdx];
            if (qtyStr.trim() !== '' && priceStr.trim() !== '') {
                amount = parseVNNumber(qtyStr) * parseVNNumber(priceStr);
                if (amountIdx !== -1) newRows[rowIndex][amountIdx] = formatVNNumber(amount);
            } else {
                if (amountIdx !== -1) newRows[rowIndex][amountIdx] = '';
            }
        } else if (amountIdx !== -1) {
            amount = parseVNNumber(newRows[rowIndex][amountIdx]);
        }

        // Check if we can calculate tax amount
        let taxAmount = 0;
        if (taxRateIdx !== -1) {
            const rateStr = newRows[rowIndex][taxRateIdx].replace('%', '').trim();
            if (rateStr !== '') {
                const rate = parseVNNumber(rateStr);
                taxAmount = amount * (rate / 100);
                if (taxAmountIdx !== -1) newRows[rowIndex][taxAmountIdx] = formatVNNumber(taxAmount);
            } else {
                if (taxAmountIdx !== -1) newRows[rowIndex][taxAmountIdx] = '';
            }
        } else if (taxAmountIdx !== -1) {
            taxAmount = parseVNNumber(newRows[rowIndex][taxAmountIdx]);
        }

        // Calculate row total
        if (totalIdx !== -1) {
            if ((hasQtyPrice && newRows[rowIndex][qtyIdx].trim() !== '' && newRows[rowIndex][priceIdx].trim() !== '') || amount > 0) {
                newRows[rowIndex][totalIdx] = formatVNNumber(amount + taxAmount);
            } else {
                newRows[rowIndex][totalIdx] = '';
            }
        }

        setRows(newRows);
    };

    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Nhập liệu bảng tính. Dữ liệu sẽ tự động được đóng gói thành chuẩn HTML hiển thị.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={addColumn} className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}>
                        + Thêm Cột
                    </button>
                    <button type="button" onClick={addRow} className="btn btn-primary" style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}>
                        + Thêm Dòng
                    </button>
                </div>
            </div>

            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', minWidth: '600px' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px', background: '#e2e8f0', borderRight: '1px solid #cbd5e1' }}></th>
                            {headers.map((header, colIndex) => (
                                <th key={colIndex} style={{ padding: '0', borderRight: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                            value={header}
                                            onChange={(e) => updateHeader(colIndex, e.target.value)}
                                            style={{ width: '100%', border: 'none', background: 'transparent', padding: '0.5rem', fontWeight: 600, outline: 'none', textAlign: 'center' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeColumn(colIndex)}
                                            style={{ padding: '0.5rem', color: 'var(--danger)', opacity: 0.5 }}
                                            title="Xóa cột"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr key={rowIndex} style={{ borderTop: '1px solid #e2e8f0' }}>
                                <td style={{ background: '#f1f5f9', borderRight: '1px solid #e2e8f0', textAlign: 'center', cursor: 'grab' }}>
                                    <button
                                        type="button"
                                        onClick={() => removeRow(rowIndex)}
                                        style={{ color: 'var(--danger)', padding: '0.25rem' }}
                                        title="Xóa dòng"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                                {row.map((cell, colIndex) => (
                                    <td key={colIndex} style={{ padding: '0', borderRight: '1px solid #e2e8f0' }}>
                                        <input
                                            value={cell}
                                            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                                            style={{ width: '100%', border: 'none', padding: '0.5rem', outline: 'none', background: 'transparent' }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
