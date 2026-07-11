import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, otpRecords } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/lib/auth-helpers";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, otp, password } = parsed.data;

    const record = db
      .select()
      .from(otpRecords)
      .where(
        and(
          eq(otpRecords.email, email),
          eq(otpRecords.otp, otp),
          eq(otpRecords.used, true)
        )
      )
      .get();

    if (!record) {
      return NextResponse.json({ error: "OTP not verified or expired" }, { status: 400 });
    }

    const user = db.select().from(users).where(eq(users.email, email)).get();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const hashed = await hashPassword(password);
    db.update(users).set({ password: hashed }).where(eq(users.id, user.id)).run();
    db.delete(otpRecords).where(eq(otpRecords.id, record.id)).run();

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
