import { GoogleGenAI } from "@google/genai";

export interface CVEvaluationResult {
  fullName: string;
  email: string;
  phone: string;
  extractedSkills: string[];
  aiMatchScore: number;
  aiEvaluationSummary: string;
  rawCvText: string;
}

interface ParseCVOptions {
  buffer: Buffer;
  mimeType?: string;
  filename?: string;
  jobPosting: {
    title: string;
    description: string;
    requirements?: string | null;
    benefits?: string | null;
  };
}

// Từ điển các kỹ năng chuyên môn phổ biến trong tuyển dụng thực tế
const STANDARD_SKILLS = [
  // Lập trình & Kỹ thuật phần mềm
  "React", "Next.js", "Vue.js", "Angular", "TypeScript", "JavaScript", "HTML", "CSS", "Tailwind CSS",
  "Node.js", "Express", "NestJS", "Python", "Django", "FastAPI", "Java", "Spring Boot", "C#", ".NET",
  "PHP", "Laravel", "Golang", "Rust", "C++", "C",
  // Mobile
  "Flutter", "React Native", "iOS", "Android", "Swift", "Kotlin",
  // Dữ liệu & Hệ thống
  "PostgreSQL", "MySQL", "SQL Server", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "Google Cloud",
  "Azure", "Git", "GitHub", "CI/CD", "Linux", "RESTful API", "GraphQL", "Microservices",
  // Kiểm thử & Chất lượng
  "QA", "QC", "Manual Test", "Automation Test", "Selenium", "Jest",
  // Thiết kế
  "Figma", "UI/UX", "Photoshop", "Illustrator",
  // Kinh doanh & Tiếp thị
  "B2B Sales", "B2C Sales", "Telesales", "SEO", "Content Marketing", "Digital Marketing", "Google Ads",
  "Facebook Ads", "CRM", "Thương lượng", "Đàm phán", "Chăm sóc khách hàng",
  // Nhân sự & Hành chính
  "Tuyển dụng", "Headhunting", "Sourcing", "Onboarding", "Luật Lao động", "Đào tạo nội bộ",
  // Quản lý & Kỹ năng chung
  "Agile", "Scrum", "Quản lý dự án", "Tiếng Anh", "IELTS", "TOEIC", "Giao tiếp", "Làm việc nhóm"
];

/**
 * Phân tích và chấm điểm CV ứng viên:
 * 1. Kiểm tra định dạng PDF bắt buộc (từ chối hình ảnh, tệp lạ).
 * 2. Trích xuất văn bản thực tế từ PDF bằng PDFParse.
 * 3. Nếu có GEMINI_API_KEY: Gọi Gemini 2.5 Flash với ràng buộc nghiêm ngặt KHÔNG BỊA ĐẶT.
 * 4. Nếu không có GEMINI_API_KEY: Phân tích thực tế trung thực từ nội dung văn bản bóc tách được (không bịa đặt số điện thoại, email hay điểm ảo).
 */
export async function parseAndEvaluateCV({
  buffer,
  mimeType = "application/pdf",
  filename = "cv.pdf",
  jobPosting,
}: ParseCVOptions): Promise<CVEvaluationResult> {
  // 1. Kiểm tra tính hợp lệ của tệp PDF (Bắt buộc đuôi .pdf và chữ ký %PDF-)
  const lowerName = filename.toLowerCase();
  if (!lowerName.endsWith(".pdf")) {
    throw new Error(`Định dạng tệp "${filename}" không được hỗ trợ. Hệ thống chỉ chấp nhận tệp tài liệu PDF (.pdf).`);
  }

  if (!buffer || buffer.length < 10) {
    throw new Error("Tệp tải lên rỗng hoặc bị lỗi.");
  }

  const magicHeader = buffer.subarray(0, 5).toString("utf8");
  if (!magicHeader.startsWith("%PDF-")) {
    throw new Error(`Tệp "${filename}" không phải là tài liệu PDF hợp lệ (chữ ký tệp không đúng chuẩn PDF). Vui lòng tải lên tệp PDF thực sự.`);
  }

  // 2. Trích xuất nội dung văn bản thực tế từ file PDF bằng PDFParse
  let rawCvText = "";
  try {
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    rawCvText = parsed?.text?.trim() || "";
    await parser.destroy();
  } catch (err: any) {
    console.warn("Cảnh báo: Không thể giải mã văn bản từ file PDF:", err?.message);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // 3. Nếu có Gemini API Key hợp lệ: Sử dụng Gemini 2.5 Flash
  if (apiKey && apiKey !== "your-gemini-api-key-here" && apiKey.length > 10) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = buffer.toString("base64");

      const prompt = `Bạn là Chuyên gia Tuyển dụng Nhân sự Cao cấp (Senior Talent Acquisition & ATS Evaluator).
Nhiệm vụ của bạn là đọc và phân tích kỹ lưỡng file CV (Hồ sơ ứng viên) đính kèm (hỗ trợ đọc cả file văn bản lẫn file scan ảnh chụp tài liệu), sau đó đối chiếu khách quan với Yêu cầu tuyển dụng (JD) dưới đây:

TIÊU ĐỀ ĐỢT TUYỂN DỤNG: ${jobPosting.title}
MÔ TẢ CÔNG VIỆC:
${jobPosting.description}

YÊU CẦU ỨNG VIÊN:
${jobPosting.requirements || "Theo chuẩn yêu cầu chuyên môn của vị trí."}

QUYỀN LỢI & PHÚC LỢI:
${jobPosting.benefits || "Theo quy chế đãi ngộ của công ty."}

NGUYÊN TẮC PHÂN TÍCH VÀ ĐÁNH GIÁ:
1. Đọc trung thực thông tin trong CV:
   - Họ và tên ứng viên: Lấy chính xác tên ứng viên trong CV.
   - Email & Số điện thoại: Lấy chính xác nếu có trong CV, nếu không có để chuỗi rỗng "".
   - Kỹ năng chuyên môn (extractedSkills): Trích xuất danh sách các kỹ năng thực tế mà ứng viên đề cập trong CV (cả tiếng Anh lẫn tiếng Việt).
   - Nội dung chữ (rawCvText): Bóc tách toàn bộ văn bản và kinh nghiệm từ CV.
2. Chấm điểm độ khớp (aiMatchScore) từ 0 đến 100:
   - Khớp xuất sắc (đáp ứng hầu hết yêu cầu kỹ thuật cốt lõi và kinh nghiệm): 80 - 95.
   - Khớp khá (đáp ứng một số yêu cầu cốt lõi, thiếu kỹ năng phụ): 60 - 79.
   - Đạt một phần (trái ngành nhẹ hoặc chỉ đáp ứng kỹ năng chung): 30 - 59.
   - Không phù hợp / Trái ngành hoàn toàn (ví dụ: CV ngành Thiết kế nội thất nộp vị trí Lập trình viên, hoặc CV ngành Kế toán nộp vị trí Bán hàng kỹ thuật): Chấm 5 - 20 điểm.
   - File rỗng hoặc không phải hồ sơ xin việc: 0 điểm.
3. Viết nhận xét (aiEvaluationSummary) theo phong cách nhân sự chuyên nghiệp, nhã nhặn, tự nhiên, dễ hiểu:
   - Nêu rõ nền tảng, chức danh và kinh nghiệm nổi bật của ứng viên trong CV.
   - Phân tích đối chiếu: Chỉ rõ điểm phù hợp hoặc lý do tại sao không phù hợp với vị trí "${jobPosting.title}" (nêu rõ các kỹ năng còn thiếu hoặc sự khác biệt về chuyên ngành).
   - Khuyến nghị cụ thể cho HR (ví dụ: Chuyển sang vòng phỏng vấn, thẩm định thêm về kỹ năng X, hoặc từ chối do trái chuyên môn).
   - TUYỆT ĐỐI KHÔNG dùng từ ngữ máy móc kỹ thuật khó hiểu như "chưa qua OCR", "text-based PDF", "lớp văn bản".

Trả về DUY NHẤT một chuỗi JSON hợp lệ:
{
  "fullName": "Tên ứng viên",
  "email": "email tìm thấy hoặc chuỗi rỗng",
  "phone": "số điện thoại tìm thấy hoặc chuỗi rỗng",
  "extractedSkills": ["kỹ năng 1", "kỹ năng 2"],
  "aiMatchScore": 75,
  "aiEvaluationSummary": "Lời nhận xét đánh giá rõ ràng, dễ hiểu...",
  "rawCvText": "Nội dung tóm tắt kinh nghiệm từ CV..."
}`;

      const contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ];

      const config = {
        responseMimeType: "application/json",
        temperature: 0.1,
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents,
          config,
        });
      } catch (e1: any) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config,
          });
        } catch (e2: any) {
          response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents,
            config,
          });
        }
      }

      const responseText = response.text || "";
      const cleanedJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      const parsed = JSON.parse(cleanedJson);

      // Sanitize thông tin
      const fullName = (parsed.fullName || "").trim() || extractNameFromFilename(filename);
      let email = (parsed.email || "").trim();
      let phone = (parsed.phone || "").trim();

      // Nếu Gemini không tìm thấy email/phone, thử tìm trong rawCvText đã parse
      if (!email && rawCvText) {
        const em = rawCvText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (em) email = em[0].toLowerCase();
      }
      if (!phone && rawCvText) {
        const pm = rawCvText.match(/(?:(?:\+84|0)[1-9][0-9]{8,9})|(?:(?:\+84|0)\s*[1-9](?:[\s.-]*\d){8,9})/);
        if (pm) phone = pm[0].replace(/[\s.-]/g, "");
      }

      return {
        fullName,
        email,
        phone,
        extractedSkills: Array.isArray(parsed.extractedSkills) ? parsed.extractedSkills : [],
        aiMatchScore: typeof parsed.aiMatchScore === "number" ? Math.max(0, Math.min(100, parsed.aiMatchScore)) : 50,
        aiEvaluationSummary: parsed.aiEvaluationSummary || "Đã phân tích hồ sơ ứng viên.",
        rawCvText: parsed.rawCvText || rawCvText || `Tệp CV: ${filename}`,
      };
    } catch (err: any) {
      console.warn("⚠️ Gọi Gemini API thất bại, chuyển sang phương án phân tích văn bản thực tế:", err?.message);
    }
  }

  // 4. Phân tích thực tế trung thực từ văn bản trích xuất được (Không có GEMINI_API_KEY hoặc API lỗi)
  return performHonestTextEvaluation(rawCvText, filename, jobPosting);
}

/**
 * Trích xuất tên sạch từ filename
 */
function extractNameFromFilename(filename: string): string {
  const base = filename
    .replace(/\.pdf$/i, "")
    .replace(/^CV[-_\s]*/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  if (base.length >= 2 && !/^\d+$/.test(base)) {
    return base
      .split(" ")
      .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
      .join(" ");
  }
  return "Ứng viên Chưa rõ tên";
}

/**
 * Phân tích trung thực, khách quan trực tiếp từ nội dung văn bản PDF
 * Tuyệt đối KHÔNG BỊA ĐẶT số điện thoại, email hay điểm số ngẫu nhiên.
 */
function performHonestTextEvaluation(
  rawText: string,
  filename: string,
  jobPosting: { title: string; description: string; requirements?: string | null }
): CVEvaluationResult {
  // 1. Trích xuất email có thực trong văn bản
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : "";

  // 2. Trích xuất số điện thoại có thực trong văn bản
  const phoneMatch = rawText.match(/(?:(?:\+84|0)[1-9][0-9]{8,9})|(?:(?:\+84|0)\s*[1-9](?:[\s.-]*\d){8,9})/);
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s.-]/g, "") : "";

  // 3. Trích xuất tên ứng viên từ đầu văn bản hoặc tên file
  let detectedName = "";
  if (rawText) {
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (const line of lines.slice(0, 5)) {
      // Bỏ qua các tiêu đề văn bản phổ biến
      if (/^(curriculum vitae|resume|cv|hồ sơ|thông tin|hồ sơ xin việc|profile)$/i.test(line)) continue;
      if (line.includes("@") || /\d{8,}/.test(line)) continue;
      if (line.length >= 3 && line.length <= 40 && !line.includes(":") && !line.includes("/")) {
        detectedName = line;
        break;
      }
    }
  }

  const fullName = detectedName || extractNameFromFilename(filename);

  // 4. Trích xuất kỹ năng CÓ THẬT trong văn bản
  const lowerText = rawText.toLowerCase();
  const extractedSkills: string[] = [];

  for (const skill of STANDARD_SKILLS) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-zA-Z0-9#+.])${escaped}([^a-zA-Z0-9#+.]|$)`, "i");
    if (regex.test(lowerText)) {
      extractedSkills.push(skill);
    }
  }

  // 5. Tính toán điểm số đối chiếu thực tế với JD
  let matchScore = 0;
  const jdContext = `${jobPosting.title} ${jobPosting.description} ${jobPosting.requirements || ""}`.toLowerCase();
  
  if (rawText.length < 30) {
    // Tệp PDF rỗng hoặc dạng scan ảnh đồ họa
    matchScore = 0;
    return {
      fullName,
      email,
      phone,
      extractedSkills: [],
      aiMatchScore: 0,
      aiEvaluationSummary: `[Đánh giá sơ bộ]:
- Hồ sơ được tải lên dưới dạng hình ảnh đồ họa hoặc bản chụp scan chưa qua xử lý văn bản tự động, hệ thống chưa nhận diện được các từ khóa chuyên môn trực tiếp.
- Khuyến nghị: Nhà tuyển dụng vui lòng đối chiếu trực tiếp qua bản xem tài liệu A4 ở cột bên trái để thẩm định thông tin ứng viên.`,
      rawCvText: `Tệp ${filename} là tài liệu đồ họa/ảnh scan.`,
    };
  }

  // Tìm các kỹ năng của ứng viên mà JD thực sự yêu cầu
  const matchedSkills = extractedSkills.filter((s) => jdContext.includes(s.toLowerCase()));

  // Điểm số căn cứ trên số lượng kỹ năng khớp và nội dung liên quan
  if (matchedSkills.length >= 4) {
    matchScore = 85;
  } else if (matchedSkills.length === 3) {
    matchScore = 75;
  } else if (matchedSkills.length === 2) {
    matchScore = 65;
  } else if (matchedSkills.length === 1) {
    matchScore = 45;
  } else {
    // Kiểm tra xem vị trí tuyển dụng có xuất hiện trong CV không
    const titleTokens = jobPosting.title.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const hasTitleTokens = titleTokens.some((t) => lowerText.includes(t));
    matchScore = hasTitleTokens ? 30 : 15;
  }

  const evaluationSummary = `[Đánh giá tự động từ nội dung CV]:
- Kỹ năng bóc tách được từ hồ sơ: ${extractedSkills.length > 0 ? extractedSkills.join(", ") : "Chưa phát hiện từ khóa kỹ năng chuyên môn rõ ràng trong CV"}.
- Đối chiếu với đợt tuyển "${jobPosting.title}": ${matchedSkills.length > 0 ? "Khớp các tiêu chí: " + matchedSkills.join(", ") : "Chưa tìm thấy từ khóa chuyên môn khớp với vị trí này"}.
- Đánh giá: ${matchScore >= 70 ? "Hồ sơ đáp ứng tốt các yêu cầu cơ bản." : matchScore >= 45 ? "Hồ sơ đạt một phần tiêu chuẩn, HR cần phỏng vấn thẩm định thêm." : "Hồ sơ chưa đạt các tiêu chí cơ bản của vị trí tuyển dụng."}
(Lưu ý: Đánh giá dựa trên trích xuất văn bản thực tế từ tệp PDF gốc)`;

  return {
    fullName,
    email,
    phone,
    extractedSkills,
    aiMatchScore: matchScore,
    aiEvaluationSummary: evaluationSummary,
    rawCvText: rawText || `Nội dung từ tệp ${filename}`,
  };
}
