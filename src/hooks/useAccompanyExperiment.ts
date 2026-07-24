"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  searchOwnersWithActiveExperiments,
  searchExperimentsByTitle,
  getExperimentsInProgress,
  createAccessRequest as createAccessRequestQuery,
  getAccessRequests,
  approveAccessRequest as approveAccessRequestQuery,
  rejectAccessRequest as rejectAccessRequestQuery,
  getNotifications as getNotificationsQuery,
  markNotificationRead as markNotificationReadQuery,
  type SearchResult,
  type JoinableExperiment,
  type Notification,
  type AccessRequestPayload,
} from "@/lib/supabase/queries/participants";
import {
  getActiveItemCounts,
  getAllProfiles,
  type Profile,
} from "@/lib/supabase/queries/experiments";

const SEARCH_DEBOUNCE_MS = 300;

/** A joinable experiment enriched with its active item count (for the card grid). */
export interface JoinableExperimentWithCount extends JoinableExperiment {
  items_count: number;
}

/** A notification enriched for display: requester profile (access_request) and
 *  the experiment_participants.id needed to approve/reject (not present in the
 *  raw payload, resolved from the owner's pending requests for that experiment). */
export interface NotificationWithMeta extends Notification {
  requester_profile?: Profile;
  participant_id?: string;
}

export function useAccompanyExperiment() {
  const { user } = useAuth();

  // --- User search -----------------------------------------------------
  const [searchQuery, setSearchQueryState] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const term = searchQuery.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        setSearchError(null);
        const results = await searchOwnersWithActiveExperiments(term);
        setSearchResults(results);
      } catch (err: any) {
        console.error("Error searching owners:", err);
        setSearchError(err.message || "No se pudo buscar personas");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryState(q);
  }, []);

  const selectUser = useCallback((profile: SearchResult | null) => {
    setSelectedUser(profile);
  }, []);

  // --- Search by experiment title (any owner) ----------------------------
  const [experimentSearchQuery, setExperimentSearchQueryState] = useState("");
  const [experimentSearchResults, setExperimentSearchResults] = useState<
    JoinableExperimentWithCount[]
  >([]);
  const [experimentSearchLoading, setExperimentSearchLoading] = useState(false);
  const [experimentSearchError, setExperimentSearchError] = useState<string | null>(
    null
  );
  const experimentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (experimentDebounceRef.current) clearTimeout(experimentDebounceRef.current);

    const term = experimentSearchQuery.trim();
    if (term.length < 2 || !user) {
      setExperimentSearchResults([]);
      setExperimentSearchError(null);
      setExperimentSearchLoading(false);
      return;
    }

    setExperimentSearchLoading(true);
    experimentDebounceRef.current = setTimeout(async () => {
      try {
        setExperimentSearchError(null);
        const results = await searchExperimentsByTitle(term, user.id);
        const counts = await getActiveItemCounts(results.map((e) => e.id));
        setExperimentSearchResults(
          results.map((e) => ({ ...e, items_count: counts.get(e.id) || 0 }))
        );
      } catch (err: any) {
        console.error("Error searching experiments:", err);
        setExperimentSearchError(err.message || "No se pudieron buscar experimentos");
        setExperimentSearchResults([]);
      } finally {
        setExperimentSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (experimentDebounceRef.current) clearTimeout(experimentDebounceRef.current);
    };
  }, [experimentSearchQuery, user]);

  const setExperimentSearchQuery = useCallback((q: string) => {
    setExperimentSearchQueryState(q);
  }, []);

  const requestAccessFromSearch = useCallback(
    async (experimentId: string) => {
      if (!user) throw new Error("Debes iniciar sesión");
      setProcessingExperimentId(experimentId);
      try {
        await createAccessRequestQuery(experimentId, user.id);
        setExperimentSearchResults((prev) =>
          prev.map((e) =>
            e.id === experimentId
              ? { ...e, participation_status: "pending" as const }
              : e
          )
        );
      } finally {
        setProcessingExperimentId(null);
      }
    },
    [user]
  );

  // --- Experiments in progress ------------------------------------------
  const [allExperiments, setAllExperiments] = useState<
    JoinableExperimentWithCount[]
  >([]);
  const [experimentsLoading, setExperimentsLoading] = useState(false);
  const [experimentsError, setExperimentsError] = useState<string | null>(
    null
  );
  const [experimentsLoaded, setExperimentsLoaded] = useState(false);
  const [processingExperimentId, setProcessingExperimentId] = useState<
    string | null
  >(null);

  const loadExperimentsInProgress = useCallback(
    async (force = false) => {
      if (!user) return;
      if (experimentsLoaded && !force) return;
      try {
        setExperimentsLoading(true);
        setExperimentsError(null);
        const joinable = await getExperimentsInProgress(user.id);
        const counts = await getActiveItemCounts(joinable.map((e) => e.id));
        setAllExperiments(
          joinable.map((e) => ({ ...e, items_count: counts.get(e.id) || 0 }))
        );
        setExperimentsLoaded(true);
      } catch (err: any) {
        console.error("Error loading experiments in progress:", err);
        setExperimentsError(
          err.message || "No se pudieron cargar los experimentos"
        );
      } finally {
        setExperimentsLoading(false);
      }
    },
    [user, experimentsLoaded]
  );

  const experimentsForSelectedUser = selectedUser
    ? allExperiments.filter((e) => e.owner_id === selectedUser.id)
    : [];

  const createAccessRequest = useCallback(
    async (experimentId: string) => {
      if (!user) throw new Error("Debes iniciar sesión");
      setProcessingExperimentId(experimentId);
      try {
        await createAccessRequestQuery(experimentId, user.id);
        // Optimistically reflect the new pending status without a refetch.
        setAllExperiments((prev) =>
          prev.map((e) =>
            e.id === experimentId
              ? { ...e, participation_status: "pending" as const }
              : e
          )
        );
      } finally {
        setProcessingExperimentId(null);
      }
    },
    [user]
  );

  // --- Notifications -----------------------------------------------------
  const [notifications, setNotifications] = useState<NotificationWithMeta[]>(
    []
  );
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null
  );
  const [processingNotificationId, setProcessingNotificationId] = useState<
    string | null
  >(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setNotificationsLoading(true);
      setNotificationsError(null);
      const rows = await getNotificationsQuery(user.id);

      // Resolve requester profiles for access_request notifications.
      const requesterIds = [
        ...new Set(
          rows
            .filter((n) => n.type === "access_request")
            .map((n) => (n.payload as AccessRequestPayload).requester_id)
        ),
      ];

      let profiles: Profile[] = [];
      if (requesterIds.length > 0) {
        // Small lab-scale user base: reuse the existing all-profiles query and
        // filter client-side rather than adding a new backend query.
        const all = await getAllProfiles();
        profiles = all.filter((p) => requesterIds.includes(p.id));
      }

      // Resolve experiment_participants.id for each access_request notification
      // (not present in the payload) by loading the owner's pending requests
      // for each distinct related experiment, then matching by requester_id.
      const accessRequestExperimentIds = [
        ...new Set(
          rows
            .filter((n) => n.type === "access_request" && n.related_experiment_id)
            .map((n) => n.related_experiment_id as string)
        ),
      ];

      const pendingByExperiment = new Map<
        string,
        Awaited<ReturnType<typeof getAccessRequests>>
      >();
      await Promise.all(
        accessRequestExperimentIds.map(async (expId) => {
          try {
            const pending = await getAccessRequests(expId);
            pendingByExperiment.set(expId, pending);
          } catch (err) {
            console.error("Error loading access requests for", expId, err);
          }
        })
      );

      const enriched: NotificationWithMeta[] = rows.map((n) => {
        if (n.type !== "access_request") return n;
        const payload = n.payload as AccessRequestPayload;
        const pending = n.related_experiment_id
          ? pendingByExperiment.get(n.related_experiment_id)
          : undefined;
        const match = pending?.find(
          (p) => p.user_id === payload.requester_id && p.status === "pending"
        );
        return {
          ...n,
          requester_profile: profiles.find((p) => p.id === payload.requester_id),
          participant_id: match?.id,
        };
      });

      setNotifications(enriched);
    } catch (err: any) {
      console.error("Error loading notifications:", err);
      setNotificationsError(
        err.message || "No se pudieron cargar las notificaciones"
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    setProcessingNotificationId(notificationId);
    try {
      await markNotificationReadQuery(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } finally {
      setProcessingNotificationId((id) =>
        id === notificationId ? null : id
      );
    }
  }, []);

  const approveAccessRequest = useCallback(
    async (participantId: string, notificationId?: string) => {
      if (!user) throw new Error("Debes iniciar sesión");
      setProcessingNotificationId(notificationId || participantId);
      try {
        await approveAccessRequestQuery(participantId, user.id);
        if (notificationId) {
          try {
            await markNotificationReadQuery(notificationId);
          } catch (err) {
            console.error("Error marking notification read:", err);
          }
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          );
        }
      } finally {
        setProcessingNotificationId(null);
      }
    },
    [user]
  );

  const rejectAccessRequest = useCallback(
    async (participantId: string, notificationId?: string) => {
      if (!user) throw new Error("Debes iniciar sesión");
      setProcessingNotificationId(notificationId || participantId);
      try {
        await rejectAccessRequestQuery(participantId, user.id);
        if (notificationId) {
          try {
            await markNotificationReadQuery(notificationId);
          } catch (err) {
            console.error("Error marking notification read:", err);
          }
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          );
        }
      } finally {
        setProcessingNotificationId(null);
      }
    },
    [user]
  );

  return {
    currentUserId: user?.id,

    // search
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    searchError,
    selectedUser,
    selectUser,

    // experiments
    experiments: experimentsForSelectedUser,
    experimentsLoading,
    experimentsError,
    loadExperimentsInProgress,
    processingExperimentId,
    createAccessRequest,

    // search by experiment title
    experimentSearchQuery,
    setExperimentSearchQuery,
    experimentSearchResults,
    experimentSearchLoading,
    experimentSearchError,
    requestAccessFromSearch,

    // notifications
    notifications,
    notificationsLoading,
    notificationsError,
    unreadCount: notifications.length,
    loadNotifications,
    processingNotificationId,
    markNotificationRead,
    approveAccessRequest,
    rejectAccessRequest,
  };
}

export type UseAccompanyExperimentReturn = ReturnType<
  typeof useAccompanyExperiment
>;
