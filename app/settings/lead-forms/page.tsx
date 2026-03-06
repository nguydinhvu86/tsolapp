import React from 'react';
import { getLeadForms } from './actions';
import { prisma } from '@/lib/prisma';
import { LeadFormsClient } from './LeadFormsClient';

export const metadata = {
    title: 'Cấu hình Lead Form - Settings',
};

export default async function LeadFormsSettingsPage() {
    const leadForms = await getLeadForms();

    // Fetch users for the Assignee dropdown
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' }
    });

    return (
        <LeadFormsClient
            initialForms={leadForms}
            users={users}
        />
    );
}
