import PublicWarrantyClient from '@/app/warranty/PublicWarrantyClient';

export const metadata = {
    title: 'Tra Cứu Bảo Hành Điện Tử Chính Hãng',
    description: 'Kiểm tra thông tin bảo hành, nguồn gốc xuất xứ và thời hạn bảo hành của thiết bị qua số Serial / IMEI.',
};

export default function PublicWarrantyPage({
    searchParams,
}: {
    searchParams?: { sn?: string; serial?: string; embed?: string };
}) {
    const initialSerial = searchParams?.sn || searchParams?.serial || '';
    const isEmbed = searchParams?.embed === 'true';

    return <PublicWarrantyClient initialSerial={initialSerial} isEmbed={isEmbed} />;
}
