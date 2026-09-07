const path = require("path");
const fs = require("fs");
const { ethers } = require("ethers");
const { getNetworkStats, getTokenInfo } = require("../services/blockchain.service");

// Rutas a los artefactos: prioriza la copia interna del backend para portabilidad en producción
const INTERNAL_ARTIFACT_PATH = path.resolve(__dirname, "../contracts/StandardBEP20.json");
const MONOREPO_ARTIFACT_PATH = path.resolve(__dirname, "../../../contracts/artifacts/contracts/StandardBEP20.sol/StandardBEP20.json");
const ARTIFACT_PATH = fs.existsSync(INTERNAL_ARTIFACT_PATH) ? INTERNAL_ARTIFACT_PATH : MONOREPO_ARTIFACT_PATH;

const INTERNAL_SOURCE_PATH = path.resolve(__dirname, "../contracts/StandardBEP20_flattened.sol");
const MONOREPO_SOURCE_PATH = path.resolve(__dirname, "../../../contracts/flattened/StandardBEP20_flattened.sol");
const SOLIDITY_SOURCE_PATH = fs.existsSync(INTERNAL_SOURCE_PATH) ? INTERNAL_SOURCE_PATH : MONOREPO_SOURCE_PATH;

// Rutas a TokenFactory
const INTERNAL_FACTORY_ARTIFACT_PATH = path.resolve(__dirname, "../contracts/TokenFactory.json");
const MONOREPO_FACTORY_ARTIFACT_PATH = path.resolve(__dirname, "../../../contracts/artifacts/contracts/TokenFactory.sol/TokenFactory.json");
const FACTORY_ARTIFACT_PATH = fs.existsSync(INTERNAL_FACTORY_ARTIFACT_PATH) ? INTERNAL_FACTORY_ARTIFACT_PATH : MONOREPO_FACTORY_ARTIFACT_PATH;

/**
 * Obtiene el ABI y Bytecode del contrato BEP-20 compilado
 */
function getContractArtifact(req, res) {
  try {
    if (!fs.existsSync(ARTIFACT_PATH)) {
      return res.status(503).json({
        success: false,
        message: "El artefacto del contrato aún se está compilando. Intenta de nuevo en unos segundos."
      });
    }

    const artifactRaw = fs.readFileSync(ARTIFACT_PATH, "utf8");
    const artifact = JSON.parse(artifactRaw);

    let sourceCode = "";
    if (fs.existsSync(SOLIDITY_SOURCE_PATH)) {
      sourceCode = fs.readFileSync(SOLIDITY_SOURCE_PATH, "utf8");
    }

    return res.json({
      success: true,
      contractName: artifact.contractName,
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      sourceCode
    });
  } catch (error) {
    console.error("Error al leer artefacto:", error);
    return res.status(500).json({
      success: false,
      message: "Error al cargar el artefacto del contrato: " + error.message
    });
  }
}

/**
 * Obtiene el ABI y Bytecode del contrato TokenFactory compilado
 */
function getFactoryArtifact(req, res) {
  try {
    if (!fs.existsSync(FACTORY_ARTIFACT_PATH)) {
      return res.status(503).json({
        success: false,
        message: "El artefacto de TokenFactory aún no está disponible."
      });
    }

    const artifactRaw = fs.readFileSync(FACTORY_ARTIFACT_PATH, "utf8");
    const artifact = JSON.parse(artifactRaw);

    return res.json({
      success: true,
      contractName: artifact.contractName,
      abi: artifact.abi,
      bytecode: artifact.bytecode
    });
  } catch (error) {
    console.error("Error al leer artefacto de TokenFactory:", error);
    return res.status(500).json({
      success: false,
      message: "Error al cargar el artefacto de TokenFactory: " + error.message
    });
  }
}

/**
 * Valida los parámetros del token antes del despliegue y calcula datos de preparación
 */
function prepareTokenDeployment(req, res) {
  try {
    const {
      name,
      symbol,
      decimals = 18,
      initialSupply,
      owner,
      canBurn = false,
      canMint = false
    } = req.body;

    // Validaciones
    const errors = [];
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.push("El nombre del token es obligatorio.");
    }
    if (!symbol || typeof symbol !== "string" || symbol.trim().length === 0) {
      errors.push("El símbolo del token es obligatorio (ej. BTC, MCM).");
    }
    const decNum = parseInt(decimals, 10);
    if (isNaN(decNum) || decNum < 0 || decNum > 18) {
      errors.push("Los decimales deben estar entre 0 y 18.");
    }
    const supplyNum = parseFloat(initialSupply);
    if (isNaN(supplyNum) || supplyNum <= 0) {
      errors.push("El suministro inicial debe ser un número mayor a 0.");
    }
    if (!owner || !ethers.isAddress(owner)) {
      errors.push("La dirección de la wallet administradora es inválida.");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    // Parámetros formateados
    const formattedParams = {
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      decimals: decNum,
      initialSupply: initialSupply.toString(),
      initialOwner: ethers.getAddress(owner),
      canBurn: Boolean(canBurn),
      canMint: Boolean(canMint)
    };

    // Estimar gas aproximado
    const estimatedGasUnits = 1450000;

    const constructorArgsArray = [
      formattedParams.name,
      formattedParams.symbol,
      formattedParams.decimals,
      formattedParams.initialSupply,
      formattedParams.initialOwner,
      formattedParams.canBurn,
      formattedParams.canMint
    ];

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const constructorArgumentsAbiEncoded = abiCoder.encode(
      ["string", "string", "uint8", "uint256", "address", "bool", "bool"],
      constructorArgsArray
    );

    return res.json({
      success: true,
      validatedParams: formattedParams,
      estimatedGasUnits,
      constructorArgsArray,
      constructorArgumentsAbiEncoded: constructorArgumentsAbiEncoded.startsWith("0x") 
        ? constructorArgumentsAbiEncoded.slice(2) 
        : constructorArgumentsAbiEncoded
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al preparar el despliegue: " + error.message
    });
  }
}

/**
 * Consulta estadísticas de la red seleccionada
 */
async function getNetworkInfo(req, res) {
  const chainId = parseInt(req.query.chainId || "97", 10);
  const result = await getNetworkStats(chainId);
  return res.json(result);
}

/**
 * Consulta información en vivo de un token ya desplegado en la blockchain
 */
async function getTokenDetails(req, res) {
  const { address } = req.params;
  const chainId = parseInt(req.query.chainId || "97", 10);
  const result = await getTokenInfo(address, chainId);
  return res.json(result);
}

module.exports = {
  getContractArtifact,
  getFactoryArtifact,
  prepareTokenDeployment,
  getNetworkInfo,
  getTokenDetails
};
