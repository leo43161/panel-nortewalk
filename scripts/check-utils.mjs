// node scripts/check-utils.mjs  (Node 23.6+, importa el .ts directo)
import assert from "node:assert/strict"
import { dayLabel, formatDuration, hhmm, isoDate, isoDaysFromToday, parseMapsLocation, people, slugify } from "../lib/utils.ts"

const plaza = { lat: -26.8305, lng: -65.2038 }
assert.deepEqual(parseMapsLocation("-26.8305, -65.2038"), plaza)
assert.deepEqual(parseMapsLocation("https://www.google.com/maps/@-26.8305,-65.2038,17z"), plaza)
assert.deepEqual(parseMapsLocation("https://maps.google.com/?q=-26.8305,-65.2038"), plaza)
// En links de lugar el pin real es !3d!4d, no el centro de la vista (@...)
assert.deepEqual(
  parseMapsLocation("https://www.google.com/maps/place/X/@-26.80,-65.10,15z/data=!3m1!4b1!4m6!3m5!3d-26.8305!4d-65.2038"),
  plaza
)
assert.equal(parseMapsLocation("https://maps.app.goo.gl/abc123"), null)
assert.equal(parseMapsLocation("Plaza Independencia"), null)

assert.equal(formatDuration(150), "2 h 30 min")
assert.equal(formatDuration(45), "45 min")
assert.equal(formatDuration(120), "2 h")
assert.equal(slugify("Caminata Histórica por Tafí"), "caminata-historica-por-tafi")

// Fechas en hora local: 23:30 del 30/10 sigue siendo el 30 (toISOString daría el 31 en UTC-3)
assert.equal(isoDate(new Date(2026, 9, 30, 23, 30)), "2026-10-30")
assert.equal(dayLabel(isoDate()), "Hoy")
assert.equal(dayLabel(isoDaysFromToday(1)), "Mañana")
assert.equal(dayLabel("2026-10-31"), dayLabel("2026-10-31 10:30:00"))
assert.equal(hhmm("10:30:00"), "10:30")
assert.equal(people(1), "1 persona")
assert.equal(people("3"), "3 personas")

console.log("ok")
