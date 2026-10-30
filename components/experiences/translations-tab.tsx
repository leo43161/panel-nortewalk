"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Languages, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage } from "@/lib/api"
import type { ApiResponse, Experience, ExperienceTranslations } from "@/types"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useInclusions, useItinerary } from "@/components/experiences/queries"

type Lang = "en" | "pt"
const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
]

const MAIN_FIELDS = [
  ["title", "Título", false],
  ["short_desc", "Resumen", true],
  ["long_desc", "Descripción completa", true],
  ["meeting_point", "Punto de encuentro", false],
] as const
type MainField = (typeof MAIN_FIELDS)[number][0]

interface Draft {
  main: Record<MainField, string>
  inc: Record<number, string>
  itin: Record<number, { title: string; description: string }>
}

function draftFrom(t: ExperienceTranslations | undefined, lang: Lang): Draft {
  const e = t?.experience.find((x) => x.locale === lang)
  return {
    main: {
      title: e?.title ?? "",
      short_desc: e?.short_desc ?? "",
      long_desc: e?.long_desc ?? "",
      meeting_point: e?.meeting_point ?? "",
    },
    inc: Object.fromEntries(
      (t?.inclusions ?? []).filter((x) => x.locale === lang).map((x) => [Number(x.entity_id), x.title ?? ""])
    ),
    itin: Object.fromEntries(
      (t?.itinerary ?? [])
        .filter((x) => x.locale === lang)
        .map((x) => [Number(x.entity_id), { title: x.title ?? "", description: x.description ?? "" }])
    ),
  }
}

/** Abre Google Translate con el texto en español: ayuda a quien no domina el idioma. */
function translateUrl(text: string, lang: Lang) {
  return `https://translate.google.com/?sl=es&tl=${lang}&op=translate&text=${encodeURIComponent(text)}`
}

export function TranslationsTab({ experience }: { experience: Experience }) {
  const [lang, setLang] = React.useState<Lang>("en")
  const translations = useQuery({
    queryKey: ["translations", experience.id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ExperienceTranslations>>("/translation_get", {
        params: { experience_id: experience.id },
      })
      return data.data
    },
  })

  if (translations.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{apiErrorMessage(translations.error)}</AlertDescription>
      </Alert>
    )
  }
  if (translations.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }
  // Se remonta al cambiar de idioma o al recargar: el borrador arranca de lo guardado.
  return (
    <TranslationsEditor
      key={`${lang}-${translations.dataUpdatedAt}`}
      experience={experience}
      lang={lang}
      onLangChange={setLang}
      initial={draftFrom(translations.data, lang)}
      prevMeta={translations.data?.experience.find((x) => x.locale === lang)}
    />
  )
}

function TranslationsEditor({
  experience,
  lang,
  onLangChange,
  initial,
  prevMeta,
}: {
  experience: Experience
  lang: Lang
  onLangChange: (l: Lang) => void
  initial: Draft
  prevMeta?: ExperienceTranslations["experience"][number]
}) {
  const qc = useQueryClient()
  const inclusions = useInclusions(experience.id)
  const itinerary = useItinerary(experience.id)
  const [draft, setDraft] = React.useState(initial)

  const incItems = (inclusions.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        (a.kind === b.kind ? 0 : a.kind === "included" ? -1 : 1) || a.sort_order - b.sort_order
    )
  const steps = (itinerary.data ?? []).slice().sort((a, b) => a.step_order - b.step_order)

  // Progreso: textos en español que tienen traducción en este idioma.
  const source = [
    ...MAIN_FIELDS.map(([k]) => [experience[k], draft.main[k]] as const),
    ...incItems.map((i) => [i.text, draft.inc[i.id]] as const),
    ...steps.map((s) => [s.title, draft.itin[s.id]?.title] as const),
  ].filter(([es]) => !!es)
  const done = source.filter(([, tr]) => !!tr?.trim()).length

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  const save = useMutation({
    mutationFn: async () => {
      const ops: Promise<unknown>[] = []
      if (JSON.stringify(draft.main) !== JSON.stringify(initial.main)) {
        ops.push(
          api.post("/translation_experience", {
            experience_id: experience.id,
            locale: lang,
            ...draft.main,
            meta_title: prevMeta?.meta_title ?? null,
            meta_description: prevMeta?.meta_description ?? null,
          })
        )
      }
      for (const i of incItems) {
        const v = draft.inc[i.id] ?? ""
        if (v !== (initial.inc[i.id] ?? "")) {
          ops.push(api.post("/translation_inclusion", { inclusion_id: i.id, locale: lang, text: v.trim() }))
        }
      }
      for (const s of steps) {
        const v = draft.itin[s.id] ?? { title: "", description: "" }
        const before = initial.itin[s.id] ?? { title: "", description: "" }
        if (v.title !== before.title || v.description !== before.description) {
          ops.push(
            api.post("/translation_itinerary", {
              itinerary_id: s.id,
              locale: lang,
              title: v.title.trim() || null,
              description: v.description.trim() || null,
            })
          )
        }
      }
      await Promise.all(ops)
    },
    onSuccess: () => {
      toast.success(`Traducción al ${LANGS.find((l) => l.value === lang)!.label.toLowerCase()} guardada`)
      qc.invalidateQueries({ queryKey: ["translations", experience.id] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const switchLang = (l: Lang) => {
    if (dirty && !confirm("Tenés cambios sin guardar. ¿Cambiar de idioma igual?")) return
    onLangChange(l)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="size-4" />
            Traducciones del sitio
          </CardTitle>
          <CardDescription>
            El sitio se ve en español, inglés y portugués. Lo que no traduzcas se muestra
            en español. Debajo de cada campo tenés el texto original.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {LANGS.map((l) => (
              <Chip key={l.value} active={lang === l.value} onClick={() => switchLang(l.value)}>
                {l.label}
              </Chip>
            ))}
          </div>
          {source.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="bg-muted-foreground/20 h-2 w-32 overflow-hidden rounded-full">
                <div className="bg-primary h-full transition-all" style={{ width: `${(done / source.length) * 100}%` }} />
              </div>
              <span className="text-muted-foreground tabular-nums">
                {done} de {source.length} textos
              </span>
            </div>
          )}
        </CardContent>
      </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ficha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {MAIN_FIELDS.map(([key, label, multiline]) => (
                <TrField
                  key={key}
                  label={label}
                  original={experience[key] ?? ""}
                  value={draft.main[key]}
                  multiline={multiline}
                  lang={lang}
                  onChange={(v) => setDraft({ ...draft, main: { ...draft.main, [key]: v } })}
                />
              ))}
            </CardContent>
          </Card>

          {incItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Qué incluye</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {incItems.map((i) => (
                  <TrField
                    key={i.id}
                    label={i.kind === "included" ? "Incluye" : "No incluye"}
                    original={i.text}
                    value={draft.inc[i.id] ?? ""}
                    lang={lang}
                    onChange={(v) => setDraft({ ...draft, inc: { ...draft.inc, [i.id]: v } })}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {steps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recorrido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {steps.map((s, idx) => {
                  const v = draft.itin[s.id] ?? { title: "", description: "" }
                  const setStep = (patch: Partial<typeof v>) =>
                    setDraft({ ...draft, itin: { ...draft.itin, [s.id]: { ...v, ...patch } } })
                  return (
                    <div key={s.id} className="space-y-3 border-l-2 pl-4">
                      <TrField
                        label={`Parada ${idx + 1}`}
                        original={s.title}
                        value={v.title}
                        lang={lang}
                        onChange={(title) => setStep({ title })}
                      />
                      {s.description && (
                        <TrField
                          label="Qué se hace ahí"
                          original={s.description}
                          value={v.description}
                          multiline
                          lang={lang}
                          onChange={(description) => setStep({ description })}
                        />
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {dirty && (
            <div className="bg-card/95 animate-in fade-in slide-in-from-bottom-2 sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-2 rounded-xl border p-2 pl-4 shadow-lg backdrop-blur md:bottom-4">
              <p className="text-sm font-medium">Tenés cambios sin guardar</p>
              <Button disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                Guardar {LANGS.find((l) => l.value === lang)!.label.toLowerCase()}
              </Button>
            </div>
          )}
    </div>
  )
}

function TrField({
  label,
  original,
  value,
  multiline,
  lang,
  onChange,
}: {
  label: string
  original: string
  value: string
  multiline?: boolean
  lang: Lang
  onChange: (v: string) => void
}) {
  if (!original) return null
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <a
          href={translateUrl(original, lang)}
          target="_blank"
          rel="noopener"
          className="text-primary text-xs hover:underline"
        >
          Ayuda con Google Translate
        </a>
      </div>
      {multiline ? (
        <Textarea rows={original.length > 300 ? 6 : 2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      <p className="text-muted-foreground line-clamp-3 text-xs whitespace-pre-line">
        <span className="font-medium">ES:</span> {original}
      </p>
    </div>
  )
}
