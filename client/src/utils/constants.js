export const NETWORK_CONFIG = {
  97: {
    chainId: "0x61", // 97 en hex
    chainIdDecimal: 97,
    chainName: "BNB Smart Chain Testnet",
    shortName: "BSC Testnet",
    symbol: "tBNB",
    nativeCurrency: {
      name: "BNB de Prueba",
      symbol: "tBNB",
      decimals: 18,
    },
    rpcUrls: [
      "https://data-seed-prebsc-1-s1.binance.org:8545/",
      "https://bsc-testnet-rpc.publicnode.com",
      "https://endpoints.omniatech.io/v1/bsc/testnet/public"
    ],
    blockExplorerUrls: ["https://testnet.bscscan.com"],
    faucetUrl: "https://www.bnbchain.org/en/testnet-faucet",
    factoryAddress: "0x9ec66BA9A2A7ee7628c9695f293D0651F651e99C",
    factoryFee: "0.01", // 0.01 tBNB
    isTestnet: true,
    isAvailable: true, // 100% operativo
    badge: "Testnet Activa"
  },
  56: {
    chainId: "0x38", // 56 en hex
    chainIdDecimal: 56,
    chainName: "BNB Smart Chain Mainnet",
    shortName: "BSC Mainnet",
    symbol: "BNB",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: [
      "https://bsc-dataseed.binance.org/",
      "https://bsc-rpc.publicnode.com"
    ],
    blockExplorerUrls: ["https://bscscan.com"],
    faucetUrl: null,
    factoryAddress: null, // Pendiente de despliegue oficial
    factoryFee: "0.01",   // Configurable por red
    isTestnet: false,
    isAvailable: false,   // BLOQUEADO: No permite transacciones en Mainnet hasta que se configure y active
    disabledReason: "BNB Smart Chain Mainnet está en fase de preparación. La creación con BNB real se habilitará próximamente.",
    badge: "En Preparación"
  },
};

// Aliases para retrocompatibilidad
export const NETWORKS = NETWORK_CONFIG;

export function getNetworkConfig(chainId) {
  const numericChainId = Number(chainId);
  return NETWORK_CONFIG[numericChainId] || NETWORK_CONFIG[97];
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Fallbacks de conveniencia
export const TOKEN_FACTORY_ADDRESS = NETWORK_CONFIG[97].factoryAddress;
export const TOKEN_FACTORY_FEE = NETWORK_CONFIG[97].factoryFee;

export const DEFAULT_TOKEN_CONFIG = {
  name: "Binance Nova",
  symbol: "BNOV",
  decimals: 18,
  initialSupply: 1000000,
  owner: "",
  canBurn: true,
  canMint: false,
  bep20Version: "OpenZeppelin v5.0 (Audited)"
};
