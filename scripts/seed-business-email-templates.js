const { PrismaClient } = require('@prisma/client');

const COMPANY = {
    name: 'CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA',
    shortName: 'TRỊNH GIA',
    brandName: 'TRỊNH GIA SOLUTIONS & TRAINING',
    taxCode: '3703185173',
    address: 'Số 147/80, Đường NTMK, Phường Phú Lợi, Tp. Hồ Chí Minh',
    phone: 'Tel: (0274) 999 2222 - HP: 090 1232255',
    email: 'vutg@trinhgiatelecom.vn',
    website: 'trinhgiatelecom.vn',
    appUrl: 'inside.trinhgiatelecom.vn'
};

const templates = [
    // 1. ESTIMATE (Báo giá) - Standard
    {
        name: '[BÁO GIÁ] Thư Gửi Báo Giá & Đề Xuất Giải Pháp Kỹ Thuật',
        module: 'ESTIMATE',
        subject: '[TRỊNH GIA] Báo Giá & Đề Xuất Giải Pháp - {{code}} - Kính gửi {{customerName}}',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; border-bottom: 3px solid #2563eb;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Hệ Thống Quản Trị Doanh Nghiệp ERP - ${COMPANY.appUrl}</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Kính gửi Quý Khách hàng / Quý Doanh nghiệp <span style="color: #2563eb;">{{customerName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      Lời đầu tiên, <strong>${COMPANY.name}</strong> xin gửi lời chào trân trọng và lời chúc sức khỏe, thành công đến Quý đơn vị.
    </p>

    <p style="margin: 12px 0;">
      Căn cứ vào nhu cầu và các nội dung trao đổi kỹ thuật giữa hai bên, chúng tôi trân trọng gửi tới Quý khách bảng <strong>Báo giá chi tiết & Đề xuất giải pháp</strong> với thông tin tóm tắt như sau:
    </p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 40%;">Mã số báo giá:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a; font-family: monospace;">{{code}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Ngày lập báo giá:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{today}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Tổng giá trị dự toán:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #2563eb; font-size: 15px;">{{totalAmount}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Chuyên viên phụ trách:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{senderName}}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 16px 0;">
      Chi tiết danh mục thiết bị, thông số kỹ thuật, tiến độ giao hàng và các điều khoản thương mại đã được đính kèm trong tài liệu. Quý khách cũng có thể xem và duyệt trực tuyến tại liên kết dưới đây:
    </p>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{link}}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25);">
        XEM BÁO GIÁ VÀ DUYỆT TRỰC TUYẾN &rarr;
      </a>
    </div>

    <div style="border-left: 3px solid #10b981; background: #f0fdf4; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #166534; margin: 20px 0;">
      <strong>Cam kết chất lượng:</strong> Báo giá có hiệu lực trong vòng 30 ngày. Thiết bị & giải pháp được bảo hành chính hãng và hỗ trợ kỹ thuật tận tâm từ đội ngũ chuyên gia của Trịnh Gia.
    </div>

    <p style="margin: 16px 0 0 0;">
      Nếu Quý khách cần điều chỉnh hoặc làm rõ thêm về phương án kỹ thuật, xin vui lòng phản hồi email này hoặc liên hệ trực tiếp với chúng tôi.
    </p>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>Mã số thuế:</strong> ${COMPANY.taxCode}</p>
    <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại:</strong> ${COMPANY.phone}</p>
    <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${COMPANY.email}" style="color: #2563eb; text-decoration: none;">${COMPANY.email}</a></p>
    <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 11px; border-top: 1px dashed #e2e8f0; padding-top: 6px;">Email tự động gửi từ Hệ thống Quản trị Doanh nghiệp Trịnh Gia ERP.</p>
  </div>
</div>`
    },

    // 2. ESTIMATE (Báo giá) - Special Project Offer
    {
        name: '[BÁO GIÁ] Đề Xuất Báo Giá Kèm Chính Sách Ưu Đãi Dự Án',
        module: 'ESTIMATE',
        subject: '[TRỊNH GIA] Đề Xuất Báo Giá Đặc Biệt Dự Án - {{code}} - {{customerName}}',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 24px 30px; border-bottom: 3px solid #6366f1;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #c7d2fe; font-size: 12px;">Đề Xuất Thương Mại & Chính Sách Đối Tác Chiến Lược</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Kính gửi Ban Lãnh Đạo & Quý Đơn Vị <span style="color: #4f46e5;">{{customerName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      Trân trọng cảm ơn Quý đối tác đã tin tưởng lựa chọn <strong>${COMPANY.name}</strong> làm đơn vị đồng hành cho dự án sắp tới. Chúng tôi xin gửi tới Quý khách phương án báo giá với <strong>chính sách chiết khấu và hỗ trợ kỹ thuật tối ưu nhất</strong>:
    </p>

    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; width: 40%;">Mã hồ sơ báo giá:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #1e1b4b; font-family: monospace;">{{code}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Tổng giá trị ưu đãi:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #4f46e5; font-size: 16px;">{{totalAmount}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Chính sách hỗ trợ:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #059669;">Miễn phí lắp đặt, đào tạo & chuyển giao giải pháp</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{link}}" target="_blank" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);">
        XEM PHƯƠNG ÁN BÁO GIÁ DỰ ÁN &rarr;
      </a>
    </div>

    <p style="margin: 16px 0 0 0;">
      Rất mong có cơ hội được hợp tác chặt chẽ cùng Quý đơn vị để triển khai dự án thành công tốt đẹp.
    </p>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>Mã số thuế:</strong> ${COMPANY.taxCode}</p>
    <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại:</strong> ${COMPANY.phone}</p>
    <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${COMPANY.email}" style="color: #4f46e5; text-decoration: none;">${COMPANY.email}</a></p>
  </div>
</div>`
    },

    // 3. ORDER (Đơn hàng)
    {
        name: '[ĐƠN HÀNG] Xác Nhận Đơn Đặt Hàng & Kế Hoạch Bàn Giao',
        module: 'ORDER',
        subject: '[TRỊNH GIA] Xác Nhận Đơn Đặt Hàng Thành Công - Đơn số {{code}}',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; border-bottom: 3px solid #4f46e5;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Thông Báo Xác Nhận Đơn Hàng Thành Công</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Kính gửi Quý Khách hàng <span style="color: #4f46e5;">{{customerName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      Hệ thống <strong>${COMPANY.name}</strong> xin trân trọng thông báo: Đơn đặt hàng của Quý khách đã được tiếp nhận và xác nhận chính thức vào quy trình xử lý.
    </p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 40%;">Mã số đơn hàng:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a; font-family: monospace;">{{code}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Ngày xác nhận:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{today}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Tổng giá trị thanh toán:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #4f46e5; font-size: 15px;">{{totalAmount}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Trạng thái xử lý:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #059669;">Đang chuẩn bị hàng hóa & kiểm thử chất lượng (QC)</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="{{link}}" target="_blank" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);">
        THEO DÕI TIẾN ĐỘ ĐƠN HÀNG &rarr;
      </a>
    </div>

    <p style="margin: 16px 0 0 0;">
      Bộ phận giao vận & kỹ thuật sẽ chủ động liên hệ trước khi bàn giao. Mọi thắc mắc xin vui lòng liên hệ chuyên viên phụ trách của Quý khách.
    </p>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>Mã số thuế:</strong> ${COMPANY.taxCode}</p>
    <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại:</strong> ${COMPANY.phone}</p>
    <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${COMPANY.email}" style="color: #4f46e5; text-decoration: none;">${COMPANY.email}</a></p>
  </div>
</div>`
    },

    // 4. INVOICE (Hóa đơn) - Issuance
    {
        name: '[HÓA ĐƠN] Thông Báo Phát Hành Hóa Đơn & Đề Nghị Thanh Toán',
        module: 'INVOICE',
        subject: '[TRỊNH GIA] Thông Báo Phát Hành Hóa Đơn {{invoiceCode}} - {{customerName}}',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); padding: 24px 30px; border-bottom: 3px solid #10b981;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #a7f3d0; font-size: 12px;">Thông Báo Phát Hành Hóa Đơn Tài Chính</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Kính gửi Quý Khách hàng / Phòng Kế toán <span style="color: #059669;">{{customerName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      <strong>${COMPANY.name}</strong> trân trọng thông báo hóa đơn bán hàng / cung ứng dịch vụ cho Quý đơn vị đã được phát hành với thông tin chi tiết như sau:
    </p>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 40%;">Mã số hóa đơn:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a; font-family: monospace;">{{invoiceCode}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Tổng giá trị hóa đơn:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">{{totalAmount}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Số tiền cần thanh toán:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #dc2626; font-size: 15px;">{{remainingAmount}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Hạn thanh toán:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #d97706;">{{dueDate}}</td>
        </tr>
      </table>
    </div>

    <div style="background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px 16px; margin: 16px 0; font-size: 13px;">
      <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px;">Thông tin chuyển khoản thanh toán:</div>
      <div style="color: #475569; line-height: 1.5;">
        &bull; <strong>Đơn vị thụ hưởng:</strong> ${COMPANY.name}<br/>
        &bull; <strong>Mã số thuế:</strong> ${COMPANY.taxCode}<br/>
        &bull; <strong>Nội dung chuyển khoản:</strong> Thanh toan {{invoiceCode}} {{customerName}}
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="{{link}}" target="_blank" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.25);">
        XEM HÓA ĐƠN ĐIỆN TỬ & CHI TIẾT &rarr;
      </a>
    </div>

    <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
      Sau khi hoàn tất thanh toán, hệ thống sẽ tự động phát hành Biên nhận / Phiếu thu gửi về email của Quý khách.
    </p>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">PHÒNG TÀI CHÍNH KẾ TOÁN - ${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>Mã số thuế:</strong> ${COMPANY.taxCode}</p>
    <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại:</strong> ${COMPANY.phone}</p>
    <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${COMPANY.email}" style="color: #059669; text-decoration: none;">${COMPANY.email}</a></p>
  </div>
</div>`
    },

    // 5. INVOICE (Hóa đơn) - Due Reminder
    {
        name: '[HÓA ĐƠN] Nhắc Hạn Thanh Toán Hóa Đơn (Lịch Sự & Chuyên Nghiệp)',
        module: 'INVOICE',
        subject: '[TRỊNH GIA] Nhắc Nhở Hạn Thanh Toán Hóa Đơn {{invoiceCode}} - Hạn: {{dueDate}}',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #78350f 0%, #92400e 100%); padding: 24px 30px; border-bottom: 3px solid #f59e0b;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #fde68a; font-size: 12px;">Thông Báo Nhắc Hạn Thanh Toán</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Kính gửi Quý Khách hàng / Bộ phận Kế toán <span style="color: #b45309;">{{customerName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      Theo dõi hệ thống đối soát công nợ định kỳ, <strong>${COMPANY.name}</strong> xin phép được gửi thông báo nhắc nhở về khoản thanh toán cho hóa đơn sắp / đã đến hạn như sau:
    </p>

    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #78350f; width: 40%;">Mã hóa đơn:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a; font-family: monospace;">{{invoiceCode}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #78350f;">Số tiền còn lại:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #dc2626; font-size: 16px;">{{remainingAmount}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #78350f;">Hạn định thanh toán:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #b45309;">{{dueDate}}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="{{link}}" target="_blank" style="display: inline-block; background: #d97706; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.25);">
        TRA CỨU CHI TIẾT HÓA ĐƠN &rarr;
      </a>
    </div>

    <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
      Nếu Quý đơn vị đã thực hiện chuyển khoản trong 24 giờ qua, xin vui lòng bỏ qua thông báo này hoặc gửi ủy nhiệm chi để kế toán ghi nhận nhanh chóng. Trân trọng cảm ơn!
    </p>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">BỘ PHẬN QUẢN LÝ CÔNG NỢ - ${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>Mã số thuế:</strong> ${COMPANY.taxCode}</p>
    <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại:</strong> ${COMPANY.phone}</p>
    <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${COMPANY.email}" style="color: #d97706; text-decoration: none;">${COMPANY.email}</a></p>
  </div>
</div>`
    },

    // 6. PAYMENT_CONFIRMATION (Phiếu thu / Xác nhận thanh toán)
    {
        name: '[PHIẾU THU] Biên Nhận Đã Nhận Tiền Thanh Toán Từ Khách Hàng',
        module: 'PAYMENT_CONFIRMATION',
        subject: '[TRỊNH GIA] Biên Nhận Đã Nhận Thanh Toán - Phiếu thu {{paymentCode}}',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 24px 30px; border-bottom: 3px solid #34d399;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #a7f3d0; font-size: 12px;">Biên Nhận Xác Nhận Thanh Toán Thành Công</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Kính gửi Quý Khách hàng <span style="color: #059669;">{{customerName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      <strong>${COMPANY.name}</strong> xin trân trọng xác nhận đã nhận được khoản thanh toán từ Quý khách. Số tiền đã được cấn trừ chính thức vào hệ thống quản lý công nợ:
    </p>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 40%;">Mã số phiếu thu:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a; font-family: monospace;">{{paymentCode}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Số tiền đã nhận:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #059669; font-size: 16px;">{{paymentAmount}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Ngày ghi nhận:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{paymentDate}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Hình thức:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{paymentMethod}}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="{{link}}" target="_blank" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.25);">
        TRA CỨU PHIẾU THU ĐIỆN TỬ &rarr;
      </a>
    </div>

    <p style="margin: 16px 0 0 0;">
      Cảm ơn Quý khách hàng đã luôn đồng hành và hợp tác cùng Trịnh Gia. Kính chúc Quý đơn vị ngày càng phát triển thịnh vượng!
    </p>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">PHÒNG TÀI CHÍNH KẾ TOÁN - ${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>Mã số thuế:</strong> ${COMPANY.taxCode}</p>
    <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại:</strong> ${COMPANY.phone}</p>
    <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${COMPANY.email}" style="color: #059669; text-decoration: none;">${COMPANY.email}</a></p>
  </div>
</div>`
    },

    // 7. DEBT_CONFIRMATION (Xác nhận công nợ)
    {
        name: '[CÔNG NỢ] Thư Đối Chiếu & Đề Nghị Xác Nhận Công Nợ Định Kỳ',
        module: 'DEBT_CONFIRMATION',
        subject: '[TRỊNH GIA] Thư Đối Chiếu & Đề Nghị Xác Nhận Công Nợ - Quý {{customerName}}',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; border-bottom: 3px solid #f59e0b;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 12px;">Thư Đối Chiếu & Xác Nhận Số Dư Công Nợ</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Kính gửi Quý Khách hàng / Phòng Kế toán <span style="color: #d97706;">{{customerName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      Nhằm phục vụ công tác đối soát số liệu tài chính định kỳ giữa hai đơn vị và đảm bảo tính minh bạch, chính xác của chứng từ kế toán, <strong>${COMPANY.name}</strong> trân trọng gửi bảng đối chiếu số dư công nợ tính đến thời điểm hiện tại:
    </p>

    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #78350f; width: 40%;">Tên đơn vị đối tác:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">{{customerName}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #78350f;">Ngày trích xuất sao kê:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{today}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #78350f;">Tổng công nợ hiện tại:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #dc2626; font-size: 17px;">{{totalDebt}}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 14px 0;">
      Kính đề nghị Quý đối tác kiểm tra số liệu. Trường hợp số liệu hoàn toàn khớp đúng, xin vui lòng phản hồi email này để xác nhận. Nếu có bất kỳ sự chênh lệch hoặc cần làm rõ các chứng từ phát sinh, xin vui lòng liên hệ trực tiếp với bộ phận kế toán của chúng tôi trong vòng 03 ngày làm việc.
    </p>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">BỘ PHẬN QUẢN TRỊ CÔNG NỢ - ${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>Mã số thuế:</strong> ${COMPANY.taxCode}</p>
    <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại:</strong> ${COMPANY.phone}</p>
    <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${COMPANY.email}" style="color: #d97706; text-decoration: none;">${COMPANY.email}</a></p>
  </div>
</div>`
    },

    // 8. PURCHASE_ORDER (Đơn mua hàng PO gửi NCC)
    {
        name: '[MUA HÀNG - PO] Đơn Đặt Mua Hàng Chính Thức Gửi Nhà Cung Cấp',
        module: 'PURCHASE_ORDER',
        subject: '[TRỊNH GIA PO] Đơn Đặt Mua Hàng Số {{orderCode}} - Kính gửi {{supplierName}}',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #831843 0%, #9d174d 100%); padding: 24px 30px; border-bottom: 3px solid #ec4899;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #fbcfe8; font-size: 12px;">Đơn Đặt Hàng Mua Sắm Thiết Bị & Vật Tư (PO)</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Kính gửi Quý Nhà Cung Cấp <span style="color: #be185d;">{{supplierName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      <strong>${COMPANY.name}</strong> trân trọng gửi tới Quý đơn vị <strong>Đơn Đặt Mua Hàng chính thức (Purchase Order)</strong> với thông tin tổng quan như sau:
    </p>

    <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #831843; width: 40%;">Mã số đơn PO:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a; font-family: monospace;">{{orderCode}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #831843;">Ngày phát hành PO:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{date}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #831843;">Tổng giá trị đặt hàng:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #be185d; font-size: 16px;">{{totalAmount}}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="{{link}}" target="_blank" style="display: inline-block; background: #be185d; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(190, 24, 93, 0.25);">
        XEM CHI TIẾT ĐƠN ĐẶT MUA HÀNG (PO) &rarr;
      </a>
    </div>

    <p style="margin: 16px 0 0 0;">
      Kính đề nghị Quý NCC kiểm tra danh mục hàng hóa, xác nhận tiến độ giao hàng và chuẩn bị hóa đơn GTGT kèm chứng từ CO/CQ tương ứng.
    </p>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">PHÒNG MUA HÀNG & CUNG ỨNG - ${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>Mã số thuế:</strong> ${COMPANY.taxCode}</p>
    <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại:</strong> ${COMPANY.phone}</p>
    <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${COMPANY.email}" style="color: #be185d; text-decoration: none;">${COMPANY.email}</a></p>
  </div>
</div>`
    },

    // 9. LEAD (Khách hàng tiềm năng)
    {
        name: '[LEAD] Thư Chào Mừng & Tiếp Nhận Yêu Cầu Tư Vấn',
        module: 'LEAD',
        subject: '[TRỊNH GIA] Cảm Ơn Quý Khách Đã Quan Tâm Đến Giải Pháp Của Trịnh Gia',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; border-bottom: 3px solid #f97316;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #fdba74; font-size: 12px;">Thư Chào Mừng & Tiếp Nhận Yêu Cầu Tư Vấn</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Kính chào Quý Khách / Anh (Chị) <span style="color: #ea580c;">{{leadName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      Cảm ơn Quý khách đã quan tâm và để lại thông tin tìm hiểu về các giải pháp đào tạo & công nghệ của <strong>${COMPANY.name}</strong>.
    </p>

    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 700; color: #9a3412;">Yêu cầu tư vấn của Quý khách đã được chuyển tới chuyên gia:</p>
      <div style="font-size: 13px; color: #431407; line-height: 1.6;">
        &bull; <strong>Chuyên viên tư vấn phụ trách:</strong> {{assignedTo}}<br/>
        &bull; <strong>Thời gian phản hồi dự kiến:</strong> Trong vòng 24 giờ làm việc
      </div>
    </div>

    <p style="margin: 16px 0;">
      Chúng tôi sẽ chủ động liên hệ qua điện thoại hoặc email để lắng nghe chi tiết bài toán thực tế của Quý đơn vị và đề xuất lộ trình giải pháp phù hợp nhất.
    </p>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">TRUNG TÂM TƯ VẤN KHÁCH HÀNG - ${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>Mã số thuế:</strong> ${COMPANY.taxCode}</p>
    <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Hotline tư vấn:</strong> ${COMPANY.phone}</p>
    <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${COMPANY.email}" style="color: #ea580c; text-decoration: none;">${COMPANY.email}</a></p>
  </div>
</div>`
    },

    // 10. TASK (Công việc nội bộ - Giao việc mới)
    {
        name: '[CÔNG VIỆC] Thông Báo Phân Công Nhiệm Vụ Mới',
        module: 'TASK',
        subject: '[TRỊNH GIA] Bạn Được Phân Công Nhiệm Vụ Mới: {{taskTitle}}',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 24px 30px; border-bottom: 3px solid #6366f1;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #c7d2fe; font-size: 12px;">Hệ Thống Quản Trị Phân Công & Theo Dõi Tiến Độ</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Chào <span style="color: #4f46e5;">{{assigneeName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      Bạn vừa được phân công một nhiệm vụ mới trên hệ thống Quản trị Trịnh Gia. Dưới đây là thông tin chi tiết:
    </p>

    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; width: 35%;">Tiêu đề việc:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">{{taskTitle}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Người giao việc:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{assignerName}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Hạn chót (Deadline):</td>
          <td style="padding: 6px 0; font-weight: 700; color: #dc2626;">{{dueDate}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Mức độ ưu tiên:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #4f46e5;">{{priority}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280; vertical-align: top;">Nội dung mô tả:</td>
          <td style="padding: 6px 0; color: #475569;">{{taskDescription}}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="{{link}}" target="_blank" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);">
        TRUY CẬP VÀ XỬ LÝ NHIỆM VỤ &rarr;
      </a>
    </div>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>MST:</strong> ${COMPANY.taxCode} | <strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại:</strong> ${COMPANY.phone} | <strong>Email:</strong> ${COMPANY.email}</p>
  </div>
</div>`
    },

    // 10b. TASK (Công việc nội bộ - Cập nhật trạng thái & tiến độ)
    {
        name: '[CÔNG VIỆC] Thông Báo Cập Nhật Trạng Thái & Tiến Độ',
        module: 'TASK',
        subject: '[TRỊNH GIA] Cập Nhật Trạng Thái: {{taskTitle}} - [{{status}}]',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; border-bottom: 3px solid #2563eb;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Thông Báo Cập Nhật Trạng Thái Công Việc</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Chào <span style="color: #2563eb;">{{assigneeName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      Công việc <strong>{{taskTitle}}</strong> vừa được chuyển trạng thái sang <strong style="color: #2563eb;">[{{status}}]</strong> bởi <strong>{{assignerName}}</strong>.
    </p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 35%;">Tiêu đề việc:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">{{taskTitle}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Trạng thái mới:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #2563eb; font-size: 14px;">{{status}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Người thực hiện:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{assignerName}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Hạn chót:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #dc2626;">{{dueDate}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Mức độ ưu tiên:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">{{priority}}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="{{link}}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25);">
        XEM CHI TIẾT CÔNG VIỆC &rarr;
      </a>
    </div>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>MST:</strong> ${COMPANY.taxCode} | <strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại:</strong> ${COMPANY.phone} | <strong>Email:</strong> ${COMPANY.email}</p>
  </div>
</div>`
    },

    // 11. CUSTOMER (Chăm sóc khách hàng)
    {
        name: '[CHĂM SÓC KH] Thư Tri Ân & Cảm Ơn Sự Đồng Hành Của Quý Khách',
        module: 'CUSTOMER',
        subject: '[TRỊNH GIA] Thư Tri Ân & Cảm Ơn Sự Đồng Hành Của Quý Đối Tác {{customerName}}',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 26px 30px; border-bottom: 3px solid #0284c7;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #7dd3fc; font-size: 12px;">Thư Cảm Ơn & Tri Ân Quý Đối Tác</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.65; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Kính gửi Quý Khách hàng & Quý Đối tác <span style="color: #0284c7;">{{customerName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      Ban Giám Đốc cùng toàn thể đội ngũ cán bộ nhân viên <strong>${COMPANY.name}</strong> xin gửi lời cảm ơn chân thành và sâu sắc nhất tới Quý khách vì đã luôn tin tưởng, đồng hành và hợp tác cùng chúng tôi trong suốt thời gian qua.
    </p>

    <p style="margin: 12px 0;">
      Sự hài lòng và thành công của Quý đối tác chính là động lực lớn nhất để Trịnh Gia không ngừng nâng cao chất lượng dịch vụ, tối ưu hóa các giải pháp và hoàn thiện hệ thống hỗ trợ.
    </p>

    <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 14px 18px; border-radius: 0 10px 10px 0; margin: 20px 0; font-style: italic; color: #0369a1;">
      "Chúng tôi cam kết luôn lắng nghe, đồng hành và mang lại những giá trị thiết thực, bền vững nhất cho sự phát triển của Quý vị."
    </div>

    <p style="margin: 14px 0 0 0;">
      Kính chúc Quý Doanh nghiệp luôn phát triển vững mạnh, gặt hái nhiều thành tựu vượt bậc!
    </p>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">BAN QUẢN TRỊ & CHĂM SÓC KHÁCH HÀNG - ${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>Mã số thuế:</strong> ${COMPANY.taxCode}</p>
    <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại CSKH:</strong> ${COMPANY.phone}</p>
    <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${COMPANY.email}" style="color: #0284c7; text-decoration: none;">${COMPANY.email}</a></p>
  </div>
</div>`
    },

    // 12. GENERAL (Thông báo chung) - Holiday / Schedule / 24/7
    {
        name: '[THÔNG BÁO CHUNG] Thông Báo Lịch Làm Việc, Nghỉ Lễ & Kênh Hỗ Trợ',
        module: 'GENERAL',
        subject: '[TRỊNH GIA] Thông Báo Lịch Làm Việc / Nghỉ Lễ & Kênh Hỗ Trợ 24/7',
        body: `<div style="max-width: 620px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; border-bottom: 3px solid #64748b;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA</h2>
    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Thông Báo Lịch Làm Việc & Kênh Hỗ Trợ Dịch Vụ</p>
  </div>

  <div style="padding: 28px 30px 20px 30px; color: #334155; line-height: 1.6; font-size: 14px;">
    <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">
      Kính gửi Quý Khách hàng & Quý Đối tác <span style="color: #2563eb;">{{customerName}}</span>,
    </p>

    <p style="margin: 12px 0;">
      <strong>${COMPANY.name}</strong> xin trân trọng thông báo lịch làm việc, lịch nghỉ lễ và kế hoạch trực hỗ trợ dịch vụ như sau:
    </p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 13px;">
      <div style="margin-bottom: 8px;">&bull; <strong>Thời gian tạm nghỉ giao dịch:</strong> Từ ngày .../... đến hết ngày .../...</div>
      <div style="margin-bottom: 8px;">&bull; <strong>Thời gian hoạt động trở lại:</strong> Bắt đầu từ ngày .../...</div>
      <div>&bull; <strong>Trực kỹ thuật & hệ thống khẩn cấp:</strong> Hoạt động 24/7 xuyên suốt.</div>
    </div>

    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px; margin: 16px 0; font-size: 13px; color: #1e40af;">
      <strong>Kênh tiếp nhận hỗ trợ khẩn cấp:</strong><br/>
      Hotline: <strong>${COMPANY.phone}</strong> | Email: <strong>${COMPANY.email}</strong>
    </div>

    <p style="margin: 16px 0 0 0;">
      Kính chúc Quý Khách hàng cùng gia đình dồi dào sức khỏe, may mắn và thành công!
    </p>
  </div>

  <div style="background: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
    <p style="margin: 0 0 4px 0; font-weight: 700; color: #1e293b; font-size: 13px;">${COMPANY.name}</p>
    <p style="margin: 2px 0;"><strong>Mã số thuế:</strong> ${COMPANY.taxCode}</p>
    <p style="margin: 2px 0;"><strong>Địa chỉ:</strong> ${COMPANY.address}</p>
    <p style="margin: 2px 0;"><strong>Điện thoại:</strong> ${COMPANY.phone}</p>
    <p style="margin: 2px 0;"><strong>Email:</strong> <a href="mailto:${COMPANY.email}" style="color: #2563eb; text-decoration: none;">${COMPANY.email}</a></p>
  </div>
</div>`
    }
];

async function seedBusinessEmailTemplates(prisma) {
    console.log('--- Đang khởi tạo bộ mẫu Email Doanh Nghiệp Chuẩn B2B - CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA (13 Mẫu) ---');
    
    // Find an admin user to be creatorId
    let creator = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'MANAGER'] } },
        select: { id: true }
    });
    if (!creator) {
        creator = await prisma.user.findFirst({ select: { id: true } });
    }
    if (!creator) {
        console.log('Chưa có user nào trong hệ thống, bỏ qua seed email template.');
        return;
    }

    const creatorId = creator.id;
    let createdCount = 0;
    let updatedCount = 0;

    for (const t of templates) {
        const existing = await prisma.emailTemplate.findFirst({
            where: {
                OR: [
                    { name: t.name },
                    { subject: t.subject }
                ]
            }
        });

        if (existing) {
            await prisma.emailTemplate.update({
                where: { id: existing.id },
                data: {
                    name: t.name,
                    subject: t.subject,
                    body: t.body,
                    module: t.module,
                    updatedAt: new Date()
                }
            });
            updatedCount++;
        } else {
            await prisma.emailTemplate.create({
                data: {
                    name: t.name,
                    subject: t.subject,
                    body: t.body,
                    module: t.module,
                    creatorId
                }
            });
            createdCount++;
        }
    }

    console.log(`✅ Đã đồng bộ Email Templates: Tạo mới ${createdCount} mẫu, Cập nhật ${updatedCount} mẫu.`);
}

module.exports = { seedBusinessEmailTemplates, templates, COMPANY };

if (require.main === module) {
    const prisma = new PrismaClient();
    seedBusinessEmailTemplates(prisma)
        .catch(console.error)
        .finally(() => prisma.$disconnect());
}
