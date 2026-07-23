// send-email — Supabase Edge Function (Deno)
//
// Triggered by a Supabase Database Webhook on INSERT into `public.notifications`.
// It builds a transactional email according to the notification type, sends it
// through the Resend API, and records the outcome (sent/failed) in `public.email_log`.
//
// Required secrets (set with `supabase secrets set ...`):
//   RESEND_API_KEY   — Resend API key (never hardcoded)
//   EMAIL_FROM       — verified sender, e.g. "GOTS Lab <noreply@tu-dominio-verificado.com>"
//   WEBHOOK_SECRET   — (optional) shared secret; if set, the webhook must send it
//                      in the `x-webhook-secret` header, otherwise the request is rejected
//
// Auto-provided by the Supabase runtime (no need to set manually):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy: `supabase functions deploy send-email`
// The function runs with verify_jwt = false (see supabase/config.toml); it is
// protected by the optional WEBHOOK_SECRET instead, since the DB webhook does not
// carry an end-user JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface NotificationRecord {
  id: string;
  user_id: string;
  type: "access_request" | "access_approved" | "access_rejected" | "experiment_finished";
  payload: Record<string, unknown>;
  related_experiment_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface WebhookBody {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: NotificationRecord | null;
  old_record: NotificationRecord | null;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "GOTS Lab <onboarding@resend.dev>";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getEmail(userId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data.email ?? null;
}

async function getExperimentTitle(experimentId: string | null): Promise<string> {
  if (!experimentId) return "un experimento";
  const { data } = await admin
    .from("experiments")
    .select("title")
    .eq("id", experimentId)
    .single();
  return data?.title ?? "un experimento";
}

interface EmailContent {
  subject: string;
  html: string;
  template: string;
}

function wrapHtml(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5f4;font-family:Inter,Arial,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4;">
        <tr><td style="background:#1c1917;padding:20px 28px;">
          <span style="color:#d4af37;font-size:18px;font-weight:700;letter-spacing:.5px;">GOTS Lab</span>
          <span style="color:#a8a29e;font-size:12px;"> · Inventario óptico UIS</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="font-size:19px;margin:0 0 12px;color:#1c1917;">${title}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#fafaf9;border-top:1px solid #e7e5e4;">
          <p style="margin:0;font-size:12px;color:#78716c;">
            Este es un mensaje automático del sistema de inventario del laboratorio de óptica (GOTS, UIS).
            No respondas a este correo.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function buildContent(n: NotificationRecord): Promise<EmailContent> {
  const experimentId = n.related_experiment_id ?? (n.payload?.experiment_id as string) ?? null;
  const title = escapeHtml(await getExperimentTitle(experimentId));

  switch (n.type) {
    case "access_request": {
      const email = escapeHtml(
        (n.payload?.requester_email as string) ?? "un miembro del laboratorio",
      );
      return {
        template: "access_request",
        subject: `Nueva solicitud de acceso a "${title}"`,
        html: wrapHtml(
          "Nueva solicitud de acceso",
          `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;">
             <strong>${email}</strong> solicitó acompañar tu experimento
             <strong>"${title}"</strong>.
           </p>
           <p style="font-size:14px;line-height:1.6;margin:0;">
             Ingresa a tu perfil en GOTS Lab para aprobar o rechazar la solicitud.
           </p>`,
        ),
      };
    }
    case "access_approved":
      return {
        template: "access_approved",
        subject: `Tu solicitud de acceso a "${title}" fue aprobada`,
        html: wrapHtml(
          "Solicitud aprobada",
          `<p style="font-size:14px;line-height:1.6;margin:0;">
             Tu solicitud para acompañar el experimento <strong>"${title}"</strong> fue
             <strong style="color:#15803d;">aprobada</strong>. Ya puedes ver los equipos e
             información del experimento desde tu perfil.
           </p>`,
        ),
      };
    case "access_rejected":
      return {
        template: "access_rejected",
        subject: `Tu solicitud de acceso a "${title}" fue rechazada`,
        html: wrapHtml(
          "Solicitud rechazada",
          `<p style="font-size:14px;line-height:1.6;margin:0;">
             Tu solicitud para acompañar el experimento <strong>"${title}"</strong> fue
             <strong style="color:#b91c1c;">rechazada</strong> por el responsable.
           </p>`,
        ),
      };
    case "experiment_finished": {
      const t = escapeHtml((n.payload?.title as string) ?? title);
      return {
        template: "experiment_finished",
        subject: `El experimento "${t}" ha finalizado`,
        html: wrapHtml(
          "Experimento finalizado",
          `<p style="font-size:14px;line-height:1.6;margin:0;">
             El experimento <strong>"${t}"</strong> se marcó como <strong>finalizado</strong>.
             Todo el equipo reservado ha sido liberado y vuelve a estar disponible en el inventario.
           </p>`,
        ),
      };
    }
    default:
      return {
        template: "unknown",
        subject: "Notificación de GOTS Lab",
        html: wrapHtml("Notificación", `<p>Tienes una nueva notificación en GOTS Lab.</p>`),
      };
  }
}

async function logEmail(
  notificationId: string,
  toEmail: string,
  subject: string,
  template: string,
  status: "sent" | "failed",
  error: string | null,
): Promise<void> {
  await admin.from("email_log").insert({
    notification_id: notificationId,
    to_email: toEmail,
    subject,
    template,
    status,
    error,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  // Optional shared-secret protection for the webhook.
  if (WEBHOOK_SECRET) {
    const provided = req.headers.get("x-webhook-secret");
    if (provided !== WEBHOOK_SECRET) {
      return jsonResponse(401, { error: "Unauthorized" });
    }
  }

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  // Only react to INSERTs of notification rows.
  if (body.type !== "INSERT" || body.table !== "notifications" || !body.record) {
    return jsonResponse(200, { skipped: true, reason: "not a notifications INSERT" });
  }

  const notification = body.record;

  const toEmail = await getEmail(notification.user_id);
  if (!toEmail) {
    return jsonResponse(200, { skipped: true, reason: "recipient has no email" });
  }

  const content = await buildContent(notification);

  if (!RESEND_API_KEY) {
    // Misconfiguration: record the failure so it is auditable, but do not throw.
    await logEmail(
      notification.id,
      toEmail,
      content.subject,
      content.template,
      "failed",
      "RESEND_API_KEY not configured",
    );
    return jsonResponse(500, { error: "RESEND_API_KEY not configured" });
  }

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [toEmail],
        subject: content.subject,
        html: content.html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      await logEmail(
        notification.id,
        toEmail,
        content.subject,
        content.template,
        "failed",
        `Resend ${resendRes.status}: ${errText}`.slice(0, 1000),
      );
      return jsonResponse(502, { error: "Resend delivery failed", detail: errText });
    }

    await logEmail(notification.id, toEmail, content.subject, content.template, "sent", null);
    return jsonResponse(200, { sent: true, to: toEmail, type: notification.type });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logEmail(
      notification.id,
      toEmail,
      content.subject,
      content.template,
      "failed",
      msg.slice(0, 1000),
    );
    return jsonResponse(500, { error: "Unexpected error", detail: msg });
  }
});
