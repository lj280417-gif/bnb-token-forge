const { ethers } = require("ethers");
const { 
  upsertToken, 
  getTokens, 
  getTokenByAddress, 
  getTokenStats 
} = require("../database/supabase");

const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545/";
const testnetProvider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);

/**
 * Registra o actualiza un token en la base de datos central después de confirmarse on-chain
 * POST /api/tokens
 */
async function registerToken(req, res) {
  try {
    const {
      address,
      chainId,
      name,
      symbol,
      decimals,
      totalSupply,
      creatorAddress,
      owner,
      txHash,
      verified,
      creationMethod,
      factoryAddress,
      feePaid,
      canBurn,
      canMint
    } = req.body;

    // 1. Validación de campos obligatorios
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Dirección de contrato inválida o ausente."
      });
    }

    const effectiveCreator = creatorAddress || owner;
    if (!effectiveCreator || !ethers.isAddress(effectiveCreator)) {
      return res.status(400).json({
        success: false,
        message: "Dirección de creador inválida o ausente."
      });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "El nombre del token es obligatorio."
      });
    }

    if (!symbol || typeof symbol !== "string" || !symbol.trim()) {
      return res.status(400).json({
        success: false,
        message: "El símbolo del token es obligatorio."
      });
    }

    // 2. Restricción estricta de red: Exclusivamente BSC Testnet (97)
    const activeChainId = Number(chainId || 97);
    if (activeChainId !== 97) {
      return res.status(400).json({
        success: false,
        message: "Actualmente solo se admite la red BNB Smart Chain Testnet (Chain ID 97)."
      });
    }

    // 3. Validación On-Chain Anti-Spam: Verificar que la dirección realmente tiene código desplegado
    try {
      const code = await testnetProvider.getCode(address);
      if (!code || code === "0x") {
        return res.status(400).json({
          success: false,
          message: `La dirección ${address} no contiene bytecode desplegado en BSC Testnet (Chain ID 97). No es un contrato válido.`
        });
      }
    } catch (rpcErr) {
      console.warn("⚠️ Aviso al verificar getCode en BSC Testnet:", rpcErr.message);
      // En caso de fallo transitorio del nodo RPC público de Binance, continuamos la validación
    }

    // 4. Guardar o actualizar en la base de datos central
    const tokenRecord = await upsertToken({
      address,
      chainId: 97,
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      decimals: Number(decimals || 18),
      totalSupply: (totalSupply || "0").toString(),
      creatorAddress: effectiveCreator,
      txHash: txHash || "0x",
      verified: Boolean(verified),
      creationMethod: creationMethod || "factory",
      factoryAddress: factoryAddress || null,
      feePaid: feePaid || (creationMethod === "factory" ? "0.01 tBNB" : "0 tBNB"),
      canBurn: Boolean(canBurn),
      canMint: Boolean(canMint),
      createdAt: req.body.createdAt || req.body.timestamp || Date.now()
    });

    return res.status(201).json({
      success: true,
      message: "Token registrado correctamente en el directorio central.",
      token: tokenRecord
    });

  } catch (error) {
    console.error("Error al registrar token en directorio:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error interno al registrar el token."
    });
  }
}

/**
 * Lista tokens con paginación, filtros y buscador
 * GET /api/tokens
 */
async function listTokens(req, res) {
  try {
    const {
      search = "",
      creator = "",
      method = "all",
      chainId = 97,
      page = 1,
      limit = 12,
      sort = "newest"
    } = req.query;

    const result = await getTokens({
      search,
      creator,
      method,
      chainId: Number(chainId) || 97,
      page: Number(page) || 1,
      limit: Number(limit) || 12,
      sort
    });

    return res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Error al consultar lista de tokens:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error interno al consultar el directorio de tokens."
    });
  }
}

/**
 * Consulta un token específico por dirección
 * GET /api/tokens/:address
 */
async function getToken(req, res) {
  try {
    const { address } = req.params;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Dirección de contrato inválida."
      });
    }

    const token = await getTokenByAddress(address);

    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Token no encontrado en el directorio central."
      });
    }

    return res.json({
      success: true,
      token
    });

  } catch (error) {
    console.error("Error al consultar detalle del token:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error al consultar token."
    });
  }
}

/**
 * Estadísticas de la plataforma (total tokens, factory tokens, creadores únicos)
 * GET /api/tokens/stats/summary
 */
async function getDirectoryStats(req, res) {
  try {
    const chainId = req.query.chainId ? Number(req.query.chainId) : 97;
    const stats = await getTokenStats(chainId);

    return res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("Error al consultar estadísticas del directorio:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Error al obtener estadísticas."
    });
  }
}

module.exports = {
  registerToken,
  listTokens,
  getToken,
  getDirectoryStats
};
