import { PrismaClient, Role, JobStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Database Seeding for B2B SaaS ATS...");

  // 1. Dọn dẹp dữ liệu cũ của công ty hung-ha nếu có
  const existingCompany = await prisma.company.findUnique({
    where: { slug: "hung-ha" },
  });

  if (existingCompany) {
    console.log(`Found existing demo company ${existingCompany.name}, cleaning up...`);
    await prisma.company.delete({
      where: { id: existingCompany.id },
    });
  }

  // 2. Tạo Công ty mẫu: Công ty Cổ phần Thanh toán Hưng Hà (slug: hung-ha)
  const company = await prisma.company.create({
    data: {
      name: "Công ty Cổ phần Thanh toán Hưng Hà",
      slug: "hung-ha",
      industry: "Công nghệ thông tin & FinTech",
      size: "100-500 nhân sự",
    },
  });
  console.log(`✅ Created Demo Company: ${company.name} (${company.slug})`);

  // 3. Tạo 2 Phòng ban thuộc công ty
  const hrDept = await prisma.department.create({
    data: {
      companyId: company.id,
      name: "Phòng Nhân sự",
      description: "Quản lý tuyển dụng, chế độ đãi ngộ và phát triển nhân tài",
    },
  });

  const itDept = await prisma.department.create({
    data: {
      companyId: company.id,
      name: "Phòng Kỹ thuật IT",
      description: "Nghiên cứu, phát triển sản phẩm công nghệ và nền tảng SaaS",
    },
  });
  console.log(`✅ Created 2 Departments: ${hrDept.name}, ${itDept.name}`);

  // 4. Tạo tài khoản Quản trị viên duy nhất (mật khẩu 123456 đã hash)
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync("123456", salt);

  // Sếp / Quản trị công ty: admin@hungha.com (Role: COMPANY_ADMIN)
  const adminUser = await prisma.user.create({
    data: {
      companyId: company.id,
      departmentId: null,
      fullName: "Nguyễn Văn Hưng",
      email: "admin@hungha.com",
      passwordHash,
      role: Role.COMPANY_ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Created Admin User: admin@hungha.com (Nguyễn Văn Hưng)`);
  console.log(`   - Role: COMPANY_ADMIN`);
  console.log(`   - Default Password: "123456"`);
  console.log(`✨ Reset hoàn tất: Công ty khởi tạo với 0 quy trình, 0 đợt tuyển dụng, 0 ứng viên, 0 nhân viên thừa.`);
  console.log(`🎉 Seeding completed successfully!`);
}

main()
  .catch((e) => {
    console.error("❌ Error while seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
