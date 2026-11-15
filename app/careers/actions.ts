'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs";

export async function submitPublicCandidateApplication(formData: FormData) {
    try {
        const postingId = formData.get('postingId') as string;
        const fullName = (formData.get('fullName') as string || '').trim();
        const email = (formData.get('email') as string || '').trim();
        const phone = (formData.get('phone') as string || '').trim();
        const notes = (formData.get('notes') as string || '').trim();
        const skills = (formData.get('skills') as string || '').trim();
        const cvLink = (formData.get('cvLink') as string || '').trim();
        const cvFile = formData.get('cvFile') as File | null;

        if (!fullName || !phone) {
            return { success: false, error: "Vui lòng nhập đầy đủ Họ tên và Số điện thoại liên hệ!" };
        }

        if (!postingId) {
            return { success: false, error: "Thiếu mã định danh vị trí tuyển dụng!" };
        }

        const posting = await prisma.jobPosting.findUnique({
            where: { id: postingId },
            include: { requisition: true }
        });

        if (!posting) {
            return { success: false, error: "Không tìm thấy thông tin vị trí tuyển dụng này!" };
        }

        let savedCvUrl = cvLink || null;

        // If candidate uploaded a physical CV file
        if (cvFile && typeof cvFile === 'object' && cvFile.size > 0 && cvFile.name) {
            const rawExt = path.extname(cvFile.name).toLowerCase();
            const allowedExtensions = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
            if (!allowedExtensions.includes(rawExt)) {
                return { success: false, error: "Định dạng file CV chỉ hỗ trợ PDF, DOC, DOCX hoặc ảnh!" };
            }
            if (cvFile.size > 15 * 1024 * 1024) {
                return { success: false, error: "Dung lượng file CV tối đa 15MB!" };
            }

            const uploadDir = path.join(process.cwd(), "public", "uploads", "cvs");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const sanitizedBase = cvFile.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
            const fileName = `cv-${Date.now()}-${sanitizedBase}${rawExt}`;
            const filePath = path.join(uploadDir, fileName);
            const bytes = await cvFile.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(bytes));
            savedCvUrl = `/uploads/cvs/${fileName}`;
        }

        // Save Candidate & Application in Transaction
        const result = await prisma.$transaction(async (tx: any) => {
            const candidate = await tx.atsCandidate.create({
                data: {
                    fullName,
                    email: email || null,
                    phone: phone || null,
                    source: "WEBSITE_CAREERS",
                    skills: skills || null,
                    notes: notes ? `Ứng tuyển từ Landing Page: ${notes}` : 'Ứng tuyển qua Landing Page Tuyển Dụng trực tuyến',
                    cvUrl: savedCvUrl
                }
            });

            const application = await tx.jobApplication.create({
                data: {
                    candidateId: candidate.id,
                    requisitionId: posting.requisitionId,
                    stage: "APPLIED"
                }
            });

            return { candidate, application };
        });

        revalidatePath('/hr/recruitment/pipeline');
        revalidatePath('/hr/recruitment/postings');

        return { 
            success: true, 
            message: "Hồ sơ ứng tuyển của bạn đã được tiếp nhận thành công!",
            data: { id: result.application.id } 
        };
    } catch (e: any) {
        console.error("Submit application error:", e);
        return { success: false, error: e.message || "Lỗi hệ thống khi gửi hồ sơ ứng tuyển" };
    }
}
