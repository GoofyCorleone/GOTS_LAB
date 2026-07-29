"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoanStatusBadge } from "@/components/loans/LoanStatusBadge";
import { Loader2, Package, Calendar, FileText } from "lucide-react";
import {
  getLoanRequestById,
  decideLoanRequest,
  resolveLoanExtension,
  requestLoanExtension,
  markLoanReturned,
  notifyLoanDecision,
  type LoanRequestWithDetails,
} from "@/lib/supabase/queries/loans";
import { getCurrentProfile } from "@/lib/supabase/queries/experiments";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm");
  } catch {
    return value;
  }
}

export default function LoanDetailPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loanId, setLoanId] = useState<string | null>(null);

  useEffect(() => {
    setLoanId(new URLSearchParams(window.location.search).get("id"));
  }, []);

  const [loan, setLoan] = useState<LoanRequestWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [newUsageEnd, setNewUsageEnd] = useState("");
  const [showExtensionForm, setShowExtensionForm] = useState(false);

  const load = async () => {
    if (!loanId) return;
    try {
      setLoading(true);
      const data = await getLoanRequestById(loanId);
      setLoan(data);
      const profile = await getCurrentProfile();
      setCurrentUserId(profile.id);
    } catch (err: any) {
      setError(err.message || "No se pudo cargar el préstamo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (isAuthenticated) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, loanId]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-destructive">{error || "Préstamo no encontrado"}</p>
      </div>
    );
  }

  const isRequester = currentUserId === loan.requester_id;
  const isProfessor = !!loan.professor?.profile_id && currentUserId === loan.professor.profile_id;

  const handleApprove = async () => {
    if (!loanId) return;
    setProcessing(true);
    try {
      await decideLoanRequest(loanId, "approved");
      if (loan.requester?.email) {
        await notifyLoanDecision(loanId, loan.requester.email, "approved");
      }
      toast({ title: "Préstamo aprobado" });
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!loanId) return;
    setProcessing(true);
    try {
      await decideLoanRequest(loanId, "rejected", rejectionReason);
      if (loan.requester?.email) {
        await notifyLoanDecision(loanId, loan.requester.email, "rejected");
      }
      toast({ title: "Préstamo rechazado" });
      setShowRejectForm(false);
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkReturned = async () => {
    if (!loanId) return;
    setProcessing(true);
    try {
      await markLoanReturned(loanId);
      toast({ title: "Préstamo marcado como devuelto" });
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestExtension = async () => {
    if (!loanId || !newUsageEnd) return;
    setProcessing(true);
    try {
      await requestLoanExtension(loanId, new Date(newUsageEnd).toISOString());
      toast({ title: "Extensión solicitada" });
      setShowExtensionForm(false);
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleResolveExtension = async (approve: boolean) => {
    if (!loanId) return;
    setProcessing(true);
    try {
      await resolveLoanExtension(loanId, approve);
      toast({ title: approve ? "Extensión aprobada" : "Extensión rechazada" });
      await load();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Solicitud de préstamo</CardTitle>
                <CardDescription>
                  {loan.requester?.full_name || loan.requester?.email} → {loan.professor?.full_name}
                </CardDescription>
              </div>
              <LoanStatusBadge status={loan.status as any} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatDateTime(loan.usage_start)} — {formatDateTime(loan.usage_end)}
              </span>
            </div>
            {loan.requested_new_usage_end && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-sm">
                Extensión solicitada hasta: <strong>{formatDateTime(loan.requested_new_usage_end)}</strong>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="whitespace-pre-wrap">{loan.purpose_description}</p>
            </div>
            {loan.rejection_reason && (
              <p className="text-sm text-destructive">Motivo de rechazo: {loan.rejection_reason}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" /> Equipos solicitados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {loan.items.map((item) => (
                <div key={item.id} className="flex justify-between p-2 border border-border rounded">
                  <span className="text-sm">{item.inventory_item?.name}</span>
                  <span className="text-sm text-muted-foreground">Cantidad: {item.quantity}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {loan.legal_acceptance && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Aceptación legal registrada</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Aceptada el {formatDateTime(loan.legal_acceptance.accepted_at)} (versión{" "}
              {loan.legal_acceptance.policy_version})
            </CardContent>
          </Card>
        )}

        {isProfessor && loan.status === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resolver solicitud</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {showRejectForm ? (
                <div className="space-y-3">
                  <Label htmlFor="rejection-reason">Motivo del rechazo (opcional)</Label>
                  <Textarea
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowRejectForm(false)} disabled={processing}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleReject} disabled={processing}>
                      Confirmar rechazo
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={handleApprove} disabled={processing} className="flex-1">
                    Aceptar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectForm(true)}
                    disabled={processing}
                    className="flex-1"
                  >
                    Rechazar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isProfessor && loan.requested_new_usage_end && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resolver extensión solicitada</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={() => handleResolveExtension(true)} disabled={processing} className="flex-1">
                Aprobar extensión
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleResolveExtension(false)}
                disabled={processing}
                className="flex-1"
              >
                Rechazar extensión
              </Button>
            </CardContent>
          </Card>
        )}

        {isRequester && (loan.status === "approved" || loan.status === "overdue") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones del préstamo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {showExtensionForm ? (
                <div className="space-y-3">
                  <Label htmlFor="new-usage-end">Nueva fecha de devolución</Label>
                  <Input
                    id="new-usage-end"
                    type="datetime-local"
                    value={newUsageEnd}
                    onChange={(e) => setNewUsageEnd(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowExtensionForm(false)} disabled={processing}>
                      Cancelar
                    </Button>
                    <Button onClick={handleRequestExtension} disabled={processing || !newUsageEnd}>
                      Solicitar extensión
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={handleMarkReturned} disabled={processing} className="flex-1">
                    Marcar como devuelto
                  </Button>
                  {!loan.requested_new_usage_end && (
                    <Button
                      variant="outline"
                      onClick={() => setShowExtensionForm(true)}
                      disabled={processing}
                      className="flex-1"
                    >
                      Solicitar extensión
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
