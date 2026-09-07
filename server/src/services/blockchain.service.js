const { ethers } = require("ethers");

const BSC_TESTNET_RPCS = [
  process.env.BSC_TESTNET_RPC,
  "https://bsc-testnet-rpc.publicnode.com",
  "https://data-seed-prebsc-1-s1.bnbchain.org:8545/",
  "https://data-seed-prebsc-1-s1.binance.org:8545/"
].filter(Boolean);

const BSC_MAINNET_RPCS = [
  process.env.BSC_MAINNET_RPC,
  "https://bsc-dataseed.binance.org/",
  "https://bsc-rpc.publicnode.com"
].filter(Boolean);

const NETWORKS = {
  97: {
    name: "BNB Smart Chain Testnet",
    chainId: 97,
    rpcUrls: BSC_TESTNET_RPCS,
    rpcUrl: BSC_TESTNET_RPCS[0],
    explorer: "https://testnet.bscscan.com",
    symbol: "tBNB"
  },
  56: {
    name: "BNB Smart Chain Mainnet",
    chainId: 56,
    rpcUrls: BSC_MAINNET_RPCS,
    rpcUrl: BSC_MAINNET_RPCS[0],
    explorer: "https://bscscan.com",
    symbol: "BNB"
  }
};

// Minimal ABI for querying standard ERC20/BEP20 details
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)",
  "function canBurn() view returns (bool)",
  "function canMint() view returns (bool)"
];

async function getWorkingProvider(chainId) {
  const network = NETWORKS[chainId] || NETWORKS[97];
  for (const url of network.rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true });
      // Probar conexión rápida
      await provider.getBlockNumber();
      return provider;
    } catch (_) {
      // Probar siguiente RPC si este falla
    }
  }
  // Fallback con el primer RPC
  return new ethers.JsonRpcProvider(network.rpcUrl, undefined, { staticNetwork: true });
}

async function getNetworkStats(chainId = 97) {
  try {
    const provider = await getWorkingProvider(chainId);
    const [blockNumber, feeData] = await Promise.all([
      provider.getBlockNumber(),
      provider.getFeeData()
    ]);

    const gasPriceGwei = feeData.gasPrice 
      ? ethers.formatUnits(feeData.gasPrice, "gwei") 
      : "3.0";

    return {
      success: true,
      network: NETWORKS[chainId] || NETWORKS[97],
      blockNumber,
      gasPriceGwei: parseFloat(gasPriceGwei).toFixed(2),
      estimatedDeployCostBNB: (parseFloat(gasPriceGwei) * 1500000 / 1e9).toFixed(5)
    };
  } catch (error) {
    console.error("Error al obtener estadísticas de red:", error.message);
    return {
      success: false,
      error: error.message,
      network: NETWORKS[chainId] || NETWORKS[97]
    };
  }
}

async function getTokenInfo(address, chainId = 97) {
  try {
    if (!ethers.isAddress(address)) {
      throw new Error("Dirección de contrato inválida");
    }

    const provider = await getWorkingProvider(chainId);
    const contract = new ethers.Contract(address, ERC20_ABI, provider);

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name().catch(() => "Desconocido"),
      contract.symbol().catch(() => "???"),
      contract.decimals().catch(() => 18),
      contract.totalSupply().catch(() => 0n)
    ]);

    let owner = null;
    let canBurn = false;
    let canMint = false;

    try { owner = await contract.owner(); } catch (_) {}
    try { canBurn = await contract.canBurn(); } catch (_) {}
    try { canMint = await contract.canMint(); } catch (_) {}

    const formattedSupply = ethers.formatUnits(totalSupply, decimals);

    return {
      success: true,
      token: {
        address,
        name,
        symbol,
        decimals,
        totalSupply: formattedSupply,
        owner,
        canBurn,
        canMint,
        network: NETWORKS[chainId] || NETWORKS[97]
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  NETWORKS,
  getNetworkStats,
  getTokenInfo
};
