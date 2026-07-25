"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { requestPasswordReset, confirmPasswordReset, error: authError } = useAuth();

  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await requestPasswordReset(email);
    } catch {
      // No revelamos si el correo existe o no (mismo criterio anti-enumeración
      // que ya usa Supabase) — seguimos al paso 2 igual.
    } finally {
      setLoading(false);
      setStep("confirm");
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Ingresa el código que recibiste por correo");
      return;
    }

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(email, code.trim(), newPassword);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "No se pudo restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Contraseña actualizada</h1>
            <p className="text-sm text-muted-foreground">
              Redirigiendo al inicio de sesión...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            {step === "request" ? "Recuperar contraseña" : "Restablecer contraseña"}
          </h1>
          <p className="text-center text-sm text-muted-foreground mb-8">
            {step === "request"
              ? "Te enviaremos un código a tu correo institucional"
              : `Ingresa el código que llegó a ${email}`}
          </p>

          {step === "request" ? (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Institucional</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu.email@correo.uis.edu.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar código"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de 6 dígitos</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {(error || authError) && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>{error || authError}</div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Guardando..." : "Restablecer contraseña"}
              </Button>

              <button
                type="button"
                onClick={() => setStep("request")}
                className="w-full text-center text-sm text-muted-foreground hover:underline"
                disabled={loading}
              >
                ¿No te llegó el código? Volver a intentar
              </button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-gold font-medium hover:underline">
                Volver a iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
