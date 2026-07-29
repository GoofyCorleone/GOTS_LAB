"use client";

import { useState } from "react";
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
  { value: "semillero", label: "Miembro semillero" },
  { value: "grupo", label: "Miembro grupo" },
  { value: "tesista", label: "Tesista" },
  { value: "pasante", label: "Pasante" },
  { value: "profesor", label: "Profesor" },
];

interface UisRegisterFormProps {
  /** Called after a successful signUp, with the email just registered. */
  onSuccess: (email: string) => void;
  submitLabel?: string;
  /** Hide the "¿Ya tienes cuenta?" footer link — useful when embedded inside
   *  another flow (e.g. the loans wizard) that already offers a login option. */
  showLoginLink?: boolean;
}

export function UisRegisterForm({
  onSuccess,
  submitLabel = "Crear Cuenta",
  showLoginLink = true,
}: UisRegisterFormProps) {
  const { signUp, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [memberStatus, setMemberStatus] = useState("");
  const [career, setCareer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);

  const emailIsValid = email ? isValidUISEmail(email) : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsDuplicateEmail(false);

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
    if (!firstName.trim()) {
      setError("Los nombres son requeridos");
      return;
    }
    if (!lastName.trim()) {
      setError("Los apellidos son requeridos");
      return;
    }
    if (!memberStatus) {
      setError("Selecciona tu rol dentro del grupo");
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, firstName, lastName, memberStatus, career);
      onSuccess(email);
    } catch (err: any) {
      const message = err.message || "Error al registrarse";
      setError(message);
      setIsDuplicateEmail(message.includes("ya está registrado"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombres</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Juan Carlos"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellidos</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="García Pérez"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            disabled={loading}
          />
        </div>
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
        <Label htmlFor="memberStatus">
          Rol <span className="text-destructive">*</span>
        </Label>
        <Select value={memberStatus} onValueChange={setMemberStatus} disabled={loading}>
          <SelectTrigger id="memberStatus" className="w-full">
            <SelectValue placeholder="Selecciona tu rol" />
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
        <Label htmlFor="career">Programa académico</Label>
        <Input
          id="career"
          type="text"
          placeholder="Ingeniería Física"
          value={career}
          onChange={(e) => setCareer(e.target.value)}
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
          <div>
            {error || authError}
            {isDuplicateEmail && (
              <>
                {" "}
                <Link href="/forgot-password" className="underline font-medium">
                  ¿Olvidaste tu contraseña?
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !emailIsValid || password !== confirmPassword}
      >
        {loading ? "Registrando..." : submitLabel}
      </Button>

      {showLoginLink && (
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-gold font-medium hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      )}
    </form>
  );
}
