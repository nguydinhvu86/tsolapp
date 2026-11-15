const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAnnouncements() {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const authorId = admin ? admin.id : null;
    const authorName = admin ? admin.name : 'Ban Giám Đốc';

    const items = [
        {
            id: 'ann_urgent_01',
            title: '⚠️ [KHẨN CẤP] Bảo trì hệ thống máy chủ và lưu trữ đám mây vào 22h00 tối nay',
            content: 'Toàn thể CBNV lưu ý: Phòng Công Nghệ Thông Tin sẽ tiến hành bảo trì, nâng cấp định kỳ hệ thống máy chủ và hạ tầng sao lưu dữ liệu từ 22h00 đến 23h30 tối nay. Đề nghị các bộ phận Kế toán, Kinh doanh và Dự án chủ động hoàn tất lưu trữ các chứng từ, báo giá và nhật ký công việc trước 21h45 để đảm bảo an toàn dữ liệu.',
            type: 'URGENT',
            isUrgent: 1,
            isPinned: 1,
            authorId,
            authorName,
            viewsCount: 28,
            createdAt: new Date().toISOString()
        },
        {
            id: 'ann_policy_02',
            title: '📋 [NỘI QUY CÔNG TY] Quy định về bảo mật dữ liệu khách hàng & quy chế văn hóa doanh nghiệp',
            content: 'Ban Giám Đốc ban hành quy chuẩn bảo mật thông tin: Mọi thông tin khách hàng, báo giá, hợp đồng và hóa đơn trên hệ thống ERP tuyệt đối không được sao chép hoặc chia sẻ ra bên ngoài khi chưa được cấp thẩm quyền. Đồng thời yêu cầu toàn thể nhân sự thực hiện chấm công đúng giờ và tuân thủ quy tắc ứng xử chuyên nghiệp.',
            type: 'POLICY',
            isUrgent: 0,
            isPinned: 1,
            authorId,
            authorName,
            viewsCount: 45,
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
            id: 'ann_mission_03',
            title: '🎯 [BẢNG NHIỆM VỤ] Chiến dịch thi đua tháng: Tăng tốc hoàn thành 100% KPI Doanh số & Dự án',
            content: 'Mục tiêu trọng tâm: Phòng Kinh doanh tập trung chuyển đổi các Lead tiềm năng thành hợp đồng; Bộ phận Kỹ thuật & Dự án nghiệm thu dứt điểm các hạng mục công trình tồn đọng; Khối Kế toán đẩy mạnh thu hồi công nợ quá hạn. Mọi cá nhân và tập thể xuất sắc sẽ được khen thưởng trực tiếp tại lễ tổng kết.',
            type: 'MISSION',
            isUrgent: 0,
            isPinned: 0,
            authorId,
            authorName,
            viewsCount: 39,
            createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
        },
        {
            id: 'ann_event_04',
            title: '🎉 [THÔNG BÁO] Lịch nghỉ lễ và phân công lịch trực Hotline hỗ trợ khách hàng',
            content: 'Thông báo lịch nghỉ và kế hoạch phân công ca trực hỗ trợ đối tác 24/7. Các trưởng bộ phận lập danh sách nhân sự trực lễ gửi về phòng Nhân sự trước thứ 6 tuần này.',
            type: 'EVENT',
            isUrgent: 0,
            isPinned: 0,
            authorId,
            authorName,
            viewsCount: 62,
            createdAt: new Date(Date.now() - 3600000 * 72).toISOString()
        },
        {
            id: 'ann_general_05',
            title: '📢 [THÔNG BÁO CHUNG] Triển khai tính năng tạo Lead nhanh dạng Popup trên toàn hệ thống',
            content: 'Hệ thống đã cập nhật chức năng tạo Cơ hội bán hàng (Lead) mới qua Popup Modal tiện lợi, giúp sales thao tác nhanh chóng và tự động chuyển ngay vào trang chi tiết để chăm sóc khách hàng.',
            type: 'GENERAL',
            isUrgent: 0,
            isPinned: 0,
            authorId,
            authorName,
            viewsCount: 88,
            createdAt: new Date(Date.now() - 3600000 * 96).toISOString()
        }
    ];

    for (const item of items) {
        await prisma.$executeRawUnsafe(
            `INSERT INTO company_announcements (id, title, content, type, isUrgent, isPinned, authorId, authorName, viewsCount, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content), isUrgent = VALUES(isUrgent), isPinned = VALUES(isPinned);`,
            item.id, item.title, item.content, item.type, item.isUrgent, item.isPinned, item.authorId, item.authorName, item.viewsCount, item.createdAt, item.createdAt
        );
    }
    console.log('Seeded sample company announcements!');
}

seedAnnouncements().catch(console.error).finally(() => prisma.$disconnect());
