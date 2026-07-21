"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useExperimentDetail } from "@/hooks/useExperimentDetail";
import { useToast } from "@/components/ui/use-toast";
import { getAllProfiles, type Profile } from "@/lib/supabase/queries/experiments";
import type { ExperimentItemWithDetails } from "@/lib/supabase/queries/experiments";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExperimentStatusBadge } from "@/components/experiments/ExperimentStatusBadge";
import { ContinueExperimentDialog } from "@/components/experiments/ContinueExperimentDialog";
import { AddItemDialog, type AddItemPayload } from "@/components/experiments/AddItemDialog";
import { RemoveItemDialog } from "@/components/experiments/RemoveItemDialog";
import { FinishExperimentDialog } from "@/components/experiments/FinishExperimentDialog";
import {
  Loader2,
  Calendar,
  User,
  Users,
  Plus,
  Trash2,
  Clock,
  PlayCircle,
  StopCircle,
  Package,
} from "lucide-react";

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "Sin definir";
  try {
    return format(new Date(value), withTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy");
  } catch {
    return value;
  }
}

export function ExperimentDetailView() {
  const [experimentId, setExperimentId] = useState<string | undefined>(undefined);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    setExperimentId(id ?? undefined);
  }, []);

  const {
    experiment,
    itemShares,
    loading,
    error,
    actionLoading,
    isOwner,
    addItem,
    removeItem,
    createSession,
    closeSession,
    finishExperiment,
  } = useExperimentDetail(experimentId);

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ExperimentItemWithDetails | null>(
    null
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    getAllProfiles()
      .then(setAllProfiles)
      .catch((err) => console.error("Error loading profiles:", err));
  }, []);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto p-8">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error || "Experimento no encontrado"}
          </p>
        </Card>
      </div>
    );
  }

  const isReadOnly = experiment.status === "finished" || experiment.status === "cancelled" || !isOwner;
  const activeItems = experiment.items.filter((it) => it.status === "active");
  const companions = experiment.participants;

  const handleContinue = async (startedAt: string, endedAtPlanned: string) => {
    await createSession(startedAt, endedAtPlanned);
    toast({
      title: "Sesión creada",
      description: "Se abrió una nueva sesión de trabajo para este experimento",
    });
  };

  const handleAddItem = async (item: AddItemPayload) => {
    await addItem(item);
    toast({
      title: "Equipo agregado",
      description: "El equipo fue reservado para este experimento",
    });
  };

  const handleRemoveItem = async () => {
    if (!removeTarget) return;
    try {
      await removeItem(removeTarget.id);
      toast({
        title: "Equipo removido",
        description: "El equipo fue liberado y devuelto al inventario",
      });
      setRemoveTarget(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo remover el equipo",
        variant: "destructive",
      });
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      await closeSession(sessionId);
      toast({ title: "Sesión cerrada", description: "La sesión fue cerrada correctamente" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo cerrar la sesión",
        variant: "destructive",
      });
    }
  };

  const handleFinish = async () => {
    try {
      await finishExperiment();
      toast({
        title: "Experimento finalizado",
        description: "Todos los equipos activos fueron devueltos al inventario",
      });
      setShowFinishDialog(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo finalizar el experimento",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{experiment.title}</h1>
              <ExperimentStatusBadge status={experiment.status} />
            </div>
            {experiment.description && (
              <p className="text-muted-foreground mt-2">{experiment.description}</p>
            )}
          </div>
        </div>

        {isReadOnly && (
          <div className="p-4 rounded-lg border bg-muted/50">
            <p className="text-sm text-muted-foreground">
              {!isOwner
                ? "Solo puedes consultar este experimento en modo lectura porque no eres la persona a cargo."
                : "Este experimento ya finalizó y se muestra en modo solo lectura."}
            </p>
          </div>
        )}

        <Tabs defaultValue="informacion">
          <TabsList>
            <TabsTrigger value="informacion">Información</TabsTrigger>
            <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
            <TabsTrigger value="inventario">Inventario</TabsTrigger>
          </TabsList>

          {/* ------------------------------------------------------------ */}
          {/* Información */}
          {/* ------------------------------------------------------------ */}
          <TabsContent value="informacion" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Responsables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Persona a cargo:</span>
                  <span className="font-medium">
                    {experiment.owner?.full_name || experiment.owner?.email || "—"}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">Acompañantes:</span>
                  {companions.length === 0 ? (
                    <span className="text-muted-foreground italic">Ninguno</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {companions.map((p) => (
                        <Badge key={p.id} variant="secondary">
                          {p.profile?.full_name || p.profile?.email || "Usuario"}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Fechas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Inicio:</span>
                  <span className="font-medium">{formatDate(experiment.fecha_inicio)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Fin tentativo:</span>
                  <span className="font-medium">
                    {formatDate(experiment.fecha_fin_tentativa)}
                  </span>
                </div>
                {experiment.fecha_fin_real && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fin real:</span>
                    <span className="font-medium">
                      {formatDate(experiment.fecha_fin_real, true)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {!isReadOnly && experiment.status === "in_progress" && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => setShowContinueDialog(true)}
                  disabled={experiment.has_open_session || actionLoading}
                  className="sm:w-auto"
                >
                  <PlayCircle className="h-4 w-4" />
                  Continuar Experimento
                </Button>
                {experiment.has_open_session && (
                  <p className="text-xs text-muted-foreground self-center">
                    Ya hay una sesión abierta. Ciérrala desde la pestaña
                    &quot;Sesiones&quot; antes de abrir una nueva.
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          {/* ------------------------------------------------------------ */}
          {/* Sesiones */}
          {/* ------------------------------------------------------------ */}
          <TabsContent value="sesiones" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Historial de sesiones</CardTitle>
              </CardHeader>
              <CardContent>
                {experiment.sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Todavía no hay sesiones registradas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[...experiment.sessions]
                      .sort(
                        (a, b) =>
                          new Date(b.started_at).getTime() -
                          new Date(a.started_at).getTime()
                      )
                      .map((session) => {
                        const isOpen = session.ended_at_actual === null;
                        return (
                          <div
                            key={session.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border flex-wrap"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {formatDate(session.started_at, true)}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span>
                                  {isOpen
                                    ? "en curso"
                                    : formatDate(session.ended_at_actual, true)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Fin planeado: {formatDate(session.ended_at_planned, true)}
                              </p>
                            </div>
                            {isOpen ? (
                              <Badge className="bg-green-600 hover:bg-green-600 text-white">
                                Abierta
                              </Badge>
                            ) : (
                              <Badge variant="outline">Cerrada</Badge>
                            )}
                            {isOpen && !isReadOnly && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCloseSession(session.id)}
                                disabled={actionLoading}
                              >
                                <StopCircle className="h-4 w-4" />
                                Cerrar sesión
                              </Button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------------------------------------------ */}
          {/* Inventario */}
          {/* ------------------------------------------------------------ */}
          <TabsContent value="inventario" className="mt-6 space-y-4">
            {!isReadOnly && (
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowAddItemDialog(true)}
                  disabled={actionLoading}
                >
                  <Plus className="h-4 w-4" />
                  Agregar Item
                </Button>
              </div>
            )}

            <Card>
              <CardContent className="pt-6">
                {activeItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      No hay equipos en uso en este experimento.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Modo</TableHead>
                        <TableHead>Con quién</TableHead>
                        {!isReadOnly && <TableHead className="text-right">Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeItems.map((item) => {
                        const shares = itemShares.get(item.id) || [];
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.inventory_item?.name || "—"}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  item.sharing_mode === "compartido"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {item.sharing_mode === "compartido"
                                  ? "Compartido"
                                  : "Individual"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.sharing_mode === "compartido" ? (
                                shares.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {shares.map((s) => (
                                      <Badge key={s.user_id} variant="outline" className="text-xs">
                                        {s.profile?.full_name || s.profile?.email || "Usuario"}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )
                              ) : (
                                <span className="text-muted-foreground text-sm">Solo el titular</span>
                              )}
                            </TableCell>
                            {!isReadOnly && (
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={() => setRemoveTarget(item)}
                                  disabled={actionLoading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remover
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Finish button */}
        {!isReadOnly && (
          <div className="pt-4 border-t flex justify-end">
            <Button
              variant="destructive"
              onClick={() => setShowFinishDialog(true)}
              disabled={actionLoading}
            >
              Finalizar Experimento
            </Button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ContinueExperimentDialog
        open={showContinueDialog}
        onOpenChange={setShowContinueDialog}
        previousSession={
          [...experiment.sessions].sort(
            (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
          )[0] || null
        }
        onSubmit={handleContinue}
        isSubmitting={actionLoading}
      />

      <AddItemDialog
        open={showAddItemDialog}
        onOpenChange={setShowAddItemDialog}
        allProfiles={allProfiles}
        currentUserId={user?.id}
        onAdd={handleAddItem}
        isSubmitting={actionLoading}
      />

      <RemoveItemDialog
        item={removeTarget}
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        onConfirm={handleRemoveItem}
        isSubmitting={actionLoading}
      />

      <FinishExperimentDialog
        open={showFinishDialog}
        onOpenChange={setShowFinishDialog}
        onConfirm={handleFinish}
        isSubmitting={actionLoading}
        hasOpenSession={experiment.has_open_session}
      />
    </div>
  );
}
