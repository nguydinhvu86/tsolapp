import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getEmailTemplates } from "./actions";
import EmailTemplateDashboardClient from "./EmailTemplateDashboardClient";

export default async function EmailTemplatesPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    // Only Admins or Managers should access this config page
    const perms = session.user.permissions || [];
    const hasAccess = session.user.role === 'ADMIN' || perms.includes('TEMPLATES_VIEW_ALL') || perms.includes('TEMPLATES_VIEW_OWN');

    if (!hasAccess) {
        redirect("/unauthorized"); // Or some generic error page
    }

    const templates = await getEmailTemplates();

    return <EmailTemplateDashboardClient initialTemplates={templates} />;
}
