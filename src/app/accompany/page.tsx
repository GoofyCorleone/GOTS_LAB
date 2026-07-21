"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAccompanyExperiment } from "@/hooks/useAccompanyExperiment";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Search, ArrowRight, TriangleAlert } from "lucide-react";
import { UserSearchInput, initials } from "@/components/accompany/UserSearchInput";
import { ExperimentsInProgressList } from "@/components/accompany/ExperimentsInProgressList";
import { AccessRequestDialog } from "@/components/accompany/AccessRequestDialog";
import type { SearchResult } from "@/lib/supabase/queries/participants";
import type { JoinableExperimentWithCount } from "@/hooks/useAccompanyExperiment";

export default function AccompanyPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const {
    currentUserId,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    searchError,
    selectedUser,
    selectUser,
    experiments,
    experimentsLoading,
    processingExperimentId,
    loadExperimentsInProgress,
    createAccessRequest,
  } = useAccompanyExperiment();

  const [showExperiments, setShowExperiments] = useState(false);
  const [requestTarget, setRequestTarget] =
    useState<JoinableExperimentWithCount | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSelectUser = (profile: SearchResult) => {
    selectUser(profile);
    setSearchQuery("");
    setShowExperiments(false);
  };

  const handleViewExperiments = async () => {
    await loadExperimentsInProgress();
    setShowExperiments(true);
  };

  const handleConfirmRequest = async () => {
    if (!requestTarget) return;
    try {
      await createAccessRequest(requestTarget.id);
      toast.success("Solicitud enviada", {
        description: `Se notificó a quien dirige "${requestTarget.title}".`,
      });
      setRequestTarget(null);
    } catch (err: any) {
      toast.error(err.message || "No se pudo enviar la solicitud");
    }
  };

  const isSelf = Boolean(
    selectedUser && currentUserId && selectedUser.id === currentUserId
  );

  if (authLoading || !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Hero */}
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Solicitar Acceso a Experimento
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Busca a un miembro del laboratorio para ver sus experimentos en
            curso y solicitar acceso para acompañarlos.
          </p>
        </div>

        {/* Search */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
            <Search className="h-4 w-4" />
            Buscar persona a cargo
          </div>
          <UserSearchInput
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
            loading={searchLoading}
            error={searchError}
            onSelect={handleSelectUser}
          />
        </Card>

        {/* Selected user */}
        {selectedUser && (
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-base">
                    {initials(selectedUser.full_name, selectedUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {selectedUser.full_name || "Sin nombre"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              {!isSelf && (
                <Button onClick={handleViewExperiments} disabled={experimentsLoading}>
                  {experimentsLoading && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Ver Experimentos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isSelf && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                <TriangleAlert className="h-4 w-4 shrink-0" />
                No puedes solicitar acceso a tus propios experimentos.
              </div>
            )}
          </Card>
        )}

        {/* Experiments in progress */}
        {selectedUser && !isSelf && showExperiments && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">
              Experimentos en curso de {selectedUser.full_name || selectedUser.email}
            </h2>
            <ExperimentsInProgressList
              experiments={experiments}
              loading={experimentsLoading}
              processingId={processingExperimentId}
              onRequestAccess={setRequestTarget}
            />
          </div>
        )}
      </div>

      <AccessRequestDialog
        open={requestTarget !== null}
        onOpenChange={(open) => !open && setRequestTarget(null)}
        experiment={requestTarget}
        onConfirm={handleConfirmRequest}
        isSubmitting={processingExperimentId === requestTarget?.id}
      />
    </div>
  );
}
