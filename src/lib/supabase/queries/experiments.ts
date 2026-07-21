import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const supabase = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Experiment = Database["public"]["Tables"]["experiments"]["Row"];
export type ExperimentParticipant =
  Database["public"]["Tables"]["experiment_participants"]["Row"];
export type ExperimentItem =
  Database["public"]["Tables"]["experiment_items"]["Row"];
export type ExperimentItemShare =
  Database["public"]["Tables"]["experiment_item_shares"]["Row"];
export type ExperimentSession =
  Database["public"]["Tables"]["experiment_sessions"]["Row"];
export type ExperimentLegalAcceptance =
  Database["public"]["Tables"]["experiment_legal_acceptance"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type InventoryItem =
  Database["public"]["Tables"]["inventory_items"]["Row"];

// ---------------------------------------------------------------------------
// Phase 4 composite types
// ---------------------------------------------------------------------------

/** A reserved experiment item enriched with its inventory + location + live
 *  availability (available/reserved computed from get_inventory_availability). */
export interface ExperimentItemWithDetails extends ExperimentItem {
  inventory_item?: InventoryItem;
  location?: Location;
  quantity_total?: number;
  quantity_reserved?: number;
  quantity_available?: number;
}

/** An experiment participant enriched with its profile. */
export interface ExperimentParticipantWithProfile extends ExperimentParticipant {
  profile?: Profile;
}

/** Full aggregate view of an experiment: sessions + items + participants +
 *  owner/creator profiles + derived session state. */
export interface ExperimentWithDetails extends Experiment {
  owner?: Profile;
  creator?: Profile;
  sessions: ExperimentSession[];
  items: ExperimentItemWithDetails[];
  participants: ExperimentParticipantWithProfile[];
  /** The single currently-open session (ended_at_actual is null), if any. */
  active_session: ExperimentSession | null;
  /** True while a session is open — blocks new sessions and finishing. */
  has_open_session: boolean;
}

/** Grouped experiment lists for an owner. */
export interface ExperimentsByOwner {
  active: Experiment[];
  finished: Experiment[];
}

/** An experiment enriched with its active item count, for list cards. */
export interface ExperimentWithStats extends Experiment {
  items_count: number;
}

/** A single item to add to an experiment (Phase 4 add-equipment flow). */
export interface NewExperimentItem {
  inventory_item_id: string;
  quantity: number;
  sharing_mode: "individual" | "compartido";
}

// ---------------------------------------------------------------------------
// Phase 4 internal helpers
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

/** Fetch an experiment and assert the current user is its owner. Returns the
 *  experiment row. RLS is the source of truth; this adds friendly errors. */
async function requireOwnedExperiment(experimentId: string) {
  const user = await requireUser();

  const { data: experiment, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", experimentId)
    .single();

  if (error || !experiment) {
    throw new Error(
      `Experiment not found or access denied: ${error?.message || "not found"}`
    );
  }

  if ((experiment as Experiment).owner_id !== user.id) {
    throw new Error("Only the experiment owner can perform this action");
  }

  return experiment as Experiment;
}

/** Load the live availability map (inventory_item_id -> availability row). */
async function fetchAvailabilityMap() {
  const { data, error } = await (supabase.rpc(
    "get_inventory_availability"
  ) as any);

  if (error) {
    console.error("Error fetching availability:", error);
    return new Map<string, any>();
  }

  const map = new Map<string, any>();
  for (const row of (data as any[]) || []) {
    map.set(row.inventory_item_id, row);
  }
  return map;
}

/**
 * Get all profiles (users) for selection
 */
export async function getAllProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching profiles:", error);
    throw new Error(
      `Failed to fetch profiles: ${error.message || "Unknown error"}`
    );
  }

  return (data as Profile[]) || [];
}

/**
 * Get current user's profile
 */
export async function getCurrentProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching current profile:", error);
    throw new Error(
      `Failed to fetch current profile: ${error.message || "Unknown error"}`
    );
  }

  return data as Profile;
}

/**
 * Create a new experiment (status = draft)
 */
export async function createExperiment(data: {
  title: string;
  owner_id: string;
  fecha_inicio?: string;
  fecha_fin_tentativa?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data: experiment, error } = await (supabase
    .from("experiments")
    .insert({
      title: data.title,
      owner_id: data.owner_id,
      created_by: user.id,
      status: "draft",
      fecha_inicio: data.fecha_inicio,
      fecha_fin_tentativa: data.fecha_fin_tentativa,
    } as any)
    .select()
    .single() as any);

  if (error) {
    console.error("Error creating experiment:", error);
    throw new Error(
      `Failed to create experiment: ${error.message || "Unknown error"}`
    );
  }

  return experiment as Experiment;
}

/**
 * Create legal acceptance record (IMMUTABLE)
 */
export async function createLegalAcceptance(data: {
  experiment_id: string;
  accepted_by: string;
}) {
  const { data: acceptance, error } = await (supabase
    .from("experiment_legal_acceptance")
    .insert({
      experiment_id: data.experiment_id,
      accepted_by: data.accepted_by,
      policy_version: "1.0",
    } as any)
    .select()
    .single() as any);

  if (error) {
    console.error("Error creating legal acceptance:", error);
    throw new Error(
      `Failed to create legal acceptance: ${error.message || "Unknown error"}`
    );
  }

  return acceptance as ExperimentLegalAcceptance;
}

/**
 * Add experiment participants (companions)
 */
export async function addExperimentParticipants(data: {
  experiment_id: string;
  user_ids: string[];
}) {
  if (data.user_ids.length === 0) {
    return [];
  }

  const participants = data.user_ids.map((user_id) => ({
    experiment_id: data.experiment_id,
    user_id,
    status: "approved" as const,
    source: "invited_by_owner" as const,
  }));

  const { data: results, error } = await (supabase
    .from("experiment_participants")
    .insert(participants as any)
    .select() as any);

  if (error) {
    console.error("Error adding participants:", error);
    throw new Error(
      `Failed to add participants: ${error.message || "Unknown error"}`
    );
  }

  return (results as ExperimentParticipant[]) || [];
}

export interface CartItem {
  inventory_item_id: string;
  quantity: number;
  sharing_mode: "individual" | "compartido";
  shared_with_user_id?: string;
}

/**
 * Create experiment items (from cart)
 */
export async function createExperimentItems(data: {
  experiment_id: string;
  items: CartItem[];
  added_by: string;
}) {
  if (data.items.length === 0) {
    return [];
  }

  const experimentItems = data.items.map((item) => ({
    experiment_id: data.experiment_id,
    inventory_item_id: item.inventory_item_id,
    quantity: item.quantity,
    sharing_mode: item.sharing_mode,
    added_by: data.added_by,
  }));

  const { data: results, error } = await (supabase
    .from("experiment_items")
    .insert(experimentItems as any)
    .select() as any);

  if (error) {
    console.error("Error creating experiment items:", error);
    throw new Error(
      `Failed to create experiment items: ${error.message || "Unknown error"}`
    );
  }

  return (results as ExperimentItem[]) || [];
}

/**
 * Create experiment item shares (if items are compartido)
 */
export async function createExperimentItemShares(data: {
  experiment_items: ExperimentItem[];
  shares: Map<string, string>; // experiment_item_id -> user_id
}) {
  const sharesToInsert = Array.from(data.shares.entries()).map(
    ([experiment_item_id, user_id]) => ({
      experiment_item_id,
      user_id,
    })
  );

  if (sharesToInsert.length === 0) {
    return [];
  }

  const { data: results, error } = await (supabase
    .from("experiment_item_shares")
    .insert(sharesToInsert as any)
    .select() as any);

  if (error) {
    console.error("Error creating item shares:", error);
    throw new Error(
      `Failed to create item shares: ${error.message || "Unknown error"}`
    );
  }

  return (results as ExperimentItemShare[]) || [];
}

/**
 * Create experiment session
 */
export async function createExperimentSession(data: {
  experiment_id: string;
  started_at: string; // ISO datetime
  ended_at_planned: string; // ISO datetime
  created_by: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Convert date strings to ISO timestamps
  const startedAt = new Date(data.started_at).toISOString();
  const endedAtPlanned = new Date(data.ended_at_planned).toISOString();

  // Validate that end >= start
  if (new Date(endedAtPlanned) < new Date(startedAt)) {
    throw new Error("Session end time must be after start time");
  }

  const { data: session, error } = await (supabase
    .from("experiment_sessions")
    .insert({
      experiment_id: data.experiment_id,
      started_at: startedAt,
      ended_at_planned: endedAtPlanned,
      created_by: user.id,
    } as any)
    .select()
    .single() as any);

  if (error) {
    console.error("Error creating experiment session:", error);
    throw new Error(
      `Failed to create experiment session: ${error.message || "Unknown error"}`
    );
  }

  return session as ExperimentSession;
}

/**
 * Update experiment status to in_progress
 */
export async function startExperiment(experiment_id: string) {
  const { data: experiment, error } = await ((supabase as any)
    .from("experiments")
    .update({ status: "in_progress" })
    .eq("id", experiment_id)
    .select()
    .single() as any);

  if (error) {
    console.error("Error starting experiment:", error);
    throw new Error(
      `Failed to start experiment: ${error.message || "Unknown error"}`
    );
  }

  return experiment as Experiment;
}

/**
 * Get experiment by ID
 */
export async function getExperiment(id: string) {
  const { data: experiment, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching experiment:", error);
    throw new Error(
      `Failed to fetch experiment: ${error.message || "Unknown error"}`
    );
  }

  return experiment as Experiment;
}

// ===========================================================================
// PHASE 4 — Continue Experiment (multiple sessions)
// ===========================================================================

/**
 * Get a full experiment aggregate: experiment + sessions + items (with
 * inventory + location + live availability) + participants (with profiles) +
 * owner/creator profiles. RLS restricts this to owner / creator / approved
 * participants.
 */
export async function getExperimentById(
  id: string
): Promise<ExperimentWithDetails> {
  // 1. Base experiment (single round-trip; RLS enforces access).
  const { data: experiment, error: expError } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", id)
    .single();

  if (expError || !experiment) {
    console.error("Error fetching experiment:", expError);
    throw new Error(
      `Failed to fetch experiment: ${expError?.message || "not found"}`
    );
  }

  const exp = experiment as Experiment;

  // 2. Fetch related rows in parallel.
  const [
    sessionsRes,
    itemsRes,
    participantsRes,
    availabilityMap,
  ] = await Promise.all([
    supabase
      .from("experiment_sessions")
      .select("*")
      .eq("experiment_id", id)
      .order("started_at", { ascending: true }),
    supabase
      .from("experiment_items")
      .select("*")
      .eq("experiment_id", id)
      .order("reserved_at", { ascending: true }),
    supabase
      .from("experiment_participants")
      .select("*")
      .eq("experiment_id", id),
    fetchAvailabilityMap(),
  ]);

  if (sessionsRes.error) {
    throw new Error(
      `Failed to fetch sessions: ${sessionsRes.error.message || "Unknown error"}`
    );
  }
  if (itemsRes.error) {
    throw new Error(
      `Failed to fetch items: ${itemsRes.error.message || "Unknown error"}`
    );
  }
  if (participantsRes.error) {
    throw new Error(
      `Failed to fetch participants: ${
        participantsRes.error.message || "Unknown error"
      }`
    );
  }

  const sessions = (sessionsRes.data as ExperimentSession[]) || [];
  const rawItems = (itemsRes.data as ExperimentItem[]) || [];
  const rawParticipants =
    (participantsRes.data as ExperimentParticipant[]) || [];

  // 3. Enrich items with inventory_items + locations.
  const inventoryIds = [
    ...new Set(rawItems.map((it) => it.inventory_item_id)),
  ];
  let inventoryItems: InventoryItem[] = [];
  let locations: Location[] = [];

  if (inventoryIds.length > 0) {
    const { data: inv } = await supabase
      .from("inventory_items")
      .select("*")
      .in("id", inventoryIds);
    inventoryItems = (inv as InventoryItem[]) || [];

    const locationIds = [
      ...new Set(inventoryItems.map((i) => i.location_id)),
    ];
    if (locationIds.length > 0) {
      const { data: locs } = await supabase
        .from("locations")
        .select("*")
        .in("id", locationIds);
      locations = (locs as Location[]) || [];
    }
  }

  const items: ExperimentItemWithDetails[] = rawItems.map((it) => {
    const inventory_item = inventoryItems.find(
      (i) => i.id === it.inventory_item_id
    );
    const location = inventory_item
      ? locations.find((l) => l.id === inventory_item.location_id)
      : undefined;
    const avail = availabilityMap.get(it.inventory_item_id);
    return {
      ...it,
      inventory_item,
      location,
      quantity_total: avail?.quantity_total ?? inventory_item?.quantity_total,
      quantity_reserved: avail?.quantity_reserved ?? 0,
      quantity_available:
        avail?.quantity_available ?? inventory_item?.quantity_total,
    };
  });

  // 4. Enrich participants + resolve owner/creator profiles.
  const profileIds = [
    ...new Set([
      exp.owner_id,
      exp.created_by,
      ...rawParticipants.map((p) => p.user_id),
    ]),
  ];
  let profiles: Profile[] = [];
  if (profileIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("*")
      .in("id", profileIds);
    profiles = (profs as Profile[]) || [];
  }

  const participants: ExperimentParticipantWithProfile[] = rawParticipants.map(
    (p) => ({
      ...p,
      profile: profiles.find((pr) => pr.id === p.user_id),
    })
  );

  const active_session =
    sessions.find((s) => s.ended_at_actual === null) || null;

  return {
    ...exp,
    owner: profiles.find((pr) => pr.id === exp.owner_id),
    creator: profiles.find((pr) => pr.id === exp.created_by),
    sessions,
    items,
    participants,
    active_session,
    has_open_session: active_session !== null,
  };
}

/**
 * Get all experiments owned by a user, split into active (draft/in_progress)
 * and finished (finished/cancelled) buckets, newest first.
 */
export async function getExperimentsByOwner(
  userId: string
): Promise<ExperimentsByOwner> {
  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching experiments by owner:", error);
    throw new Error(
      `Failed to fetch experiments: ${error.message || "Unknown error"}`
    );
  }

  const all = (data as Experiment[]) || [];
  return {
    active: all.filter(
      (e) => e.status === "draft" || e.status === "in_progress"
    ),
    finished: all.filter(
      (e) => e.status === "finished" || e.status === "cancelled"
    ),
  };
}

/**
 * Update an experiment's planned dates. Owner-only (enforced here + by RLS).
 */
export async function updateExperimentDates(
  id: string,
  fecha_inicio: string | null,
  fecha_fin_tentativa: string | null
): Promise<Experiment> {
  await requireOwnedExperiment(id);

  const { data, error } = await ((supabase as any)
    .from("experiments")
    .update({
      fecha_inicio,
      fecha_fin_tentativa,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single() as any);

  if (error) {
    console.error("Error updating experiment dates:", error);
    throw new Error(
      `Failed to update experiment dates: ${error.message || "Unknown error"}`
    );
  }

  return data as Experiment;
}

/**
 * Add one or more items to an existing experiment (Phase 4 add-equipment).
 * Owner-only. The DB availability trigger rejects the batch if any item would
 * exceed stock (availability = 0); that error is surfaced to the caller.
 */
export async function addExperimentItems(
  experimentId: string,
  items: NewExperimentItem[]
): Promise<ExperimentItem[]> {
  if (items.length === 0) {
    return [];
  }

  const experiment = await requireOwnedExperiment(experimentId);

  if (experiment.status !== "in_progress" && experiment.status !== "draft") {
    throw new Error(
      `Cannot add items to an experiment with status '${experiment.status}'`
    );
  }

  const user = await requireUser();

  const rows = items.map((item) => ({
    experiment_id: experimentId,
    inventory_item_id: item.inventory_item_id,
    quantity: item.quantity,
    sharing_mode: item.sharing_mode,
    added_by: user.id,
  }));

  const { data, error } = await (supabase
    .from("experiment_items")
    .insert(rows as any)
    .select() as any);

  if (error) {
    console.error("Error adding experiment items:", error);
    // Surface the availability trigger message verbatim when present.
    if (
      error.message?.includes("Insufficient inventory") ||
      error.message?.includes("Available:")
    ) {
      throw new Error(error.message);
    }
    if (error.code === "23505") {
      throw new Error(
        "One or more items are already reserved in this experiment"
      );
    }
    throw new Error(
      `Failed to add items: ${error.message || "Unknown error"}`
    );
  }

  return (data as ExperimentItem[]) || [];
}

/**
 * Remove a reserved item from an experiment. Only items with status='active'
 * may be removed; returned items are historical. Owner-only (RLS delete policy
 * added in the Phase 4 migration also enforces this).
 */
export async function removeExperimentItem(itemId: string): Promise<void> {
  await requireUser();

  // Verify the item exists and is still active before deleting, so we can
  // give a precise error instead of a silent 0-row delete.
  const { data: item, error: fetchError } = await supabase
    .from("experiment_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (fetchError || !item) {
    throw new Error(
      `Item not found or access denied: ${fetchError?.message || "not found"}`
    );
  }

  if ((item as ExperimentItem).status !== "active") {
    throw new Error("Only active items can be removed");
  }

  // Owner check (defense in depth; RLS delete policy also enforces it).
  await requireOwnedExperiment((item as ExperimentItem).experiment_id);

  const { error, count } = await (supabase
    .from("experiment_items")
    .delete({ count: "exact" })
    .eq("id", itemId)
    .eq("status", "active") as any);

  if (error) {
    console.error("Error removing experiment item:", error);
    throw new Error(
      `Failed to remove item: ${error.message || "Unknown error"}`
    );
  }

  if (count === 0) {
    throw new Error(
      "Item could not be removed (not active, or not permitted by policy)"
    );
  }
}

/**
 * Open a new session for an experiment (Phase 4 continue). Validates the
 * experiment is in_progress and that there is no still-open session (a DB
 * trigger also enforces this atomically). Owner-only.
 */
export async function createNewSession(
  experimentId: string,
  started_at: string,
  ended_at_planned: string
): Promise<ExperimentSession> {
  const experiment = await requireOwnedExperiment(experimentId);
  const user = await requireUser();

  if (experiment.status !== "in_progress") {
    throw new Error(
      `Cannot open a session for an experiment with status '${experiment.status}'`
    );
  }

  const startedAt = new Date(started_at).toISOString();
  const endedAtPlanned = new Date(ended_at_planned).toISOString();

  if (new Date(endedAtPlanned) < new Date(startedAt)) {
    throw new Error("Session end time must be after start time");
  }

  // Pre-check for a friendly error (the DB trigger is the atomic guarantee).
  const { data: openSessions, error: checkError } = await supabase
    .from("experiment_sessions")
    .select("id")
    .eq("experiment_id", experimentId)
    .is("ended_at_actual", null);

  if (checkError) {
    throw new Error(
      `Failed to validate sessions: ${checkError.message || "Unknown error"}`
    );
  }

  if ((openSessions?.length || 0) > 0) {
    throw new Error(
      "Cannot open a new session while a previous session is still open. Close it first."
    );
  }

  const { data: session, error } = await (supabase
    .from("experiment_sessions")
    .insert({
      experiment_id: experimentId,
      started_at: startedAt,
      ended_at_planned: endedAtPlanned,
      created_by: user.id,
    } as any)
    .select()
    .single() as any);

  if (error) {
    console.error("Error creating new session:", error);
    if (error.message?.includes("still open")) {
      throw new Error(error.message);
    }
    throw new Error(
      `Failed to create session: ${error.message || "Unknown error"}`
    );
  }

  return session as ExperimentSession;
}

/**
 * Close a session by stamping its actual end time. Defaults to now(). Owner-only
 * (via the parent experiment). Validates the session isn't already closed.
 */
export async function updateSessionEndTime(
  sessionId: string,
  ended_at_actual?: string
): Promise<ExperimentSession> {
  await requireUser();

  const { data: session, error: fetchError } = await supabase
    .from("experiment_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (fetchError || !session) {
    throw new Error(
      `Session not found or access denied: ${
        fetchError?.message || "not found"
      }`
    );
  }

  const s = session as ExperimentSession;

  // Owner check (RLS also gates this via the parent experiment).
  await requireOwnedExperiment(s.experiment_id);

  if (s.ended_at_actual !== null) {
    throw new Error("Session is already closed");
  }

  const endedAt = ended_at_actual
    ? new Date(ended_at_actual).toISOString()
    : new Date().toISOString();

  if (new Date(endedAt) < new Date(s.started_at)) {
    throw new Error("Session end time must be after its start time");
  }

  const { data, error } = await ((supabase as any)
    .from("experiment_sessions")
    .update({ ended_at_actual: endedAt })
    .eq("id", sessionId)
    .select()
    .single() as any);

  if (error) {
    console.error("Error updating session end time:", error);
    throw new Error(
      `Failed to close session: ${error.message || "Unknown error"}`
    );
  }

  return data as ExperimentSession;
}

/**
 * Finish an experiment: set status='finished' + fecha_fin_real. Inventory items
 * are released automatically by the DB trigger `free_inventory_on_finish`
 * (status -> 'returned'). Refuses to finish while any session is still open
 * (validated here for a friendly error, and enforced atomically by a DB
 * trigger). Owner-only.
 */
export async function finishExperiment(
  experimentId: string
): Promise<Experiment> {
  const experiment = await requireOwnedExperiment(experimentId);

  if (experiment.status === "finished") {
    throw new Error("Experiment is already finished");
  }
  if (experiment.status === "cancelled") {
    throw new Error("Cannot finish a cancelled experiment");
  }

  // Refuse if any session is still open (friendly pre-check).
  const { data: openSessions, error: checkError } = await supabase
    .from("experiment_sessions")
    .select("id")
    .eq("experiment_id", experimentId)
    .is("ended_at_actual", null);

  if (checkError) {
    throw new Error(
      `Failed to validate sessions: ${checkError.message || "Unknown error"}`
    );
  }

  if ((openSessions?.length || 0) > 0) {
    throw new Error(
      "Cannot finish experiment: close all open sessions first"
    );
  }

  // Atomic at the DB: the status change fires free_inventory_on_finish which
  // releases every active item, and prevent_finish_with_open_session guards it.
  const { data, error } = await ((supabase as any)
    .from("experiments")
    .update({
      status: "finished",
      fecha_fin_real: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", experimentId)
    .select()
    .single() as any);

  if (error) {
    console.error("Error finishing experiment:", error);
    if (error.message?.includes("open session")) {
      throw new Error(error.message);
    }
    throw new Error(
      `Failed to finish experiment: ${error.message || "Unknown error"}`
    );
  }

  return data as Experiment;
}

/**
 * Fetch a full experiment aggregate together with real-time availability for
 * every reserved item, computed from the get_inventory_availability RPC. Use
 * this on the "continue experiment" screen where up-to-date stock matters.
 * (getExperimentById already merges availability; this is the explicit,
 * RPC-driven variant kept as a distinct entry point for the Phase 4 UI.)
 */
export async function getExperimentWithAvailability(
  experimentId: string
): Promise<ExperimentWithDetails> {
  // getExperimentById already merges live availability via the RPC.
  return getExperimentById(experimentId);
}

/**
 * Count active (still reserved) experiment_items per experiment. Used by the
 * /experiments list page cards (Activos tab) without pulling full item details.
 */
export async function getActiveItemCounts(
  experimentIds: string[]
): Promise<Map<string, number>> {
  const ids = [...new Set(experimentIds)].filter(Boolean);
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("experiment_items")
    .select("experiment_id, status")
    .in("experiment_id", ids)
    .eq("status", "active");

  if (error) {
    console.error("Error fetching item counts:", error);
    return new Map();
  }

  const counts = new Map<string, number>();
  for (const row of (data as any[]) || []) {
    counts.set(row.experiment_id, (counts.get(row.experiment_id) || 0) + 1);
  }
  return counts;
}

export interface ExperimentItemShareWithProfile {
  user_id: string;
  profile?: Profile;
}

/**
 * Fetch who each 'compartido' experiment_item is shared with, keyed by
 * experiment_item_id. getExperimentById does not include this (it only
 * merges availability), so the Inventario tab fetches it separately.
 */
export async function getExperimentItemShares(
  experimentItemIds: string[]
): Promise<Map<string, ExperimentItemShareWithProfile[]>> {
  const ids = [...new Set(experimentItemIds)].filter(Boolean);
  const map = new Map<string, ExperimentItemShareWithProfile[]>();
  if (ids.length === 0) return map;

  const { data, error } = await (supabase
    .from("experiment_item_shares")
    .select("*, profiles(*)")
    .in("experiment_item_id", ids) as any);

  if (error) {
    console.error("Error fetching item shares:", error);
    return map;
  }

  for (const row of (data as any[]) || []) {
    const list = map.get(row.experiment_item_id) || [];
    list.push({ user_id: row.user_id, profile: row.profiles || undefined });
    map.set(row.experiment_item_id, list);
  }
  return map;
}
