import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { otpRecords } from "@/lib/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, otp } = parsed.data;

    const now = new Date().toISOString();
    const record = db
      .select()
      .from(otpRecords)
      .where(
        and(
          eq(otpRecords.email, email),
          eq(otpRecords.otp, otp),
          eq(otpRecords.used, false),
          gt(otpRecords.expiresAt, now)
        )
      )
      .get();

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    db.update(otpRecords).set({ used: true }).where(eq(otpRecords.id, record.id)).run();
    return NextResponse.json({ message: "OTP verified" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
