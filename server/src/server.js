require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const apiRoutes = require("./routes/api.routes");
const { generalLimiter } = require("./middlewares/rateLimiters");

const app = express();

// 0. Habilitar confianza en proxy inverso (Render, Railway, Fly.io, Vercel)
// Permite que express-rate-limit obtenga la IP real del cliente mediante X-Forwarded-For
app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== "production";


// 1. Cabeceras de seguridad con Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Configuración granular de CORS (sin origin: "*")
const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin cabecera origin (herramientas locales, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || (isDev && origin.includes("localhost"))) {
      return callback(null, true);
    }

    return callback(new Error(`CORS bloqueado: El origen '${origin}' no está autorizado.`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// 3. Rate Limiting general para la API
app.use("/api", generalLimiter);

// 4. Procesamiento de cuerpo JSON con límite de tamaño para mitigar ataques de payload
app.use(express.json({ limit: "1mb" }));

// 5. Rutas de la API
app.use("/api", apiRoutes);

// Manejador global de errores
app.use((err, req, res, next) => {
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: err.message
    });
  }
  console.error("Error no controlado:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Error interno del servidor",
  });
});

const { isSupabaseConfigured } = require("./database/supabase");

app.listen(PORT, () => {
  console.log(`🚀 BNB Token Forge API corriendo en http://localhost:${PORT}`);
  console.log(`🛡️ Seguridad: Helmet activo, Rate Limiting configurado, CORS restringido`);
  console.log(`🗄️ Persistencia: ${isSupabaseConfigured ? "Supabase PostgreSQL Conectado" : "Modo Local / Fallback en Memoria"}`);
  console.log(`📡 Entorno: ${process.env.NODE_ENV || 'desarrollo'}`);
});

