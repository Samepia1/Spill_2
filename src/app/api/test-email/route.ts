import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = request.nextUrl.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "Missing 'to' param" }, { status: 400 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ?? "Unispill <noreply@unispill.com>";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Unispill Test Email",
      html: "<p>If you see this in your inbox (not spam), Resend is working correctly.</p>",
      text: "If you see this in your inbox (not spam), Resend is working correctly.",
    });

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
