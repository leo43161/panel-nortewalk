"use client"

import * as React from "react"
import type { Map as LeafletMap, Marker } from "leaflet"
import "leaflet/dist/leaflet.css"

type LatLng = { lat: number; lng: number }

/**
 * Mapa para marcar el punto de encuentro: tocá para poner el pin, arrastralo
 * para ajustarlo. OpenStreetMap: sin API key. Leaflet se carga solo en el
 * navegador (usa window).
 */
export function LocationMap({
  value,
  center,
  onChange,
}: {
  value: LatLng | null
  /** Dónde mirar si todavía no hay pin (la ciudad elegida). */
  center: LatLng
  onChange: (pos: LatLng) => void
}) {
  const el = React.useRef<HTMLDivElement>(null)
  const map = React.useRef<LeafletMap | null>(null)
  const marker = React.useRef<Marker | null>(null)
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  })
  const [ready, setReady] = React.useState(false)

  // Crear el mapa una sola vez.
  React.useEffect(() => {
    let cancelled = false
    import("leaflet").then((L) => {
      if (cancelled || !el.current || map.current) return
      const start = value ?? center
      const m = L.map(el.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], value ? 16 : 13)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m)
      // La rueda del mouse solo hace zoom después de tocar el mapa (si no, secuestra el scroll de la página).
      m.on("focus click", () => m.scrollWheelZoom.enable())
      m.on("blur", () => m.scrollWheelZoom.disable())
      m.on("click", (e) => onChangeRef.current(round(e.latlng)))
      map.current = m
      setReady(true)
    })
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
      marker.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pin: crear / mover / sacar según el valor del formulario.
  React.useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    import("leaflet").then((L) => {
      if (!value) {
        marker.current?.remove()
        marker.current = null
        return
      }
      if (!marker.current) {
        marker.current = L.marker([value.lat, value.lng], { icon: pinIcon(L), draggable: true, keyboard: false })
          .on("dragend", (e) => onChangeRef.current(round((e.target as Marker).getLatLng())))
          .addTo(m)
      } else {
        marker.current.setLatLng([value.lat, value.lng])
      }
      if (!m.getBounds().contains([value.lat, value.lng])) m.setView([value.lat, value.lng], Math.max(m.getZoom(), 16))
    })
  }, [ready, value])

  // Sin pin: seguir a la ciudad elegida.
  React.useEffect(() => {
    if (ready && !value) map.current?.setView([center.lat, center.lng], 13)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, center.lat, center.lng])

  return (
    <div
      ref={el}
      role="application"
      aria-label="Mapa: tocá para marcar el punto de encuentro"
      className="bg-muted relative z-0 h-72 w-full overflow-hidden rounded-lg border sm:h-80"
    />
  )
}

const round = (p: LatLng): LatLng => ({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) })

/** Pin con los colores de la marca (los íconos por defecto de Leaflet se rompen con el bundler). */
function pinIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "",
    iconSize: [32, 42],
    iconAnchor: [16, 40],
    html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
      <path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="#E67E22" stroke="#fff" stroke-width="2"/>
      <circle cx="16" cy="15.5" r="5.5" fill="#fff"/></svg>`,
  })
}
