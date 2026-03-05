import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import EmailTemplateFormClient from "../EmailTemplateFormClient";

export default async function NewEmailTemplatePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    // Checking permissions
    if (session.user.role !== 'ADMIN' && !session.user.permissions?.includes('TEMPLATES_CREATE')) {
        redirect("/unauthorized");
    }

    return <EmailTemplateFormClient initialTemplate={null} userId={session.user.id} />;
}
