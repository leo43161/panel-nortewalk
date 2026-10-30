export type Role = "admin" | "provider"

export type Vertical = "fwt" | "adventure" | "experience" | "gastronomy"
export type ExperienceType = "free" | "paid"
export type Locale = "es" | "en" | "pt"

export type ProviderStatus = "active" | "trial" | "suspended" | "banned"

export type LeadStatus =
  | "new"
  | "contacted"
  | "confirmed"
  | "attended"
  | "no_show"
  | "lost"
  | "spam"

export type Difficulty = "easy" | "moderate" | "hard" | "expert"

export interface ApiResponse<T> {
  status: number
  message: string
  data: T
  meta?: { total?: number } & Record<string, unknown>
}

export interface JwtPayload {
  id: number
  email: string
  role: Role
  providerId: number | null
  iat?: number
  exp?: number
}

export interface AdminUser {
  id: number
  email: string
  full_name: string
  role: Role
  provider_id: number | null
}

export interface LoginResponse {
  token: string
  admin: AdminUser
}

export interface Provider {
  id: number
  slug: string
  business_name: string
  contact_name: string
  email: string
  whatsapp_e164: string
  city: string
  province: string
  country: string
  bio?: string | null
  logo_url?: string | null
  status: ProviderStatus
  trial_ends_at?: string | null
  paid_until?: string | null
  monthly_fee_usd: number | string
  notes_admin?: string | null
  created_at: string
  updated_at: string
  total_experiences?: number
  total_leads?: number
}

export interface Experience {
  id: number
  provider_id: number
  slug: string
  title: string
  short_desc: string | null
  long_desc: string | null
  vertical: Vertical
  category: string
  type: ExperienceType
  price: string | number | null
  price_min: string | number | null
  price_max: string | number | null
  currency: string
  duration_min: number
  difficulty: Difficulty
  meeting_point: string | null
  city: string
  province: string
  country: string
  latitude: string | number | null
  longitude: string | number | null
  min_pax: number
  max_pax: number
  min_age: number
  is_active: 0 | 1
  is_featured: 0 | 1
  external_rating: string | number | null
  external_reviews_count: number
  external_reviews_url: string | null
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
  // joined from SP
  provider_name?: string
  provider_status?: ProviderStatus
  total_leads?: number
  cover_image?: string | null
  /** sp_experience_list_admin (migración v9) */
  active_schedules?: number | string
  inclusions_count?: number | string
}

export type PaymentMethod =
  | "transfer"
  | "cash"
  | "mercadopago"
  | "crypto"
  | "other"

export type SubscriptionEventType =
  | "payment"
  | "refund"
  | "manual_adjustment"
  | "suspension"
  | "reactivation"
  | "trial_start"
  | "trial_end"

export interface SubscriptionEvent {
  id: number
  provider_id: number
  event_type: SubscriptionEventType
  amount_usd: string | number | null
  payment_method: PaymentMethod | null
  reference: string | null
  days_added: number
  effective_date: string
  paid_until_after: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface ProviderDashboardStats {
  total_leads: number
  leads_last_30d: number
  active_experiences: number
  total_experiences: number
  days_until_expire: number | null
  status: ProviderStatus
}

export interface ExperienceImage {
  id: number
  experience_id: number
  url: string
  alt_text: string | null
  sort_order: number
  is_cover: 0 | 1
  created_at: string
}

export type InclusionKind = "included" | "excluded"

export interface ExperienceInclusion {
  id: number
  experience_id: number
  text: string
  kind: InclusionKind
  sort_order: number
}

export interface ExperienceItineraryStep {
  id: number
  experience_id: number
  step_order: number
  title: string
  description: string | null
  duration_min: number | null
}

export interface ExperienceSchedule {
  id: number
  experience_id: number
  day_of_week: number // 0=Sun..6=Sat
  start_time: string // HH:MM:SS
  locale: Locale
  capacity_hint: number | null
  is_active: 0 | 1
  valid_from: string | null
  valid_to: string | null
}

/** Día puntual sin salidas (feriado, vacaciones, lluvia). */
export interface ExperienceBlackout {
  id: number
  experience_id: number
  blackout_date: string // YYYY-MM-DD
  reason: string | null
}

/** GET /translation_get — sólo EN/PT; si falta un campo el sitio muestra el español. */
export interface ExperienceTranslations {
  experience: {
    locale: "en" | "pt"
    title: string | null
    short_desc: string | null
    long_desc: string | null
    meeting_point: string | null
    meta_title: string | null
    meta_description: string | null
  }[]
  /** entity_id = id de la inclusión, title = texto traducido */
  inclusions: { entity_id: number; locale: "en" | "pt"; title: string | null }[]
  /** entity_id = id del paso */
  itinerary: {
    entity_id: number
    locale: "en" | "pt"
    title: string | null
    description: string | null
  }[]
}

export interface Lead {
  id: number
  /** Código visible para el turista, ej. "NW-7K3FQ". */
  booking_code: string | null
  experience_id: number
  provider_id: number
  schedule_id: number | null
  tourist_name: string
  tourist_surname: string | null
  tourist_phone: string
  tourist_email: string | null
  preferred_locale: Locale
  desired_date: string
  desired_time: string | null
  pax: number
  pax_adults: number
  pax_children: number
  message: string | null
  source: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  ip_address?: string | null
  user_agent?: string | null
  status: LeadStatus
  created_at: string
  // joined from SP
  experience_title?: string
  experience_slug?: string
  vertical?: Vertical
  category?: string
  type?: ExperienceType
  city?: string
  provider_name?: string
  whatsapp_e164?: string
  provider_email?: string
  // from sp_lead_get_detail / sp_booking_list_upcoming (schedule join)
  day_of_week?: number | null
  schedule_time?: string | null
  schedule_locale?: Locale | null
  schedule_capacity?: number | null
}
