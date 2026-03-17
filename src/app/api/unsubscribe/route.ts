import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/unsubscribe?error=missing", request.url));
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("users")
    .update({
      email_notify_posts: false,
      email_notify_comments: false,
      email_notify_mentions: false,
    })
    .eq("email_unsubscribe_token", token);

  if (error) {
    return NextResponse.redirect(new URL("/unsubscribe?error=failed", request.url));
  }

  return NextResponse.redirect(new URL("/unsubscribe?success=true", request.url));
}
