import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getEmailTemplate } from "../actions";
import EmailTemplateFormClient from "../EmailTemplateFormClient";

export default async function EditEmailTemplatePage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    // Checking permissions
    if (session.user.role !== 'ADMIN' && !session.user.permissions?.includes('TEMPLATES_EDIT')) {
        redirect("/unauthorized");
    }

    const template = await getEmailTemplate(params.id);

    if (!template) {
        return <div className="p-8 text-center text-gray-500">Không tìm thấy mẫu email.</div>;
    }

    return <EmailTemplateFormClient initialTemplate={template} userId={session.user.id} />;
}
