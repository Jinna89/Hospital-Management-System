"use client";

import { useCallback, useEffect, useState } from "react";

const storageKey = (appointmentId: string) => `hms:consultation:${appointmentId}`;

/**
 * The API has no "get consultation by appointment" lookup, only
 * `POST /consultations` and `GET /consultations/:id`. Persisting the id after
 * creation lets the wizard resume after a reload without inventing an endpoint.
 * Storage can be unavailable (private mode, blocked cookies), so every access
 * is guarded and the hook degrades to in-memory state.
 */
export function useConsultationId(appointmentId: string) {
  const [consultationId, setConsultationId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setConsultationId(window.localStorage.getItem(storageKey(appointmentId)));
    } catch {
      setConsultationId(null);
    }
  }, [appointmentId]);

  const remember = useCallback(
    (id: string) => {
      setConsultationId(id);
      try {
        window.localStorage.setItem(storageKey(appointmentId), id);
      } catch {
        // Persistence is best-effort; the wizard still works for this session.
      }
    },
    [appointmentId]
  );

  return { consultationId, remember };
}
