"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { isValidUISEmail, EMAIL_VALIDATION_MESSAGE } from "@/lib/auth/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle } from "lucide-react";

const MEMBER_STATUS_OPTIONS = [
  { value: "semillero", label: "Miembro del semillero" },
  { value: "grupo_investigacion", label: "Miembro del grupo de investigación" },
  { value: "tesista", label: "Tesista" },
  { value: "profesor", label: "Profesor" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [memberStatus, setMemberStatus] = useState("");
  const [career, setCareer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const emailIsValid = email ? isValidUISEmail(email) : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!emailIsValid) {
      setError(EMAIL_VALIDATION_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (!fullName.trim()) {
      setError("El nombre es requerido");
      return;
    }

    if (!memberStatus) {
      setError("Selecciona tu estado dentro del grupo");
      return;
    }

    if (!career.trim()) {
      setError("La carrera es requerida");
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, fullName, memberStatus, career);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login?registered=true");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Error al registrarse");
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
            <h1 className="text-2xl font-bold mb-2">¡Registro Exitoso!</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Se ha enviado un correo de confirmación a <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Redirigiendo al login en unos segundos...
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
          <h1 className="text-3xl font-bold text-center mb-2">Registrarse</h1>
          <p className="text-center text-sm text-muted-foreground mb-8">
            Crea tu cuenta en GOTS Lab
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Juan García"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

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
                className={!emailIsValid && email ? "border-destructive" : ""}
              />
              {email && !emailIsValid && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {EMAIL_VALIDATION_MESSAGE}
                </div>
              )}
              {email && emailIsValid && (
                <p className="text-xs text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Dominio válido
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberStatus">Estado en el grupo</Label>
              <Select value={memberStatus} onValueChange={setMemberStatus} disabled={loading}>
                <SelectTrigger id="memberStatus" className="w-full">
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="career">Carrera</Label>
              <Input
                id="career"
                type="text"
                placeholder="Ingeniería Física"
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
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

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !emailIsValid || password !== confirmPassword}
            >
              {loading ? "Registrando..." : "Crear Cuenta"}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-gold font-medium hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Solo se permiten correos @correo.uis.edu.co
        </p>
      </div>
    </div>
  );
}
