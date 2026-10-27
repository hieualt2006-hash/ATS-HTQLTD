import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getCompanySafeMetrics, CompanySafeMetrics } from "@/lib/chatbot-metrics";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { isRealDatabaseConfigured } from "@/lib/db-status";
import { generateSmartReply } from "@/lib/chatbot-engine";

export const dynamic = "force-dynamic";

/**
 * Endpoint GET: Lấy trạng thái ban đầu của ChatBot và danh sách câu hỏi gợi ý phù hợp
 */
export async function GET() {
  try {
    const session = await getCurrentSession();

    if (session) {
      const metrics = await getCompanySafeMetrics(session.companyId);
      return NextResponse.json({
        isAuthenticated: true,
        user: {
          fullName: session.fullName,
          role: session.role,
        },
        company: {
          name: session.companyName,
          slug: session.companySlug,
        },
        suggestedQuestions: [
          "📊 Báo cáo tổng quan số liệu tài khoản công ty",
          "📋 Các đợt tuyển dụng nào đang mở?",
          "👥 Tình hình ứng viên và điểm AI thế nào?",
          "📅 Có lịch phỏng vấn nào sắp tới không?",
          "🤖 Cách AI bóc tách và chấm điểm CV hoạt động ra sao?",
          "💡 Hướng dẫn tạo đợt tuyển và lấy link ứng tuyển",
        ],
        welcomeMessage: "Xin chào! Tôi là **Trợ lý AI**. Tôi có thể hỗ trợ bạn giải đáp thông tin về phần mềm cũng như các số liệu tài khoản.",
      });
    }

    return NextResponse.json({
      isAuthenticated: false,
      suggestedQuestions: [
        "✨ Giới thiệu về Hệ thống Tuyển dụng ATS Nhóm 20",
        "🤖 Tính năng bóc tách & chấm điểm CV bằng AI hoạt động ra sao?",
        "📋 Các chức năng chính của phần mềm gồm những gì?",
        "🏢 Làm thế nào để đăng ký tài khoản doanh nghiệp?",
      ],
      welcomeMessage: "Xin chào! Tôi là **Trợ lý AI**. Tôi có thể hỗ trợ bạn giải đáp thông tin về phần mềm cũng như các số liệu tài khoản.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Endpoint POST: Xử lý tin nhắn chat từ người dùng
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage = (body.message || "").trim();
    const chatHistory = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return NextResponse.json({ error: "Tin nhắn không được để trống" }, { status: 400 });
    }

    const session = await getCurrentSession();
    let safeMetrics: CompanySafeMetrics | null = null;

    if (session?.companyId) {
      safeMetrics = await getCompanySafeMetrics(session.companyId);
    }

    // 1. KIỂM TRA BẢO MẬT: Chặn yêu cầu liên quan đến mật khẩu
    const lowerMsg = userMessage.toLowerCase();
    const isAskingPassword =
      lowerMsg.includes("mật khẩu") ||
      lowerMsg.includes("password") ||
      lowerMsg.includes("pass") ||
      lowerMsg.includes("mat khau") ||
      lowerMsg.includes("hash") ||
      lowerMsg.includes("token") ||
      lowerMsg.includes("secret") ||
      lowerMsg.includes("quyền admin mật khẩu");

    if (isAskingPassword && (lowerMsg.includes("cho tôi") || lowerMsg.includes("xem") || lowerMsg.includes("lấy") || lowerMsg.includes("gì") || lowerMsg.includes("show") || lowerMsg.includes("get") || lowerMsg.includes("quên"))) {
      const securityResponse = `🔒 **Cảnh báo Bảo mật Hệ thống:**\n\nTheo tiêu chuẩn bảo mật dữ liệu và chính sách an toàn thông tin, **Trợ lý AI tuyệt đối không có quyền truy cập, tra cứu hay cung cấp mật khẩu, chuỗi mã hóa mật khẩu (password hash) hoặc mã xác thực của bất kỳ tài khoản nào.**\n\n- Nếu bạn cần thay đổi mật khẩu của mình, vui lòng sử dụng chức năng trong mục Cài đặt hoặc liên hệ Quản trị viên công ty (${safeMetrics?.company.name || "Doanh nghiệp"}).\n- Nếu bạn là Quản trị viên và cần cấp lại quyền cho thành viên, vui lòng vào trang **Quản lý Nhân sự / Cài đặt** để thao tác trực tiếp.`;
      
      await saveChatHistorySafe(session, userMessage, securityResponse);
      return NextResponse.json({ reply: securityResponse, timestamp: new Date().toISOString() });
    }

    // 2. CHUẨN BỊ SYSTEM PROMPT CHUYÊN SÂU
    const systemPrompt = buildSystemPrompt(session, safeMetrics);

    // 3. KÍCH HOẠT GOOGLE GEMINI LLM (Mô hình thông minh thế hệ mới)
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey && apiKey !== "your-gemini-api-key-here" && apiKey.length > 10) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        // Chuẩn bị lịch sử trò chuyện chuẩn multi-turn
        const contents: any[] = [];
        const recentHist = chatHistory.slice(-8);
        for (const item of recentHist) {
          if (item?.content && typeof item.content === "string") {
            contents.push({
              role: item.role === "user" ? "user" : "model",
              parts: [{ text: item.content }],
            });
          }
        }

        // Thêm tin nhắn hiện tại của người dùng
        contents.push({
          role: "user",
          parts: [{ text: userMessage }],
        });

        const config = {
          systemInstruction: systemPrompt,
          temperature: 0.35,
        };

        // Ưu tiên gemini-3.5-flash-lite siêu nhanh & thông minh, fallback gemini-3.5-flash
        let response;
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents,
            config,
          });
        } catch (e1: any) {
          try {
            response = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents,
              config,
            });
          } catch (e2: any) {
            response = await ai.models.generateContent({
              model: "gemini-3.8-flash",
              contents,
              config,
            });
          }
        }

        const reply = response.text?.trim() || "";
        if (reply) {
          await saveChatHistorySafe(session, userMessage, reply);
          return NextResponse.json({ reply, timestamp: new Date().toISOString() });
        }
      } catch (geminiError: any) {
        console.warn("⚠️ Gọi Gemini API không thành công, chuyển sang Smart Engine nội bộ:", geminiError?.message);
      }
    }

    // 4. BỘ NÃO XỬ LÝ NGÔN NGỮ TỰ NHIÊN THÔNG MINH (Dự phòng khi mất kết nối mạng)
    const smartReply = generateSmartReply(userMessage, session, safeMetrics);
    await saveChatHistorySafe(session, userMessage, smartReply);

    return NextResponse.json({ reply: smartReply, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("Lỗi ChatBot API:", error);
    return NextResponse.json(
      {
        reply: "Xin lỗi, hiện tại tôi đang gặp chút trục trặc khi tra cứu dữ liệu. Bạn vui lòng thử lại sau ít giây hoặc đặt câu hỏi khác nhé!",
      },
      { status: 200 }
    );
  }
}

/**
 * Xây dựng Huấn luyện Chuyên sâu (System Instruction) cho ChatBot AI
 */
function buildSystemPrompt(session: any, metrics: CompanySafeMetrics | null): string {
  const companyName = metrics?.company?.name || session?.companyName || "doanh nghiệp";
  const companySlug = metrics?.company?.slug || session?.companySlug || "company";

  const accountContext = metrics
    ? `
[DỮ LIỆU THỜI GIAN THỰC CỦA TÀI KHOẢN HIỆN TẠI]:
- Doanh nghiệp: ${metrics.company.name} (Mã định danh slug: ${metrics.company.slug})
- Lĩnh vực hoạt động: ${metrics.company.industry || "Chưa cập nhật"} | Quy mô: ${metrics.company.size || "Chưa cập nhật"}
- Người dùng đang tương tác: ${session?.fullName} (Chức danh / Vai trò: ${session?.role === "COMPANY_ADMIN" ? "Quản trị viên tối cao" : session?.role === "HR" ? "Chuyên viên HR Tuyển dụng" : "Người phỏng vấn"})
- THỐNG KÊ CHI TIẾT TÀI KHOẢN:
  + Đợt tuyển dụng (Jobs): Tổng cộng ${metrics.stats.totalJobs} đợt (Đang mở nhận hồ sơ: ${metrics.stats.openJobs}, Đã đóng: ${metrics.stats.closedJobs}).
  + Hồ sơ ứng viên (Candidates): Tổng cộng ${metrics.stats.totalCandidates} hồ sơ (Đang trong quy trình xử lý: ${metrics.stats.inProgressCandidates}, Đã trúng tuyển nhận việc - Hired: ${metrics.stats.hiredCandidates}, Đã từ chối - Rejected: ${metrics.stats.rejectedCandidates}).
  + Lịch phỏng vấn (Interviews): Tổng cộng ${metrics.stats.totalInterviews} buổi (Trong đó có ${metrics.stats.upcomingInterviews} buổi sắp diễn ra).
  + Quy trình tuyển dụng chuẩn hóa (Processes): ${metrics.stats.totalProcesses} quy trình.
  + Cơ cấu phòng ban (Departments): ${metrics.stats.totalDepartments} phòng ban.
  + Nhân sự tham gia quản trị: ${metrics.stats.totalMembers} thành viên.

- DANH SÁCH ĐỢT TUYỂN DỤNG ĐANG MỞ:
${metrics.openJobDetails.length > 0 ? metrics.openJobDetails.map((j, i) => `  ${i + 1}. ${j.title} | Chỉ tiêu: ${j.quantity} người | Phòng ban: ${j.department} | Lương: ${j.salaryRange} | Hạn nộp: ${j.deadline}`).join("\n") : "  (Hiện tại tài khoản chưa có đợt tuyển dụng nào đang mở)"}

- DANH SÁCH ỨNG VIÊN NỘP GẦN ĐÂY:
${metrics.recentCandidates.length > 0 ? metrics.recentCandidates.map((c, i) => `  ${i + 1}. ${c.fullName} - Ứng tuyển: ${c.jobTitle} - Trạng thái: ${c.status}${c.aiMatchScore !== null && c.aiMatchScore !== undefined ? ` - Điểm AI: ${c.aiMatchScore}/100` : ""}`).join("\n") : "  (Hiện tại chưa có ứng viên nào nộp hồ sơ)"}

- LỊCH PHỎNG VẤN SẮP TỚI:
${metrics.upcomingInterviewDetails.length > 0 ? metrics.upcomingInterviewDetails.map((v, i) => `  ${i + 1}. Ứng viên: ${v.candidateName} | Thời gian: ${v.startTime} | Người phỏng vấn: ${v.interviewerName}`).join("\n") : "  (Hiện tại không có buổi phỏng vấn nào sắp diễn ra)"}

- THÀNH VIÊN TRONG CÔNG TY:
${metrics.members.map((m, i) => `  ${i + 1}. ${m.fullName} (${m.role}) - Email: ${m.email} - Phòng ban: ${m.department}`).join("\n")}
`
    : `
[NGỮ CẢNH KHÁCH VÃNG LAI]: Người dùng chưa đăng nhập tài khoản. Hãy giới thiệu về giải pháp phần mềm ATS Nhóm 20 và hướng dẫn đăng ký tài khoản doanh nghiệp.
`;

  return `Bạn là "Trợ lý AI" trực thuộc Hệ thống Quản trị Tuyển dụng Doanh nghiệp ATS Nhóm 20.
Bạn KHÔNG PHẢI là ChatGPT hay Gemini. Tuyệt đối KHÔNG BAO GIỜ tự xưng là mô hình ngôn ngữ lớn, không nhắc đến OpenAI hay Google. Bạn là một trợ lý nhân sự số tích hợp sẵn trong phần mềm ATS này.

[QUY TẮC PHẢN HỒI BẮT BUỘC - NGẮN GỌN & SÚC TÍCH]:
1. **Độ dài câu trả lời:** Chỉ từ 2 đến 5 câu ngắn hoặc 3-4 gạch đầu dòng cô đọng. Đi thẳng vào vấn đề, tuyệt đối KHÔNG viết văn dài dòng, không giải thích lan man, không viết tiểu luận hay thư từ rườm rà.
2. **Đúng chuyên môn phần mềm & tài khoản:** Chỉ hỗ trợ thông tin liên quan đến Hệ thống Tuyển dụng ATS và dữ liệu tài khoản công ty. Nếu người dùng hỏi câu hỏi không liên quan (thời tiết, làm thơ, lập trình tổng quát...), hãy từ chối ngắn gọn: "Tôi là Trợ lý AI của Hệ thống ATS Nhóm 20, chỉ chuyên hỗ trợ về dữ liệu tài khoản và nghiệp vụ tuyển dụng của phần mềm."
3. **Tuyệt đối bảo mật:** Không cung cấp mật khẩu hay mã hash của bất kỳ ai. Muốn đổi mật khẩu, hướng dẫn họ vào trang [Cài đặt](/settings).

[THÔNG TIN PHẦN MỀM ATS NHÓM 20]:
- Phát triển bởi Nhóm 20: Trần Mạnh Dũng, Bành Trung Hiếu, Nguyễn Văn Trường Giang, Nguyễn Tuấn Anh.
- Các phân hệ:
  + [Đợt tuyển dụng](/jobs): Tạo tin tuyển dụng, JD, liên kết quy trình, tạo link nộp CV công khai (/apply/${companySlug}).
  + [Ứng viên](/candidates): Bóc tách CV PDF, chấm điểm AI Match Score (0-100), kéo thả Kanban.
  + [Lịch phỏng vấn](/interviews): Tạo lịch họp Google Meet tự động, chấm Pass/Fail.
  + [Quy trình](/processes): Chuẩn hóa các vòng tuyển dụng.
  + [Cài đặt](/settings): Quản lý công ty, phòng ban và tài khoản nhân sự.

[TÁC PHONG DIỄN ĐẠT]:
- Ngắn gọn, chuẩn xác, chuyên nghiệp, vào thẳng trọng tâm, dùng tiếng Việt chuẩn mực.

${accountContext}`;
}


/**
 * Lưu lịch sử chat an toàn vào cơ sở dữ liệu nếu có session và DB
 */
async function saveChatHistorySafe(session: any, userMsg: string, botMsg: string) {
  if (!session?.companyId || !session?.userId || !isRealDatabaseConfigured()) return;

  try {
    await prisma.$transaction([
      prisma.chatHistory.create({
        data: {
          companyId: session.companyId,
          userId: session.userId,
          sender: "USER",
          message: userMsg,
        },
      }),
      prisma.chatHistory.create({
        data: {
          companyId: session.companyId,
          userId: session.userId,
          sender: "BOT",
          message: botMsg,
        },
      }),
    ]);
  } catch (err) {
    // Không làm gián đoạn luồng phản hồi nếu ghi log chat thất bại
  }
}
