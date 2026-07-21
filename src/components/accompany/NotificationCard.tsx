"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Check,
  CheckCheck,
  FlaskConical,
  Loader2,
  UserPlus,
  X,
} from "lucide-react";
import { ApproveAccessDialog } from "@/components/accompany/ApproveAccessDialog";
import { initials } from "@/components/accompany/UserSearchInput";
import type { NotificationWithMeta } from "@/hooks/useAccompanyExperiment";
import type {
  AccessRequestPayload,
  ExperimentFinishedPayload,
} from "@/lib/supabase/queries/participants";

interface NotificationCardProps {
  notification: NotificationWithMeta;
  processing?: boolean;
  onMarkRead: (id: string) => void;
  onApprove: (participantId: string, notificationId: string) => Promise<void>;
  onReject: (participantId: string, notificationId: string) => Promise<void>;
}

function timeAgo(iso: string) {
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm");
  } catch {
    return iso;
  }
}

export function NotificationCard({
  notification,
  processing,
  onMarkRead,
  onApprove,
  onReject,
}: NotificationCardProps) {
  const [dialogAction, setDialogAction] = useState<"approve" | "reject" | null>(
    null
  );

  const experimentTitle = notification.experiment?.title;

  const handleConfirm = async () => {
    if (!notification.participant_id || !dialogAction) return;
    if (dialogAction === "approve") {
      await onApprove(notification.participant_id, notification.id);
    } else {
      await onReject(notification.participant_id, notification.id);
    }
    setDialogAction(null);
  };

  let icon = <FlaskConical className="h-4 w-4" />;
  let title = "Notificación";
  let description = "";

  if (notification.type === "access_request") {
    const payload = notification.payload as AccessRequestPayload;
    const label =
      notification.requester_profile?.full_name || payload.requester_email;
    icon = <UserPlus className="h-4 w-4" />;
    title = "Solicitud de acceso";
    description = `${label} quiere acompañar${
      experimentTitle ? ` "${experimentTitle}"` : " tu experimento"
    }.`;
  } else if (notification.type === "access_approved") {
    icon = <Check className="h-4 w-4 text-green-600 dark:text-green-500" />;
    title = "Acceso aprobado";
    description = `Tu solicitud para${
      experimentTitle ? ` "${experimentTitle}"` : " el experimento"
    } fue aprobada.`;
  } else if (notification.type === "access_rejected") {
    icon = <X className="h-4 w-4 text-destructive" />;
    title = "Acceso rechazado";
    description = `Tu solicitud para${
      experimentTitle ? ` "${experimentTitle}"` : " el experimento"
    } fue rechazada.`;
  } else if (notification.type === "experiment_finished") {
    const payload = notification.payload as ExperimentFinishedPayload;
    icon = <FlaskConical className="h-4 w-4" />;
    title = "Experimento finalizado";
    description = `"${payload.title || experimentTitle || "Experimento"}" ha finalizado.`;
  }

  const isProcessing = Boolean(processing);

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="shrink-0">
            <AvatarFallback>
              {notification.type === "access_request" ? (
                initials(
                  notification.requester_profile?.full_name || null,
                  (notification.payload as AccessRequestPayload).requester_email
                )
              ) : (
                icon
              )}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{title}</p>
              <span className="text-xs text-muted-foreground shrink-0">
                {timeAgo(notification.created_at)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {description}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {notification.type === "access_request" &&
                notification.participant_id && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setDialogAction("approve")}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5 mr-1" />
                      )}
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDialogAction("reject")}
                      disabled={isProcessing}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Rechazar
                    </Button>
                  </>
                )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMarkRead(notification.id)}
                disabled={isProcessing}
                className="text-muted-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Marcar como leída
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ApproveAccessDialog
        open={dialogAction !== null}
        onOpenChange={(open) => !open && setDialogAction(null)}
        action={dialogAction || "approve"}
        requesterLabel={
          notification.requester_profile?.full_name ||
          (notification.payload as AccessRequestPayload).requester_email
        }
        experimentTitle={experimentTitle}
        onConfirm={handleConfirm}
        isSubmitting={isProcessing}
      />
    </>
  );
}
