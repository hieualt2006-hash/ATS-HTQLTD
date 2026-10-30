---
name: ats-ai-integration
description: Cơ chế Tích hợp Trí tuệ Nhân tạo (LLM Integration) theo mô hình RAG và Cấu trúc Prompt 5 thành phần chuẩn hóa
version: 1.0.0
tags:
  - ai-integration
  - gemini-llm
  - prompt-engineering
  - rag
---

# SKILL: CƠ CHẾ TÍCH HỢP AI & CẤU TRÚC PROMPT CHUẨN TRONG ATS

## 1. Sơ đồ Chu trình Tích hợp AI (AI Pipeline Architecture)

Chu trình tích hợp AI trong hệ thống tuân thủ nghiêm ngặt mô hình Truy xuất & Sinh phản hồi có ngữ cảnh (Context-Augmented Retrieval):

```
[Người dùng / Ứng viên gửi Yêu cầu]
                 │
                 ▼
     1. Phân tích câu hỏi / Input
                 │
                 ▼
     2. Truy xuất dữ liệu (Retrieval) ──► Tra cứu Database Neon Postgres / Trích xuất PDF
                 │
                 ▼
     3. Tổng hợp Ngữ cảnh (Context)
                 │
                 ▼
     4. Đóng gói PROMPT Chuẩn 5 Thành phần:
        ├─ [Role]: Vai trò chuyên môn của AI
        ├─ [Yêu cầu]: Nhiệm vụ cốt lõi cần giải quyết
        ├─ [Context]: Dữ liệu JD, tệp CV, số liệu công ty
        ├─ [Ràng buộc]: Giới hạn bảo mật, thang điểm, tone giọng
        └─ [Output]: Định dạng đầu ra bắt buộc (JSON / Markdown)
                 │
                 ▼
     5. Mô hình Ngôn ngữ lớn (LLM: Gemini 3.8 Flash)
                 │
                 ▼
     6. Trả lời & Lưu trữ (Response & Persistence)
```

---

## 2. Ứng dụng Thực tế 1: Bóc tách & Đánh giá CV Ứng viên (`src/lib/gemini.ts`)

| Bước | Thực thi trong mã nguồn ATS |
| :--- | :--- |
| **1. Phân tích câu hỏi** | Ứng viên nộp tệp CV PDF qua cổng `/apply/[jobId]` hoặc HR tải lên tại `/candidates`. Hệ thống nhận tệp nhị phân (`Buffer`) và mã đợt tuyển dụng (`jobPostingId`). |
| **2. Truy xuất dữ liệu** | Gọi Prisma ORM truy xuất thông tin đợt tuyển từ bảng `JobPosting` (Tiêu đề, Mô tả công việc, Yêu cầu ứng viên, Phúc lợi). |
| **3. Tổng hợp Context** | Ghép toàn bộ nội dung JD tuyển dụng với dữ liệu Base64/Text của tệp PDF CV thành một gói ngữ cảnh hoàn chỉnh. |
| **4. Xây dựng Prompt 5 thành phần** | Xem chi tiết bên dưới. |
| **5. Mô hình AI** | Truyền tải vào Google Gemini LLM (`gemini-3.8-flash`) với khả năng đọc hiểu đa phương thức (Multimodal Document/Vision). |
| **6. Trả lời** | Trả về chuỗi JSON bóc tách thông tin, điểm khớp `aiMatchScore` và lời nhận xét khách quan lưu thẳng vào bảng `Candidate`. |

### Cấu trúc Prompt 5 thành phần của tính năng Đánh giá CV:
```typescript
// 1. ROLE (Vai trò)
"Bạn là Chuyên gia Tuyển dụng Nhân sự Cao cấp (Senior Talent Acquisition & ATS Evaluator)."

// 2. YÊU CẦU (Task / Nhiệm vụ)
"Nhiệm vụ của bạn là đọc và phân tích kỹ lưỡng file CV (Hồ sơ ứng viên) đính kèm, sau đó đối chiếu khách quan với Yêu cầu tuyển dụng (JD)."

// 3. CONTEXT (Ngữ cảnh dữ liệu)
`TIÊU ĐỀ ĐỢT TUYỂN DỤNG: ${jobPosting.title}
 MÔ TẢ CÔNG VIỆC: ${jobPosting.description}
 YÊU CẦU ỨNG VIÊN: ${jobPosting.requirements}
 QUYỀN LỢI & PHÚC LỢI: ${jobPosting.benefits}`

// 4. RÀNG BUỘC (Constraints)
`- CHỈ trích xuất thông tin CÓ THẬT trong CV (Tuyệt đối không bịa đặt SĐT/Email).
 - Chấm điểm độ khớp (aiMatchScore) theo thang điểm 0 đến 100:
   + 80 - 95: Khớp xuất sắc các yêu cầu cốt lõi.
   + 60 - 79: Khớp khá, thiếu một vài kỹ năng phụ.
   + 5 - 20: Trái ngành hoàn toàn (ví dụ: CV Thiết kế nội thất nộp vị trí Lập trình).
 - Nhận xét theo văn phong nhân sự chuyên nghiệp, nhã nhặn, tự nhiên, dễ hiểu.
 - TUYỆT ĐỐI KHÔNG dùng từ ngữ máy móc kỹ thuật như "chưa qua OCR", "text-based PDF".`

// 5. OUTPUT (Định dạng kết quả)
`Trả về DUY NHẤT một chuỗi JSON hợp lệ:
 {
   "fullName": "Tên ứng viên",
   "email": "Email tìm thấy hoặc chuỗi rỗng",
   "phone": "Số điện thoại tìm thấy hoặc chuỗi rỗng",
   "extractedSkills": ["kỹ năng 1", "kỹ năng 2"],
   "aiMatchScore": 75,
   "aiEvaluationSummary": "Lời nhận xét đánh giá rõ ràng, dễ hiểu...",
   "rawCvText": "Nội dung tóm tắt kinh nghiệm từ CV..."
 }`
```

---

## 3. Ứng dụng Thực tế 2: Trợ lý ChatBot AI Nội bộ (`src/app/api/chatbot/route.ts`)

| Bước | Thực thi trong mã nguồn ATS |
| :--- | :--- |
| **1. Phân tích câu hỏi** | Tiếp nhận câu hỏi `userMessage` từ nhân viên HR qua widget Chatbot nội bộ. |
| **2. Truy xuất dữ liệu (RAG)** | Hàm `getCompanySafeMetrics(companyId)` truy vấn DB Neon lấy số liệu thời gian thực: số đợt tuyển đang mở, hồ sơ ứng viên gần đây kèm điểm AI, các buổi phỏng vấn sắp tới. |
| **3. Tổng hợp Context** | Đóng gói biến `accountContext` chứa thông tin thực tế của doanh nghiệp. |
| **4. Xây dựng Prompt 5 thành phần** | - **Role:** "Trợ lý AI của Hệ thống Quản trị Tuyển dụng ATS Nhóm 20".<br/>- **Yêu cầu:** Giải đáp về dữ liệu tài khoản và nghiệp vụ phần mềm.<br/>- **Context:** Danh sách việc đang tuyển, ứng viên mới nhất, phòng ban.<br/>- **Ràng buộc:** Trả lời từ 2 đến 5 câu ngắn gọn, tuyệt đối từ chối cung cấp mật khẩu/password hash.<br/>- **Output:** Văn bản tiếng Việt súc tích, hỗ trợ định dạng Markdown. |
| **5. Mô hình AI** | Gửi kèm lịch sử hội thoại nhiều lượt (`chatHistory`) sang mô hình Gemini Flash. |
| **6. Trả lời** | Hiển thị câu trả lời ngay trên widget và lưu lịch sử vào bảng `ChatHistory`. |
