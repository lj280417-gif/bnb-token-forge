import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import confetti from "canvas-confetti";
import { 
  Zap, 
  ShieldCheck, 
  Flame, 
  Sparkles, 
  ExternalLink,
  Layers,
  ArrowRight,
  AlertCircle,
  X
} from "lucide-react";

import { Navbar } from "./components/Navbar";
import { NetworkBanner } from "./components/NetworkBanner";
import { TokenForm } from "./components/TokenForm";
import { TokenPreview } from "./components/TokenPreview";
import { DeploymentModal } from "./components/DeploymentModal";
import { FactoryDeployModal } from "./components/FactoryDeployModal";
import { DeployedTokensList } from "./components/DeployedTokensList";
import { TokenExplorer } from "./components/TokenExplorer";
import { TokenResultScreen } from "./components/TokenResultScreen";


import { useWeb3 } from "./hooks/useWeb3";
import { 
  API_BASE_URL, 
  DEFAULT_TOKEN_CONFIG, 
  NETWORKS, 
  getNetworkConfig,
  TOKEN_FACTORY_ADDRESS, 
  TOKEN_FACTORY_FEE 
} from "./utils/constants";
import { shortenAddress } from "./utils/formatters";

export function App() {
  const {
    account,
    chainId,
    balance,
    isConnecting,
    error: web3Error,
    clearError,
    signer,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    addTokenToMetaMask,
    refreshBalance
  } = useWeb3();

  const [formData, setFormData] = useState(DEFAULT_TOKEN_CONFIG);
  const [networkStats, setNetworkStats] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployMode, setDeployMode] = useState("factory"); // 'factory' | 'direct'
  const [activeTab, setActiveTab] = useState("forge"); // 'forge' | 'explore' (Fase 3)

  // Historial de tokens creados en localStorage
  const [deployedTokens, setDeployedTokens] = useState(() => {
    try {
      const saved = localStorage.getItem("bnb_deployed_tokens");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Estado del modal de despliegue
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createdTokenResult, setCreatedTokenResult] = useState(null);
  const [deploymentState, setDeploymentState] = useState({
    step: 1,
    status: "idle", // 'idle' | 'loading' | 'success' | 'error'
    txHash: null,
    contractAddress: null,
    error: null,
    tokenData: null,
    method: "factory"
  });

  // Estado del modal y datos de TokenFactory (Fase 2)
  const [isFactoryModalOpen, setIsFactoryModalOpen] = useState(false);
  const [factoryInfo, setFactoryInfo] = useState(() => {
    try {
      const addr = localStorage.getItem("bnb_factory_address") || TOKEN_FACTORY_ADDRESS;
      const treasury = localStorage.getItem("bnb_factory_treasury");
      const fee = localStorage.getItem("bnb_factory_fee") || TOKEN_FACTORY_FEE;
      return { address: addr, treasury, fee };
    } catch {
      return { address: TOKEN_FACTORY_ADDRESS, fee: TOKEN_FACTORY_FEE };
    }
  });

  // Registrar token en la base de datos central (Fase 3: Supabase/PostgreSQL)
  const registerTokenInBackend = async (tokenRecord) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokenRecord)
      });
      const data = await res.json();
      if (data.success) {
        console.log("✅ Token registrado en la base de datos central:", data.token);
      } else {
        console.warn("⚠️ Aviso al registrar token en la base de datos central:", data.message);
      }
    } catch (err) {
      console.error("Error al registrar token en backend:", err);
    }
  };

  // Guardar historial en localStorage
  useEffect(() => {
    try {
      localStorage.setItem("bnb_deployed_tokens", JSON.stringify(deployedTokens));
    } catch (e) {
      console.error("Error al guardar en localStorage:", e);
    }
  }, [deployedTokens]);

  // Sincronizar tokens locales existentes con la base de datos central (Fase 3)
  useEffect(() => {
    const syncLocalTokens = async () => {
      if (!deployedTokens || deployedTokens.length === 0) return;
      for (const token of deployedTokens) {
        try {
          await fetch(`${API_BASE_URL}/tokens`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(token)
          });
        } catch (_) {}
      }
    };
    syncLocalTokens();
  }, []);


  // Cargar estadísticas de red periódicamente
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const activeChain = chainId === 56 ? 56 : 97;
        const res = await fetch(`${API_BASE_URL}/network/stats?chainId=${activeChain}`);
        const data = await res.json();
        if (data.success) {
          setNetworkStats(data);
        }
      } catch (err) {
        // Fallback local si la API aún no está disponible
        setNetworkStats({
          gasPriceGwei: "3.00",
          estimatedDeployCostBNB: "0.0045"
        });
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [chainId]);

  // Ejecutar animación de confeti al desplegar con éxito
  const fireConfetti = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#F0B90B", "#FCD535", "#10B981", "#ffffff"]
      });
    } catch (_) {}
  };

  // Validaciones del formulario
  const validateForm = () => {
    const errors = [];
    if (!formData.name.trim()) errors.push("El nombre del token es obligatorio.");
    if (!formData.symbol.trim()) errors.push("El símbolo del token es obligatorio.");
    if (isNaN(Number(formData.decimals)) || Number(formData.decimals) < 0 || Number(formData.decimals) > 18) {
      errors.push("Los decimales deben estar entre 0 y 18.");
    }
    if (isNaN(Number(formData.initialSupply)) || Number(formData.initialSupply) <= 0) {
      errors.push("El suministro debe ser mayor a 0.");
    }
    if (!formData.owner || !ethers.isAddress(formData.owner)) {
      errors.push("Ingresa una dirección de wallet administradora válida (0x...).");
    }
    return errors;
  };

  // Flujo completo de despliegue: Fase 2 (TokenFactory) o Flujo Directo Standalone
  const handleDeployToken = async (requestedMethod) => {
    // Solo si el usuario solicita explícitamente "direct", se usa flujo directo.
    // De lo contrario (sea "factory", undefined o evento submit), se usa STRICTLY "factory".
    const method = requestedMethod === "direct" ? "direct" : "factory";

    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 400, behavior: "smooth" });
      return;
    }
    setValidationErrors([]);

    if (!account || !signer) {
      await connectWallet();
      return;
    }

    const activeNetConfig = getNetworkConfig(chainId);

    // Candado de seguridad: Si la red activa está bloqueada para creación (como BSC Mainnet en preparación)
    if (!activeNetConfig.isAvailable) {
      setValidationErrors([
        activeNetConfig.disabledReason || "La creación de tokens en esta red está temporalmente desactivada. Cambia a BSC Testnet (Chain ID 97) para continuar."
      ]);
      window.scrollTo({ top: 400, behavior: "smooth" });
      return;
    }

    // Si la billetera está en una red no BSC
    if (chainId !== 97 && chainId !== 56) {
      const switched = await switchNetwork(97);
      if (!switched) {
        setValidationErrors([
          "Debes estar conectado a la red BNB Smart Chain para realizar la creación del token. Por favor, confirma el cambio de red en MetaMask."
        ]);
        window.scrollTo({ top: 400, behavior: "smooth" });
        return;
      }
    }

    // Comprobar saldo nativo según la red
    const currentBnbBalance = parseFloat(balance);
    const requiredFee = parseFloat(activeNetConfig.factoryFee || "0.01");
    const minRequired = method === "factory" ? (requiredFee + 0.004) : 0.003;
    if (!isNaN(currentBnbBalance) && currentBnbBalance < minRequired) {
      const msg = method === "factory"
        ? `Saldo insuficiente de ${activeNetConfig.symbol} en ${activeNetConfig.shortName} (tu saldo actual es ${balance} ${activeNetConfig.symbol}). Para crear el token a través de TokenFactory se requiere la comisión de servicio de ${activeNetConfig.factoryFee} ${activeNetConfig.symbol} más gas (~0.003 a 0.005 ${activeNetConfig.symbol}). ${activeNetConfig.isTestnet ? "Haz clic en el botón 'tBNB Faucet' en la barra superior para recibir saldo gratis." : ""}`
        : `Saldo insuficiente de ${activeNetConfig.symbol} para pagar el gas de despliegue directo en ${activeNetConfig.shortName} (tu saldo actual es ${balance} ${activeNetConfig.symbol}). Se necesitan aproximadamente ~0.003 a 0.005 ${activeNetConfig.symbol} de gas.`;
      setValidationErrors([msg]);
      window.scrollTo({ top: 400, behavior: "smooth" });
      return;
    }

    setIsDeploying(true);
    setIsModalOpen(true);
    setCreatedTokenResult(null);
    setDeploymentState({
      step: 1,
      status: "loading",
      method: method,
      txHash: null,
      contractAddress: null,
      error: null,
      tokenData: { ...formData, method }
    });

    try {
      if (method === "factory") {
        // ============================================
        // FLUJO FASE 2: CREACIÓN MEDIANTE TOKENFACTORY
        // ============================================
        const artifactRes = await fetch(`${API_BASE_URL}/contract/factory-artifact`);
        const artifactData = await artifactRes.json();

        if (!artifactData.success || !artifactData.abi) {
          throw new Error("No se pudo obtener el artefacto compilado de TokenFactory desde el servidor.");
        }

        // Dirección de TokenFactory según la red activa
        const factoryAddress = activeNetConfig.factoryAddress;
        if (!factoryAddress) {
          throw new Error(`No hay un contrato TokenFactory configurado para la red ${activeNetConfig.chainName}.`);
        }
        const factoryContract = new ethers.Contract(factoryAddress, artifactData.abi, signer);

        // Paso 2: Firma en MetaMask con destino a TokenFactory y valor configurado
        setDeploymentState(prev => ({ ...prev, step: 2, method: "factory" }));

        const feeWei = ethers.parseEther(activeNetConfig.factoryFee || "0.01");
        const tx = await factoryContract.createToken(
          formData.name.trim(),
          formData.symbol.trim().toUpperCase(),
          Number(formData.decimals),
          formData.initialSupply.toString(),
          Boolean(formData.canBurn),
          Boolean(formData.canMint),
          { value: feeWei }
        );

        // Paso 3: Minado en BNB Smart Chain Testnet
        setDeploymentState(prev => ({ ...prev, step: 3, txHash: tx.hash, method: "factory" }));

        const receipt = await tx.wait();

        // Extraer la dirección del token desde el evento TokenCreated
        let deployedTokenAddress = null;
        for (const log of receipt.logs) {
          try {
            const parsedLog = factoryContract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === "TokenCreated") {
              deployedTokenAddress = parsedLog.args.tokenAddress;
              break;
            }
          } catch (_) {}
        }

        if (!deployedTokenAddress) {
          const userTokens = await factoryContract.getUserTokens(account);
          if (userTokens && userTokens.length > 0) {
            deployedTokenAddress = userTokens[userTokens.length - 1];
          }
        }

        if (!deployedTokenAddress) {
          throw new Error("No se pudo identificar la dirección del token creado por el Factory.");
        }

        // Paso 4: ¡Éxito!
        setDeploymentState(prev => ({
          ...prev,
          status: "success",
          method: "factory",
          contractAddress: deployedTokenAddress,
          txHash: tx.hash
        }));

        fireConfetti();
        refreshBalance();

        // Guardar en historial local y base de datos central
        const currentNet = activeNetConfig;
        const newTokenRecord = {
          name: formData.name.trim(),
          symbol: formData.symbol.trim().toUpperCase(),
          decimals: Number(formData.decimals),
          initialSupply: formData.initialSupply,
          address: deployedTokenAddress,
          owner: account,
          creatorAddress: account,
          canBurn: formData.canBurn,
          canMint: formData.canMint,
          chainId: currentNet.chainIdDecimal,
          networkName: currentNet.chainName,
          txHash: tx.hash,
          timestamp: Date.now(),
          creationMethod: "factory",
          factoryAddress: factoryAddress,
          feePaid: `${currentNet.factoryFee} ${currentNet.symbol}`
        };

        setDeployedTokens(prev => [newTokenRecord, ...prev]);
        registerTokenInBackend(newTokenRecord);

        // Cerrar automáticamente el modal/estado de creación y mostrar pantalla de resultado
        setIsModalOpen(false);
        setIsDeploying(false);
        setCreatedTokenResult(newTokenRecord);

        // Desplazar suavemente a la pantalla de resultado para PC y móvil
        setTimeout(() => {
          const resultElem = document.getElementById("token-result-screen");
          if (resultElem) {
            resultElem.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);

      } else {
        // ============================================
        // FLUJO ORIGINAL: DESPLIEGUE DIRECTO STANDALONE
        // ============================================
        const artifactRes = await fetch(`${API_BASE_URL}/contract/artifact`);
        const artifactData = await artifactRes.json();

        if (!artifactData.success || !artifactData.abi || !artifactData.bytecode) {
          throw new Error("No se pudo obtener el artefacto compilado del contrato desde el servidor.");
        }

        // Paso 2: Preparar Factory y solicitar firma a MetaMask
        setDeploymentState(prev => ({ ...prev, step: 2, method: "direct" }));

        const factory = new ethers.ContractFactory(
          artifactData.abi,
          artifactData.bytecode,
          signer
        );

        // Despliegue con parámetros: (name, symbol, decimals, initialSupply, owner, canBurn, canMint)
        const contract = await factory.deploy(
          formData.name.trim(),
          formData.symbol.trim().toUpperCase(),
          Number(formData.decimals),
          formData.initialSupply.toString(),
          ethers.getAddress(formData.owner.trim()),
          Boolean(formData.canBurn),
          Boolean(formData.canMint)
        );

        const deployTx = contract.deploymentTransaction();
        const txHash = deployTx ? deployTx.hash : null;

        // Paso 3: Esperar minado en la blockchain
        setDeploymentState(prev => ({
          ...prev,
          step: 3,
          txHash,
          method: "direct"
        }));

        await contract.waitForDeployment();
        const deployedAddress = await contract.getAddress();

        // Paso 4: ¡Éxito!
        setDeploymentState(prev => ({
          ...prev,
          status: "success",
          method: "direct",
          contractAddress: deployedAddress,
          txHash
        }));

        fireConfetti();
        refreshBalance();

        // Guardar en historial local y base de datos central
        const currentNet = NETWORKS[chainId] || NETWORKS[97];
        const newTokenRecord = {
          name: formData.name.trim(),
          symbol: formData.symbol.trim().toUpperCase(),
          decimals: Number(formData.decimals),
          initialSupply: formData.initialSupply,
          address: deployedAddress,
          owner: formData.owner.trim(),
          creatorAddress: formData.owner.trim(),
          canBurn: formData.canBurn,
          canMint: formData.canMint,
          chainId: currentNet.chainIdDecimal,
          networkName: currentNet.chainName,
          txHash,
          timestamp: Date.now(),
          creationMethod: "direct",
          feePaid: "0 tBNB"
        };

        setDeployedTokens(prev => [newTokenRecord, ...prev]);
        registerTokenInBackend(newTokenRecord);

        // Cerrar automáticamente el modal/estado de creación y mostrar pantalla de resultado
        setIsModalOpen(false);
        setIsDeploying(false);
        setCreatedTokenResult(newTokenRecord);

        // Desplazar suavemente a la pantalla de resultado para PC y móvil
        setTimeout(() => {
          const resultElem = document.getElementById("token-result-screen");
          if (resultElem) {
            resultElem.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }

    } catch (err) {
      console.error("Error durante el despliegue:", err);
      let friendlyError = err.message;
      const errMsg = (err.message || "").toLowerCase();

      if (err.code === 4001 || err.code === "ACTION_REJECTED" || errMsg.includes("user rejected") || errMsg.includes("user denied")) {
        friendlyError = "Rechazaste la transacción de despliegue en la ventana de MetaMask.";
      } else if (err.code === "INSUFFICIENT_FUNDS" || errMsg.includes("insufficient funds")) {
        friendlyError = "Saldo de tBNB insuficiente en tu MetaMask para cubrir el costo. Utiliza el enlace 'tBNB Faucet' en la parte superior para obtener tokens de gas gratuitos de la red de pruebas.";
      } else if (errMsg.includes("tarifa de servicio insuficiente")) {
        friendlyError = "La transacción requiere exactamente 0.01 tBNB de comisión para el TokenFactory.";
      } else if (errMsg.includes("gas required exceeds allowance") || errMsg.includes("always failing transaction")) {
        friendlyError = "La estimación de gas falló. Comprueba que los parámetros del token sean válidos y que tu wallet tenga al menos 0.015 tBNB.";
      }

      setDeploymentState(prev => ({
        ...prev,
        status: "error",
        error: friendlyError
      }));
    } finally {
      setIsDeploying(false);
    }
  };

  // Manejo de verificación en BscScan
  const handleVerifyContract = async (contractAddress) => {
    try {
      const activeChain = chainId === 56 ? 56 : 97;
      const res = await fetch(`${API_BASE_URL}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          contractName: "StandardBEP20",
          chainId: activeChain,
          constructorArgs: [
            formData.name.trim(),
            formData.symbol.trim().toUpperCase(),
            Number(formData.decimals),
            formData.initialSupply.toString(),
            ethers.getAddress(formData.owner.trim()),
            Boolean(formData.canBurn),
            Boolean(formData.canMint)
          ]
        })
      });

      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("¿Seguro que deseas limpiar el historial local de tokens creados?")) {
      setDeployedTokens([]);
      localStorage.removeItem("bnb_deployed_tokens");
    }
  };

  return (
    <div className="app-container">
      {/* Navbar con selector de red, MetaMask y pestañas de navegación (Fase 3) */}
      <Navbar 
        account={account}
        chainId={chainId}
        balance={balance}
        isConnecting={isConnecting}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        switchNetwork={switchNetwork}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Alerta si está en una red no BSC */}
      <NetworkBanner 
        chainId={chainId} 
        switchNetwork={switchNetwork} 
      />

      {/* Aviso de error o estado de billetera */}
      {web3Error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          borderRadius: "var(--radius-md)",
          padding: "14px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#fca5a5",
          gap: "12px",
          animation: "modalAppear 0.2s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.88rem" }}>
            <AlertCircle size={18} style={{ flexShrink: 0, color: "var(--danger)" }} />
            <span>{web3Error}</span>
          </div>
          <button 
            onClick={clearError}
            style={{
              background: "transparent",
              border: "none",
              color: "#fca5a5",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center"
            }}
            title="Descartar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Renderizado Condicional según Pestaña Activa: Forjar Token vs Explorar Tokens */}
      {activeTab === "explore" ? (
        <TokenExplorer 
          account={account}
          chainId={chainId}
          onAddToMetaMask={addTokenToMetaMask}
          onNavigateToForge={() => {
            setActiveTab("forge");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : (
        <>
          {/* Banner de Estado según la Red Activa */}
          {chainId === 56 ? (
            <div className="factory-status-banner" style={{ borderColor: "rgba(240, 185, 11, 0.3)" }}>
              <div className="factory-banner-info">
                <span className="factory-badge" style={{ background: "rgba(240, 185, 11, 0.15)", color: "var(--bnb-gold)" }}>
                  <Sparkles size={12} /> BSC Mainnet · En Preparación
                </span>
                <h3 className="factory-banner-title">TokenFactory en BSC Mainnet (Bloqueado)</h3>
                <p className="factory-banner-desc">
                  La fábrica en Mainnet está en fase de preparación y desactivada para transacciones reales. Las pruebas se realizan exclusivamente en <strong>BSC Testnet (Chain ID 97)</strong>.
                </p>
              </div>
              <button 
                className="deploy-factory-btn"
                onClick={() => switchNetwork(97)}
                style={{ background: "var(--bnb-gold)", color: "#000", fontWeight: 700 }}
              >
                <Zap size={16} /> Cambiar a BSC Testnet
              </button>
            </div>
          ) : factoryInfo ? (
            <div className="factory-active-banner">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="factory-badge-active">✅ TokenFactory Activo</span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Fábrica oficial operativa en BSC Testnet
                </span>
              </div>
              <div className="factory-details-text">
                <span>Contrato: <strong style={{ fontFamily: "var(--font-mono)" }}>{shortenAddress(factoryInfo.address, 6)}</strong></span>
                <span>Red: <strong>BSC Testnet (Chain ID 97)</strong></span>
                <span>Comisión: <strong>{factoryInfo.fee || "0.01"} tBNB</strong></span>
                <span>Tesorería: <strong style={{ fontFamily: "var(--font-mono)" }}>{shortenAddress(factoryInfo.treasury || account, 4)}</strong></span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <a 
                  href={`https://testnet.bscscan.com/address/${factoryInfo.address}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="view-bscscan-link"
                  title="Ver contrato TokenFactory en BscScan Testnet"
                >
                  <ExternalLink size={14} /> BscScan
                </a>
                <button 
                  className="view-bscscan-link"
                  onClick={() => setIsFactoryModalOpen(true)}
                  style={{ cursor: "pointer", background: "none" }}
                >
                  Ver Detalles
                </button>
              </div>
            </div>
          ) : (
            <div className="factory-status-banner">
              <div className="factory-banner-info">
                <span className="factory-badge">
                  <Sparkles size={12} /> Fase 2: Despliegue Oficial
                </span>
                <h3 className="factory-banner-title">Desplegar TokenFactory.sol en BSC Testnet</h3>
                <p className="factory-banner-desc">
                  Configura la fábrica descentralizada con <strong>comisión de 0.01 tBNB</strong> y tesorería asignada a tu wallet MetaMask conectada.
                </p>
              </div>
              <button 
                className="deploy-factory-btn"
                onClick={() => setIsFactoryModalOpen(true)}
              >
                <Zap size={16} /> Desplegar TokenFactory
              </button>
            </div>
          )}

          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-pill">
              <Zap size={14} /> Estándar BEP-20 Auditado · OpenZeppelin v5.0
            </div>
            <h1 className="hero-title">
              Crea tu Token en <span className="hero-title-gradient">BNB Smart Chain</span>
            </h1>
            <p className="hero-description">
              Configura y despliega tu propia criptomoneda BEP-20 en segundos. Firma de forma 100% segura y sin custodia directamente desde tu billetera MetaMask.
            </p>

            <div className="hero-features">
              <div className="feature-tag">
                <Sparkles size={14} /> Despliegue en 1 Clic
              </div>
              <div className="feature-tag">
                <ShieldCheck size={14} /> 100% Sin Custodia
              </div>
              <div className="feature-tag">
                <Layers size={14} /> Verificable en BscScan
              </div>
              <div className="feature-tag">
                <Flame size={14} /> Quema y Emisión Opcional
              </div>
            </div>
          </section>

          {/* Grid Principal: Formulario / Pantalla de Resultado + Vista Previa Holográfica */}
          <main className="workspace-grid" id="token-result-screen">
            {createdTokenResult ? (
              <TokenResultScreen 
                token={createdTokenResult}
                onAddToMetaMask={addTokenToMetaMask}
                onVerifyContract={handleVerifyContract}
                onCreateAnother={() => setCreatedTokenResult(null)}
                chainId={chainId}
              />
            ) : (
              <TokenForm 
                formData={formData}
                setFormData={setFormData}
                account={account}
                chainId={chainId}
                onDeploy={handleDeployToken}
                isDeploying={isDeploying}
                validationErrors={validationErrors}
                connectWallet={connectWallet}
                deployMode={deployMode}
                setDeployMode={setDeployMode}
              />
            )}

            <TokenPreview 
              formData={createdTokenResult || formData}
              chainId={chainId}
              networkStats={networkStats}
            />
          </main>

          {/* Historial de Tokens Creados */}
          <DeployedTokensList 
            tokens={deployedTokens}
            onClearHistory={handleClearHistory}
            onAddToMetaMask={addTokenToMetaMask}
          />
        </>
      )}


      {/* Modal Interactivo de Despliegue */}
      <DeploymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deploymentState={deploymentState}
        chainId={chainId}
        onAddToMetaMask={addTokenToMetaMask}
        onVerifyContract={handleVerifyContract}
      />

      {/* Modal de Despliegue de TokenFactory (Fase 2) */}
      <FactoryDeployModal 
        isOpen={isFactoryModalOpen}
        onClose={() => setIsFactoryModalOpen(false)}
        account={account}
        chainId={chainId}
        balance={balance}
        onSuccess={(deployedData) => {
          setFactoryInfo({
            address: deployedData.address,
            treasury: deployedData.treasury,
            fee: "0.01"
          });
          refreshBalance();
        }}
      />
    </div>
  );
}
