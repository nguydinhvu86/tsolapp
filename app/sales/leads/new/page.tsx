import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewLeadPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const customerId = typeof searchParams?.customerId === 'string' ? searchParams.customerId : undefined;
    const query = new URLSearchParams({ action: 'new' });
    if (customerId) query.set('customerId', customerId);
    redirect(`/sales/leads?${query.toString()}`);
}
