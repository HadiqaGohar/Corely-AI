/*
// TODO: Re-enable auth
// TODO: Re-enable auth at the end
// import { SignJWT, jwtVerify } from "jose";
import { hash, compare } from "bcryptjs";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "corely-dev-secret-change-in-production"
);

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

export async function createToken(payload: Record<string, any>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<Record<string, any> | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as Record<string, any>;
  } catch {
    return null;
  }
}

export async function getUserFromToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = await verifyToken(auth.split(" ")[1]);
  if (!payload?.sub) return null;

  const { db } = await import("./db");
  const { users } = await import("./schema");
  const { eq } = await import("drizzle-orm");

  const user = db.select().from(users).where(eq(users.id, payload.sub as number)).get();
  return user || null;
}
*/
