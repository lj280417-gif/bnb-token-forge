const axios = require("axios");

const BSCSCAN_ENDPOINTS = {
  97: "https://api-testnet.bscscan.com/api",
  56: "https://api.bscscan.com/api"
};

/**
 * Solicita la verificación de código fuente a la API de BscScan
 */
async function submitSourceCodeVerification({
  chainId = 97,
  contractAddress,
  sourceCode,
  contractName = "StandardBEP20",
  compilerVersion = "v0.8.20+commit.a1b79de6",
  constructorArguments = "",
  apiKey = ""
}) {
  const endpoint = BSCSCAN_ENDPOINTS[chainId] || BSCSCAN_ENDPOINTS[97];
  const finalApiKey = apiKey || process.env.BSCSCAN_API_KEY;

  if (!finalApiKey) {
    return {
      success: false,
      message: "Se requiere una BscScan API Key para enviar la verificación automática."
    };
  }

  // Eliminar '0x' inicial de constructorArguments si existe
  const cleanConstructorArgs = constructorArguments.startsWith("0x")
    ? constructorArguments.slice(2)
    : constructorArguments;

  const params = new URLSearchParams();
  params.append("apikey", finalApiKey);
  params.append("module", "contract");
  params.append("action", "verifysourcecode");
  params.append("contractaddress", contractAddress);
  params.append("sourceCode", sourceCode);
  params.append("codeformat", "solidity-single-file");
  params.append("contractname", contractName);
  params.append("compilerversion", compilerVersion);
  params.append("optimizationUsed", "1");
  params.append("runs", "200");
  params.append("constructorArguements", cleanConstructorArgs);

  try {
    const response = await axios.post(endpoint, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000
    });

    if (response.data.status === "1") {
      return {
        success: true,
        guid: response.data.result,
        message: "Verificación enviada con éxito a BscScan. GUID: " + response.data.result
      };
    } else {
      return {
        success: false,
        message: response.data.result || "Error reportado por BscScan"
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.result || error.message
    };
  }
}

/**
 * Consulta el estado de verificación mediante el GUID retornado previamente
 */
async function checkVerificationStatus(guid, chainId = 97, apiKey = "") {
  const endpoint = BSCSCAN_ENDPOINTS[chainId] || BSCSCAN_ENDPOINTS[97];
  const finalApiKey = apiKey || process.env.BSCSCAN_API_KEY;

  try {
    const response = await axios.get(endpoint, {
      params: {
        apikey: finalApiKey,
        module: "contract",
        action: "checkverifystatus",
        guid
      },
      timeout: 10000
    });

    return {
      success: response.data.status === "1",
      statusText: response.data.result
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  submitSourceCodeVerification,
  checkVerificationStatus
};
