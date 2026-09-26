import { prisma } from '@/lib/prisma';

export interface CompanyInfo {
    name: string;
    fullName: string;
    displayName: string;
    taxCode: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
    bankInfo: string;
}

export async function getCompanyInfo(): Promise<CompanyInfo> {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: {
                    in: [
                        'COMPANY_NAME',
                        'COMPANY_DISPLAY_NAME',
                        'COMPANY_FULL_NAME',
                        'COMPANY_LOGO',
                        'COMPANY_PHONE',
                        'COMPANY_EMAIL',
                        'COMPANY_ADDRESS',
                        'COMPANY_TAX',
                        'COMPANY_TAX_CODE',
                        'COMPANY_WEBSITE',
                        'BANK_INFO_CONTENT'
                    ]
                }
            }
        });

        const map: Record<string, string> = {};
        settings.forEach(s => {
            if (s.value) map[s.key] = s.value;
        });

        const fullName = map['COMPANY_FULL_NAME'] || map['COMPANY_NAME'] || map['COMPANY_DISPLAY_NAME'] || 'CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA';
        const displayName = map['COMPANY_DISPLAY_NAME'] || map['COMPANY_NAME'] || 'TRỊNH GIA';
        const taxCode = map['COMPANY_TAX'] || map['COMPANY_TAX_CODE'] || '3703185173';
        const address = map['COMPANY_ADDRESS'] || 'Số 147/80, Đường NTMK, Phường Phú Lợi, Tp. Hồ Chí Minh';
        const phone = map['COMPANY_PHONE'] || 'Tel: (0274) 999 2222 - HP: 090 1232255';
        const email = map['COMPANY_EMAIL'] || 'vutg@trinhgiatelecom.vn';
        const website = map['COMPANY_WEBSITE'] || 'trinhgiatelecom.vn';
        const logo = map['COMPANY_LOGO'] || '';
        const bankInfo = map['BANK_INFO_CONTENT'] || '';

        return {
            name: fullName,
            fullName,
            displayName,
            taxCode,
            address,
            phone,
            email,
            website,
            logo,
            bankInfo
        };
    } catch (err) {
        console.error('Error fetching company info from system settings:', err);
        return {
            name: 'CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA',
            fullName: 'CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA',
            displayName: 'TRỊNH GIA',
            taxCode: '3703185173',
            address: 'Số 147/80, Đường NTMK, Phường Phú Lợi, Tp. Hồ Chí Minh',
            phone: 'Tel: (0274) 999 2222 - HP: 090 1232255',
            email: 'vutg@trinhgiatelecom.vn',
            website: 'trinhgiatelecom.vn',
            logo: '',
            bankInfo: ''
        };
    }
}
