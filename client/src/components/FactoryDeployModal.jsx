import React, { useState } from "react";
import { 
  CheckCircle2, 
  X, 
  Loader2, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertCircle,
  ShieldCheck,
  Zap,
  Layers
} from "lucide-react";
import { shortenAddress } from "../utils/formatters";

export function FactoryDeployModal({
  isOpen,
  onClose,
  account,
  chainId,
  balance,
  onSuccess
}) {
  const [status, setStatus] = useState("idle"); // 'idle' | 'preparing' | 'signing' | 'mining' | 'success' | 'error'
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [factoryAddress, setFactoryAddress] = useState(null);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  if (!isOpen) return null;

  const isBscTestnet = chainId === 97;
  const configuredFee = "0.01"; // 0.01 tBNB

  const handleDeploy = async () => {
    if (!isBscTestnet) {
      setErrorMsg("Debes estar conectado a BNB Smart Chain Testnet (Chain ID 97) para desplegar TokenFactory.");
      setStatus("error");
      return;
    }

    if (!account) {
      setErrorMsg("Conecta tu billetera MetaMask primero.");
      setStatus("error");
      return;
    }

    const currentBal = parseFloat(balance);
    if (!isNaN(currentBal) && currentBal < 0.003) {
      setErrorMsg(`Saldo insuficiente de tBNB para pagar el gas de despliegue en BSC Testnet (saldo actual: ${balance} tBNB). Solicita tBNB gratis en el faucet.`);
      setStatus("error");
      return;
    }

    try {
      setStatus("preparing");
      setStep(1);
      setErrorMsg(null);

      // 1. Obtener ABI y Bytecode exclusivos de TokenFactory
      const res = await fetch("http://localhost:5000/api/contract/factory-artifact");
      const artifact = await res.json();

      if (!artifact.success || !artifact.bytecode || !artifact.abi) {
        throw new Error("No se pudo obtener el artefacto compilado de TokenFactory.sol");
      }

      if (artifact.contractName !== "TokenFactory") {
        throw new Error("El artefacto recibido no corresponde a TokenFactory.sol");
      }

      // 2. Preparar el despliegue con ethers y MetaMask
      setStatus("signing");
      setStep(2);

      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const factory = new ethers.ContractFactory(
        artifact.abi,
        artifact.bytecode,
        signer
      );

      // Parámetros solicitados por el usuario:
      // initialOwner_: account (MetaMask)
      // treasuryWallet_: account (MetaMask)
      // initialFee_: 0.01 tBNB (10000000000000000 wei)
      const initialFeeWei = ethers.parseEther(configuredFee);

      const contract = await factory.deploy(
        account,
        account,
        initialFeeWei
      );

      const hash = contract.deploymentTransaction()?.hash;
      setTxHash(hash);

      // 3. Minando en BNB Smart Chain Testnet
      setStatus("mining");
      setStep(3);

      await contract.waitForDeployment();
      const deployedAddress = await contract.getAddress();

      setFactoryAddress(deployedAddress);
      setStatus("success");

      // Guardar en almacenamiento local
      localStorage.setItem("bnb_factory_address", deployedAddress);
      localStorage.setItem("bnb_factory_treasury", account);
      localStorage.setItem("bnb_factory_fee", configuredFee);

      if (onSuccess) {
        onSuccess({
          address: deployedAddress,
          txHash: hash,
          network: "BNB Smart Chain Testnet (Chain ID 97)",
          treasury: account,
          serviceFee: `${configuredFee} tBNB`
        });
      }
    } catch (err) {
      console.error("Error al desplegar TokenFactory:", err);
      let message = err.message || "Error desconocido durante el despliegue.";
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        message = "Transacción rechazada por el usuario en MetaMask.";
      }
      setErrorMsg(message);
      setStatus("error");
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "addr") {
      setCopiedAddr(true);
      setTimeout(() => setCopiedAddr(false), 2000);
    } else {
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
  };

  const stepsList = [
    {
      id: 1,
      title: "1. Carga de Artefacto",
      desc: "Verificando bytecode y ABI exclusivo de TokenFactory.sol"
    },
    {
      id: 2,
      title: "2. Firma en MetaMask",
      desc: "Confirma la transacción de despliegue en tu extensión MetaMask"
    },
    {
      id: 3,
      title: "3. Minado en BSC Testnet",
      desc: "Esperando confirmación del bloque en BNB Smart Chain Testnet"
    }
  ];

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: "600px" }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="status-indicator-icon success" style={{ width: "32px", height: "32px", fontSize: "16px" }}>
              <Layers size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: "1.15rem" }}>
                {status === "success" 
                  ? "🎉 ¡TokenFactory Desplegado con Éxito!" 
                  : "Despliegue de TokenFactory.sol"}
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Fábrica oficial descentralizada en BSC Testnet (Chain ID 97)
              </span>
            </div>
          </div>
          {status !== "signing" && status !== "mining" && (
            <button className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Alerta de Red Incorrecta */}
          {!isBscTestnet && (
            <div className="validation-error-box" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Red no autorizada detectada:</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                    Este despliegue está estrictamente configurado para <strong>BNB Smart Chain Testnet (Chain ID 97)</strong>. No está permitido el despliegue en Mainnet. Por favor cambia de red en MetaMask.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Estado Inicial / Configuración Previa */}
          {status === "idle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{
                background: "rgba(240, 185, 11, 0.06)",
                border: "1px solid rgba(240, 185, 11, 0.2)",
                borderRadius: "var(--radius-md)",
                padding: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--bnb-gold)", fontWeight: 600, marginBottom: "10px" }}>
                  <ShieldCheck size={18} />
                  <span>Verificaciones Previas de Seguridad</span>
                </div>
                
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.86rem" }}>
                  <li style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Contrato a desplegar:</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>TokenFactory.sol</span>
                  </li>
                  <li style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Tipo de contrato:</span>
                    <span style={{ color: "var(--emerald)", fontWeight: 600 }}>Fábrica BEP-20 (No es StandardBEP20)</span>
                  </li>
                  <li style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Red destino:</span>
                    <span style={{ color: "var(--bnb-gold)", fontWeight: 600 }}>BNB Smart Chain Testnet (Chain ID 97)</span>
                  </li>
                  <li style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Propietario Inicial (Admin):</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{account ? shortenAddress(account, 6) : "No conectado"}</span>
                  </li>
                  <li style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Wallet de Tesorería:</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{account ? shortenAddress(account, 6) : "No conectado"}</span>
                  </li>
                  <li style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Comisión de Servicio inicial:</span>
                    <span style={{ color: "var(--bnb-gold)", fontWeight: 700 }}>0.01 tBNB</span>
                  </li>
                </ul>
              </div>

              <div style={{
                background: "rgba(16, 21, 32, 0.6)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                fontSize: "0.82rem",
                color: "var(--text-secondary)"
              }}>
                ℹ️ Al hacer clic en <strong>"Desplegar TokenFactory con MetaMask"</strong>, se enviará la solicitud de despliegue a tu extensión MetaMask para que apruebes la transacción en BSC Testnet.
              </div>

              <button
                className="submit-deploy-btn"
                onClick={handleDeploy}
                disabled={!isBscTestnet || !account}
                style={{ width: "100%", padding: "14px", marginTop: "4px" }}
              >
                <Zap size={18} />
                <span>Desplegar TokenFactory con MetaMask</span>
              </button>
            </div>
          )}

          {/* Proceso en Curso */}
          {(status === "preparing" || status === "signing" || status === "mining") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="steps-container" style={{ margin: "10px 0" }}>
                {stepsList.map((s) => {
                  const isActive = step === s.id;
                  const isCompleted = step > s.id;

                  return (
                    <div 
                      key={s.id} 
                      className={`step-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                    >
                      <div className="step-circle">
                        {isCompleted ? (
                          <Check size={16} />
                        ) : isActive ? (
                          <Loader2 size={16} className="spinning" />
                        ) : (
                          s.id
                        )}
                      </div>
                      <div className="step-text">
                        <div className="step-title">{s.title}</div>
                        <div className="step-desc">{s.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                background: "rgba(240, 185, 11, 0.08)",
                border: "1px solid rgba(240, 185, 11, 0.2)",
                borderRadius: "var(--radius-md)",
                padding: "14px",
                textAlign: "center"
              }}>
                <Loader2 size={24} className="spinning" style={{ color: "var(--bnb-gold)", margin: "0 auto 8px" }} />
                <div style={{ fontWeight: 600, color: "var(--bnb-gold)" }}>
                  {status === "signing" && "Abre y confirma la transacción en la ventana emergente de MetaMask..."}
                  {status === "mining" && "Minando transacción en BSC Testnet... Esperando confirmación..."}
                  {status === "preparing" && "Compilando y cargando artefactos..."}
                </div>
                {txHash && (
                  <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Tx Hash: <span style={{ fontFamily: "var(--font-mono)" }}>{shortenAddress(txHash, 8)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Éxito: Desplegado */}
          {status === "success" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "var(--radius-md)",
                padding: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--emerald)", fontWeight: 700, marginBottom: "14px", fontSize: "1.05rem" }}>
                  <CheckCircle2 size={22} />
                  <span>TokenFactory.sol desplegado y verificado</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.88rem" }}>
                  {/* Dirección del Factory */}
                  <div>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Dirección de TokenFactory:</span>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(0, 0, 0, 0.3)",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      marginTop: "4px"
                    }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--bnb-gold)", wordBreak: "break-all" }}>
                        {factoryAddress}
                      </span>
                      <button
                        onClick={() => copyToClipboard(factoryAddress, "addr")}
                        style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px", marginLeft: "8px" }}
                        title="Copiar dirección"
                      >
                        {copiedAddr ? <Check size={16} style={{ color: "var(--emerald)" }} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Hash de la Tx */}
                  <div>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Hash de la Transacción:</span>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "rgba(0, 0, 0, 0.3)",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      marginTop: "4px"
                    }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--text-primary)", wordBreak: "break-all" }}>
                        {txHash}
                      </span>
                      <div style={{ display: "flex", gap: "6px", marginLeft: "8px" }}>
                        <button
                          onClick={() => copyToClipboard(txHash, "tx")}
                          style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
                          title="Copiar Hash"
                        >
                          {copiedTx ? <Check size={16} style={{ color: "var(--emerald)" }} /> : <Copy size={16} />}
                        </button>
                        <a
                          href={`https://testnet.bscscan.com/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--bnb-gold)", display: "flex", alignItems: "center", padding: "4px" }}
                          title="Ver en BscScan Testnet"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Red */}
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Red:</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>BNB Smart Chain Testnet (Chain ID 97)</span>
                  </div>

                  {/* Treasury */}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Treasury Configurada:</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--text-primary)" }}>{account}</span>
                  </div>

                  {/* Fee */}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Service Fee Configurada:</span>
                    <span style={{ fontWeight: 700, color: "var(--bnb-gold)" }}>0.01 tBNB</span>
                  </div>
                </div>
              </div>

              <div style={{
                background: "rgba(16, 21, 32, 0.6)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                fontSize: "0.82rem",
                color: "var(--text-secondary)"
              }}>
                🔒 <strong>Seguridad:</strong> El contrato TokenFactory quedó desplegado y registrado. No se ha ejecutado ninguna creación de token automática, tal como solicitaste.
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <a
                  href={`https://testnet.bscscan.com/address/${factoryAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-outline-btn"
                  style={{ flex: 1, textDecoration: "none", textAlign: "center", justifyContent: "center" }}
                >
                  <ExternalLink size={16} />
                  <span>Ver Factory en BscScan</span>
                </a>
                <button
                  className="submit-deploy-btn"
                  onClick={onClose}
                  style={{ flex: 1, padding: "10px" }}
                >
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="validation-error-box">
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <AlertCircle size={20} style={{ color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong>No se pudo completar el despliegue:</strong>
                    <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "#fca5a5" }}>
                      {errorMsg}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="secondary-outline-btn"
                  onClick={() => setStatus("idle")}
                  style={{ flex: 1 }}
                >
                  <span>Reintentar</span>
                </button>
                <button
                  className="secondary-outline-btn"
                  onClick={onClose}
                  style={{ flex: 1 }}
                >
                  <span>Cancelar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
