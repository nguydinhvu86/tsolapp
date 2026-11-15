import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import CareerDetailClient from "./CareerDetailClient";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const posting = await prisma.jobPosting.findUnique({
        where: { id: params.id },
        include: { requisition: true }
    });

    if (!posting) {
        return {
            title: "Cơ Hội Nghề Nghiệp | T-SOLUTION",
            description: "Khám phá các vị trí tuyển dụng và cơ hội phát triển nghề nghiệp tại T-SOLUTION"
        };
    }

    const title = `${posting.title} | Cơ Hội Nghề Nghiệp T-SOLUTION`;
    const description = `Tuyển dụng ${posting.title} (${posting.requisition?.department || 'Khối chuyên môn'}). Môi trường làm việc năng động, đãi ngộ cạnh tranh. Nộp hồ sơ ứng tuyển trực tuyến ngay hôm nay!`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            images: [
                {
                    url: 'https://inside.tsol.vn/og-image.jpg',
                    width: 1200,
                    height: 630,
                    alt: title
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description
        }
    };
}

export default async function PublicCareerJobPage({ params }: { params: { id: string } }) {
    const posting = await prisma.jobPosting.findUnique({
        where: { id: params.id },
        include: {
            requisition: true,
            poster: {
                select: { name: true, email: true }
            }
        }
    });

    if (!posting) {
        notFound();
    }

    // Fetch company settings for corporate branding
    const settings = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    'COMPANY_NAME',
                    'COMPANY_DISPLAY_NAME',
                    'COMPANY_LOGO',
                    'COMPANY_PHONE',
                    'COMPANY_EMAIL',
                    'COMPANY_ADDRESS',
                    'COMPANY_WEBSITE',
                    'COMPANY_TAX',
                    'COMPANY_TAX_CODE'
                ]
            }
        }
    });

    const settingsMap = settings.reduce((acc: any, item: any) => {
        acc[item.key] = item.value;
        return acc;
    }, {});

    const companyInfo = {
        name: settingsMap['COMPANY_NAME'] || settingsMap['COMPANY_FULL_NAME'] || 'CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA',
        displayName: settingsMap['COMPANY_DISPLAY_NAME'] || 'TRỊNH GIA TELECOM',
        logo: settingsMap['COMPANY_LOGO'] || '/uploads/documents/cmmdibfp0000041p926ag2j47-1772839158213.png',
        phone: settingsMap['COMPANY_PHONE'] || '(0274) 999 2222 - 090 1232255',
        email: settingsMap['COMPANY_EMAIL'] || 'vutg@trinhgiatelecom.vn',
        address: settingsMap['COMPANY_ADDRESS'] || 'Số 147/80, Đường NTMK, Phường Phú Lợi, Tp. Hồ Chí Minh',
        website: settingsMap['COMPANY_WEBSITE'] || 'trinhgiatelecom.vn',
        tax: settingsMap['COMPANY_TAX'] || settingsMap['COMPANY_TAX_CODE'] || '3703185173'
    };

    return (
        <CareerDetailClient 
            posting={posting} 
            companyInfo={companyInfo} 
        />
    );
}
