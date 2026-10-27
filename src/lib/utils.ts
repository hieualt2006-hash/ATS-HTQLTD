/**
 * Tạo slug chuẩn từ tiếng Việt và ký tự đặc biệt
 */
export function slugify(text: string): string {
  let str = text.toLowerCase().trim();

  // Đổi ký tự có dấu thành không dấu
  str = str.replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, "a");
  str = str.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, "e");
  str = str.replace(/i|í|ì|ỉ|ĩ|ị/gi, "i");
  str = str.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, "o");
  str = str.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, "u");
  str = str.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, "y");
  str = str.replace(/đ/gi, "d");

  // Xóa các ký tự đặc biệt
  str = str.replace(/[^a-z0-9 -]/g, "");

  // Thay khoảng trắng thành dấu gạch ngang
  str = str.replace(/\s+/g, "-");

  // Xóa gạch ngang liên tiếp
  str = str.replace(/-+/g, "-");

  // Cắt gạch ngang ở đầu và cuối
  str = str.replace(/^-+|-+$/g, "");

  return str || "company";
}

/**
 * Ghép chuỗi CSS className
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Định dạng ngày giờ hiển thị
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "--/--/----";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
