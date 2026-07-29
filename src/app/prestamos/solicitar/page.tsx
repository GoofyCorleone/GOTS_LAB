"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { UisRegisterForm } from "@/components/auth/UisRegisterForm";
import { LoanInventorySelectionStep } from "@/components/loans/LoanInventorySelectionStep";
import { LoanLegalStep } from "@/components/loans/LoanLegalStep";
import { Loader2, ArrowLeft, User } from "lucide-react";
import {
  getGroupProfessors,
  submitLoanRequest,
  notifyLoanRequest,
  type GroupProfessor,
  type LoanCartItem,
} from "@/lib/supabase/queries/loans";
import { getCurrentProfile, getProfile } from "@/lib/supabase/queries/experiments";

type Step = "auth" | "professor" | "items" | "form" | "legal";

export default function SolicitarPrestamoPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("auth");

  // --- Auth gate state ---
  const [isExternalPath, setIsExternalPath] = useState<boolean | null>(null);
  const [authTab, setAuthTab] = useState<"register" | "login">("register");
  const [registerSuccessEmail, setRegisterSuccessEmail] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // External register fields
  const [extFirstName, setExtFirstName] = useState("");
  const [extLastName, setExtLastName] = useState("");
  const [extEmail, setExtEmail] = useState("");
  const [extInstitution, setExtInstitution] = useState("");
  const [extPassword, setExtPassword] = useState("");
  const [extConfirmPassword, setExtConfirmPassword] = useState("");
  const [extLoading, setExtLoading] = useState(false);
  const [extError, setExtError] = useState<string | null>(null);

  // --- Professor selection ---
  const [professors, setProfessors] = useState<GroupProfessor[]>([]);
  const [professorsLoading, setProfessorsLoading] = useState(true);
  const [selectedProfessor, setSelectedProfessor] = useState<GroupProfessor | null>(null);
  const [underConstruction, setUnderConstruction] = useState<GroupProfessor | null>(null);

  // --- Items ---
  const [cartItems, setCartItems] = useState<LoanCartItem[]>([]);

  // --- Form ---
  const [purposeDescription, setPurposeDescription] = useState("");
  const [usageStart, setUsageStart] = useState("");
  const [usageEnd, setUsageEnd] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // --- Legal + submit ---
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && step === "auth") {
      setStep("professor");
    }
  }, [authLoading, isAuthenticated, step]);

  useEffect(() => {
    getGroupProfessors()
      .then(setProfessors)
      .catch((err) => console.error("Error loading professors:", err))
      .finally(() => setProfessorsLoading(false));
  }, []);

  const handleAuthSuccess = () => {
    setStep("professor");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      handleAuthSuccess();
    } catch (err: any) {
      setLoginError(err.message || "No se pudo iniciar sesión");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleExternalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtError(null);

    if (!extFirstName.trim() || !extLastName.trim()) {
      setExtError("Los nombres y apellidos son requeridos");
      return;
    }
    if (!extEmail.trim()) {
      setExtError("El correo es requerido");
      return;
    }
    if (extPassword.length < 6) {
      setExtError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (extPassword !== extConfirmPassword) {
      setExtError("Las contraseñas no coinciden");
      return;
    }

    setExtLoading(true);
    try {
      await signUp(extEmail, extPassword, extFirstName, extLastName, "", "", {
        accountType: "external",
        institution: extInstitution,
      });
      setRegisterSuccessEmail(extEmail);
      setLoginEmail(extEmail);
      setAuthTab("login");
    } catch (err: any) {
      setExtError(err.message || "Error al registrarse");
    } finally {
      setExtLoading(false);
    }
  };

  const handleProfessorClick = (professor: GroupProfessor) => {
    if (!professor.is_active) {
      setUnderConstruction(professor);
      return;
    }
    setSelectedProfessor(professor);
    setStep("items");
  };

  const handleAddCartItem = (item: LoanCartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.inventory_item_id === item.inventory_item_id);
      if (existing) {
        return prev.map((ci) => (ci.inventory_item_id === item.inventory_item_id ? item : ci));
      }
      return [...prev, item];
    });
  };

  const handleRemoveCartItem = (inventoryItemId: string) => {
    setCartItems((prev) => prev.filter((ci) => ci.inventory_item_id !== inventoryItemId));
  };

  const handleContinueToForm = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Selecciona al menos un equipo",
        description: "Agrega al menos un equipo antes de continuar",
        variant: "destructive",
      });
      return;
    }
    setStep("form");
  };

  const handleContinueToLegal = () => {
    setFormError(null);
    if (!purposeDescription.trim() || purposeDescription.trim().length < 10) {
      setFormError("Describe con al menos 10 caracteres para qué se usarán los equipos");
      return;
    }
    if (!usageStart || !usageEnd) {
      setFormError("Selecciona el rango de fechas y horas de uso");
      return;
    }
    if (new Date(usageEnd) <= new Date(usageStart)) {
      setFormError("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }
    setStep("legal");
  };

  const handleSubmit = async () => {
    if (submittingRef.current || !selectedProfessor) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const loan = await submitLoanRequest({
        professorId: selectedProfessor.id,
        items: cartItems,
        purposeDescription,
        usageStart: new Date(usageStart).toISOString(),
        usageEnd: new Date(usageEnd).toISOString(),
      });

      if (selectedProfessor.profile_id) {
        try {
          const [professorProfile, requesterProfile] = await Promise.all([
            getProfile(selectedProfessor.profile_id),
            getCurrentProfile(),
          ]);
          await notifyLoanRequest(
            loan.id,
            professorProfile.email,
            requesterProfile.full_name || requesterProfile.email
          );
        } catch (notifyErr) {
          // Best-effort only — the DB trigger + webhook already created the
          // in-app notification/email path independently of this call.
          console.error("Failed to send loan request email:", notifyErr);
        }
      }

      toast({
        title: "Solicitud enviada",
        description: "El profesor recibirá una notificación para aprobar o rechazar tu solicitud",
      });

      router.push(`/prestamos/detalle?id=${loan.id}`);
    } catch (err: any) {
      console.error("Error submitting loan request:", err);
      setSubmitError(err.message || "No se pudo enviar la solicitud");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const stepIndex = { auth: 1, professor: 2, items: 3, form: 4, legal: 5 }[step];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Solicitar Préstamo</h1>
          <p className="text-muted-foreground">Paso {stepIndex} de 5</p>
          <div className="mt-4">
            <Progress value={(stepIndex / 5) * 100} className="h-2" />
          </div>
        </div>

        {step === "auth" && (
          <Card>
            <CardHeader>
              <CardTitle>¿Es estudiante o profesor de la Universidad Industrial de Santander?</CardTitle>
              <CardDescription>
                Esto determina cómo vas a registrarte para poder solicitar el préstamo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isExternalPath === null ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button className="flex-1" onClick={() => { setIsExternalPath(false); setAuthTab("register"); }}>
                    Sí, soy de la UIS
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setIsExternalPath(true); setAuthTab("register"); }}
                  >
                    No, soy externo
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 border-b border-border">
                    <button
                      onClick={() => setAuthTab("register")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        authTab === "register" ? "border-gold text-gold" : "border-transparent text-muted-foreground"
                      }`}
                    >
                      Registrarme
                    </button>
                    <button
                      onClick={() => setAuthTab("login")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        authTab === "login" ? "border-gold text-gold" : "border-transparent text-muted-foreground"
                      }`}
                    >
                      Ya tengo cuenta
                    </button>
                  </div>

                  {authTab === "register" ? (
                    isExternalPath ? (
                      <form onSubmit={handleExternalRegister} className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Crea una cuenta externa. Solo tendrás acceso al módulo de Préstamos.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="ext-first-name">Nombres</Label>
                            <Input id="ext-first-name" value={extFirstName} onChange={(e) => setExtFirstName(e.target.value)} required disabled={extLoading} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ext-last-name">Apellidos</Label>
                            <Input id="ext-last-name" value={extLastName} onChange={(e) => setExtLastName(e.target.value)} required disabled={extLoading} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ext-email">Correo electrónico</Label>
                          <Input id="ext-email" type="email" value={extEmail} onChange={(e) => setExtEmail(e.target.value)} required disabled={extLoading} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ext-institution">Institución</Label>
                          <Input
                            id="ext-institution"
                            placeholder="Universidad / Empresa"
                            value={extInstitution}
                            onChange={(e) => setExtInstitution(e.target.value)}
                            disabled={extLoading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ext-password">Contraseña</Label>
                          <Input id="ext-password" type="password" value={extPassword} onChange={(e) => setExtPassword(e.target.value)} required disabled={extLoading} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ext-confirm-password">Confirmar contraseña</Label>
                          <Input
                            id="ext-confirm-password"
                            type="password"
                            value={extConfirmPassword}
                            onChange={(e) => setExtConfirmPassword(e.target.value)}
                            required
                            disabled={extLoading}
                          />
                        </div>
                        {extError && <p className="text-sm text-destructive">{extError}</p>}
                        <Button type="submit" className="w-full" disabled={extLoading}>
                          {extLoading ? "Registrando..." : "Crear cuenta externa"}
                        </Button>
                      </form>
                    ) : (
                      <UisRegisterForm
                        submitLabel="Crear cuenta"
                        showLoginLink={false}
                        onSuccess={(email) => {
                          setRegisterSuccessEmail(email);
                          setLoginEmail(email);
                          setAuthTab("login");
                        }}
                      />
                    )
                  ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                      {registerSuccessEmail && (
                        <p className="text-sm text-green-700 dark:text-green-400">
                          Te enviamos un correo de confirmación a <strong>{registerSuccessEmail}</strong>. Confírmalo
                          y luego inicia sesión aquí.
                        </p>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Correo electrónico</Label>
                        <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required disabled={loginLoading} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Contraseña</Label>
                        <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required disabled={loginLoading} />
                      </div>
                      {loginError && <p className="text-sm text-destructive">{loginError}</p>}
                      <Button type="submit" className="w-full" disabled={loginLoading}>
                        {loginLoading ? "Iniciando sesión..." : "Iniciar sesión"}
                      </Button>
                    </form>
                  )}

                  <Button variant="ghost" size="sm" onClick={() => setIsExternalPath(null)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === "professor" && (
          <Card>
            <CardHeader>
              <CardTitle>¿A quién le va a solicitar el préstamo?</CardTitle>
              <CardDescription>Selecciona el profesor del grupo de investigación</CardDescription>
            </CardHeader>
            <CardContent>
              {professorsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : underConstruction ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-lg font-medium">Inventario de solicitudes en construcción</p>
                  <p className="text-sm text-muted-foreground">
                    Todavía no está disponible el préstamo de equipos de {underConstruction.full_name}.
                  </p>
                  <Button variant="outline" onClick={() => setUnderConstruction(null)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la lista de profesores
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {professors.map((professor) => (
                    <Card
                      key={professor.id}
                      className="p-4 cursor-pointer hover:shadow-lg transition-shadow hover:border-gold text-center"
                      onClick={() => handleProfessorClick(professor)}
                    >
                      <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center overflow-hidden">
                        {professor.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={professor.image_url} alt={professor.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <p className="font-medium text-sm">{professor.full_name}</p>
                      {!professor.is_active && (
                        <p className="text-xs text-muted-foreground mt-1">Próximamente</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === "items" && (
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar equipos</CardTitle>
              <CardDescription>
                Equipos del inventario de {selectedProfessor?.full_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <LoanInventorySelectionStep
                cartItems={cartItems}
                onAddCartItem={handleAddCartItem}
                onRemoveCartItem={handleRemoveCartItem}
              />
              <div className="flex justify-between gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep("professor")}>
                  Atrás
                </Button>
                <Button onClick={handleContinueToForm} disabled={cartItems.length === 0}>
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "form" && (
          <Card>
            <CardHeader>
              <CardTitle>Solicitud formal de préstamo</CardTitle>
              <CardDescription>
                Especifica para qué se usarán los equipos y el rango de tiempo de uso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="purpose">Descripción de uso *</Label>
                <Textarea
                  id="purpose"
                  placeholder="Describe con detalle para qué se van a usar los equipos solicitados"
                  value={purposeDescription}
                  onChange={(e) => setPurposeDescription(e.target.value)}
                  rows={5}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usage-start">Fecha y hora de inicio *</Label>
                  <Input
                    id="usage-start"
                    type="datetime-local"
                    value={usageStart}
                    onChange={(e) => setUsageStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usage-end">Fecha y hora de devolución *</Label>
                  <Input
                    id="usage-end"
                    type="datetime-local"
                    value={usageEnd}
                    onChange={(e) => setUsageEnd(e.target.value)}
                  />
                </div>
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <div className="flex justify-between gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep("items")}>
                  Atrás
                </Button>
                <Button onClick={handleContinueToLegal}>Continuar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "legal" && (
          <Card>
            <CardHeader>
              <CardTitle>Advertencia legal</CardTitle>
              <CardDescription>Revisa y acepta los términos antes de enviar la solicitud</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <LoanLegalStep accepted={legalAccepted} onChange={setLegalAccepted} />
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              <div className="flex justify-between gap-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep("form")} disabled={submitting}>
                  Atrás
                </Button>
                <Button onClick={handleSubmit} disabled={!legalAccepted || submitting}>
                  {submitting ? "Enviando..." : "Solicitar equipos"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
