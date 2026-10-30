"use client"

import * as React from "react"
import { ImageUp, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { apiErrorMessage, uploadImage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const ACCEPT = "image/jpeg,image/png,image/webp"
const MAX_MB = 5

/** Una sola imagen: arrastrar o tocar para subir; devuelve la URL pública. */
export function ImageDropzone({
  value,
  onChange,
  subdir,
  providerId,
  label = "Subí una imagen",
  className,
}: {
  value?: string | null
  onChange: (url: string) => void
  subdir: string
  providerId?: number
  label?: string
  className?: string
}) {
  const input = React.useRef<HTMLInputElement>(null)
  const [over, setOver] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const upload = async (file?: File) => {
    if (!file) return
    if (!ACCEPT.split(",").includes(file.type)) return toast.error("Tiene que ser JPG, PNG o WEBP")
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`La imagen pesa más de ${MAX_MB} MB`)
    setBusy(true)
    try {
      const { url } = await uploadImage(file, { subdir, providerId })
      onChange(url)
    } catch (err) {
      toast.error(apiErrorMessage(err, "No se pudo subir la imagen"))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          upload(e.dataTransfer.files[0])
        }}
        aria-label={value ? "Cambiar imagen" : label}
        className={cn(
          "bg-muted/40 text-muted-foreground hover:border-primary/50 relative flex size-28 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed text-xs transition-colors",
          over && "border-primary bg-primary/5",
          value && "border-solid"
        )}
      >
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        {busy ? (
          <Loader2 className="relative size-5 animate-spin" />
        ) : (
          !value && (
            <>
              <ImageUp className="size-5" />
              Arrastrá o tocá
            </>
          )
        )}
      </button>
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          {value ? "Tocá la imagen para cambiarla." : label}
          <br />
          JPG, PNG o WEBP, hasta {MAX_MB} MB.
        </p>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} disabled={busy}>
            <Trash2 />
            Quitar
          </Button>
        )}
      </div>
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => upload(e.target.files?.[0])} />
    </div>
  )
}
