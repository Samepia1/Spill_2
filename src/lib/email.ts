import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type NotificationType = "new_post" | "new_comment" | "new_mention";

const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Spill <noreply@spill.com>";
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export function getNotificationMessage(
  type: string,
  actorHandle: string | null
): string {
  switch (type) {
    case "new_post":
      return actorHandle
        ? `@${actorHandle} posted about you`
        : "Someone posted about you";
    case "new_comment":
      return actorHandle
        ? `@${actorHandle} commented on your post`
        : "Someone commented on your post";
    case "new_mention":
      return actorHandle
        ? `@${actorHandle} mentioned you`
        : "Someone mentioned you";
    default:
      return "You have a new notification";
  }
}

function getEmailSubject(
  type: NotificationType,
  actorHandle: string | null,
  notificationCount?: number
): string {
  if (notificationCount && notificationCount > 1) {
    return `You have ${notificationCount} new notifications on Spill`;
  }
  switch (type) {
    case "new_post":
      return actorHandle
        ? `${actorHandle} posted about you`
        : "Someone posted about you";
    case "new_comment":
      return actorHandle
        ? `${actorHandle} commented on your post`
        : "Someone commented on your post";
    case "new_mention":
      return actorHandle
        ? `${actorHandle} mentioned you`
        : "Someone mentioned you";
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSingleEmailHtml(
  type: NotificationType,
  actorHandle: string | null,
  postId: string,
  unsubscribeUrl: string
): string {
  const message = escapeHtml(getNotificationMessage(type, actorHandle));
  const postUrl = `${BASE_URL}/post/${postId}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:12px;">
<tr><td style="padding:32px 32px 0 32px;text-align:center;">
  <span style="font-size:28px;font-weight:700;color:#18181b;">Spill</span>
</td></tr>
<tr><td style="padding:24px 32px;text-align:center;">
  <p style="margin:0;font-size:16px;line-height:24px;color:#52525b;">${message}</p>
</td></tr>
<tr><td style="padding:0 32px 32px 32px;text-align:center;">
  <a href="${escapeHtml(postUrl)}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;padding:12px 24px;">View on Spill</a>
</td></tr>
<tr><td style="padding:0 32px 32px 32px;text-align:center;">
  <p style="margin:0;font-size:12px;line-height:18px;color:#a1a1aa;">You're receiving this because you're on Spill.</p>
  <p style="margin:8px 0 0 0;font-size:12px;line-height:18px;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildDigestEmailHtml(
  notifications: Array<{
    type: string;
    actor_handle: string | null;
    post_subject: string;
    post_id: string;
  }>,
  unsubscribeUrl: string
): string {
  const items = notifications
    .map((n) => {
      const msg = escapeHtml(getNotificationMessage(n.type, n.actor_handle));
      return `<tr><td style="padding:4px 0;font-size:14px;line-height:22px;color:#3f3f46;">&#8226; ${msg}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:12px;">
<tr><td style="padding:32px 32px 0 32px;text-align:center;">
  <span style="font-size:28px;font-weight:700;color:#18181b;">Spill</span>
</td></tr>
<tr><td style="padding:24px 32px 8px 32px;">
  <p style="margin:0;font-size:16px;line-height:24px;color:#52525b;">Here's what you missed:</p>
</td></tr>
<tr><td style="padding:0 32px 24px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
</td></tr>
<tr><td style="padding:0 32px 32px 32px;text-align:center;">
  <a href="${escapeHtml(BASE_URL)}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;padding:12px 24px;">Open Spill</a>
</td></tr>
<tr><td style="padding:0 32px 32px 32px;text-align:center;">
  <p style="margin:0;font-size:12px;line-height:18px;color:#a1a1aa;">You're receiving this because you're on Spill.</p>
  <p style="margin:8px 0 0 0;font-size:12px;line-height:18px;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildPlainText(
  unread: Array<{ type: string; actor_handle: string | null }>,
  triggerType: NotificationType,
  actorHandle: string | null,
  postId: string,
  unsubscribeUrl: string
): string {
  if (unread.length <= 1) {
    const msg = getNotificationMessage(triggerType, actorHandle);
    return `${msg}\n\nView on Spill: ${BASE_URL}/post/${postId}\n\nYou're receiving this because you have an account on Spill. If you'd like to stop receiving these emails, visit: ${unsubscribeUrl}`;
  }
  const items = unread
    .map((n) => `- ${getNotificationMessage(n.type, n.actor_handle)}`)
    .join("\n");
  return `Here's what you missed:\n\n${items}\n\nOpen Spill: ${BASE_URL}\n\nYou're receiving this because you have an account on Spill. If you'd like to stop receiving these emails, visit: ${unsubscribeUrl}`;
}

async function shouldSendEmail(
  recipientId: string,
  notificationType: NotificationType,
  actorHandle: string | null,
  supabase: SupabaseClient
): Promise<
  | { send: false }
  | { send: true; email: string; unsubscribeToken: string }
> {
  const { data: user } = await supabase
    .from("users")
    .select(
      "email, email_notify_posts, email_notify_comments, email_notify_mentions, last_email_sent_at, email_unsubscribe_token, status"
    )
    .eq("id", recipientId)
    .single();

  if (!user) {
    console.error("[email] shouldSendEmail: user not found for", recipientId);
    return { send: false };
  }
  if (user.status !== "active") {
    console.error("[email] shouldSendEmail: user status is", user.status);
    return { send: false };
  }

  if (notificationType === "new_post" && !user.email_notify_posts) {
    return { send: false };
  }

  if (notificationType === "new_comment") {
    if (!user.email_notify_comments || actorHandle === null) {
      return { send: false };
    }
  }

  if (notificationType === "new_mention" && !user.email_notify_mentions) {
    return { send: false };
  }

  if (user.last_email_sent_at) {
    const lastSent = new Date(user.last_email_sent_at).getTime();
    if (Date.now() - lastSent < COOLDOWN_MS) {
      return { send: false };
    }
  }

  return {
    send: true,
    email: user.email as string,
    unsubscribeToken: user.email_unsubscribe_token as string,
  };
}

export async function sendNotificationEmail(
  recipientId: string,
  triggerType: NotificationType,
  postId: string,
  actorHandle: string | null,
  supabase: SupabaseClient
): Promise<void> {
  try {
    console.log("[email] sendNotificationEmail called:", { recipientId, triggerType, postId, actorHandle });
    const check = await shouldSendEmail(
      recipientId,
      triggerType,
      actorHandle,
      supabase
    );
    if (!check.send) {
      console.log("[email] shouldSendEmail returned false, skipping");
      return;
    }
    console.log("[email] sending email to:", check.email);

    const { email, unsubscribeToken } = check;
    const unsubscribeUrl = `${BASE_URL}/api/unsubscribe?token=${unsubscribeToken}`;

    const { data: notifications } = await supabase
      .from("notifications")
      .select("type, actor_handle, post_subject, post_id, created_at")
      .eq("recipient_id", recipientId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10);

    const unread = notifications ?? [];

    let subject: string;
    let html: string;

    if (unread.length <= 1) {
      subject = getEmailSubject(triggerType, actorHandle);
      html = buildSingleEmailHtml(
        triggerType,
        actorHandle,
        postId,
        unsubscribeUrl
      );
    } else {
      subject = getEmailSubject(triggerType, actorHandle, unread.length);
      html = buildDigestEmailHtml(unread, unsubscribeUrl);
    }

    const resend = getResend();
    const plainText = buildPlainText(unread, triggerType, actorHandle, postId, unsubscribeUrl);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
      text: plainText,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    await supabase
      .from("users")
      .update({ last_email_sent_at: new Date().toISOString() })
      .eq("id", recipientId);
  } catch (err) {
    console.error("[email] sendNotificationEmail failed:", err);
    return;
  }
}
