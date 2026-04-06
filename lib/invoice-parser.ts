import { XMLParser } from 'fast-xml-parser';

export interface InvoiceExtractedData {
    invoiceNumber: string;
    issueDate: Date | null;
    totalAmount: number;
    taxAmount: number;
    supplierName: string;
    supplierTaxCode: string;
    items: InvoiceExtractedItem[];
}

export interface InvoiceExtractedItem {
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate: number;
}

export function parseXmlInvoice(xmlString: string): InvoiceExtractedData | null {
    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            parseTagValue: true,
            trimValues: true,
        });

        let jsonObj = parser.parse(xmlString);

        // Helper to find key recursively if structure is different
        const findNode = (obj: any, key: string): any => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj[key] !== undefined) return obj[key];
            for (const k in obj) {
                const res = findNode(obj[k], key);
                 if (res !== null) return res;
            }
            return null;
        };

        const root = jsonObj;

        // 1. Thông tin chung (TTChung)
        const ttChung = findNode(root, 'TTChung') || root;
        const invoiceNumber = ttChung?.SHDon?.toString() || ttChung?.['SHDON']?.toString() || 'UNKNOWN';
        
        let issueDate = null;
        if (ttChung?.NLap) {
            issueDate = new Date(ttChung.NLap);
        }

        // 2. Thông tin người bán (NBan)
        const nBan = findNode(root, 'NBan') || findNode(root, 'NBAN') || root;
        const supplierName = nBan?.Ten || nBan?.['TEN'] || 'Chưa định dạng Tên NCC';
        const supplierTaxCode = nBan?.MST?.toString() || nBan?.['MST']?.toString() || '';

        // 3. Thông tin thanh toán (TToan)
        const tToan = findNode(root, 'TToan') || findNode(root, 'TTOAN') || root;
        const totalAmount = parseFloat(tToan?.TgTTTBSo || tToan?.['TGTTTBSO'] || 0);
        const taxAmount   = parseFloat(tToan?.TgTThue || tToan?.['TGTTHUE'] || 0);

        // 4. Hàng hoá dịch vụ (HHDVu)
        const items: InvoiceExtractedItem[] = [];
        
        const dshhdvu = findNode(root, 'DSHHDVu') || findNode(root, 'HHDVu');
        let productList = [];

        if (dshhdvu && dshhdvu.HHDVu) {
            productList = Array.isArray(dshhdvu.HHDVu) ? dshhdvu.HHDVu : [dshhdvu.HHDVu];
        } else if (dshhdvu) {
             productList = Array.isArray(dshhdvu) ? dshhdvu : [dshhdvu];
        } else {
             // Fallback deep search directly for arrays
             const directSearch = findNode(root, 'HHDVu');
             if (directSearch) {
                 productList = Array.isArray(directSearch) ? directSearch : [directSearch];
             }
        }

        for (const prod of productList) {
            if (!prod) continue;
            items.push({
                productName: prod.THHDVu || prod['THHDVU'] || prod.Ten || '',
                quantity: parseFloat(prod.SLuong || prod['SLUONG'] || 0),
                unitPrice: parseFloat(prod.DGia || prod['DGIA'] || 0),
                totalPrice: parseFloat(prod.ThTien || prod['THTIEN'] || 0),
                taxRate: parseFloat(prod.TSuat || prod['TSUAT'] || 0),
            });
        }

        return {
            invoiceNumber,
            issueDate,
            totalAmount,
            taxAmount,
            supplierName,
            supplierTaxCode,
            items
        };

    } catch (e: any) {
        console.error("XML Parsing Error:", e.message);
        return null;
    }
}
