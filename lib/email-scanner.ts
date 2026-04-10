import imaps from 'imap-simple';
import { simpleParser, Attachment } from 'mailparser';
import { parseXmlInvoice } from './invoice-parser';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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

            let invoiceData: any = null;
            let lookupLink = '';
            let lookupCode = '';

            if (xmlAttachment) {
                const xmlString = xmlAttachment.content.toString('utf8');
                invoiceData = parseXmlInvoice(xmlString);
            } else {
                // Thử bóc tách thông tin Link và Mã tra cứu từ email body nếu không có file XML
                const textContent = parsedMail.text || parsedMail.html || '';
                const plainText = textContent.replace(/<[^>]+>/g, ' ').replace(/\&nbsp;/g, ' ').replace(/\s+/g, ' ');
                
                // For links, it's safer to grab right from raw text because of href="..."
                // Find all URLs in the email, filter for those containing common invoice domain words or near "tra cứu"
                let linkMatch = textContent.match(/href=["'](https?:\/\/[^"']+)["'][^>]*>[\s\S]*?(?:Tra cứu|Xem|Tại đây)/i);
                if (!linkMatch) linkMatch = plainText.match(/(?:Link tra cứu|Trang tra cứu|địa chỉ tra cứu|URL|Tra cứu hóa đơn tại|Link tải hóa đơn|Tra cứu tại|đường dẫn|truy cập)[\s:;]*(https?:\/\/[^\s]+)/i);
                
                // For codes and symbols, strip HTML tags which normally break regexes like <b>ABC</b>
                const codeMatch = plainText.match(/(?:Mã tra cứu|Mã bảo mật|Mã nhận hóa đơn|Mã kiểm tra|Mã tra cứu hóa đơn|Mã số bí mật|mã số)[\s:;]*([^\s<>]+)/i);
                
                console.log(`[InvoiceScan] Trying fallback extraction - Subject: ${parsedMail.subject}`);
                console.log(`[InvoiceScan] Link found: ${linkMatch ? linkMatch[1] : 'NONE'}, Code found: ${codeMatch ? codeMatch[1] : 'NONE'}`);

                if (linkMatch || codeMatch) {
                    if (linkMatch) lookupLink = linkMatch[1].trim().replace(/và.*/i, '').replace(/Quý.*/i, '').replace(/[.,:;]+$/, '');
                    if (codeMatch) lookupCode = codeMatch[1].trim().replace(/Quý.*/i, '').replace(/Quy.*/i, '').replace(/Q$/, '').replace(/[.,:;]+$/, '');
                    
                    const taxCodeMatch = plainText.match(/(?:Mã số thuế|MST)[^\d]*([\d\-]+)/i);
                    const sysTaxCode = taxCodeMatch ? taxCodeMatch[1].replace(/-/g, '') : 'KhongTheTrichXuatMST';
                    
                    const invNumberMatch = plainText.match(/(?:Số hóa đơn|Số HĐ|Ký hiệu|Số)[\s:;]*([A-Za-z0-9\-\/]+)/i);
                    const sysInvNumberRaw = invNumberMatch ? invNumberMatch[1] : `PENDING-${Date.now()}`;
                    const sysInvNumber = sysInvNumberRaw.replace(/Ngày.*/i, '').replace(/Nga.*/i, '');

                    console.log(`[InvoiceScan] Extracted MST: ${sysTaxCode}, Invoice: ${sysInvNumber}`);
                    
                    invoiceData = {
                        invoiceNumber: sysInvNumber,
                        supplierTaxCode: sysTaxCode,
                        supplierName: 'Nhà cung cấp (Bản Nháp Nhận Diện Từ Email)',
                        issueDate: new Date(),
                        totalAmount: 0,
                        taxAmount: 0,
                        items: []
                    };
                } else {
                     console.log(`[InvoiceScan] Fallback failed. Could not find any link or code pattern in text.`);
                }
            }

            if (!invoiceData) {
                console.warn("Could not parse XML or find sufficient lookup information from email:", parsedMail.subject);
                continue;
            }



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
                // Save XML and PDF to persistent storage
                const invoicesDir = path.join(process.cwd(), 'uploads_data', 'invoices');
                if (!fs.existsSync(invoicesDir)) {
                    fs.mkdirSync(invoicesDir, { recursive: true });
                }

                const timestamp = Date.now();
                let xmlUrl = '';
                if (xmlAttachment) {
                    const xmlFilename = invoiceData.invoiceNumber + '_' + timestamp + '.xml';
                    fs.writeFileSync(path.join(invoicesDir, xmlFilename), xmlAttachment.content);
                    xmlUrl = '/api/files/invoices/' + xmlFilename;
                }

                let pdfUrl = '';
                if (pdfAttachment) {
                    const pdfFilename = invoiceData.invoiceNumber + '_' + timestamp + '.pdf';
                    fs.writeFileSync(path.join(invoicesDir, pdfFilename), pdfAttachment.content);
                    pdfUrl = '/api/files/invoices/' + pdfFilename;
                }

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
                        lookupLink: lookupLink,
                        lookupCode: lookupCode,
                        status: 'NEW',
                        supplierId: supplierId,
                        items: {
                            create: invoiceData.items.map((i: any) => {
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
