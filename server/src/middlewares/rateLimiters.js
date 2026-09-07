const rateLimit = require("express-rate-limit");

/**
 * Limitador general para todas las rutas bajo /api
 * 200 peticiones por cada ventana de 15 minutos
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiadas solicitudes desde esta dirección IP. Por favor, intenta de nuevo en unos minutos."
  }
});

/**
 * Limitador para la preparación y validación de tokens (/api/token/prepare)
 * 50 peticiones por cada 15 minutos (suficiente para uso legítimo, previene spam)
 */
const prepareTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Has alcanzado el límite temporal para preparar tokens. Espera unos minutos antes de intentar de nuevo."
  }
});

/**
 * Limitador estricto para verificación en BscScan (/api/verify)
 * 15 solicitudes por cada 15 minutos para proteger la cuota de la API de BscScan
 */
const verifyContractLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Límite de solicitudes de verificación a BscScan excedido temporalmente. Por favor, intenta más tarde."
  }
});

/**
 * Limitador dedicado para registro de tokens en el directorio (/api/tokens)
 * 30 solicitudes por cada ventana de 15 minutos para proteger el nodo RPC de getCode
 */
const registerTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Has alcanzado el límite de registros de tokens por IP. Por favor, espera unos minutos antes de intentar de nuevo."
  }
});

module.exports = {
  generalLimiter,
  prepareTokenLimiter,
  verifyContractLimiter,
  registerTokenLimiter
};

