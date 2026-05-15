/** Run Prisma query; on connection failure return fallback (demo without Postgres). */
export async function safeDbQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("Can't reach database") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("P1001") ||
      msg.includes("connect")
    ) {
      console.warn("[db] offline — using in-memory fallback:", msg.slice(0, 80));
      return fallback;
    }
    throw err;
  }
}
