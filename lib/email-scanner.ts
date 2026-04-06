import imaps from 'imap-simple';
import { simpleParser, Attachment } from 'mailparser';
import { parseXmlInvoice } from './invoice-parser';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function fetchUnreadInvoices() {
    // 1. Fetch IMAP settings dynamically from DB
    const settings = await prisma.systemSetting.findMany({
        where: { key: { startsWith: 'INVOICE_SYNC_' } }
    });
    
    if (settings.length === 0) {
        console.warn("IMAP credentials not configured in DB. Skipping email scan.");
        return { success: false, error: 'IMAP Not Configured - Vui lòng cài đặt thông số Email trong Cấu Hình Kế Toán' };
    }

    const configMap: Record<string, string> = {};
    settings.forEach(s => configMap[s.key] = s.value);

    const user = configMap['INVOICE_SYNC_EMAIL'];
    const password = configMap['INVOICE_SYNC_PASSWORD'];
    const host = configMap['INVOICE_SYNC_HOST'] || 'imap.gmail.com';
    const port = parseInt(configMap['INVOICE_SYNC_PORT'] || '993');

    if (!user || !password) {
        return { success: false, error: 'Missing Email or Password in configuration' };
    }

    const IMAP_CONFIG = {
        imap: {
            user,
            password,
            host,
            port,
            tls: true,
            authTimeout: 5000, // Zimbra servers might be slightly slower
            tlsOptions: { 
                rejectUnauthorized: false,
                servername: host // Crucial for SNI compatibility on custom email hosts
            }
        }
    };

    try {
        const connection = await imaps.connect(IMAP_CONFIG);
        await connection.openBox('INBOX');

        // Search for UNSEEN emails
        const searchCriteria = ['UNSEEN'];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            markSeen: true
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        let processedCount = 0;

        for (const msg of messages) {
            const allBody = msg.parts.find(part => part.which === '');
            if (!allBody || !allBody.body) continue;

            const parsedMail = await simpleParser(allBody.body);
            
            // Check for XML attachments
            const xmlAttachment = parsedMail.attachments.find(a => a.contentType === 'text/xml' || a.filename?.toLowerCase().endsWith('.xml'));
            const pdfAttachment = parsedMail.attachments.find(a => a.contentType === 'application/pdf' || a.filename?.toLowerCase().endsWith('.pdf'));

            if (!xmlAttachment) continue;

            const xmlString = xmlAttachment.content.toString('utf8');
            const invoiceData = parseXmlInvoice(xmlString);

            if (!invoiceData) {
                console.warn("Could not parse XML from email:", parsedMail.subject);
                continue;
            }

            // Optional: Backup file to disk/S3 returning a URL.
            // For now, we store them temporarily or leave them blank/base64 (not recommended for DB).
            // Example:
            const xmlUrl = '/uploads/invoices/' + invoiceData.invoiceNumber + '.xml';
            const pdfUrl = pdfAttachment ? '/uploads/invoices/' + invoiceData.invoiceNumber + '.pdf' : '';

            // Map Supplier by TaxCode
            let supplierId = null;
            if (invoiceData.supplierTaxCode) {
                const supplier = await prisma.supplier.findFirst({
                    where: { taxCode: { contains: invoiceData.supplierTaxCode } }
                });
                if (supplier) {
                    supplierId = supplier.id;
                } else {
                    const count = await prisma.supplier.count();
                    const sCode = `NCC-${(count + 1).toString().padStart(6, '0')}`;
                    const newSupplier = await prisma.supplier.create({
                        data: {
                            code: sCode,
                            name: invoiceData.supplierName || 'NCC Mới từ Hóa Đơn',
                            taxCode: invoiceData.supplierTaxCode,
                            totalDebt: 0
                        }
                    });
                    supplierId = newSupplier.id;
                }
            }

            const existing = await prisma.supplierInvoice.findFirst({
                where: { invoiceNumber: invoiceData.invoiceNumber, supplierTaxCode: invoiceData.supplierTaxCode }
            });

            if (!existing) {
                // Fetch the active PO for price checking
                let activePoItems: any[] = [];
                if (supplierId) {
                    const latestPo = await prisma.purchaseOrder.findFirst({
                        where: { supplierId: supplierId, status: { in: ['SENT', 'PARTIAL_RECEIVED'] } },
                        orderBy: { date: 'desc' },
                        include: { items: true }
                    });
                    if (latestPo) {
                        activePoItems = latestPo.items;
                    }
                }

                await prisma.supplierInvoice.create({
                    data: {
                        invoiceNumber: invoiceData.invoiceNumber,
                        issueDate: invoiceData.issueDate,
                        totalAmount: invoiceData.totalAmount,
                        taxAmount: invoiceData.taxAmount,
                        supplierName: invoiceData.supplierName,
                        supplierTaxCode: invoiceData.supplierTaxCode,
                        xmlUrl: xmlUrl,
                        pdfUrl: pdfUrl,
                        status: 'NEW',
                        supplierId: supplierId,
                        items: {
                            create: invoiceData.items.map(i => {
                                let unitPriceDiscrepancy = 0;
                                let matchedPoItemId = null;

                                // Match PO Item by name similarity
                                if (activePoItems.length > 0) {
                                    const matched = activePoItems.find(po => 
                                        po.productName?.toLowerCase().includes(i.productName.toLowerCase()) || 
                                        i.productName.toLowerCase().includes(po.productName?.toLowerCase() || '')
                                    );

                                    if (matched) {
                                        matchedPoItemId = matched.id;
                                        if (i.unitPrice > matched.unitPrice) {
                                            unitPriceDiscrepancy = i.unitPrice - matched.unitPrice;
                                        }
                                    }
                                }

                                return {
                                    productName: i.productName,
                                    quantity: i.quantity,
                                    unitPrice: i.unitPrice,
                                    totalPrice: i.totalPrice,
                                    taxRate: i.taxRate,
                                    unitPriceDiscrepancy,
                                    matchedPoItemId
                                };
                            })
                        }
                    }
                });
                processedCount++;
            }
        }

        connection.end();
        return { success: true, processedCount };
    } catch (e: any) {
        console.error("IMAP Fetch Error:", e);
        return { success: false, error: e.message };
    }
}
