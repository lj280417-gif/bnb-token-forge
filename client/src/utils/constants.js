export const NETWORKS = {
  97: {
    chainId: "0x61", // 97 in hex
    chainIdDecimal: 97,
    chainName: "BNB Smart Chain Testnet",
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
    isTestnet: true,
  },
  56: {
    chainId: "0x38", // 56 in hex
    chainIdDecimal: 56,
    chainName: "BNB Smart Chain Mainnet",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: ["https://bsc-dataseed.binance.org/"],
    blockExplorerUrls: ["https://bscscan.com"],
    faucetUrl: null,
    isTestnet: false,
  },
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const TOKEN_FACTORY_ADDRESS = "0x9ec66BA9A2A7ee7628c9695f293D0651F651e99C";
export const TOKEN_FACTORY_FEE = "0.01"; // 0.01 tBNB

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
