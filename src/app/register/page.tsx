"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UisRegisterForm } from "@/components/auth/UisRegisterForm";
import { CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleSuccess = (email: string) => {
    setRegisteredEmail(email);
    setSuccess(true);
    setTimeout(() => {
      router.push("/login?registered=true");
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">¡Registro Exitoso!</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Se ha enviado un correo de confirmación a <strong>{registeredEmail}</strong>
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

          <UisRegisterForm onSuccess={handleSuccess} />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Solo se permiten correos @correo.uis.edu.co o @uis.edu.co
        </p>
      </div>
    </div>
  );
}
