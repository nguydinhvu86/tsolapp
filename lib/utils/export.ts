import * as XLSX from 'xlsx';

/**
 * Downloads an array of objects as an Excel file.
 * @param data Array of objects representing rows in the Excel sheet
 * @param filename Name of the downloaded file (without extension)
 */
export const exportToExcel = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        alert("Không có dữ liệu để xuất.");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Trigger a print action on the browser which allows saving as PDF.
 * This is a lightweight alternative to full PDF generation libraries,
 * which relies on browser's native print-to-PDF capabilities.
 */
export const exportToPDF = () => {
    window.print();
};
