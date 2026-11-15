const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Updating sample announcements with rich structured content...');

  const updates = [
    {
      id: 'ann_urgent_01',
      title: '⚠️ [KHẨN CẤP] Bảo trì hệ thống máy chủ và lưu trữ đám mây vào 22h00 tối nay',
      content: `Kính gửi: **Toàn thể Cán bộ - Nhân viên Công ty**

Phòng Công Nghệ Thông Tin trân trọng thông báo lịch bảo trì, nâng cấp định kỳ hệ thống máy chủ và hạ tầng sao lưu dữ liệu trung tâm:

• **Thời gian thực hiện**: Từ **22h00 đến 23h30 tối nay**.
• **Phạm vi bảo trì**: Toàn bộ hệ thống máy chủ ERP, cổng lưu trữ đám mây (Cloud Storage) và dịch vụ đồng bộ cơ sở dữ liệu.
• **Yêu cầu các phòng ban phối hợp**:
  - Khối **Kinh doanh & Bán hàng**: Chủ động hoàn tất lưu trữ các **Báo giá**, hợp đồng và cơ hội bán hàng (Lead) trước **21h45**.
  - Khối **Kế toán & Thu ngân**: Tạm ngừng xuất hóa đơn điện tử và các giao dịch đối soát công nợ trong khung giờ trên.
  - Bộ phận **Kỹ thuật & Dự án**: Bàn giao tiến độ công việc trong ngày trước thời điểm hệ thống bắt đầu bảo trì.

⚠️ **LƯU Ý QUAN TRỌNG**: Trong thời gian bảo trì, ứng dụng web sẽ tạm thời ngắt kết nối trong khoảng 15-20 phút. Vui lòng không thực hiện các thao tác thêm mới dữ liệu quan trọng.

Hotline hỗ trợ kỹ thuật trực ca đêm: **0901.888.666** (Mr. Tuấn - Trưởng phòng IT).
Trân trọng cảm ơn sự hợp tác của các phòng ban!`
    },
    {
      id: 'ann_policy_02',
      title: '📋 [NỘI QUY CÔNG TY] Quy định về bảo mật dữ liệu khách hàng & quy chế văn hóa doanh nghiệp',
      content: `Ban Giám Đốc ban hành quy định bảo mật thông tin và văn hóa doanh nghiệp năm 2026:

1. **QUY ĐỊNH BẢO MẬT DỮ LIỆU KHÁCH HÀNG & KINH DOANH**:
• Mọi thông tin khách hàng, số điện thoại, báo giá, chiết khấu và chứng từ tài chính trên hệ thống ERP là **tài sản bảo mật tuyệt đối** của Công ty.
• Nghiêm cấm mọi hành vi sao chép, trích xuất dữ liệu hàng loạt hoặc gửi thông tin ra ngoài hệ thống khi chưa có sự phê duyệt bằng văn bản của **Ban Giám Đốc**.

2. **QUY CHẾ VĂN HÓA DOANH NGHIỆP & CHẤM CÔNG**:
• **Giờ làm việc**: Buổi sáng từ **08h00 - 12h00**, Buổi chiều từ **13h30 - 17h30**.
• Nhân viên thực hiện chấm công đúng giờ qua ứng dụng nội bộ hoặc máy chấm công vân tay tại văn phòng.
• Trang phục công sở lịch sự, phong thái làm việc chuyên nghiệp, luôn chủ động hỗ trợ đồng nghiệp và khách hàng.

👉 Văn bản này có hiệu lực kể từ ngày ký. Mọi trường hợp vi phạm sẽ bị xử lý nghiêm theo quy chế khen thưởng & kỷ luật của Công ty.`
    },
    {
      id: 'ann_mission_03',
      title: '🎯 [BẢNG NHIỆM VỤ] Chiến dịch thi đua tháng: Tăng tốc hoàn thành 100% KPI Doanh số & Dự án',
      content: `Kính gửi các Khối Phòng ban trực thuộc Công ty,

Nhằm hoàn thành thắng lợi các chỉ tiêu sản xuất kinh doanh quý, Ban Giám Đốc phát động chiến dịch thi đua cao điểm:

🎯 **MỤC TIÊU TRỌNG TÂM TRONG THÁNG**:
• **Phòng Kinh doanh**: 
  - Tập trung chuyển đổi tối thiểu **40% các Lead tiềm năng** thành hợp đồng chính thức.
  - Đẩy mạnh hoàn thiện các Báo giá đang mở trước ngày 25 hàng tháng.
• **Bộ phận Kỹ thuật & Dự án**:
  - Nghiệm thu dứt điểm các hạng mục công trình tồn đọng, đảm bảo đúng tiến độ cam kết với chủ đầu tư.
• **Khối Kế toán - Tài chính**:
  - Đẩy mạnh đôn đốc và thu hồi dứt điểm **các khoản nợ quá hạn trên 30 ngày**.

🏆 **CHÍNH SÁCH KHEN THƯỞNG ĐẶC BIỆT**:
• Thưởng nóng **5.000.000 VNĐ** cho Nhân viên Kinh doanh đạt mốc doanh thu cá nhân cao nhất tháng.
• Thưởng tập thể xuất sắc cho phòng ban hoàn thành tiến độ trước hạn 3 ngày.

Chúc toàn thể CBNV luôn tràn đầy năng lượng và bứt phá ngoạn mục trong chiến dịch lần này!`
    },
    {
      id: 'ann_event_04',
      title: '🎉 [THÔNG BÁO] Lịch nghỉ lễ và phân công lịch trực Hotline hỗ trợ khách hàng',
      content: `Kính gửi: **Toàn thể Cán bộ - Nhân viên và Quý Khách hàng, Đối tác**

Công ty trân trọng thông báo kế hoạch nghỉ lễ và sắp xếp lịch trực điều hành như sau:

📅 **LỊCH NGHỈ CHÍNH THỨC**:
• **Thời gian nghỉ**: Bắt đầu từ ngày **Thứ Bảy** đến hết ngày **Chủ Nhật**.
• **Thời gian làm việc trở lại**: Thứ Hai tuần kế tiếp vào lúc **08h00 sáng**.

📞 **PHÂN CÔNG LỊCH TRỰC HỖ TRỢ ĐỐI TÁC 24/7**:
• Các Trưởng bộ phận gửi danh sách nhân sự trực lễ về phòng Nhân sự trước **17h00 thứ Năm**.
• Đường dây nóng xử lý sự cố khẩn cấp: **1900.8888** (hoạt động 24/24).
• Phòng Kỹ thuật bảo đảm duy trì kết nối máy chủ và hệ sinh thái phần mềm luôn thông suốt.

Kính chúc toàn thể Anh/Chị CBNV có một kỳ nghỉ lễ thật ấm áp, vui vẻ và trọn vẹn bên gia đình!`
    },
    {
      id: 'ann_general_05',
      title: '📢 [THÔNG BÁO CHUNG] Triển khai tính năng tạo Lead nhanh dạng Popup trên toàn hệ thống',
      content: `Kính gửi: **Khối Kinh doanh, Marketing và Dịch vụ Khách hàng**

Nhằm tối ưu hóa trải nghiệm làm việc và tăng tốc quy trình chuyển đổi bán hàng, hệ thống đã chính thức cập nhật:

✨ **CÁC ĐIỂM CẢI TIẾN NỔI BẬT**:
• **Tạo Cơ hội bán hàng (Lead) mới qua Popup Modal**:
  - Thao tác trực tiếp ngay tại trang danh sách mà không cần chuyển trang.
  - Hỗ trợ chọn nhanh Khách hàng hiện có hoặc tạo Khách hàng mới tức thì.
  - Tự động điền giá trị dự kiến, nguồn dữ liệu và người phụ trách.
• **Tự động chuyển vào trang chi tiết**:
  - Ngay sau khi lưu, hệ thống sẽ mở trực tiếp trang chi tiết của Lead để sales ghi chú, cập nhật tiến độ và gửi báo giá.

💡 **HƯỚNG DẪN TRUY CẬP**:
Vào menu **Kinh Doanh** ➔ **Cơ Hội (Leads)** ➔ Bấm nút **"+ Tạo Lead Mới"** để trải nghiệm.
Mọi đóng góp ý kiến cải tiến vui lòng phản hồi cho Ban Quản trị hệ thống!`
    }
  ];

  for (const item of updates) {
    await prisma.companyAnnouncement.update({
      where: { id: item.id },
      data: {
        title: item.title,
        content: item.content
      }
    });
    console.log(`Updated: ${item.id}`);
  }

  console.log('All sample announcements updated successfully!');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
