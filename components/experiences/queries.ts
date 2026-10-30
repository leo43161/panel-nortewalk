"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type {
  ApiResponse,
  ExperienceBlackout,
  ExperienceImage,
  ExperienceInclusion,
  ExperienceItineraryStep,
  ExperienceSchedule,
} from "@/types"

/*
 * Listas hijas de una experiencia. El editor (checklist) y cada pestaña usan
 * la misma queryKey, así que React Query hace un solo pedido por lista.
 * MySQL manda los números como string: se normalizan acá una sola vez.
 */

const n = (v: unknown) => Number(v)
const nOrNull = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v))

function useChildList<T>(
  key: string,
  endpoint: string,
  experienceId: number,
  normalize: (row: T) => T
) {
  return useQuery({
    queryKey: [key, experienceId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<T[]>>(endpoint, {
        params: { experience_id: experienceId },
      })
      return (data.data ?? []).map(normalize)
    },
  })
}

export const useImages = (id: number) =>
  useChildList<ExperienceImage>("images", "/image_list", id, (r) => ({
    ...r,
    id: n(r.id),
    sort_order: n(r.sort_order),
    is_cover: n(r.is_cover) === 1 ? 1 : 0,
  }))

export const useInclusions = (id: number) =>
  useChildList<ExperienceInclusion>("inclusions", "/inclusion_list", id, (r) => ({
    ...r,
    id: n(r.id),
    sort_order: n(r.sort_order),
  }))

export const useItinerary = (id: number) =>
  useChildList<ExperienceItineraryStep>("itinerary", "/itinerary_list", id, (r) => ({
    ...r,
    id: n(r.id),
    step_order: n(r.step_order),
    duration_min: nOrNull(r.duration_min),
  }))

export const useSchedules = (id: number) =>
  useChildList<ExperienceSchedule>("schedules", "/schedule_list", id, (r) => ({
    ...r,
    id: n(r.id),
    day_of_week: n(r.day_of_week),
    capacity_hint: nOrNull(r.capacity_hint),
    is_active: n(r.is_active) === 1 ? 1 : 0,
  }))

export const useBlackouts = (id: number) =>
  useChildList<ExperienceBlackout>("blackouts", "/blackout_list", id, (r) => ({
    ...r,
    id: n(r.id),
  }))
