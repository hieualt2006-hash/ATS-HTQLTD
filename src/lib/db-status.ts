export function isRealDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  if (
    url.includes("sample-pooler") ||
    url.includes("user:password") ||
    url.includes("ep-sample") ||
    url.includes("your-database-host") ||
    url.includes("[username]") ||
    url.includes("[password]") ||
    url.includes("[neon-host]") ||
    url.includes("<username>") ||
    url.includes("<password>") ||
    url.includes("neon-host") ||
    url.includes("placeholder") ||
    url.includes("[") ||
    url.includes("]")
  ) {
    return false;
  }
  return true;
}
