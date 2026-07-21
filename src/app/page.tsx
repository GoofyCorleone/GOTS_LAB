"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, RotateCcw, Users } from "lucide-react";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <div className="flex flex-row items-center justify-center gap-3 sm:gap-4 md:gap-5 flex-wrap mb-6">
            <video
              src="/videos/logo.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="h-[5.5rem] sm:h-[7rem] md:h-[8.25rem] w-auto"
            />
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-balance text-gold whitespace-nowrap">
              Inventario
            </h1>
          </div>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
            Sistema integral de gestión de inventario óptico y trazabilidad de experimentos.
            Mantén orden y claridad sobre quiénes están usando qué elementos ópticos en qué fechas.
          </p>

          <div className="bg-card/50 border border-border rounded-lg p-6 mb-8">
            <p className="text-sm text-muted-foreground mb-4">
              Este sistema fue diseñado para resolver un problema real en nuestro laboratorio:
              la desorganización sobre el uso compartido de equipos ópticos.
            </p>
            <p className="text-sm text-foreground">
              <strong>¿Cómo funciona?</strong> Cada miembro crea experimentos, registra qué equipos usa,
              quién más está usando (compartido), y en qué fechas y horas. El sistema registra la
              responsabilidad legal y notifica a todos los involucrados.
            </p>
          </div>
        </div>
      </section>

      {/* Main CTA Section */}
      <section className="py-10 sm:py-12 md:py-16 px-4 bg-primary/5">
        <div className="container mx-auto">
          {isAuthenticated ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">¿Qué quieres hacer?</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {/* New Experiment */}
                <Link href="/experiments/new">
                  <Card className="p-6 h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-gold">
                    <div className="flex flex-col items-center text-center h-full">
                      <Plus className="w-12 h-12 text-gold mb-4" />
                      <h3 className="text-lg font-bold mb-2">Nuevo Experimento</h3>
                      <p className="text-sm text-muted-foreground flex-1">
                        Comienza un experimento nuevo, registra equipos y define responsabilidades
                      </p>
                      <Button className="w-full mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
                        Crear
                      </Button>
                    </div>
                  </Card>
                </Link>

                {/* Continue Experiment */}
                <Link href="/experiments">
                  <Card className="p-6 h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-gold">
                    <div className="flex flex-col items-center text-center h-full">
                      <RotateCcw className="w-12 h-12 text-gold mb-4" />
                      <h3 className="text-lg font-bold mb-2">Continuar Experimento</h3>
                      <p className="text-sm text-muted-foreground flex-1">
                        Sigue trabajando en un experimento activo, agrega o quita equipos
                      </p>
                      <Button
                        variant="outline"
                        className="w-full mt-4 border-gold text-gold hover:bg-gold/10"
                      >
                        Continuar
                      </Button>
                    </div>
                  </Card>
                </Link>

                {/* Accompany Experiment */}
                <Link href="/accompany">
                  <Card className="p-6 h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-gold">
                    <div className="flex flex-col items-center text-center h-full">
                      <Users className="w-12 h-12 text-gold mb-4" />
                      <h3 className="text-lg font-bold mb-2">Acompañar Experimento</h3>
                      <p className="text-sm text-muted-foreground flex-1">
                        Solicita acceso a un experimento en curso de otro miembro
                      </p>
                      <Button
                        variant="outline"
                        className="w-full mt-4 border-gold text-gold hover:bg-gold/10"
                      >
                        Acompañar
                      </Button>
                    </div>
                  </Card>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Bienvenido a GOTS Lab</h2>

              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full border-gold text-gold hover:bg-gold/10">
                    Iniciar Sesión
                  </Button>
                </Link>

                <Link href="/register" className="flex-1">
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    Registrarse
                  </Button>
                </Link>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Solo para miembros del GOTS con correo @correo.uis.edu.co
              </p>
            </>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="py-12 sm:py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Características Principales</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Inventario Completo",
                description: "Acceso a todos los elementos ópticos del laboratorio, organizados por ubicación",
              },
              {
                title: "Trazabilidad Total",
                description: "Registro de quién usa qué equipos, cuándo y con quién está compartiendo",
              },
              {
                title: "Responsabilidad Legal",
                description: "Gate de aceptación de responsabilidad por robo, daño o pérdida de equipos",
              },
              {
                title: "Notificaciones",
                description: "Recibe notificaciones cuando otros solicitan acceso a tus experimentos",
              },
              {
                title: "Multi-sesión",
                description: "Un experimento puede durar múltiples días con varias sesiones de trabajo",
              },
              {
                title: "Compartir Equipos",
                description: "Usa equipos en modo individual o compartido con otros miembros del grupo",
              },
            ].map((feature, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-bold mb-2 text-gold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
