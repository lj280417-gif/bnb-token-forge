const express = require("express");
const router = express.Router();
const {
  getContractArtifact,
  getFactoryArtifact,
  prepareTokenDeployment,
  getNetworkInfo,
  getTokenDetails
} = require("../controllers/token.controller");
const {
  verifyContract,
  getVerifyStatus
} = require("../controllers/verify.controller");
const {
  registerToken,
  listTokens,
  getToken,
  getDirectoryStats
} = require("../controllers/directory.controller");
const {
  prepareTokenLimiter,
  verifyContractLimiter,
  registerTokenLimiter
} = require("../middlewares/rateLimiters");

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "BNB Token Forge API", timestamp: new Date() });
});

// Artifact & Compilation
router.get("/contract/artifact", getContractArtifact);
router.get("/contract/factory-artifact", getFactoryArtifact);

// Token Preparation & Validation (con rate limit)
router.post("/token/prepare", prepareTokenLimiter, prepareTokenDeployment);

// Network Info & Stats
router.get("/network/stats", getNetworkInfo);

// On-chain Token Inspector
router.get("/token/:address", getTokenDetails);

// Directorio Central de Tokens (Fase 3: PostgreSQL / Supabase con rate limiting dedicado)
router.post("/tokens", registerTokenLimiter, registerToken);
router.get("/tokens", listTokens);
router.get("/tokens/stats/summary", getDirectoryStats);
router.get("/tokens/:address", getToken);


// BscScan Verification (con rate limit estricto)
router.post("/verify", verifyContractLimiter, verifyContract);
router.get("/verify/status/:guid", verifyContractLimiter, getVerifyStatus);

module.exports = router;

