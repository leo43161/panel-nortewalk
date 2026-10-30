import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // .env.local pisa esto en dev (XAMPP); el deploy usa el fallback de prod.
    API_URL: process.env.API_URL ?? "https://amadamia.com.ar/nortewalk/api/api/",
  },
  // Pantallas que se unificaron: los links viejos siguen andando.
  async redirects() {
    return [
      { source: "/provider/leads", destination: "/provider/reservas?vista=historial", permanent: true },
      { source: "/provider/suscripcion", destination: "/provider/cuenta", permanent: true },
      { source: "/provider/ajustes", destination: "/provider/cuenta", permanent: true },
    ];
  },
};

export default nextConfig;
