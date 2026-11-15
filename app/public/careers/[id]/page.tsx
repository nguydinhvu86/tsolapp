import { redirect } from "next/navigation";

export default function PublicCareersRedirectPage({ params }: { params: { id: string } }) {
    redirect(`/careers/${params.id}`);
}
