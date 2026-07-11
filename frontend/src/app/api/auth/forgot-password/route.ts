import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, otpRecords } from "@/lib/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const { email } = parsed.data;

    const user = db.select().from(users).where(eq(users.email, email)).get();
    if (!user) {
      return NextResponse.json({ message: "If the email exists, a code has been sent" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate old OTPs
    db.update(otpRecords)
      .set({ used: true })
      .where(and(eq(otpRecords.email, email), eq(otpRecords.used, false)))
      .run();

    db.insert(otpRecords).values({ email, otp, expiresAt, used: false }).run();

    // TODO: Send email here. For now return OTP in response (dev only)
    console.log(`[OTP] ${email} -> ${otp}`);

    return NextResponse.json({ message: "OTP sent", otp });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
