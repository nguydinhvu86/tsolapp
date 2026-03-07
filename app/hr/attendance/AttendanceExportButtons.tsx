'use client';

import React, { useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { exportToExcel } from '@/lib/utils/export';

interface ExportButtonsProps {
    matrix: any[];
    month: number;
    year: number;
    daysInMonth: number;
}

export function AttendanceExportButtons({ matrix, month, year, daysInMonth }: ExportButtonsProps) {
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const handleExportExcel = () => {
        if (!matrix || matrix.length === 0) {
            alert('Không có dữ liệu để xuất Excel.');
            return;
        }

        const dataToExport = matrix.map((row) => {
            const rowData: any = {
                'Họ Tên': row.user.name || 'Người dùng vô danh',
                'Email': row.user.email || '',
                'Tổng Công': row.totalPresent + (row.records && Object.values(row.records).filter((r: any) => r.status === 'LATE').length || 0),
                'Muộn': row.totalLate
            };

            // Add columns for each day of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const record = row.records[day];
                let content = '-';
                if (record) {
                    switch (record.status) {
                        case 'PRESENT': content = 'X'; break;
                        case 'LATE': content = 'M'; break;
                        case 'ABSENT': content = 'V'; break;
                        case 'HALF_DAY': content = 'H'; break;
                    }
                }
                rowData[`Ngày ${day}`] = content;
            }

            return rowData;
        });

        exportToExcel(dataToExport, `Bang_Cong_Cong_Ty_${month}_${year}`);
    };

    const handleExportPDF = async () => {
        const element = document.getElementById('attendance-matrix-table');
        if (!element) {
            alert('Không tìm thấy bảng công để xuất PDF.');
            return;
        }

        try {
            setIsExportingPDF(true);

            // Temporarily clone the table if we want to manipulate it, or just print the live element
            // Since it might have a scrollbar, we need to ensure the full table is captured
            const htmlElement = element as HTMLElement;
            const originalStyle = htmlElement.style.cssText;

            // Expand width temporarily to capture everything without scroll
            htmlElement.style.width = 'max-content';
            htmlElement.style.overflow = 'visible';
            htmlElement.style.maxWidth = 'none';

            // Dynamically import html2pdf
            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;

            const opt = {
                margin: [10, 10, 10, 10] as [number, number, number, number], // top, left, bottom, right
                filename: `Bang_Cong_Cong_Ty_${month}_${year}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    windowWidth: htmlElement.scrollWidth,
                    width: htmlElement.scrollWidth
                },
                jsPDF: { unit: 'mm' as const, format: 'a3', orientation: 'landscape' as const } // using A3 landscape due to wide table
            };

            await html2pdf().set(opt).from(htmlElement).save();

            // Restore style
            htmlElement.style.cssText = originalStyle;

        } catch (error) {
            console.error('Lỗi khi xuất PDF:', error);
            alert('Đã xảy ra lỗi khi tạo file PDF.');
        } finally {
            setIsExportingPDF(false);
        }
    };

    return (
        <div className="flex gap-2">
            <Button onClick={handleExportExcel} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                <FileSpreadsheet size={16} /> Xuất Excel
            </Button>
            <Button onClick={handleExportPDF} disabled={isExportingPDF} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: '#e2e8f0', color: '#0f172a' }}>
                <FileText size={16} /> {isExportingPDF ? 'Đang tạo PDF...' : 'Xuất PDF'}
            </Button>
        </div>
    );
}
