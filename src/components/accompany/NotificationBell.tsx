"use client";

import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationCard } from "@/components/accompany/NotificationCard";
import { useAccompanyExperiment } from "@/hooks/useAccompanyExperiment";
import { toast } from "sonner";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const {
    notifications,
    notificationsLoading,
    unreadCount,
    processingNotificationId,
    markNotificationRead,
    approveAccessRequest,
    rejectAccessRequest,
  } = useAccompanyExperiment();

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch (err: any) {
      toast.error(err.message || "No se pudo marcar como leída");
    }
  };

  const handleApprove = async (participantId: string, notificationId: string) => {
    try {
      await approveAccessRequest(participantId, notificationId);
      toast.success("Solicitud aprobada");
    } catch (err: any) {
      toast.error(err.message || "No se pudo aprobar la solicitud");
    }
  };

  const handleReject = async (participantId: string, notificationId: string) => {
    try {
      await rejectAccessRequest(participantId, notificationId);
      toast.success("Solicitud rechazada");
    } catch (err: any) {
      toast.error(err.message || "No se pudo rechazar la solicitud");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${className || ""}`}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full text-[10px] leading-none flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 max-h-[28rem] overflow-y-auto">
        <p className="text-sm font-semibold px-1 pb-2">Notificaciones</p>
        {notificationsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-4 text-center">
            No hay notificaciones nuevas.
          </p>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                processing={processingNotificationId === n.id}
                onMarkRead={handleMarkRead}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
        <Link
          href="/profile?tab=notifications"
          className="block text-center text-xs text-accent hover:underline mt-3 pt-2 border-t border-border"
        >
          Ver todas las notificaciones
        </Link>
      </PopoverContent>
    </Popover>
  );
}
