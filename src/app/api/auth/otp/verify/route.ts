import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, phoneToAuthEmail } from "@/lib/phone";
import { MAX_ATTEMPTS, otpMatches } from "@/lib/otp";

export const runtime = "nodejs";

async function findOrCreateUser(
  admin: ReturnType<typeof createAdminClient>,
  phone: string,
  fullName: string | null,
) {
  const email = phoneToAuthEmail(phone);

  const { data: byPhone } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (byPhone?.id) {
    if (fullName) {
      await admin
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("id", byPhone.id);
    } else {
      await admin.from("profiles").update({ phone }).eq("id", byPhone.id);
    }
    // Ensure auth email exists for magic-link session
    const { data: userData } = await admin.auth.admin.getUserById(byPhone.id);
    if (userData.user && !userData.user.email) {
      await admin.auth.admin.updateUserById(byPhone.id, {
        email,
        email_confirm: true,
        user_metadata: {
          ...userData.user.user_metadata,
          phone,
        },
      });
    }
    return { userId: byPhone.id, email: userData.user?.email || email };
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
      },
    });

  if (!createError && created.user) {
    await admin
      .from("profiles")
      .update({
        phone,
        ...(fullName ? { full_name: fullName } : {}),
      })
      .eq("id", created.user.id);
    return { userId: created.user.id, email };
  }

  // Already registered — recover via generateLink (returns user)
  if (
    createError &&
    (/already|registered|exists/i.test(createError.message) ||
      createError.status === 422)
  ) {
    const { data: linkProbe, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
    if (linkErr || !linkProbe.user) {
      throw createError;
    }
    await admin
      .from("profiles")
      .update({
        phone,
        ...(fullName ? { full_name: fullName } : {}),
      })
      .eq("id", linkProbe.user.id);
    return { userId: linkProbe.user.id, email };
  }

  throw createError ?? new Error("Could not create account");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      phone?: string;
      code?: string;
      fullName?: string;
    };

    const phone = normalizePhone(body.phone ?? "");
    const code = (body.code ?? "").trim();
    const fullName = body.fullName?.trim() || null;

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

    const admin = createAdminClient();
    const { data: challenge, error: challengeError } = await admin
      .from("otp_challenges")
      .select("id, code_hash, attempts, expires_at, consumed_at")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: "No active code. Request a new one." },
        { status: 400 },
      );
    }

    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Code expired. Request a new one." },
        { status: 400 },
      );
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many attempts. Request a new code." },
        { status: 429 },
      );
    }

    if (!otpMatches(phone, code, challenge.code_hash)) {
      await admin
        .from("otp_challenges")
        .update({ attempts: challenge.attempts + 1 })
        .eq("id", challenge.id);
      return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
    }

    await admin
      .from("otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id);

    const { email } = await findOrCreateUser(admin, phone, fullName);

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError || !linkData.properties?.hashed_token) {
      console.error("generateLink", linkError);
      return NextResponse.json(
        { error: "Could not start session" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      token_hash: linkData.properties.hashed_token,
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
