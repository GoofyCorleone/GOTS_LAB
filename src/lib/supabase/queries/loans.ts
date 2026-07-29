import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const supabase = createSupabaseClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type GroupProfessor = Database["public"]["Tables"]["group_professors"]["Row"];
export type LoanRequest = Database["public"]["Tables"]["loan_requests"]["Row"];
export type LoanRequestItem = Database["public"]["Tables"]["loan_request_items"]["Row"];
export type LoanLegalAcceptance = Database["public"]["Tables"]["loan_legal_acceptance"]["Row"];
export type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];

export type LoanStatus = LoanRequest["status"];

/** A single item to request, before it becomes a loan_request_items row. */
export interface LoanCartItem {
  inventory_item_id: string;
  quantity: number;
}

export interface LoanRequestItemWithDetails extends LoanRequestItem {
  inventory_item?: InventoryItem;
}

/** Loan list card shape: enough to render LoanCard without a second round-trip. */
export interface LoanRequestSummary extends LoanRequest {
  requester?: Profile;
  professor?: GroupProfessor;
  items_count: number;
}

/** Full loan detail view. */
export interface LoanRequestWithDetails extends LoanRequest {
  requester?: Profile;
  professor?: GroupProfessor;
  items: LoanRequestItemWithDetails[];
  legal_acceptance?: LoanLegalAcceptance;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function requireUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user;
}

/** Fetch a loan and assert the current user is the professor it was requested
 *  from (via group_professors.profile_id). RLS is the source of truth; this
 *  adds a friendly error. */
async function requireLendingProfessor(loanId: string): Promise<LoanRequest> {
  const user = await requireUser();

  const { data: loan, error } = await supabase
    .from("loan_requests")
    .select("*")
    .eq("id", loanId)
    .single();

  if (error || !loan) {
    throw new Error(`Préstamo no encontrado: ${error?.message || "not found"}`);
  }

  const { data: professor } = await supabase
    .from("group_professors")
    .select("id, profile_id")
    .eq("id", (loan as LoanRequest).professor_id)
    .single();

  if (!professor || (professor as any).profile_id !== user.id) {
    throw new Error("Solo el profesor puede resolver esta solicitud");
  }

  return loan as LoanRequest;
}

/** Fetch a loan and assert the current user is the original requester. */
async function requireLoanRequester(loanId: string): Promise<LoanRequest> {
  const user = await requireUser();

  const { data: loan, error } = await supabase
    .from("loan_requests")
    .select("*")
    .eq("id", loanId)
    .single();

  if (error || !loan) {
    throw new Error(`Préstamo no encontrado: ${error?.message || "not found"}`);
  }

  if ((loan as LoanRequest).requester_id !== user.id) {
    throw new Error("Solo quien solicitó el préstamo puede hacer esto");
  }

  return loan as LoanRequest;
}

// ---------------------------------------------------------------------------
// Professors
// ---------------------------------------------------------------------------

export async function getGroupProfessors(): Promise<GroupProfessor[]> {
  const { data, error } = await supabase
    .from("group_professors")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching professors:", error);
    throw new Error(`Failed to fetch professors: ${error.message || "Unknown error"}`);
  }

  return (data as GroupProfessor[]) || [];
}

// ---------------------------------------------------------------------------
// Submit a loan request
// ---------------------------------------------------------------------------

export interface SubmitLoanRequestInput {
  professorId: string;
  items: LoanCartItem[];
  purposeDescription: string;
  usageStart: string; // ISO datetime
  usageEnd: string; // ISO datetime
}

/**
 * Create a loan request: loan_requests -> loan_request_items -> (last)
 * loan_legal_acceptance. Mirrors the experiment wizard's sequential-insert +
 * best-effort-rollback pattern (no single-RPC transaction elsewhere in this
 * codebase either). The concurrency-safe stock check happens per-item inside
 * the loan_request_items INSERT trigger. legal_acceptance is inserted last on
 * purpose: it is immutable (no UPDATE/DELETE, ever), so a failure that needs
 * to roll back the whole request must happen *before* it exists.
 */
export async function submitLoanRequest(
  input: SubmitLoanRequestInput
): Promise<LoanRequest> {
  if (input.items.length === 0) {
    throw new Error("Selecciona al menos un equipo para solicitar");
  }

  const user = await requireUser();

  const { data: loan, error: loanError } = await (supabase
    .from("loan_requests")
    .insert({
      requester_id: user.id,
      professor_id: input.professorId,
      purpose_description: input.purposeDescription.trim(),
      usage_start: input.usageStart,
      usage_end: input.usageEnd,
      status: "pending",
    } as any)
    .select()
    .single() as any);

  if (loanError || !loan) {
    console.error("Error creating loan request:", loanError);
    throw new Error(
      `No se pudo crear la solicitud: ${loanError?.message || "error desconocido"}`
    );
  }

  const createdLoan = loan as LoanRequest;

  try {
    const itemRows = input.items.map((item) => ({
      loan_request_id: createdLoan.id,
      inventory_item_id: item.inventory_item_id,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await (supabase
      .from("loan_request_items")
      .insert(itemRows as any) as any);

    if (itemsError) {
      if (
        itemsError.message?.includes("Insufficient inventory") ||
        itemsError.message?.includes("Available:")
      ) {
        throw new Error(itemsError.message);
      }
      throw new Error(
        `No se pudieron reservar los equipos: ${itemsError.message || "error desconocido"}`
      );
    }

    const { error: legalError } = await (supabase
      .from("loan_legal_acceptance")
      .insert({
        loan_request_id: createdLoan.id,
        accepted_by: user.id,
        policy_version: "1.0",
      } as any) as any);

    if (legalError) {
      throw new Error(
        `No se pudo registrar la aceptación legal: ${legalError.message || "error desconocido"}`
      );
    }
  } catch (err) {
    try {
      await supabase.from("loan_requests").delete().eq("id", createdLoan.id);
    } catch (cleanupErr) {
      console.error("Rollback failed for loan request", createdLoan.id, cleanupErr);
    }
    throw err;
  }

  return createdLoan;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function enrichLoans(loans: LoanRequest[]): Promise<LoanRequestSummary[]> {
  if (loans.length === 0) return [];

  const requesterIds = [...new Set(loans.map((l) => l.requester_id))];
  const professorIds = [...new Set(loans.map((l) => l.professor_id))];
  const loanIds = loans.map((l) => l.id);

  const [requestersRes, professorsRes, itemsRes] = await Promise.all([
    supabase.from("profiles").select("*").in("id", requesterIds),
    supabase.from("group_professors").select("*").in("id", professorIds),
    supabase.from("loan_request_items").select("loan_request_id").in("loan_request_id", loanIds),
  ]);

  const requesters = (requestersRes.data as Profile[]) || [];
  const professors = (professorsRes.data as GroupProfessor[]) || [];
  const itemRows = (itemsRes.data as { loan_request_id: string }[]) || [];

  const counts = new Map<string, number>();
  for (const row of itemRows) {
    counts.set(row.loan_request_id, (counts.get(row.loan_request_id) || 0) + 1);
  }

  return loans.map((l) => ({
    ...l,
    requester: requesters.find((r) => r.id === l.requester_id),
    professor: professors.find((p) => p.id === l.professor_id),
    items_count: counts.get(l.id) || 0,
  }));
}

/** Every loan visible to the current viewer — RLS already restricts external
 *  accounts to only their own requests, UIS accounts see everything. */
export async function getLoanRequests(): Promise<LoanRequestSummary[]> {
  const { data, error } = await supabase
    .from("loan_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching loan requests:", error);
    throw new Error(`Failed to fetch loan requests: ${error.message || "Unknown error"}`);
  }

  return enrichLoans((data as LoanRequest[]) || []);
}

export async function getLoanRequestById(id: string): Promise<LoanRequestWithDetails> {
  const { data: loan, error } = await supabase
    .from("loan_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !loan) {
    throw new Error(`Failed to fetch loan request: ${error?.message || "not found"}`);
  }

  const l = loan as LoanRequest;

  const [requesterRes, professorRes, itemsRes, legalRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", l.requester_id).single(),
    supabase.from("group_professors").select("*").eq("id", l.professor_id).single(),
    supabase.from("loan_request_items").select("*").eq("loan_request_id", id),
    supabase.from("loan_legal_acceptance").select("*").eq("loan_request_id", id).maybeSingle(),
  ]);

  const rawItems = (itemsRes.data as LoanRequestItem[]) || [];
  const inventoryIds = [...new Set(rawItems.map((it) => it.inventory_item_id))];

  let inventoryItems: InventoryItem[] = [];
  if (inventoryIds.length > 0) {
    const { data: inv } = await supabase
      .from("inventory_items")
      .select("*")
      .in("id", inventoryIds);
    inventoryItems = (inv as InventoryItem[]) || [];
  }

  const items: LoanRequestItemWithDetails[] = rawItems.map((it) => ({
    ...it,
    inventory_item: inventoryItems.find((i) => i.id === it.inventory_item_id),
  }));

  return {
    ...l,
    requester: (requesterRes.data as Profile) || undefined,
    professor: (professorRes.data as GroupProfessor) || undefined,
    items,
    legal_acceptance: (legalRes.data as LoanLegalAcceptance) || undefined,
  };
}

// ---------------------------------------------------------------------------
// Professor actions
// ---------------------------------------------------------------------------

export async function decideLoanRequest(
  loanId: string,
  decision: "approved" | "rejected",
  rejectionReason?: string
): Promise<LoanRequest> {
  const loan = await requireLendingProfessor(loanId);
  const user = await requireUser();

  if (loan.status !== "pending") {
    throw new Error(`Esta solicitud ya fue ${loan.status}`);
  }

  const { data, error } = await ((supabase as any)
    .from("loan_requests")
    .update({
      status: decision,
      decided_at: new Date().toISOString(),
      decided_by: user.id,
      rejection_reason: decision === "rejected" ? rejectionReason?.trim() || null : null,
    })
    .eq("id", loanId)
    .eq("status", "pending")
    .select()
    .single() as any);

  if (error || !data) {
    console.error("Error deciding loan request:", error);
    throw new Error(
      `No se pudo ${decision === "approved" ? "aprobar" : "rechazar"} la solicitud: ${
        error?.message || "no permitido"
      }`
    );
  }

  return data as LoanRequest;
}

/** Professor approves (usage_end -> requested_new_usage_end, status back to
 *  'approved') or rejects (fields simply clear, status unchanged) a pending
 *  extension request. */
export async function resolveLoanExtension(
  loanId: string,
  approve: boolean
): Promise<LoanRequest> {
  const loan = await requireLendingProfessor(loanId);

  if (!loan.requested_new_usage_end) {
    throw new Error("Este préstamo no tiene una extensión pendiente");
  }

  const update = approve
    ? { usage_end: loan.requested_new_usage_end, status: "approved", requested_new_usage_end: null }
    : { requested_new_usage_end: null };

  const { data, error } = await ((supabase as any)
    .from("loan_requests")
    .update(update)
    .eq("id", loanId)
    .select()
    .single() as any);

  if (error || !data) {
    console.error("Error resolving loan extension:", error);
    throw new Error(
      `No se pudo resolver la extensión: ${error?.message || "no permitido"}`
    );
  }

  return data as LoanRequest;
}

// ---------------------------------------------------------------------------
// Requester actions
// ---------------------------------------------------------------------------

export async function requestLoanExtension(
  loanId: string,
  newUsageEnd: string
): Promise<LoanRequest> {
  const loan = await requireLoanRequester(loanId);

  if (loan.status !== "approved" && loan.status !== "overdue") {
    throw new Error("Solo se puede pedir extensión de un préstamo aprobado o vencido");
  }

  const { data, error } = await ((supabase as any)
    .from("loan_requests")
    .update({ requested_new_usage_end: newUsageEnd })
    .eq("id", loanId)
    .select()
    .single() as any);

  if (error || !data) {
    console.error("Error requesting loan extension:", error);
    throw new Error(
      `No se pudo solicitar la extensión: ${error?.message || "no permitido"}`
    );
  }

  return data as LoanRequest;
}

export async function markLoanReturned(loanId: string): Promise<LoanRequest> {
  const loan = await requireLoanRequester(loanId);

  if (loan.status !== "approved" && loan.status !== "overdue") {
    throw new Error("Solo se puede marcar como devuelto un préstamo aprobado o vencido");
  }

  const { data, error } = await ((supabase as any)
    .from("loan_requests")
    .update({ status: "returned", returned_at: new Date().toISOString() })
    .eq("id", loanId)
    .select()
    .single() as any);

  if (error || !data) {
    console.error("Error marking loan returned:", error);
    throw new Error(
      `No se pudo marcar como devuelto: ${error?.message || "no permitido"}`
    );
  }

  return data as LoanRequest;
}

/**
 * Ask the DB to flag any loan whose usage_end has passed as 'overdue', and
 * any 'overdue' loan past its 3-day grace period as 'lost_stolen'. Same
 * no-cron pattern as closeOverdueSessions — called opportunistically when the
 * loans module loads.
 */
export async function closeOverdueLoans(): Promise<number> {
  const { data, error } = await (supabase.rpc("close_overdue_loans") as any);
  if (error) {
    console.error("Error closing overdue loans:", error);
    return 0;
  }
  return (data as number) ?? 0;
}

// ---------------------------------------------------------------------------
// Email (belt-and-suspenders direct invoke, same pattern as
// notifyAccessRequest in participants.ts — the DB webhook on notifications
// INSERT is primary, this guarantees delivery even if it's misconfigured).
// ---------------------------------------------------------------------------

async function sendLoanEmail(
  template: string,
  to: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke("send-email", {
      body: { template, to, data },
    });
    if (error) {
      console.error("send-email Edge Function returned an error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to invoke send-email Edge Function:", err);
    return false;
  }
}

export async function notifyLoanRequest(
  loanId: string,
  professorEmail: string,
  requesterFullName: string
): Promise<boolean> {
  return sendLoanEmail("loan_request", professorEmail, {
    loan_request_id: loanId,
    requester_full_name: requesterFullName,
  });
}

export async function notifyLoanDecision(
  loanId: string,
  requesterEmail: string,
  decision: "approved" | "rejected"
): Promise<boolean> {
  return sendLoanEmail(decision === "approved" ? "loan_approved" : "loan_rejected", requesterEmail, {
    loan_request_id: loanId,
  });
}
