"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { asset } from "@/lib/assets";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoanCard } from "@/components/loans/LoanCard";
import { Loader2, HandHeart } from "lucide-react";
import { getLoanRequests, closeOverdueLoans, type LoanRequestSummary } from "@/lib/supabase/queries/loans";
import { useAuth } from "@/hooks/useAuth";

export default function PrestamosPage() {
  const { isAuthenticated } = useAuth();
  const [loans, setLoans] = useState<LoanRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        await closeOverdueLoans();
        const data = await getLoanRequests();
        if (!cancelled) setLoans(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "No se pudieron cargar los préstamos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      <section className="pt-20 pb-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex flex-row flex-nowrap items-center justify-center gap-[2vw] mb-6">
            <video
              src={asset("/videos/logo.mp4")}
              autoPlay
              loop
              muted
              playsInline
              className="w-auto shrink-0"
              style={{ height: "clamp(2.75rem, 12.8vw, 8.25rem)" }}
            />
            <h1
              className="font-bold text-balance whitespace-nowrap text-gold"
              style={{ fontSize: "clamp(1.25rem, 5.6vw, 3.6rem)" }}
            >
              Préstamos
            </h1>
          </div>

          <div className="max-w-2xl mx-auto">
            <p className="text-base sm:text-lg md:text-xl text-foreground font-medium mb-4">
              Bienvenido al módulo de préstamos de equipos de laboratorio del GOTS-LAB
            </p>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
              Este módulo es para la solicitud formal de inventario de laboratorio de los
              profesores presentes en el grupo de investigación.
            </p>

            <div className="bg-card/50 border border-border rounded-lg p-6 mb-8 text-left">
              <p className="text-sm text-foreground mb-3">
                <strong>¿Cómo funciona?</strong> Si no tienes un usuario creado, deberás
                registrarte. Luego buscarás al profesor a quien quieres solicitarle el préstamo,
                llenarás un formulario especificando los equipos, para qué se van a usar y el
                rango de tiempo de uso.
              </p>
              <p className="text-sm text-foreground mb-3">
                Pasado el tiempo acordado, se notificará por correo tanto al profesor que presta
                como a quien solicitó el préstamo, avisando que debe devolver los equipos o
                solicitar una extensión.
              </p>
              <p className="text-sm text-destructive font-medium">
                Si no se devuelven los equipos ni se avisa a tiempo, el préstamo se marca
                automáticamente como robo o pérdida, y el responsable debe responder legalmente
                ante las autoridades de la Universidad Industrial de Santander por los equipos
                perdidos o robados.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 px-4">
        <div className="container mx-auto max-w-md">
          <Link href="/prestamos/solicitar">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-gold text-center">
              <HandHeart className="w-10 h-10 text-gold mx-auto mb-3" />
              <h3 className="text-lg font-bold mb-2">Solicitar Préstamo</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Pide equipos de laboratorio prestados a un profesor del grupo
              </p>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Solicitar Préstamo
              </Button>
            </Card>
          </Link>
        </div>
      </section>

      {isAuthenticated && (
        <section className="py-10 px-4">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">Préstamos</h2>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <p className="text-center text-sm text-destructive">{error}</p>
            ) : loans.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                No hay préstamos registrados todavía.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loans.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
