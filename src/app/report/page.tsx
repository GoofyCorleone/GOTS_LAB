"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import {
  createBugReport,
  getMyBugReports,
  MAX_IMAGES_PER_REPORT,
  type BugReport,
} from "@/lib/supabase/queries/bugReports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bug, ImagePlus, Loader2, X, Send } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  open: "Abierto",
  in_review: "En revisión",
  resolved: "Resuelto",
  wont_fix: "No se corregirá",
};

export default function ReportBugPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [myReports, setMyReports] = useState<BugReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const loadReports = useCallback(async () => {
    if (!user) return;
    try {
      setReportsLoading(true);
      setMyReports(await getMyBugReports());
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setReportsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Object URLs must be revoked when previews change, or the blobs leak.
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
    if (selected.length === 0) return;

    const combined = [...images, ...selected].slice(0, MAX_IMAGES_PER_REPORT);
    if (images.length + selected.length > MAX_IMAGES_PER_REPORT) {
      toast({
        title: "Demasiadas imágenes",
        description: `Solo puedes adjuntar ${MAX_IMAGES_PER_REPORT} imágenes.`,
        variant: "destructive",
      });
    }
    setImages(combined);
    setPreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await createBugReport({
        title,
        description,
        pageUrl: pageUrl.trim() || undefined,
        images,
      });
      toast({
        title: "¡Reporte enviado!",
        description: "Gracias por ayudarnos a mejorar la plataforma.",
      });
      setTitle("");
      setDescription("");
      setPageUrl("");
      setImages([]);
      setPreviews([]);
      await loadReports();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo enviar el reporte",
        variant: "destructive",
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-3">
            <Bug className="h-7 w-7 text-gold" />
            Reportar un error
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            ¿Algo no funciona como esperabas? Cuéntanos qué pasó y adjunta capturas de
            pantalla si las tienes. Esto nos ayuda a corregirlo más rápido.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="bug-title">¿Qué salió mal? *</Label>
                <Input
                  id="bug-title"
                  placeholder="Ej: No puedo agregar equipos a mi experimento"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bug-description">Descripción detallada *</Label>
                <Textarea
                  id="bug-description"
                  placeholder="Describe qué estabas haciendo, qué esperabas que pasara y qué pasó en su lugar. Si aparece un mensaje de error, cópialo aquí."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={7}
                  maxLength={5000}
                  required
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  {description.trim().length}/5000 — mínimo 10 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bug-url">¿En qué página ocurrió? (opcional)</Label>
                <Input
                  id="bug-url"
                  placeholder="Ej: /experiments/detail?id=..."
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-3">
                <Label>Capturas de pantalla (opcional, máx. {MAX_IMAGES_PER_REPORT})</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handleFilesSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting || images.length >= MAX_IMAGES_PER_REPORT}
                >
                  <ImagePlus className="h-4 w-4" />
                  Adjuntar imágenes
                </Button>

                {previews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {previews.map((src, i) => (
                      <div key={src} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`Captura ${i + 1}`}
                          className="w-full h-28 object-cover rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          disabled={submitting}
                          aria-label={`Quitar captura ${i + 1}`}
                          className="absolute top-1 right-1 rounded-full bg-background/90 border border-border p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting ? "Enviando..." : "Enviar reporte"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Mis reportes</h2>
          {reportsLoading ? (
            <Card className="p-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </Card>
          ) : myReports.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground text-sm">
                Todavía no has enviado ningún reporte.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {myReports.map((r) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <Badge variant={r.status === "resolved" ? "secondary" : "outline"}>
                        {STATUS_LABEL[r.status] || r.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {r.description}
                    </p>
                    {r.image_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {r.image_urls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt="Captura adjunta"
                              className="h-20 w-20 object-cover rounded border border-border hover:opacity-80 transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
