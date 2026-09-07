const { submitSourceCodeVerification, checkVerificationStatus } = require("../services/bscscan.service");
const path = require("path");
const fs = require("fs");

/**
 * Endpoint para solicitar verificación de contrato a BscScan
 */
async function verifyContract(req, res) {
  try {
    const {
      chainId = 97,
      contractAddress,
      constructorArguments,
      apiKey
    } = req.body;

    if (!contractAddress) {
      return res.status(400).json({
        success: false,
        message: "La dirección del contrato desplegado es obligatoria."
      });
    }

    // Leemos el código fuente aplanado para verificación en BscScan
    const internalFlattenedPath = path.resolve(__dirname, "../contracts/StandardBEP20_flattened.sol");
    const monorepoFlattenedPath = path.resolve(__dirname, "../../../contracts/flattened/StandardBEP20_flattened.sol");
    const internalSourcePath = path.resolve(__dirname, "../contracts/StandardBEP20.sol");
    const monorepoSourcePath = path.resolve(__dirname, "../../../contracts/contracts/StandardBEP20.sol");

    let sourceCode = "";
    if (fs.existsSync(internalFlattenedPath)) {
      sourceCode = fs.readFileSync(internalFlattenedPath, "utf8");
    } else if (fs.existsSync(monorepoFlattenedPath)) {
      sourceCode = fs.readFileSync(monorepoFlattenedPath, "utf8");
    } else if (fs.existsSync(internalSourcePath)) {
      sourceCode = fs.readFileSync(internalSourcePath, "utf8");
    } else if (fs.existsSync(monorepoSourcePath)) {
      sourceCode = fs.readFileSync(monorepoSourcePath, "utf8");
    }

    const result = await submitSourceCodeVerification({
      chainId: parseInt(chainId, 10),
      contractAddress,
      sourceCode,
      contractName: "StandardBEP20",
      compilerVersion: "v0.8.20+commit.a1b79de6",
      constructorArguments: constructorArguments || "",
      apiKey: apiKey || ""
    });

    return res.json(result);
  } catch (error) {
    console.error("Error en verificación:", error);
    return res.status(500).json({
      success: false,
      message: "Error procesando verificación: " + error.message
    });
  }
}

/**
 * Endpoint para verificar el status de un GUID previo
 */
async function getVerifyStatus(req, res) {
  try {
    const { guid } = req.params;
    const chainId = parseInt(req.query.chainId || "97", 10);
    const apiKey = req.query.apiKey || "";

    const result = await checkVerificationStatus(guid, chainId, apiKey);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  verifyContract,
  getVerifyStatus
};
