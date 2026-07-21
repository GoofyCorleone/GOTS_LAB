import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const supabase = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---------------------------------------------------------------------------
// Row aliases
// ---------------------------------------------------------------------------

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Experiment = Database["public"]["Tables"]["experiments"]["Row"];
type ExperimentParticipant =
  Database["public"]["Tables"]["experiment_participants"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

// ---------------------------------------------------------------------------
// Phase 5 composite / typed shapes
// ---------------------------------------------------------------------------

/** A single profile as returned by user search (excludes the current user). */
export interface SearchResult {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

/** Participation status of the current user against an in-progress experiment. */
export type ParticipationStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "owner";

/** An in-progress experiment the current user may accompany, enriched with the
 *  owner profile and the user's own participation status. */
export interface JoinableExperiment extends Experiment {
  owner?: Profile;
  participation_status: ParticipationStatus;
}

/** A pending access request seen from the owner's side: the participant row
 *  enriched with the requester's profile and the target experiment. */
export interface AccessRequest extends ExperimentParticipant {
  requester?: Profile;
  experiment?: Experiment;
}

// --- Notification payloads (mirror the DB trigger jsonb_build_object shapes) --

export type NotificationType = NotificationRow["type"];

/** Payload for `access_request` (built by notify_access_request trigger). */
export interface AccessRequestPayload {
  requester_id: string;
  requester_email: string;
  experiment_id: string;
}

/** Payload for `access_approved` / `access_rejected`
 *  (built by notify_access_resolution trigger). */
export interface AccessResolutionPayload {
  experiment_id: string;
}

/** Payload for `experiment_finished` (built by notify_experiment_finished). */
export interface ExperimentFinishedPayload {
  experiment_id: string;
  title: string;
}

export type NotificationPayload =
  | AccessRequestPayload
  | AccessResolutionPayload
  | ExperimentFinishedPayload;

/** A typed notification row, optionally enriched with its related experiment. */
export interface Notification<P extends NotificationPayload = NotificationPayload>
  extends Omit<NotificationRow, "payload"> {
  payload: P;
  experiment?: Pick<Experiment, "id" | "title" | "status">;
}

/** Body posted to the `send-email` Edge Function. The function reads `template`
 *  to pick the Resend template and merges `data` for interpolation. This is a
 *  belt-and-suspenders path: the DB webhook on notifications INSERT is primary,
 *  this direct invocation guarantees delivery even if the webhook is disabled. */
export interface SendEmailPayload {
  template: NotificationType;
  to: string;
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Resolve the authenticated user or throw. */
async function requireUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user;
}

/** Load a participant row and assert the current user owns its experiment.
 *  RLS is the source of truth; this adds precise, friendly errors and returns
 *  both the participant and its experiment for downstream use. */
async function requireOwnedParticipant(participantId: string): Promise<{
  participant: ExperimentParticipant;
  experiment: Experiment;
}> {
  const user = await requireUser();

  const { data: participant, error } = await supabase
    .from("experiment_participants")
    .select("*")
    .eq("id", participantId)
    .single();

  if (error || !participant) {
    throw new Error(
      `Access request not found or access denied: ${
        error?.message || "not found"
      }`
    );
  }

  const p = participant as ExperimentParticipant;

  const { data: experiment, error: expError } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", p.experiment_id)
    .single();

  if (expError || !experiment) {
    throw new Error(
      `Experiment not found or access denied: ${
        expError?.message || "not found"
      }`
    );
  }

  const exp = experiment as Experiment;

  if (exp.owner_id !== user.id) {
    throw new Error(
      "Only the experiment owner can resolve access requests"
    );
  }

  return { participant: p, experiment: exp };
}

// ===========================================================================
// PHASE 5 — Accompany experiment: search, requests, notifications, email
// ===========================================================================

/**
 * 1. Search profiles by email or full name, excluding the current user.
 *    Case-insensitive partial match. Empty/whitespace query returns [].
 */
export async function searchUsers(query: string): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length === 0) {
    return [];
  }

  const user = await requireUser();

  // Escape LIKE wildcards so a literal % or _ in the query is matched literally.
  const escaped = term.replace(/[%_]/g, (m) => `\\${m}`);
  const pattern = `%${escaped}%`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .neq("id", user.id)
    .or(`email.ilike.${pattern},full_name.ilike.${pattern}`)
    .order("full_name", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Error searching users:", error);
    throw new Error(
      `Failed to search users: ${error.message || "Unknown error"}`
    );
  }

  return (data as SearchResult[]) || [];
}

/**
 * 2. List in-progress experiments the given user can accompany. Excludes the
 *    experiments they already own and annotates each with the user's own
 *    participation status (none / pending / approved / rejected). RLS
 *    (experiments_select_in_progress) makes every in-progress experiment
 *    visible to authenticated users, which is what powers this browse view.
 */
export async function getExperimentsInProgress(
  userId: string
): Promise<JoinableExperiment[]> {
  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("status", "in_progress")
    .neq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching in-progress experiments:", error);
    throw new Error(
      `Failed to fetch in-progress experiments: ${
        error.message || "Unknown error"
      }`
    );
  }

  const experiments = (data as Experiment[]) || [];
  if (experiments.length === 0) {
    return [];
  }

  const experimentIds = experiments.map((e) => e.id);
  const ownerIds = [...new Set(experiments.map((e) => e.owner_id))];

  // Fetch owner profiles + this user's participation rows in parallel.
  const [ownersRes, participationRes] = await Promise.all([
    supabase.from("profiles").select("*").in("id", ownerIds),
    supabase
      .from("experiment_participants")
      .select("experiment_id, status")
      .eq("user_id", userId)
      .in("experiment_id", experimentIds),
  ]);

  const owners = (ownersRes.data as Profile[]) || [];
  const participationByExperiment = new Map<string, ParticipationStatus>();
  for (const row of (participationRes.data as ExperimentParticipant[]) || []) {
    participationByExperiment.set(row.experiment_id, row.status);
  }

  return experiments.map((exp) => ({
    ...exp,
    owner: owners.find((o) => o.id === exp.owner_id),
    participation_status:
      participationByExperiment.get(exp.id) ?? ("none" as ParticipationStatus),
  }));
}

/**
 * 3. Create an access request: insert an experiment_participants row with
 *    status='pending', source='requested_by_user'. The notify_access_request
 *    DB trigger fires atomically in the same statement, creating the owner's
 *    in-app notification (and, via the notifications webhook, the email).
 *
 *    Validations:
 *      - experiment must exist and be in_progress (RLS also enforces this;
 *        pre-checked here for a friendly message)
 *      - user must not already be a participant (unique(experiment_id,user_id)
 *        → 23505 mapped to a clear error)
 */
export async function createAccessRequest(
  experimentId: string,
  requestedBy: string
): Promise<ExperimentParticipant> {
  // Friendly pre-check; RLS (experiment_participants_insert_by_user) is the
  // atomic guarantee that a request cannot target a non-in-progress experiment.
  const { data: experiment, error: expError } = await supabase
    .from("experiments")
    .select("id, status")
    .eq("id", experimentId)
    .single();

  if (expError || !experiment) {
    throw new Error(
      `Experiment not found or not accessible: ${
        expError?.message || "not found"
      }`
    );
  }

  if ((experiment as Experiment).status !== "in_progress") {
    throw new Error(
      "Access can only be requested for experiments that are in progress"
    );
  }

  const { data, error } = await (supabase
    .from("experiment_participants")
    .insert({
      experiment_id: experimentId,
      user_id: requestedBy,
      status: "pending",
      source: "requested_by_user",
    } as any)
    .select()
    .single() as any);

  if (error) {
    console.error("Error creating access request:", error);
    if (error.code === "23505") {
      throw new Error(
        "You already have a request or membership for this experiment"
      );
    }
    throw new Error(
      `Failed to create access request: ${error.message || "Unknown error"}`
    );
  }

  return data as ExperimentParticipant;
}

/**
 * 4. List pending access requests for an experiment (owner view), enriched with
 *    the requester profile. RLS (experiment_participants_select_own) restricts
 *    visibility of these rows to the experiment owner.
 */
export async function getAccessRequests(
  experimentId: string
): Promise<AccessRequest[]> {
  const { data, error } = await supabase
    .from("experiment_participants")
    .select("*")
    .eq("experiment_id", experimentId)
    .eq("status", "pending")
    .eq("source", "requested_by_user")
    .order("requested_at", { ascending: true });

  if (error) {
    console.error("Error fetching access requests:", error);
    throw new Error(
      `Failed to fetch access requests: ${error.message || "Unknown error"}`
    );
  }

  const requests = (data as ExperimentParticipant[]) || [];
  if (requests.length === 0) {
    return [];
  }

  const requesterIds = [...new Set(requests.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", requesterIds);

  const profileList = (profiles as Profile[]) || [];

  return requests.map((r) => ({
    ...r,
    requester: profileList.find((p) => p.id === r.user_id),
  }));
}

/**
 * 5. Approve an access request. UPDATE status='approved', resolved_by,
 *    resolved_at. Owner-only (validated here + RLS
 *    experiment_participants_update_owner). The notify_access_resolution
 *    trigger fires in the same statement, notifying the requester.
 */
export async function approveAccessRequest(
  participantId: string,
  approvedBy: string
): Promise<ExperimentParticipant> {
  const { participant } = await requireOwnedParticipant(participantId);

  if (participant.status !== "pending") {
    throw new Error(
      `This request has already been ${participant.status}`
    );
  }

  const { data, error } = await ((supabase as any)
    .from("experiment_participants")
    .update({
      status: "approved",
      resolved_by: approvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", participantId)
    .eq("status", "pending")
    .select()
    .single() as any);

  if (error) {
    console.error("Error approving access request:", error);
    throw new Error(
      `Failed to approve access request: ${error.message || "Unknown error"}`
    );
  }

  if (!data) {
    throw new Error(
      "Request could not be approved (already resolved or not permitted)"
    );
  }

  return data as ExperimentParticipant;
}

/**
 * 6. Reject an access request. UPDATE status='rejected', resolved_by,
 *    resolved_at. Owner-only (validated here + RLS). The
 *    notify_access_resolution trigger fires in the same statement.
 */
export async function rejectAccessRequest(
  participantId: string,
  rejectedBy: string
): Promise<ExperimentParticipant> {
  const { participant } = await requireOwnedParticipant(participantId);

  if (participant.status !== "pending") {
    throw new Error(
      `This request has already been ${participant.status}`
    );
  }

  const { data, error } = await ((supabase as any)
    .from("experiment_participants")
    .update({
      status: "rejected",
      resolved_by: rejectedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", participantId)
    .eq("status", "pending")
    .select()
    .single() as any);

  if (error) {
    console.error("Error rejecting access request:", error);
    throw new Error(
      `Failed to reject access request: ${error.message || "Unknown error"}`
    );
  }

  if (!data) {
    throw new Error(
      "Request could not be rejected (already resolved or not permitted)"
    );
  }

  return data as ExperimentParticipant;
}

/**
 * 7. Trigger the access-request email for a just-created request. The in-app
 *    notification row is already created atomically by the notify_access_request
 *    DB trigger, and the notifications webhook is the primary path to the
 *    send-email Edge Function. This function additionally invokes send-email
 *    directly with a fully-formed payload so delivery is guaranteed even when
 *    the webhook is not configured. It never throws on email failure — email is
 *    best-effort and must not roll back the (already-committed) request.
 *
 *    Returns true if the Edge Function accepted the payload, false otherwise.
 */
export async function notifyAccessRequest(
  participantId: string,
  experimentId: string,
  requesterEmail: string,
  ownerEmail: string
): Promise<boolean> {
  const payload: SendEmailPayload = {
    template: "access_request",
    to: ownerEmail,
    data: {
      participant_id: participantId,
      experiment_id: experimentId,
      requester_email: requesterEmail,
      owner_email: ownerEmail,
    },
  };

  try {
    const { error } = await supabase.functions.invoke("send-email", {
      body: payload,
    });

    if (error) {
      // Do not throw: the request itself succeeded and the DB webhook may still
      // deliver the email. Surface as a soft failure for observability.
      console.error("send-email Edge Function returned an error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to invoke send-email Edge Function:", err);
    return false;
  }
}

/**
 * 8. List the given user's unread notifications, newest first, enriched with
 *    the related experiment (id/title/status). RLS (notifications_select)
 *    restricts rows to auth.uid() = user_id.
 */
export async function getNotifications(
  userId: string
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    throw new Error(
      `Failed to fetch notifications: ${error.message || "Unknown error"}`
    );
  }

  const rows = (data as NotificationRow[]) || [];
  if (rows.length === 0) {
    return [];
  }

  const experimentIds = [
    ...new Set(
      rows
        .map((n) => n.related_experiment_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let experiments: Pick<Experiment, "id" | "title" | "status">[] = [];
  if (experimentIds.length > 0) {
    const { data: exps } = await supabase
      .from("experiments")
      .select("id, title, status")
      .in("id", experimentIds);
    experiments =
      (exps as Pick<Experiment, "id" | "title" | "status">[]) || [];
  }

  return rows.map((n) => ({
    ...n,
    payload: n.payload as unknown as NotificationPayload,
    experiment: n.related_experiment_id
      ? experiments.find((e) => e.id === n.related_experiment_id)
      : undefined,
  }));
}

/**
 * 9. Mark a notification as read. RLS (notifications_update) restricts this to
 *    the notification's own user.
 */
export async function markNotificationRead(
  notificationId: string
): Promise<NotificationRow> {
  const { data, error } = await ((supabase as any)
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .select()
    .single() as any);

  if (error) {
    console.error("Error marking notification read:", error);
    throw new Error(
      `Failed to mark notification as read: ${
        error.message || "Unknown error"
      }`
    );
  }

  if (!data) {
    throw new Error(
      "Notification not found or not permitted"
    );
  }

  return data as NotificationRow;
}
