import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { NETWORKS } from "../utils/constants";

/**
 * Helper para obtener el proveedor EIP-1193 inyectado (MetaMask).
 * Maneja casos donde múltiples extensiones inyectan sus propios proveedores
 * dentro de window.ethereum.providers.
 */
export function getInjectedProvider() {
  if (typeof window === "undefined") return null;

  // 1. Si existe window.ethereum
  if (window.ethereum) {
    // Si hay múltiples billeteras instaladas (MetaMask, Coinbase, Phantom, etc.)
    if (Array.isArray(window.ethereum.providers) && window.ethereum.providers.length > 0) {
      // Buscar el proveedor específico de MetaMask
      const metaMaskProvider = window.ethereum.providers.find(
        (p) => p.isMetaMask && !p.isBraveWallet
      ) || window.ethereum.providers.find((p) => p.isMetaMask);

      if (metaMaskProvider) return metaMaskProvider;
      return window.ethereum.providers[0];
    }
    return window.ethereum;
  }

  return null;
}

export function useWeb3() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState("0");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [hasInjectedProvider, setHasInjectedProvider] = useState(false);

  // Referencia a un proveedor descubierto mediante EIP-6963
  const eip6963ProviderRef = useRef(null);

  /**
   * Resuelve el mejor proveedor disponible en el momento
   */
  const resolveProvider = useCallback(() => {
    return eip6963ProviderRef.current || getInjectedProvider();
  }, []);

  // Actualiza el balance nativo (BNB / tBNB)
  const updateBalance = useCallback(async (userAccount, browserProvider) => {
    if (!userAccount || !browserProvider) return;
    try {
      const bal = await browserProvider.getBalance(userAccount);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
    } catch (err) {
      console.warn("No se pudo obtener el balance BNB:", err.message);
    }
  }, []);

  // Inicializa el estado Web3 si la billetera ya tiene permisos otorgados
  const checkConnection = useCallback(async () => {
    const injected = resolveProvider();
    if (!injected) {
      setHasInjectedProvider(false);
      return;
    }

    setHasInjectedProvider(true);

    try {
      const browserProvider = new ethers.BrowserProvider(injected);
      setProvider(browserProvider);

      // Consulta si ya hay cuentas autorizadas sin abrir popup invasivo
      const accounts = await injected.request({ method: "eth_accounts" });

      // Leer cadena actual
      const rawChainId = await injected.request({ method: "eth_chainId" });
      const currentChainId = parseInt(rawChainId, 16);
      setChainId(currentChainId);

      if (accounts && accounts.length > 0) {
        const userAccount = ethers.getAddress(accounts[0]);
        setAccount(userAccount);
        const userSigner = await browserProvider.getSigner();
        setSigner(userSigner);
        await updateBalance(userAccount, browserProvider);
      }
    } catch (err) {
      console.warn("Error comprobando estado de conexión Web3:", err.message);
    }
  }, [resolveProvider, updateBalance]);

  // Listener de inicialización y eventos de MetaMask
  useEffect(() => {
    // 1. Detección inmediata
    checkConnection();

    // 2. Soporte EIP-6963: Multi-Injected Provider Discovery
    const handleEIP6963 = (event) => {
      if (event?.detail?.provider) {
        const info = event.detail.info;
        if (info?.name?.toLowerCase().includes("metamask") || !eip6963ProviderRef.current) {
          eip6963ProviderRef.current = event.detail.provider;
          setHasInjectedProvider(true);
          checkConnection();
        }
      }
    };
    window.addEventListener("eip6963:announceProvider", handleEIP6963);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // 3. Si MetaMask se inyecta con un pequeño retraso
    const handleInitialized = () => {
      checkConnection();
    };
    window.addEventListener("ethereum#initialized", handleInitialized, { once: true });

    // Verificaciones retardadas por si la extensión inyecta después de React mount
    const timer1 = setTimeout(checkConnection, 300);
    const timer2 = setTimeout(checkConnection, 1000);

    // 4. Suscribirse a cambios de cuenta y cadena
    const injected = resolveProvider();
    let handleAccountsChanged;
    let handleChainChanged;

    if (injected && injected.on) {
      handleAccountsChanged = (accounts) => {
        if (!accounts || accounts.length === 0) {
          setAccount(null);
          setSigner(null);
          setBalance("0");
        } else {
          checkConnection();
        }
      };

      handleChainChanged = (newChainHex) => {
        const newChainId = parseInt(newChainHex, 16);
        setChainId(newChainId);
        checkConnection();
      };

      injected.on("accountsChanged", handleAccountsChanged);
      injected.on("chainChanged", handleChainChanged);
    }

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleEIP6963);
      window.removeEventListener("ethereum#initialized", handleInitialized);
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (injected && injected.removeListener) {
        if (handleAccountsChanged) injected.removeListener("accountsChanged", handleAccountsChanged);
        if (handleChainChanged) injected.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [checkConnection, resolveProvider]);

  /**
   * Conectar billetera manualmente al hacer clic en "Conectar MetaMask"
   */
  const connectWallet = async () => {
    setError(null);
    setIsConnecting(true);

    try {
      // Re-verificar proveedor en el momento del clic
      const injected = resolveProvider();

      if (!injected) {
        // NO REDIRIGIR. Mostrar mensaje amigable en pantalla.
        setError(
          "No se detectó la extensión de MetaMask en este navegador. Asegúrate de que la extensión de MetaMask esté activa o desbloqueada."
        );
        setIsConnecting(false);
        return;
      }

      // Solicitar permisos y cuentas a través del estándar EIP-1193
      const accounts = await injected.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        const userAccount = ethers.getAddress(accounts[0]);
        setAccount(userAccount);

        const browserProvider = new ethers.BrowserProvider(injected);
        setProvider(browserProvider);

        const userSigner = await browserProvider.getSigner();
        setSigner(userSigner);

        const rawChainId = await injected.request({ method: "eth_chainId" });
        const currentChainId = parseInt(rawChainId, 16);
        setChainId(currentChainId);

        await updateBalance(userAccount, browserProvider);
        setHasInjectedProvider(true);
      } else {
        setError("No se seleccionó ninguna cuenta en MetaMask.");
      }
    } catch (err) {
      console.error("Error al conectar MetaMask:", err);
      if (err.code === 4001) {
        setError("Cancelaste o rechazaste la conexión en la ventana de MetaMask.");
      } else if (err.code === -32002) {
        setError("Ya hay una solicitud de conexión abierta en MetaMask. Por favor, abre la extensión en tu barra de Chrome para confirmarla.");
      } else {
        setError(err.message || "Error al conectar con la extensión MetaMask.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Desconectar billetera del estado local
   */
  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setBalance("0");
    setError(null);
  };

  /**
   * Cambiar o registrar red (BSC Testnet o BSC Mainnet) en MetaMask
   */
  const switchNetwork = async (targetChainId) => {
    setError(null);
    const injected = resolveProvider();
    if (!injected) {
      setError("No se detectó la extensión MetaMask para cambiar de red.");
      return false;
    }

    const targetConfig = NETWORKS[targetChainId];
    if (!targetConfig) {
      setError(`Configuración de red no encontrada para Chain ID ${targetChainId}`);
      return false;
    }

    try {
      // 1. Intentar cambiar de red
      await injected.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetConfig.chainId }],
      });
      setChainId(targetConfig.chainIdDecimal);
      if (account && provider) {
        await updateBalance(account, provider);
      }
      return true;
    } catch (switchError) {
      // Código 4902: La red no está registrada en MetaMask
      const isUnrecognized = 
        switchError.code === 4902 || 
        switchError?.data?.originalError?.code === 4902 ||
        (switchError.message && switchError.message.toLowerCase().includes("unrecognized"));

      if (isUnrecognized) {
        try {
          await injected.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetConfig.chainId,
                chainName: targetConfig.chainName,
                nativeCurrency: targetConfig.nativeCurrency,
                rpcUrls: targetConfig.rpcUrls,
                blockExplorerUrls: targetConfig.blockExplorerUrls,
              },
            ],
          });
          setChainId(targetConfig.chainIdDecimal);
          if (account && provider) {
            await updateBalance(account, provider);
          }
          return true;
        } catch (addError) {
          console.error("Error agregando red a MetaMask:", addError);
          if (addError.code === 4001) {
            setError("Cancelaste la solicitud para agregar la red en MetaMask.");
          } else {
            setError("No se pudo agregar la red a MetaMask: " + addError.message);
          }
          return false;
        }
      } else if (switchError.code === 4001) {
        setError("Cancelaste el cambio de red en MetaMask.");
        return false;
      } else {
        console.error("Error cambiando de red:", switchError);
        setError("Error al cambiar de red: " + switchError.message);
        return false;
      }
    }
  };

  /**
   * Sugerir agregar el nuevo token a MetaMask mediante wallet_watchAsset
   */
  const addTokenToMetaMask = async (tokenAddress, tokenSymbol, tokenDecimals = 18) => {
    const injected = resolveProvider();
    if (!injected) return false;

    try {
      const wasAdded = await injected.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: Number(tokenDecimals),
          },
        },
      });
      return wasAdded;
    } catch (err) {
      console.warn("El usuario rechazó o falló agregar el token a MetaMask:", err.message);
      return false;
    }
  };

  return {
    account,
    chainId,
    balance,
    isConnecting,
    error,
    clearError: () => setError(null),
    provider,
    signer,
    hasInjectedProvider,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    addTokenToMetaMask,
    refreshBalance: () => updateBalance(account, provider),
  };
}
