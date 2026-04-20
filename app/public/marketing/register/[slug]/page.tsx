import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import RegisterClient from "./RegisterClient";
import Image from "next/link";
import { BackgroundBeams } from "@/app/components/ui/background-beams";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
    const form = await prisma.marketingForm.findUnique({
        where: { id: params.slug },
        include: { campaign: true }
    });
    
    if (!form || !form.isActive) return { title: 'Sự kiện không tồn tại' };
    
    return {
        title: `${form.title} | Đăng ký tham gia`,
        description: form.description || form.campaign.description || 'Đăng ký tham gia sự kiện',
    };
}

export default async function PublicRegistrationPage({ params }: { params: { slug: string } }) {
    const form = await prisma.marketingForm.findUnique({
        where: { id: params.slug },
        include: {
            campaign: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    eventTime: true,
                    location: true,
                    startDate: true,
                    endDate: true,
                }
            }
        }
    });

    if (!form || !form.isActive) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-slate-100">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">!</div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Không tìm thấy form</h1>
                    <p className="text-slate-500">Biểu mẫu này không tồn tại hoặc đã ngừng nhận đăng ký.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white relative flex w-full">
            <div className="w-full">
                <RegisterClient form={form as any} />
            </div>
        </div>
    );
}
