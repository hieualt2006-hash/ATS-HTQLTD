# ĐẶC TẢ HỆ THỐNG PHẦN MỀM QUẢN LÝ TUYỂN DỤNG DOANH NGHIỆP (B2B SaaS ATS)

## 1. Quy tắc Tối thượng (CRITICAL RULES)
1. **ĐỐI TƯỢNG SỬ DỤNG PHẦN MỀM:** Phần mềm này CHỈ dành cho các Công ty (Sếp/Admin công ty, Nhân viên HR, Trưởng bộ phận phỏng vấn). **TUYỆT ĐỐI KHÔNG làm trang chủ tìm việc làm cho ứng viên.**
2. **LUỒNG TRUY CẬP GỐC (`/`):**
   - Khi mở phần mềm (`/`), nếu chưa đăng nhập sẽ hiển thị màn hình Cổng Doanh Nghiệp gồm 2 chức năng: **Đăng nhập Tài khoản Công ty (`/login`)** và **Đăng ký Tài khoản Công ty mới (`/register`)**.
   - Sau khi đăng nhập thành công, người dùng vào thẳng giao diện làm việc nội bộ của công ty mình (`/dashboard`, `/processes`, `/jobs`, `/candidates`, `/interviews`, `/settings`).
   - Mọi dữ liệu trong phần mềm được phân tách độc lập theo `companyId` (Multi-tenant: Công ty nào chỉ nhìn thấy quy trình, đợt tuyển dụng và ứng viên của công ty đó).
3. **CÁCH THU THẬP HỒ SƠ TỪ BÊN NGOÀI (EXTERNAL APPLY LINK & WEBHOOK):**
   - Ứng viên KHÔNG sử dụng phần mềm này.
   - Khi HR tạo một đợt tuyển dụng trong mục `/jobs`, phần mềm cung cấp cho HR:
     + **1 Đường link Form nộp đơn rời (`/apply/[jobId]`):** Giao diện trắng tinh gọn chỉ có thông tin JD và nút gửi file PDF CV (giống như một tờ Google Form độc lập để HR đem gắn lên Facebook/Web công ty).
     + **1 Endpoint API (`/api/external/apply`):** Nhận dữ liệu ứng viên từ bên ngoài đẩy về phần mềm.
   - Khi có hồ sơ gửi về từ Form rời hoặc do HR tự tải CV lên, hệ thống tự động gọi Gemini AI bóc tách thông tin, chấm điểm độ khớp với JD và lưu thẳng vào mục **Danh sách ứng viên (`/candidates`)** của HR.

## 2. Hạ tầng Kỹ thuật (Tech Stack)
- **Framework:** Next.js (App Router, TypeScript) + Tailwind CSS (Giao diện Quản trị Dark Mode chuyên nghiệp).
- **Database & ORM:** Neon Serverless PostgreSQL (`DATABASE_URL`) + Prisma ORM.
- **Xác thực:** JWT lưu trong HTTP-Only Cookie (chứa `userId`, `companyId`, `role`) + `middleware.ts`.
- **AI & Tích hợp:** Google Gemini API (`@google/genai` - model `gemini-2.5-flash`) để bóc tách/chấm điểm CV PDF và làm Trợ lý Chatbot cho HR; Google Calendar API (`googleapis`) để tạo lịch phỏng vấn kèm link Google Meet.
- **Triển khai:** Tương thích 100% với Vercel Serverless (Xử lý đọc file PDF trực tiếp trên RAM/Buffer, không ghi file ra ổ cứng local).

## 3. Phân quyền Tài khoản trong 1 Công ty (`Company` -> `Users`)
Khi một doanh nghiệp bấm **Đăng ký tài khoản công ty (`/register`)**, hệ thống tạo 1 `Company` mới và tạo tài khoản đầu tiên mang quyền `COMPANY_ADMIN`. Bên trong công ty có 3 cấp tài khoản:
1. **`COMPANY_ADMIN` (Sếp / Giám đốc Nhân sự):** Toàn quyền trong công ty mình. Tạo phòng ban, tạo tài khoản cho nhân viên `HR` và `INTERVIEWER`, thiết lập các Quy trình tuyển dụng mẫu.
2. **`HR` (Chuyên viên Tuyển dụng - Người dùng chính):**
   - Tạo và quản lý các đợt tuyển dụng (`JobPosting`), lấy link form thu thập hồ sơ.
   - Tải trực tiếp file PDF CV ứng viên lên phần mềm (hoặc nhận từ form ngoài) để AI tự động bóc tách & chấm điểm.
   - Sàng lọc, kéo thả ứng viên qua các giai đoạn của quy trình (Kanban Pipeline).
   - Đặt lịch phỏng vấn qua Google Calendar API và sử dụng Trợ lý Chatbot AI để soạn câu hỏi phỏng vấn/email.
3. **`INTERVIEWER` (Trưởng bộ phận / Người phỏng vấn chuyên môn):**
   - Khi đăng nhập chỉ thấy đúng danh sách Lịch phỏng vấn và Hồ sơ ứng viên mà HR đã phân công cho mình (`interviewerId == currentUserId`).
   - Xem CV, bấm vào link Google Meet phỏng vấn và điền phiếu Chấm điểm/Nhận xét (`PASS` / `FAIL`).

## 4. Cấu trúc Danh mục Chức năng của Phần mềm (Sidebar Menu)
1. **Trang chủ (`/dashboard`):** Thống kê tổng quan của công ty (Tổng đợt đang tuyển, Tổng hồ sơ ứng viên, Ứng viên tiềm năng điểm AI >= 80%, Biểu đồ phễu ứng viên qua từng vòng, Lịch phỏng vấn hôm nay).
2. **Quy trình tuyển dụng (`/processes`):** (Chuẩn theo video Phần mềm 365)
   - Danh sách quy trình tuyển dụng của công ty + Tìm kiếm quy trình.
   - Thêm/Sửa/Xóa quy trình tuyển dụng (Tên quy trình, Đối tượng áp dụng).
   - Trong mỗi quy trình, cho phép thêm mới/chỉnh sửa/xóa nhiều **Giai đoạn tuyển dụng (`ProcessStage`)** nối tiếp nhau (`orderIndex` 1, 2, 3...): Tên giai đoạn, Bộ phận đảm nhận, Mục tiêu giai đoạn, Thời gian định lượng, Mô tả công việc.
3. **Thực hiện tuyển dụng (`/jobs`):**
   - CRUD các đợt tuyển dụng của công ty (Tiêu đề, Phòng ban, Gán Quy trình tuyển dụng mẫu, Số lượng, Mức lương, Hạn nộp, Mô tả công việc, Yêu cầu ứng viên, Trạng thái `DRAFT`/`OPEN`/`CLOSED`).
   - Nút **"Copy Link Form Nhận Đơn (`/apply/[jobId]`)"** để HR đem đi đăng tuyển bên ngoài.
4. **Danh sách ứng viên (`/candidates`):**
   - Hiển thị toàn bộ ứng viên của công ty (lọc theo Đợt tuyển dụng, Giai đoạn hiện tại, Điểm AI).
   - Chế độ xem Bảng (Table) và Bảng kéo thả (Kanban Pipeline theo các vòng `ProcessStage`).
   - Nút **"HR Tải CV Lên (AI Tự động bóc tách)"**: HR chọn đợt tuyển dụng và upload file PDF CV -> AI đọc PDF, trích xuất thông tin, chấm điểm khớp JD (`0-100%`) và đưa ứng viên vào vòng 1.
   - Chi tiết Ứng viên: Xem thông tin, đọc CV, xem hộp **Đánh giá của AI (`aiMatchScore` + `aiEvaluationSummary`)**, chuyển vòng tuyển dụng.
5. **Lịch phỏng vấn (`/interviews`):**
   - HR tạo lịch phỏng vấn (chọn Ứng viên, Vòng, Người phỏng vấn, Giờ bắt đầu/kết thúc) -> Gọi Google Calendar API tạo sự kiện và sinh link **Google Meet**.
   - Người phỏng vấn (`INTERVIEWER`) chấm điểm (`1-5 sao`), viết nhận xét và chốt kết quả vòng đó (`PASS` / `FAIL`).
6. **Trợ lý AI cho HR (Floating Widget góc phải dưới màn hình quản trị):**
   - Chatbot AI nội bộ hỗ trợ HR phân tích CV ứng viên đang chọn, gợi ý câu hỏi phỏng vấn xoáy vào điểm yếu, soạn email mời phỏng vấn hoặc email từ chối.
7. **Quản lý Công ty & Nhân sự (`/settings` - Chỉ dành cho `COMPANY_ADMIN`):**
   - Cập nhật thông tin công ty, CRUD Phòng ban (`Department`), CRUD Tài khoản nhân viên (`User`: tạo tài khoản cho HR và Interviewer trong công ty).

## 5. Thiết kế Cơ sở Dữ liệu (9 Bảng Prisma)
1. `Company`: `id`, `name`, `slug` (Unique), `industry`, `size`, `createdAt`
2. `Department`: `id`, `companyId` (FK -> Company), `name`, `description`, `createdAt`
3. `User`: `id`, `companyId` (FK -> Company), `departmentId` (Nullable), `fullName`, `email` (Unique), `passwordHash`, `role` (`COMPANY_ADMIN`, `HR`, `INTERVIEWER`), `isActive`, `createdAt`
4. `RecruitmentProcess`: `id`, `companyId` (FK -> Company), `name`, `targetPosition`, `createdById`, `createdAt`
5. `ProcessStage`: `id`, `processId` (FK -> RecruitmentProcess, Cascade Delete), `stageName`, `orderIndex`, `responsibleDept`, `goalDescription`, `estimatedDays`, `workDescription`
6. `JobPosting`: `id`, `companyId` (FK -> Company), `departmentId`, `processId`, `title`, `quantity`, `salaryRange`, `description`, `requirements`, `benefits`, `status` (`DRAFT`, `OPEN`, `CLOSED`), `deadline`, `createdById`, `createdAt`
7. `Candidate`: `id`, `companyId` (FK -> Company), `jobPostingId`, `currentStageId`, `fullName`, `email`, `phone`, `cvFileUrl` (Nullable/Base64), `source` (`EXTERNAL_FORM`, `HR_UPLOAD`), `status` (`IN_PROGRESS`, `HIRED`, `REJECTED`), `rawCvText`, `extractedSkills`, `aiMatchScore` (Int), `aiEvaluationSummary`, `appliedAt`
8. `Interview`: `id`, `companyId` (FK -> Company), `candidateId`, `stageId`, `interviewerId`, `createdById`, `startTime`, `endTime`, `googleEventId`, `meetLink`, `calendarHtmlLink`, `rating` (Int 1-5), `interviewerNotes`, `evaluationResult` (`PENDING`, `PASS`, `FAIL`)
9. `ChatHistory`: `id`, `companyId` (FK -> Company), `userId`, `candidateContextId`, `sender` (`USER`, `BOT`), `message`, `createdAt`