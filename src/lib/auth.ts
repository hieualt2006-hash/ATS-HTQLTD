import { SignJWT, jwtVerify } from "jose";
import { AuthSessionPayload, AUTH_COOKIE_NAME } from "@/types/auth";

export * from "@/types/auth";

const JWT_SECRET = process.env.JWT_SECRET || "ats_b2b_recruitment_jwt_secret_super_secure_key_2026";
const key = new TextEncoder().encode(JWT_SECRET);

/**
 * Tạo và ký JWT Token
 */
export async function signAuthToken(payload: AuthSessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

/**
 * Giải mã và xác thực JWT Token
 */
export async function verifyAuthToken(token: string): Promise<AuthSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as AuthSessionPayload;
  } catch (err) {
    return null;
  }
}

interface CachedCompany {
  name: string;
  slug: string;
  expiresAt: number;
}

const companyCache = new Map<string, CachedCompany>();
const COMPANY_CACHE_TTL_MS = 60 * 1000; // 60 giây cache nhanh

/**
 * Xóa cache khi công ty đổi tên hoặc slug trong trang Cài Đặt
 */
export function invalidateCompanyCache(companyId?: string) {
  if (companyId) {
    companyCache.delete(companyId);
  } else {
    companyCache.clear();
  }
}

/**
 * Lấy Session người dùng hiện tại từ Cookie (Server Component & Server Actions)
 * Tự động đồng bộ thời gian thực tên công ty và slug mới nhất có bộ nhớ đệm hiệu năng cao
 */
export async function getCurrentSession(): Promise<AuthSessionPayload | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    const session = await verifyAuthToken(token);
    if (!session) return null;

    // Kiểm tra bộ nhớ đệm trước để tránh lãng phí truy vấn database lặp đi lặp lại
    const now = Date.now();
    const cached = companyCache.get(session.companyId);
    if (cached && cached.expiresAt > now) {
      session.companyName = cached.name;
      session.companySlug = cached.slug;
      return session;
    }

    // Đồng bộ tên công ty và slug mới nhất từ mockStore hoặc Database
    try {
      const { isRealDatabaseConfigured } = await import("@/lib/db-status");

      if (!isRealDatabaseConfigured()) {
        const { mockStore } = await import("@/lib/mock-store");
        const list = Array.isArray(mockStore.companies) ? mockStore.companies : [];
        const comp = list.find((c) => c && c.id === session.companyId) || list[0];
        if (comp?.name) session.companyName = comp.name;
        if (comp?.slug) session.companySlug = comp.slug;

        companyCache.set(session.companyId, {
          name: session.companyName,
          slug: session.companySlug,
          expiresAt: now + COMPANY_CACHE_TTL_MS,
        });
      } else {
        const { prisma } = await import("@/lib/prisma");
        const comp = await prisma.company.findUnique({
          where: { id: session.companyId },
          select: { name: true, slug: true },
        });
        if (comp?.name) session.companyName = comp.name;
        if (comp?.slug) session.companySlug = comp.slug;

        companyCache.set(session.companyId, {
          name: session.companyName,
          slug: session.companySlug,
          expiresAt: now + COMPANY_CACHE_TTL_MS,
        });
      }
    } catch (syncErr) {
      // Giữ nguyên dữ liệu trong session nếu sync lỗi
    }

    return session;
  } catch (error) {
    return null;
  }
}
