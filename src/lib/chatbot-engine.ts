import { CompanySafeMetrics } from "./chatbot-metrics";

/**
 * Các loại Intent (Ý định) chính của người dùng
 */
export type ChatIntent =
  | "GREETING"
  | "ABOUT_BOT_AND_TEAM"
  | "TODO_OR_NEXT_STEPS"
  | "HOWTO_CREATE_JOB"
  | "HOWTO_ADD_CANDIDATE"
  | "HOWTO_SCHEDULE_INTERVIEW"
  | "HOWTO_CREATE_PROCESS"
  | "HOWTO_CREATE_DEPARTMENT"
  | "HOWTO_ADD_MEMBER"
  | "HOWTO_CHANGE_PASSWORD"
  | "PASSWORD_STEAL_ATTEMPT"
  | "QUERY_JOBS"
  | "QUERY_CANDIDATES"
  | "QUERY_INTERVIEWS"
  | "QUERY_MEMBERS"
  | "QUERY_DEPARTMENTS"
  | "QUERY_OVERVIEW"
  | "EXPLAIN_AI_MATCH"
  | "FULL_WORKFLOW_GUIDE"
  | "THANKS"
  | "UNKNOWN";

/**
 * Phân tích và nhận diện chính xác Ý định (Intent) của người dùng
 */
export function detectUserIntent(message: string): ChatIntent {
  const text = message.toLowerCase().trim();

  // 1. Cố tình lấy / xem mật khẩu của người khác
  const isAskingPassword =
    text.includes("mật khẩu") ||
    text.includes("password") ||
    text.includes("pass") ||
    text.includes("mat khau") ||
    text.includes("hash") ||
    text.includes("token");

  if (
    isAskingPassword &&
    (text.includes("cho tôi") ||
      text.includes("lấy") ||
      text.includes("xem") ||
      text.includes("show") ||
      text.includes("của ai") ||
      text.includes("của admin") ||
      text.includes("của người") ||
      text.includes("là gì")) &&
    !text.includes("làm sao") &&
    !text.includes("làm thế nào") &&
    !text.includes("cách") &&
    !text.includes("hướng dẫn")
  ) {
    return "PASSWORD_STEAL_ATTEMPT";
  }

  // 2. Hỏi cách đổi mật khẩu hoặc quên mật khẩu
  if (
    isAskingPassword &&
    (text.includes("đổi") ||
      text.includes("quên") ||
      text.includes("cấp lại") ||
      text.includes("làm sao") ||
      text.includes("cách") ||
      text.includes("reset"))
  ) {
    return "HOWTO_CHANGE_PASSWORD";
  }

  // 3. Chào hỏi
  if (
    /^(chào|xin chào|hi|hello|alo|ê|bạn ơi|chào bạn|hey|good morning|chao)$/i.test(text) ||
    text.startsWith("chào bạn") ||
    text.startsWith("xin chào")
  ) {
    return "GREETING";
  }

  // 4. Lời cảm ơn
  if (
    text.includes("cảm ơn") ||
    text.includes("thank") ||
    text.includes("tốt quá") ||
    text.includes("tuyệt vời") ||
    text.includes("ok rồi") ||
    text.includes("oke rồi")
  ) {
    return "THANKS";
  }

  // 5. Hỏi về Bot và Nhóm 20
  if (
    text.includes("bạn là ai") ||
    text.includes("bạn tên gì") ||
    text.includes("nhóm 20") ||
    text.includes("ai làm") ||
    text.includes("ai phát triển") ||
    text.includes("nhóm phát triển") ||
    text.includes("tác giả")
  ) {
    return "ABOUT_BOT_AND_TEAM";
  }

  // 6. Kiểm tra các câu hỏi HOW-TO (Hướng dẫn thao tác)
  const isActionOrHowTo =
    text.includes("làm sao") ||
    text.includes("làm thế nào") ||
    text.includes("cách") ||
    text.includes("hướng dẫn") ||
    text.includes("thêm mới") ||
    text.includes("tạo mới") ||
    text.includes("đăng tin") ||
    text.includes("nộp hồ sơ") ||
    text.includes("bước") ||
    text.includes("thao tác");

  if (isActionOrHowTo) {
    if (text.includes("đợt tuyển") || text.includes("tin tuyển") || text.includes("vị trí") || text.includes("job") || text.includes("đăng tuyển")) {
      return "HOWTO_CREATE_JOB";
    }
    if (text.includes("ứng viên") || text.includes("hồ sơ") || text.includes("cv") || text.includes("upload") || text.includes("tải lên") || text.includes("nộp")) {
      return "HOWTO_ADD_CANDIDATE";
    }
    if (text.includes("phỏng vấn") || text.includes("lịch") || text.includes("meet") || text.includes("họp") || text.includes("interview")) {
      return "HOWTO_SCHEDULE_INTERVIEW";
    }
    if (text.includes("quy trình") || text.includes("vòng") || text.includes("giai đoạn") || text.includes("stage") || text.includes("bước tuyển")) {
      return "HOWTO_CREATE_PROCESS";
    }
    if (text.includes("phòng ban") || text.includes("bộ phận") || text.includes("cơ cấu")) {
      return "HOWTO_CREATE_DEPARTMENT";
    }
    if (text.includes("thành viên") || text.includes("nhân sự") || text.includes("nhân viên") || text.includes("tài khoản") || text.includes("phân quyền")) {
      return "HOWTO_ADD_MEMBER";
    }
  }

  // 7. Hỏi về AI bóc tách & chấm điểm
  if (
    text.includes("bóc tách") ||
    text.includes("chấm điểm") ||
    text.includes("match score") ||
    text.includes("trí tuệ nhân tạo") ||
    text.includes("tại sao điểm") ||
    (/\bai\b/i.test(text) && (text.includes("cv") || text.includes("hoạt động") || text.includes("sàng lọc") || text.includes("chấm")))
  ) {
    return "EXPLAIN_AI_MATCH";
  }

  // 8. Hỏi về việc cần làm / Gợi ý các bước tiếp theo
  if (
    text.includes("cần làm gì") ||
    text.includes("làm gì tiếp") ||
    text.includes("bắt đầu từ đâu") ||
    text.includes("hôm nay") ||
    text.includes("gợi ý") ||
    text.includes("việc cần làm")
  ) {
    return "TODO_OR_NEXT_STEPS";
  }

  // 9. Hỏi quy trình tổng thể từ A - Z
  if (
    text.includes("toàn bộ quy trình") ||
    text.includes("tổng thể") ||
    text.includes("từ a đến z") ||
    text.includes("luồng tuyển dụng") ||
    text.includes("hướng dẫn sử dụng") ||
    text.includes("tính năng chính")
  ) {
    return "FULL_WORKFLOW_GUIDE";
  }

  // 10. Tra cứu danh sách & số liệu cụ thể (DATA QUERY)
  if (text.includes("đợt tuyển") || text.includes("tin tuyển") || text.includes("vị trí") || text.includes("công việc") || text.includes("đang tuyển")) {
    return "QUERY_JOBS";
  }

  if (text.includes("ứng viên") || text.includes("hồ sơ") || text.includes("cv") || text.includes("ai nộp")) {
    return "QUERY_CANDIDATES";
  }

  if (text.includes("phỏng vấn") || text.includes("lịch") || text.includes("meet") || text.includes("interview")) {
    return "QUERY_INTERVIEWS";
  }

  if (text.includes("nhân sự") || text.includes("thành viên") || text.includes("nhân viên") || text.includes("đồng nghiệp") || text.includes("ai trong công ty")) {
    return "QUERY_MEMBERS";
  }

  if (text.includes("phòng ban") || text.includes("bộ phận")) {
    return "QUERY_DEPARTMENTS";
  }

  if (
    text.includes("số liệu") ||
    text.includes("thống kê") ||
    text.includes("báo cáo") ||
    text.includes("tổng quan") ||
    text.includes("tài khoản của tôi") ||
    text.includes("công ty tôi") ||
    text.includes("tình hình") ||
    text.includes("hiện tại")
  ) {
    return "QUERY_OVERVIEW";
  }

  return "UNKNOWN";
}

/**
 * Bộ tạo phản hồi thông minh, giải thích sâu sắc, tự nhiên dựa trên Intent và Dữ liệu thực tế
 */
export function generateSmartReply(
  message: string,
  session: any,
  metrics: CompanySafeMetrics | null
): string {
  const intent = detectUserIntent(message);
  const companyName = metrics?.company?.name || session?.companyName || "doanh nghiệp của bạn";
  const companySlug = metrics?.company?.slug || session?.companySlug || "company";

  switch (intent) {
    case "GREETING":
      return `Xin chào ${session?.fullName ? `**${session.fullName}**` : ""}! Tôi là **Trợ lý AI** của Hệ thống Tuyển dụng Nhóm 20.\n\nTôi có thể hỗ trợ bạn:\n- 📊 Tra cứu số liệu thực tế (đợt tuyển dụng, ứng viên, lịch phỏng vấn, nhân sự...).\n- 💡 Hướng dẫn chi tiết từng thao tác nghiệp vụ trên hệ thống.\n\nBạn đang cần hỗ trợ vấn đề gì?`;

    case "ABOUT_BOT_AND_TEAM":
      return `Tôi là **Trợ lý AI** được tích hợp trong Hệ thống Quản trị Tuyển dụng B2B SaaS, được nghiên cứu và phát triển bởi **Nhóm 20**.\n\n**Thành viên nhóm phát triển:**\n- 👨‍💻 **Trần Mạnh Dũng** (dungtm@gmail.com)\n- 👨‍💻 **Bành Trung Hiếu** (hieubt@gmail.com)\n- 👨‍💻 **Nguyễn Văn Trường Giang** (giangnvt@gmail.com)\n- 👨‍💻 **Nguyễn Tuấn Anh** (anhnt@gmail.com)\n\nMục tiêu của hệ thống là tự động hóa sàng lọc hồ sơ CV bằng AI, chuẩn hóa quy trình phỏng vấn và cung cấp báo cáo tuyển dụng trực quan cho doanh nghiệp.`;

    case "PASSWORD_STEAL_ATTEMPT":
      return `🔒 **Quy định An toàn Bảo mật:**\n\nTheo chính sách an toàn thông tin của hệ thống, **Trợ lý AI tuyệt đối không có quyền truy cập, tra cứu hay cung cấp mật khẩu** (kể cả mật khẩu mã hóa) của bất kỳ tài khoản nào trong hệ thống.\n\nNếu bạn cần thay đổi mật khẩu của mình, vui lòng sử dụng tính năng Đổi mật khẩu trong Cài đặt, hoặc liên hệ trực tiếp Quản trị viên công ty.`;

    case "HOWTO_CHANGE_PASSWORD":
      return `🔑 **Hướng dẫn Đổi hoặc Cấp lại Mật khẩu:**\n\n` +
        `1. **Tài khoản cá nhân tự đổi:** Bấm vào avatar góc trên bên phải màn hình -> Chọn **Cài đặt tài khoản** để đổi mật khẩu mới.\n` +
        `2. **Quản trị viên cấp lại mật khẩu cho nhân viên:**\n` +
        `   - Bước 1: Vào trang **Quản lý công ty & nhân sự** (\`/settings\`).\n` +
        `   - Bước 2: Tại tab *Nhân Sự & Tài Khoản*, tìm nhân viên cần đổi và nhấn vào **icon chiếc chìa khóa** (Cấp lại mật khẩu).\n` +
        `   - Bước 3: Nhập mật khẩu mới cho nhân sự và bấm **Lưu thay đổi**.\n\n` +
        `*(Mọi mật khẩu đều được băm bảo mật bằng thuật toán Bcrypt an toàn tuyệt đối).*`;

    case "HOWTO_CREATE_JOB":
      return `📋 **Hướng dẫn Tạo Đợt Tuyển Dụng Mới:**\n\n` +
        `1. Vào trang **Thực hiện tuyển dụng** (\`/jobs\`) từ menu bên trái.\n` +
        `2. Nhấn nút màu xanh **+ Tạo Đợt Tuyển Mới** ở góc trên bên phải.\n` +
        `3. Điền các thông tin vị trí:\n` +
        `   - **Tiêu đề công việc** & **Chỉ tiêu cần tuyển**.\n` +
        `   - **Phòng ban** và **Quy trình tuyển dụng** áp dụng.\n` +
        `   - **Mô tả công việc (JD)**, **Yêu cầu ứng viên**, và **Quyền lợi đãi ngộ**.\n` +
        `4. Đặt trạng thái là **Đang mở (OPEN)** để bắt đầu nhận hồ sơ.\n\n` +
        `🔗 Sau khi tạo, hệ thống tự động sinh link nộp CV công khai cho ứng viên: \`/apply/${companySlug}\`.`;

    case "HOWTO_ADD_CANDIDATE":
      return `👥 **Cách Tiếp Nhận & Tải Lên Hồ Sơ Ứng Viên:**\n\n` +
        `Bạn có 2 cách để đưa ứng viên vào hệ thống:\n` +
        `1. **Ứng viên tự ứng tuyển trực tuyến:** Chia sẻ liên kết công khai \`/apply/${companySlug}\`. Ứng viên điền thông tin và đính kèm CV (PDF), hồ sơ sẽ tự động đồng bộ vào hệ thống.\n` +
        `2. **HR tải lên thủ công:**\n` +
        `   - Vào trang **Danh sách ứng viên** (\`/candidates\`).\n` +
        `   - Nhấn nút **+ Thêm Ứng Viên / Tải Lên CV**.\n` +
        `   - Chọn vị trí tuyển dụng và tải file tài liệu **PDF chuẩn** lên.\n` +
        `   - **AI sẽ tự động đọc CV**, trích xuất Họ tên, Email, Số điện thoại, Kỹ năng và tính điểm **AI Match Score** đối chiếu với JD!`;

    case "HOWTO_SCHEDULE_INTERVIEW":
      return `📅 **Cách Xếp Lịch Phỏng Vấn (Tích hợp Google Meet):**\n\n` +
        `1. Vào trang **Lịch phỏng vấn** (\`/interviews\`) hoặc bấm nút *Hẹn lịch phỏng vấn* trực tiếp từ thẻ ứng viên.\n` +
        `2. Nhấn nút **+ Đặt Lịch Phỏng Vấn**.\n` +
        `3. Chọn **Ứng viên**, **Vòng phỏng vấn (Stage)**, và **Người phỏng vấn phụ trách**.\n` +
        `4. Chọn **Thời gian bắt đầu & kết thúc**.\n` +
        `5. Hệ thống sẽ **tự động sinh link Google Meet** và liên kết lịch phỏng vấn. Người phỏng vấn có thể vào phòng họp trực tiếp và chấm điểm kết quả (Đạt / Không đạt / Chờ duyệt) kèm nhận xét.`;

    case "HOWTO_CREATE_PROCESS":
      return `🔄 **Cách Thiết Lập Quy Trình Tuyển Dụng Chuẩn:**\n\n` +
        `1. Vào trang **Quy trình tuyển dụng** (\`/processes\`).\n` +
        `2. Nhấn nút **+ Tạo Quy Trình Mới**.\n` +
        `3. Đặt tên quy trình (ví dụ: *Quy trình Tuyển dụng Developer*, *Quy trình Tuyển dụng Sales*).\n` +
        `4. Cấu hình các **Vòng/Giai đoạn (Stages)** theo thứ tự:\n` +
        `   - Vòng 1: Tiếp nhận & Sàng lọc CV\n` +
        `   - Vòng 2: Phỏng vấn Kỹ thuật / Chuyên môn\n` +
        `   - Vòng 3: Phỏng vấn Văn hóa & Ban Giám đốc\n` +
        `   - Vòng 4: Gửi Thư mời nhận việc (Offer)\n` +
        `5. Lưu quy trình để áp dụng trực tiếp cho các đợt tuyển dụng sau này.`;

    case "HOWTO_CREATE_DEPARTMENT":
      return `🏢 **Cách Tạo Cơ Cấu Phòng Ban:**\n\n` +
        `1. Vào trang **Quản lý công ty & nhân sự** (\`/settings\`).\n` +
        `2. Chọn tab **Cơ Cấu Phòng Ban**.\n` +
        `3. Nhấn nút **+ Thêm Phòng Ban**.\n` +
        `4. Điền tên phòng ban (ví dụ: *Phòng Kỹ thuật*, *Phòng Kinh doanh*, *Phòng Nhân sự*) và mô tả chức năng.\n` +
        `5. Nhấn **Tạo Phòng Ban** để hoàn tất. Các phòng ban này sẽ dùng để phân bổ nhân viên và gắn vào các đợt tuyển dụng.`;

    case "HOWTO_ADD_MEMBER":
      return `👤 **Cách Thêm Thành Viên Mới & Phân Quyền:**\n\n` +
        `*(Chỉ Quản trị viên - COMPANY_ADMIN mới có quyền thực hiện)*\n\n` +
        `1. Vào trang **Quản lý công ty & nhân sự** (\`/settings\`).\n` +
        `2. Tại tab **Nhân Sự & Tài Khoản**, nhấn nút **+ Tạo Tài Khoản Mới**.\n` +
        `3. Điền thông tin nhân sự: Họ tên, Email, Mật khẩu ban đầu, Phòng ban.\n` +
        `4. Chọn vai trò phù hợp:\n` +
        `   - **HR Tuyển Dụng:** Toàn quyền tạo đợt tuyển, sàng lọc CV, xếp lịch phỏng vấn.\n` +
        `   - **Người Phỏng Vấn (Interviewer):** Chỉ xem lịch phỏng vấn được giao và ghi nhận đánh giá ứng viên.\n` +
        `5. Nhấn **Khởi Tạo Tài Khoản**. Nhân viên có thể đăng nhập ngay bằng email và mật khẩu vừa cấp.`;

    case "EXPLAIN_AI_MATCH":
      return `🤖 **Công Nghệ Bóc Tách & Chấm Điểm CV Bằng AI:**\n\n` +
        `Hệ thống sử dụng cơ chế xử lý ngôn ngữ tự nhiên đối soát thông minh:\n` +
        `1. **Trích xuất nguyên bản (No Hallucination):** Đọc lớp văn bản PDF thực tế, bóc tách chính xác Họ tên, Email, Số điện thoại và Kỹ năng chuyên môn. **Tuyệt đối không bịa đặt** số điện thoại hay email nếu CV không có.\n` +
        `2. **Đối chiếu Tiêu chí Tuyển dụng (JD Matching):** Phân tích mô tả công việc, kỹ năng bắt buộc và quyền lợi để so khớp với năng lực ứng viên.\n` +
        `3. **Thang điểm AI Match Score (0 - 100):**\n` +
        `   - Dưới 45 điểm: Chưa đáp ứng tiêu chuẩn vị trí.\n` +
        `   - 50 - 70 điểm: Đáp ứng một phần yêu cầu, cần phỏng vấn thẩm định thêm.\n` +
        `   - Trên 75 điểm: Khớp tốt các kỹ năng cốt lõi, ưu tiên mời phỏng vấn.\n` +
        `4. **Bản tóm tắt nhận xét:** Tự động chỉ ra điểm mạnh, điểm còn thiếu giúp HR ra quyết định chỉ trong 30 giây thay vì phải đọc toàn bộ CV 5 trang.`;

    case "TODO_OR_NEXT_STEPS":
      return getNextStepsAdvice(metrics, companyName);

    case "FULL_WORKFLOW_GUIDE":
      return `🚀 **Lộ Trình Tuyển Dụng Chuẩn B2B Từ A - Z:**\n\n` +
        `1. **Bước 1 - Khởi tạo Cơ cấu (\`/settings\`):** Tạo các phòng ban và cấp tài khoản cho chuyên viên HR hoặc Trưởng bộ phận phỏng vấn.\n` +
        `2. **Bước 2 - Chuẩn hóa Quy trình (\`/processes\`):** Thiết lập các giai đoạn phỏng vấn mẫu (Vòng CV -> Phỏng vấn -> Offer).\n` +
        `3. **Bước 3 - Đăng Đợt Tuyển Dụng (\`/jobs\`):** Soạn thảo JD, chọn phòng ban và quy trình áp dụng. Chia sẻ link \`/apply/${companySlug}\` để thu hút ứng viên.\n` +
        `4. **Bước 4 - Sàng lọc & Đánh giá (\`/candidates\`):** AI tự động bóc tách và xếp hạng CV. Kéo thả ứng viên trên bảng Kanban.\n` +
        `5. **Bước 5 - Phỏng vấn & Tiếp nhận (\`/interviews\`):** Xếp lịch họp Google Meet tự động, ghi nhận kết quả và chuyển ứng viên sang trạng thái Trúng tuyển (Hired).`;

    case "QUERY_JOBS":
      if (!metrics || metrics.stats.totalJobs === 0) {
        return `📋 **Tình hình Đợt Tuyển Dụng:**\n\nHiện tại **${companyName}** chưa có đợt tuyển dụng nào trong hệ thống.\n\n👉 **Gợi ý thao tác:** Bạn hãy vào trang **Thực hiện tuyển dụng** (\`/jobs\`) và bấm **+ Tạo Đợt Tuyển Mới** để đăng vị trí tuyển dụng đầu tiên.`;
      }
      if (metrics.openJobDetails.length === 0) {
        return `📋 Hiện tại công ty có tổng cộng **${metrics.stats.totalJobs}** đợt tuyển, nhưng **chưa có đợt nào đang mở (OPEN)** (các đợt đều đang đóng hoặc là bản nháp).\n\nBạn có thể vào \`/jobs\` để kích hoạt lại các đợt tuyển đang có.`;
      }
      let jobReply = `📋 **Danh sách ${metrics.openJobDetails.length} Đợt Tuyển Dụng Đang Mở tại ${companyName}:**\n\n`;
      metrics.openJobDetails.forEach((j, i) => {
        jobReply += `${i + 1}. **${j.title}**\n   - Phòng ban: ${j.department} | Chỉ tiêu: **${j.quantity} người**\n   - Mức lương: ${j.salaryRange} | Hạn nộp: ${j.deadline}\n\n`;
      });
      jobReply += `🔗 Link nộp hồ sơ công khai: \`/apply/${companySlug}\``;
      return jobReply;

    case "QUERY_CANDIDATES":
      if (!metrics || metrics.stats.totalCandidates === 0) {
        return `👥 **Hồ sơ Ứng viên:**\n\nHiện tại chưa có hồ sơ ứng viên nào trong hệ thống của **${companyName}**.\n\n👉 **Gợi ý:** Bạn có thể vào trang **Danh sách ứng viên** (\`/candidates\`) để tự tải lên file CV (PDF) hoặc chia sẻ link \`/apply/${companySlug}\` để ứng viên tự nộp trực tuyến.`;
      }
      let candReply = `👥 **Thống kê Hồ sơ Ứng viên (${metrics.stats.totalCandidates} hồ sơ):**\n\n` +
        `- Đang xử lý / phỏng vấn: **${metrics.stats.inProgressCandidates}**\n` +
        `- Đã tuyển thành công (Hired): **${metrics.stats.hiredCandidates}**\n` +
        `- Đã từ chối (Rejected): **${metrics.stats.rejectedCandidates}**\n\n` +
        `**Ứng viên nộp gần đây:**\n`;
      metrics.recentCandidates.slice(0, 5).forEach((c, i) => {
        const score = c.aiMatchScore !== null && c.aiMatchScore !== undefined ? ` (Điểm AI: **${c.aiMatchScore}/100**)` : "";
        candReply += `${i + 1}. **${c.fullName}** - Vị trí: *${c.jobTitle}* - Trạng thái: ${c.status}${score}\n`;
      });
      return candReply;

    case "QUERY_INTERVIEWS":
      if (!metrics || metrics.stats.totalInterviews === 0) {
        return `📅 **Lịch phỏng vấn:**\n\nHiện tại chưa có buổi phỏng vấn nào được lên lịch trong hệ thống.\n\n👉 Để lên lịch phỏng vấn, bạn vào trang **Lịch phỏng vấn** (\`/interviews\`) hoặc chọn ứng viên cần phỏng vấn trong bảng Kanban và bấm **Hẹn lịch phỏng vấn**. Hệ thống sẽ tự động tạo link Google Meet!`;
      }
      if (metrics.upcomingInterviewDetails.length === 0) {
        return `📅 Hiện tại không có buổi phỏng vấn nào sắp diễn ra (Tổng cộng ${metrics.stats.totalInterviews} buổi phỏng vấn đã được ghi nhận trước đó).`;
      }
      let intReply = `📅 **Danh sách Lịch Phỏng Vấn Sắp Tới:**\n\n`;
      metrics.upcomingInterviewDetails.forEach((v, i) => {
        intReply += `${i + 1}. Ứng viên: **${v.candidateName}**\n   - Thời gian: **${v.startTime}**\n   - Người phỏng vấn: ${v.interviewerName || "Chưa chỉ định"}\n\n`;
      });
      return intReply;

    case "QUERY_MEMBERS":
      if (!metrics || metrics.members.length === 0) {
        return `👤 Hiện tại hệ thống chưa ghi nhận thông tin nhân sự.`;
      }
      let memReply = `👤 **Thành viên tham gia Quản trị Tuyển dụng tại ${companyName} (${metrics.members.length} người):**\n\n`;
      metrics.members.forEach((m, i) => {
        memReply += `${i + 1}. **${m.fullName}** - ${m.role} (${m.department})\n   - Email liên hệ: \`${m.email}\`\n`;
      });
      return memReply;

    case "QUERY_DEPARTMENTS":
      const deptCount = metrics?.stats.totalDepartments || 0;
      if (deptCount === 0) {
        return `🏢 **Cơ cấu Phòng Ban:**\n\nHiện tại **${companyName}** chưa thiết lập phòng ban nào.\n\n👉 Bạn hãy vào mục **Quản lý công ty & nhân sự** (\`/settings\`) -> Chọn tab **Cơ Cấu Phòng Ban** để tạo các phòng ban như *Phòng Kỹ thuật*, *Phòng Kinh doanh*, *Phòng Nhân sự* nhé!`;
      }
      return `🏢 Hiện tại công ty đang có **${deptCount}** phòng ban được thiết lập trong hệ thống. Bạn có thể xem chi tiết hoặc thêm mới tại mục Cài đặt (\`/settings\`).`;

    case "QUERY_OVERVIEW":
      if (!metrics) {
        return `Hiện tại bạn chưa đăng nhập tài khoản doanh nghiệp. Hãy đăng nhập để tôi báo cáo đầy đủ số liệu thực tế của công ty bạn nhé!`;
      }
      return `📊 **Báo cáo Tổng quan Dữ liệu Tài khoản (${companyName}):**\n\n` +
        `- **Đợt tuyển dụng:** **${metrics.stats.totalJobs}** đợt (${metrics.stats.openJobs} đang mở nhận hồ sơ).\n` +
        `- **Hồ sơ ứng viên:** **${metrics.stats.totalCandidates}** ứng viên (Đang xử lý: ${metrics.stats.inProgressCandidates}, Đã tuyển: ${metrics.stats.hiredCandidates}, Từ chối: ${metrics.stats.rejectedCandidates}).\n` +
        `- **Lịch phỏng vấn:** **${metrics.stats.totalInterviews}** buổi (${metrics.stats.upcomingInterviews} buổi sắp tới).\n` +
        `- **Cơ cấu tổ chức:** **${metrics.stats.totalDepartments}** phòng ban & **${metrics.stats.totalProcesses}** quy trình tuyển dụng chuẩn.\n` +
        `- **Nhân sự tham gia:** **${metrics.stats.totalMembers}** thành viên.\n\n` +
        getNextStepsShort(metrics);

    case "THANKS":
      return `Rất vui được hỗ trợ bạn! Nếu có bất kỳ câu hỏi nào về số liệu hay tính năng phần mềm, bạn cứ hỏi tôi bất cứ lúc nào nhé. Chúc bạn một ngày làm việc hiệu quả! 🌟`;

    default:
      // Phản hồi thông minh khi câu hỏi ngoài tầm nhận diện
      return `Tôi đã ghi nhận câu hỏi của bạn. Tôi có thể hỗ trợ tốt nhất cho bạn về:\n\n` +
        `1. 📊 **Tra cứu số liệu tài khoản:** Thống kê đợt tuyển, danh sách ứng viên, lịch phỏng vấn sắp tới.\n` +
        `2. 📋 **Nghiệp vụ tuyển dụng:** Cách tạo đợt tuyển, tạo link ứng tuyển trực tuyến, bóc tách & chấm điểm CV bằng AI.\n` +
        `3. ⚙️ **Quản trị hệ thống:** Cách thiết lập phòng ban, tạo quy trình tuyển dụng, phân quyền nhân sự.\n\n` +
        `Bạn có thể gõ câu hỏi cụ thể hoặc chọn các chủ đề ở trên nhé!`;
  }
}

/**
 * Đưa ra lời khuyên bước tiếp theo dựa trên tình trạng số liệu hiện tại
 */
function getNextStepsAdvice(metrics: CompanySafeMetrics | null, companyName: string): string {
  if (!metrics) {
    return `Bạn hãy đăng nhập vào hệ thống để bắt đầu thiết lập chiến dịch tuyển dụng cho doanh nghiệp.`;
  }

  const steps: string[] = [];

  if (metrics.stats.totalDepartments === 0) {
    steps.push(`**1. Thiết lập Phòng Ban (\`/settings\`):** Tạo cơ cấu phòng ban (VD: Phòng Kỹ thuật, Phòng Kinh doanh) để phân bổ công việc.`);
  }

  if (metrics.stats.totalProcesses === 0) {
    steps.push(`**2. Tạo Quy trình Tuyển dụng (\`/processes\`):** Chuẩn hóa các vòng phỏng vấn cho vị trí cần tuyển.`);
  }

  if (metrics.stats.totalJobs === 0) {
    steps.push(`**3. Đăng Tin Tuyển Dụng Đầu Tiên (\`/jobs\`):** Tạo JD vị trí cần tuyển và nhận link nộp CV công khai.`);
  } else if (metrics.stats.totalCandidates === 0) {
    steps.push(`**4. Tiếp nhận Ứng viên:** Chia sẻ link ứng tuyển hoặc trực tiếp tải lên tệp CV (PDF) vào mục \`/candidates\` để AI chấm điểm.`);
  } else if (metrics.stats.upcomingInterviews === 0 && metrics.stats.inProgressCandidates > 0) {
    steps.push(`**5. Lên Lịch Phỏng Vấn:** Đặt lịch phỏng vấn với các ứng viên tiềm năng để hệ thống tự động sinh link Google Meet.`);
  }

  if (steps.length === 0) {
    return `🎉 **Tuyệt vời! Hệ thống tuyển dụng của ${companyName} đang hoạt động rất tốt.**\n\nBạn hiện có **${metrics.stats.openJobs}** đợt tuyển đang mở và **${metrics.stats.totalCandidates}** hồ sơ trong hệ thống. Hãy tiếp tục theo dõi các buổi phỏng vấn sắp tới nhé!`;
  }

  return `💡 **Gợi ý các bước thiết lập tiếp theo cho ${companyName}:**\n\n` +
    steps.join("\n\n") +
    `\n\nBạn có thể hỏi tôi chi tiết cách thực hiện bất kỳ bước nào ở trên!`;
}

function getNextStepsShort(metrics: CompanySafeMetrics): string {
  if (metrics.stats.totalJobs === 0) {
    return `👉 *Gợi ý:* Tài khoản của bạn hiện chưa có đợt tuyển nào. Hãy vào mục **Đợt Tuyển Dụng** để đăng tin tuyển vị trí mới!`;
  }
  if (metrics.stats.totalCandidates === 0) {
    return `👉 *Gợi ý:* Hãy chia sẻ liên kết nộp CV để bắt đầu thu hút ứng viên nộp hồ sơ!`;
  }
  return `💡 Bạn có thể hỏi chi tiết hơn như *"Các đợt tuyển dụng nào đang mở?"* hoặc *"Có lịch phỏng vấn nào sắp tới không?"*.`;
}
