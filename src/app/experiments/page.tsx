"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  getExperimentsByOwner,
  getActiveItemCounts,
  type Experiment,
  type ExperimentWithStats,
} from "@/lib/supabase/queries/experiments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExperimentCard } from "@/components/experiments/ExperimentCard";
import { Loader2, FlaskConical, Plus } from "lucide-react";

function withCounts(
  experiments: Experiment[],
  counts: Map<string, number>
): ExperimentWithStats[] {
  return experiments.map((e) => ({ ...e, items_count: counts.get(e.id) || 0 }));
}

export default function ExperimentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [active, setActive] = useState<ExperimentWithStats[]>([]);
  const [finished, setFinished] = useState<ExperimentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { active, finished } = await getExperimentsByOwner(user.id);
        const counts = await getActiveItemCounts([
          ...active.map((e) => e.id),
          ...finished.map((e) => e.id),
        ]);
        setActive(withCounts(active, counts));
        setFinished(withCounts(finished, counts));
      } catch (err: any) {
        console.error("Error loading experiments:", err);
        setError(err.message || "No se pudieron cargar los experimentos");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <h1 className="text-3xl font-bold">Mis Experimentos</h1>
          <Link href="/experiments/new">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo Experimento
            </Button>
          </Link>
        </div>

        {authLoading || loading ? (
          <Card className="p-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </Card>
        ) : error ? (
          <Card className="p-8">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </Card>
        ) : (
          <Tabs defaultValue="activos">
            <TabsList>
              <TabsTrigger value="activos">
                Activos {active.length > 0 && `(${active.length})`}
              </TabsTrigger>
              <TabsTrigger value="finalizados">
                Finalizados {finished.length > 0 && `(${finished.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activos" className="mt-6">
              {active.length === 0 ? (
                <Card className="p-10 text-center">
                  <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    No tienes experimentos en curso todavía.
                  </p>
                  <Link href="/experiments/new">
                    <Button variant="outline">Crear tu primer experimento</Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {active.map((experiment) => (
                    <ExperimentCard
                      key={experiment.id}
                      experiment={experiment}
                      variant="active"
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="finalizados" className="mt-6">
              {finished.length === 0 ? (
                <Card className="p-10 text-center">
                  <p className="text-muted-foreground">
                    Todavía no has finalizado ningún experimento.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {finished.map((experiment) => (
                    <ExperimentCard
                      key={experiment.id}
                      experiment={experiment}
                      variant="finished"
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
