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
