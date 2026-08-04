import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { verifyAndConsumeOtp } from "@/lib/otp-challenge";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      phone?: string;
      code?: string;
      fullName?: string;
      email?: string;
      password?: string;
    };

    const phone = normalizePhone(body.phone ?? "");
    const code = (body.code ?? "").trim();
    const fullName = body.fullName?.trim() || "";
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid mobile number" },
        { status: 400 },
      );
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Enter the 6-digit code from your SMS" },
        { status: 400 },
      );
    }
    if (!fullName) {
      return NextResponse.json(
        { error: "Enter your full name" },
        { status: 400 },
      );
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: existingPhone } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingPhone?.id) {
      return NextResponse.json(
        { error: "This mobile number is already registered. Please log in." },
        { status: 409 },
      );
    }

    const verified = await verifyAndConsumeOtp({
      phone,
      code,
      purpose: "auth",
    });

    if (!verified.ok) {
      return NextResponse.json(
        { error: verified.error },
        { status: verified.status },
      );
    }

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone,
        },
      });

    if (createError || !created.user) {
      if (
        createError &&
        (/already|registered|exists/i.test(createError.message) ||
          createError.status === 422)
      ) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in." },
          { status: 409 },
        );
      }
      console.error("register createUser", createError);
      return NextResponse.json(
        { error: createError?.message || "Could not create account" },
        { status: 500 },
      );
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        phone,
        full_name: fullName,
      })
      .eq("id", created.user.id);

    if (profileError) {
      console.error("register profile update", profileError);
    }

    return NextResponse.json({
      ok: true,
      email,
    });
  } catch (err) {
    console.error("otp verify", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Verification failed. Try again.",
      },
      { status: 500 },
    );
  }
}
