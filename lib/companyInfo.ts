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

        const fullName = map['COMPANY_FULL_NAME'] || map['COMPANY_NAME'] || map['COMPANY_DISPLAY_NAME'] || 'CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ TSOL';
        const displayName = map['COMPANY_DISPLAY_NAME'] || map['COMPANY_NAME'] || 'TSOL';
        const taxCode = map['COMPANY_TAX'] || map['COMPANY_TAX_CODE'] || '';
        const address = map['COMPANY_ADDRESS'] || '';
        const phone = map['COMPANY_PHONE'] || '';
        const email = map['COMPANY_EMAIL'] || '';
        const website = map['COMPANY_WEBSITE'] || '';
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
            name: 'CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ TSOL',
            fullName: 'CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ TSOL',
            displayName: 'TSOL',
            taxCode: '',
            address: '',
            phone: '',
            email: '',
            website: '',
            logo: '',
            bankInfo: ''
        };
    }
}
