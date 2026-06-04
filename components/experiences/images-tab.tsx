"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ImagePlus,
  ImageIcon,
  Link2,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { api, apiErrorMessage, uploadImage as uploadImageHttp } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ApiResponse, ExperienceImage } from "@/types"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif"
const MAX_BYTES = 5 * 1024 * 1024

interface PendingUpload {
  id: string
  file: File
  preview: string
  status: "pending" | "uploading" | "done" | "error"
  error?: string
}

export function ImagesTab({ experienceId }: { experienceId: number }) {
  const qc = useQueryClient()
  const [pending, setPending] = React.useState<PendingUpload[]>([])
  const [urlInput, setUrlInput] = React.useState("")
  const [altInput, setAltInput] = React.useState("")
  const [dragOver, setDragOver] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const list = useQuery({
    queryKey: ["images", experienceId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ExperienceImage[]>>(
        "/image_list",
        { params: { experience_id: experienceId } }
      )
      return data.data ?? []
    },
  })

  const items = React.useMemo(
    () =>
      [...(list.data ?? [])].sort(
        (a, b) =>
          Number(b.is_cover) - Number(a.is_cover) ||
          a.sort_order - b.sort_order
      ),
    [list.data]
  )

  const addByUrl = useMutation({
    mutationFn: async (input: { url: string; alt: string }) => {
      await api.post<ApiResponse<unknown>>("/image_add", {
        experience_id: experienceId,
        url: input.url,
        alt_text: input.alt || null,
        sort_order: items.length,
        is_cover: items.length === 0 ? 1 : 0,
      })
    },
    onSuccess: () => {
      toast.success("Imagen agregada")
      setUrlInput("")
      setAltInput("")
      qc.invalidateQueries({ queryKey: ["images", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const setCover = useMutation({
    mutationFn: async (id: number) => {
      await api.post<ApiResponse<unknown>>("/image_set_cover", { id })
    },
    onSuccess: () => {
      toast.success("Portada actualizada")
      qc.invalidateQueries({ queryKey: ["images", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const remove = useMutation({
    mutationFn: async (id: number) => {
      await api.post<ApiResponse<unknown>>("/image_delete", { id })
    },
    onSuccess: () => {
      toast.success("Imagen eliminada")
      qc.invalidateQueries({ queryKey: ["images", experienceId] })
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const validateFile = (f: File): string | null => {
    if (!f.type.startsWith("image/")) return "No es una imagen"
    if (!ACCEPT.split(",").includes(f.type)) return "Formato no permitido"
    if (f.size > MAX_BYTES) return "Supera 5MB"
    return null
  }

  const handleFiles = async (files: FileList | File[]) => {
    const toAdd: PendingUpload[] = []
    for (const f of Array.from(files)) {
      const err = validateFile(f)
      const id = `${f.name}-${f.size}-${Date.now()}-${Math.random()}`
      toAdd.push({
        id,
        file: f,
        preview: URL.createObjectURL(f),
        status: err ? "error" : "pending",
        error: err ?? undefined,
      })
    }
    if (toAdd.length === 0) return
    setPending((p) => [...p, ...toAdd])

    // Procesar uno por uno para no saturar.
    let baseOrder = items.length
    for (const up of toAdd) {
      if (up.status === "error") continue
      setPending((p) =>
        p.map((x) => (x.id === up.id ? { ...x, status: "uploading" } : x))
      )
      try {
        const { url } = await uploadImageHttp(up.file, {
          subdir: "experiences",
          experienceId,
        })
        await api.post<ApiResponse<unknown>>("/image_add", {
          experience_id: experienceId,
          url,
          alt_text: null,
          sort_order: baseOrder++,
          is_cover: baseOrder === 1 ? 1 : 0,
        })
        setPending((p) =>
          p.map((x) => (x.id === up.id ? { ...x, status: "done" } : x))
        )
      } catch (err) {
        setPending((p) =>
          p.map((x) =>
            x.id === up.id
              ? { ...x, status: "error", error: apiErrorMessage(err) }
              : x
          )
        )
        toast.error(`Falló: ${up.file.name}`)
      }
    }
    qc.invalidateQueries({ queryKey: ["images", experienceId] })
    // Limpiar los "done" tras 1s
    setTimeout(() => {
      setPending((p) => p.filter((x) => x.status !== "done"))
    }, 1200)
  }

  // ---- Dropzone handlers ----
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Subir imágenes</CardTitle>
          <CardDescription>
            Arrastrá archivos o hacé click. JPG / PNG / WEBP, hasta 5MB cada
            una.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              "group flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-sm transition",
              "border-border bg-muted/30 hover:bg-muted/60",
              dragOver && "border-primary bg-primary/5"
            )}
          >
            <div
              className={cn(
                "rounded-full p-3 transition",
                dragOver
                  ? "bg-primary/10 text-primary"
                  : "bg-background text-muted-foreground border"
              )}
            >
              <Upload className="size-5" />
            </div>
            <div className="text-center">
              <p className="font-medium">
                {dragOver ? "Soltá para subir" : "Arrastrá imágenes aquí"}
              </p>
              <p className="text-muted-foreground text-xs">
                o hacé click para seleccionar archivos
              </p>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files)
              e.target.value = ""
            }}
          />

          {/* URL fallback */}
          <details className="rounded-md border">
            <summary className="text-muted-foreground hover:bg-muted/30 flex cursor-pointer items-center gap-2 px-3 py-2 text-xs">
              <Link2 className="size-3.5" />
              ¿Ya tenés la imagen alojada? Agregar por URL
            </summary>
            <div className="grid gap-2 p-3 sm:grid-cols-[1fr,1fr,auto]">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://…"
              />
              <Input
                value={altInput}
                onChange={(e) => setAltInput(e.target.value)}
                placeholder="Texto alternativo (opcional)"
              />
              <Button
                size="sm"
                disabled={!urlInput || addByUrl.isPending}
                onClick={() =>
                  addByUrl.mutate({ url: urlInput.trim(), alt: altInput })
                }
              >
                {addByUrl.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Agregar
              </Button>
            </div>
          </details>

          {/* Cola de subida */}
          {pending.length > 0 && (
            <div className="grid gap-2">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-2 text-sm",
                    p.status === "error" && "border-red-300 bg-red-50/40 dark:bg-red-950/20",
                    p.status === "done" && "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.preview}
                    alt=""
                    className="size-10 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.file.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {Math.round(p.file.size / 1024)} KB ·{" "}
                      {p.status === "pending" && "En cola"}
                      {p.status === "uploading" && "Subiendo…"}
                      {p.status === "done" && "Listo"}
                      {p.status === "error" && (p.error || "Error")}
                    </div>
                  </div>
                  {p.status === "uploading" && (
                    <Loader2 className="text-muted-foreground size-4 animate-spin" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="size-4" />
            Galería ({items.length})
          </CardTitle>
          <CardDescription>
            La primera marcada como portada es la imagen principal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.isError && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo cargar</AlertTitle>
              <AlertDescription>{apiErrorMessage(list.error)}</AlertDescription>
            </Alert>
          )}
          {list.isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
              <ImageIcon className="size-8" />
              <p>Sin imágenes todavía. Subí la primera arriba.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((img) => {
                const isCover = Number(img.is_cover) === 1
                return (
                  <div
                    key={img.id}
                    className="group bg-card relative overflow-hidden rounded-md border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt_text ?? ""}
                      className="aspect-video w-full object-cover"
                    />
                    {isCover && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 rounded bg-amber-400/95 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
                        <Star className="size-3 fill-current" />
                        Portada
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      <span className="truncate text-[11px] text-white">
                        {img.alt_text || `#${img.sort_order}`}
                      </span>
                      <div className="flex gap-1">
                        {!isCover && (
                          <Button
                            variant="secondary"
                            size="icon-xs"
                            onClick={() => setCover.mutate(img.id)}
                            disabled={setCover.isPending}
                            title="Marcar portada"
                          >
                            <Star className="size-3" />
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          onClick={() => {
                            if (confirm("¿Eliminar esta imagen?"))
                              remove.mutate(img.id)
                          }}
                          disabled={remove.isPending}
                          title="Eliminar"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
