import React, { useState } from "react";
import { 
  CheckCircle2, 
  X, 
  Loader2, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertCircle,
  PlusCircle,
  ShieldCheck,
  ArrowUpRight
} from "lucide-react";
import { NETWORKS } from "../utils/constants";
import { shortenAddress } from "../utils/formatters";

export function DeploymentModal({
  isOpen,
  onClose,
  deploymentState, // { step, status, txHash, contractAddress, error, tokenData }
  chainId,
  onAddToMetaMask,
  onVerifyContract
}) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null); // 'verifying', 'success', 'error'
  const [verificationMsg, setVerificationMsg] = useState("");

  if (!isOpen) return null;

  const currentNetwork = NETWORKS[chainId] || NETWORKS[97];
  const explorerUrl = currentNetwork.blockExplorerUrls[0];
  const { step, status, txHash, contractAddress, error, tokenData } = deploymentState;

  const handleCopyAddress = () => {
    if (!contractAddress) return;
    navigator.clipboard.writeText(contractAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleTriggerVerification = async () => {
    setVerificationStatus("verifying");
    setVerificationMsg("Enviando código fuente a BscScan...");
    const res = await onVerifyContract(contractAddress);
    if (res.success) {
      setVerificationStatus("success");
      setVerificationMsg("¡Código verificado exitosamente en BscScan!");
    } else {
      setVerificationStatus("error");
      setVerificationMsg(res.message || "No se pudo verificar automáticamente.");
    }
  };

  const isFactory = deploymentState?.method === "factory";
  const stepsList = [
    {
      id: 1,
      title: isFactory ? "Preparación de TokenFactory" : "Validación y Preparación",
      desc: isFactory 
        ? `Conectando con TokenFactory en ${currentNetwork.shortName || currentNetwork.chainName}` 
        : "Validando parámetros y compilando bytecode BEP-20",
    },
    {
      id: 2,
      title: "Firma en MetaMask",
      desc: isFactory 
        ? `Confirma llamada a createToken con valor de ${currentNetwork.factoryFee || "0.01"} ${currentNetwork.symbol}` 
        : "Confirma la transacción de despliegue en tu billetera",
    },
    {
      id: 3,
      title: "Minado en BNB Smart Chain",
      desc: `Esperando confirmación del bloque en ${currentNetwork.shortName}`,
    },
  ];

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">
            {status === "success" 
              ? "🎉 ¡Token Creado con Éxito!" 
              : status === "error" 
              ? "Error en la Transacción" 
              : isFactory ? "Creando en TokenFactory..." : `Desplegando en ${currentNetwork.shortName}...`}
          </h3>
          {status !== "loading" && (
            <button className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Tracker de pasos (mientras está en proceso o si completó) */}
        {status !== "error" && (
          <div className="steps-container">
            {stepsList.map((s) => {
              const isActive = step === s.id && status === "loading";
              const isCompleted = step > s.id || status === "success";

              return (
                <div 
                  key={s.id} 
                  className={`step-row ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                >
                  <div className="step-icon-wrapper">
                    {isCompleted ? (
                      <Check size={16} />
                    ) : isActive ? (
                      <Loader2 size={16} className="spinner-icon" />
                    ) : (
                      s.id
                    )}
                  </div>
                  <div className="step-text-group">
                    <div className="step-title">{s.title}</div>
                    <div className="step-desc">{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tarjeta de Verificación de Transacción en Vivo (durante carga) */}
        {status === "loading" && isFactory && (
          <div style={{
            background: "rgba(240, 185, 11, 0.08)",
            border: "1px solid rgba(240, 185, 11, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            marginBottom: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--bnb-gold)", fontWeight: 700, fontSize: "0.88rem", marginBottom: "10px" }}>
              <ShieldCheck size={16} />
              <span>Verificación de Transacción enviada a MetaMask</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Contrato Destino:</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--bnb-gold)", fontWeight: 600 }}>
                  {currentNetwork.factoryAddress || "No asignado"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Función:</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)", fontWeight: 600 }}>createToken(...)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Valor a Enviar (Value):</span>
                <span style={{ color: "var(--bnb-gold)", fontWeight: 800 }}>
                  {currentNetwork.factoryFee || "0.01"} {currentNetwork.symbol}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Red:</span>
                <span>{currentNetwork.chainName} (Chain ID {currentNetwork.chainIdDecimal})</span>
              </div>
            </div>
            <div style={{ marginTop: "10px", fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              ℹ️ Verifica en la ventana emergente de MetaMask que el destino sea <strong>{shortenAddress(currentNetwork.factoryAddress || "0x0000", 6)}</strong> y el valor sea <strong>{currentNetwork.factoryFee || "0.01"} {currentNetwork.symbol}</strong> antes de confirmar.
            </div>
          </div>
        )}

        {/* Estado: Éxito */}
        {status === "success" && (
          <div>
            <div className="success-result-box">
              <div className="success-header-row">
                <CheckCircle2 size={20} />
                <span>¡Contrato BEP-20 Desplegado en la Red!</span>
              </div>

              {/* Método de Creación */}
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                marginBottom: "10px", 
                background: deploymentState?.method === "factory" ? "rgba(240, 185, 11, 0.1)" : "rgba(6, 182, 212, 0.1)", 
                border: `1px solid ${deploymentState?.method === "factory" ? "rgba(240, 185, 11, 0.3)" : "rgba(6, 182, 212, 0.3)"}`, 
                padding: "8px 12px", 
                borderRadius: "var(--radius-sm)" 
              }}>
                <span style={{ fontSize: "0.8rem", color: deploymentState?.method === "factory" ? "var(--bnb-gold)" : "var(--cyan)", fontWeight: 700 }}>
                  {deploymentState?.method === "factory" ? "🏭 Creado vía TokenFactory (Fase 2)" : "🚀 Despliegue Directo BEP-20"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {deploymentState?.method === "factory" ? "Tarifa: 0.01 tBNB" : "Tarifa: 0 tBNB (Solo Gas)"}
                </span>
              </div>

              {/* Red Utilizada */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", background: "rgba(0,0,0,0.25)", padding: "8px 12px", borderRadius: "var(--radius-sm)" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Red Utilizada:</span>
                <span className="network-chip" style={{ fontSize: "0.72rem" }}>
                  <span className="network-dot testnet"></span>
                  {currentNetwork.chainName} ({currentNetwork.chainIdDecimal})
                </span>
              </div>

              {/* Dirección del Contrato */}
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Dirección del Contrato Creado:
              </div>
              <div className="result-address-bar">
                <span>{contractAddress}</span>
                <button 
                  className="copy-btn" 
                  onClick={handleCopyAddress}
                  title="Copiar dirección del contrato"
                >
                  {copiedAddress ? <Check size={15} color="var(--emerald)" /> : <Copy size={15} />}
                </button>
              </div>

              {/* Hash de Transacción */}
              {txHash && (
                <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Hash de Transacción:</span>
                  <a 
                    href={`${explorerUrl}/tx/${txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: "var(--bnb-gold-light)", textDecoration: "none", fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    {shortenAddress(txHash, 8)} <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Acciones de post-despliegue */}
            <div className="action-buttons-group">
              {/* Botón 1: Agregar a MetaMask */}
              <button 
                className="btn-metamask-add"
                onClick={() => onAddToMetaMask(contractAddress, tokenData.symbol, tokenData.decimals)}
              >
                <PlusCircle size={17} />
                <span>Agregar ${tokenData.symbol} a MetaMask</span>
              </button>

              {/* Botón 2: Ver Contrato en BscScan Testnet */}
              <a 
                href={`${explorerUrl}/token/${contractAddress}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                <span>Abrir Contrato en BscScan Testnet</span>
                <ArrowUpRight size={16} />
              </a>

              {/* Botón 3: Verificar Código Fuente */}
              <button 
                className="btn-secondary"
                onClick={handleTriggerVerification}
                disabled={verificationStatus === "verifying" || verificationStatus === "success"}
              >
                {verificationStatus === "verifying" ? (
                  <>
                    <Loader2 size={16} className="spinner-icon" />
                    <span>Verificando en BscScan...</span>
                  </>
                ) : verificationStatus === "success" ? (
                  <>
                    <ShieldCheck size={16} color="var(--emerald)" />
                    <span>¡Contrato Verificado!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Verificar Código en BscScan</span>
                  </>
                )}
              </button>

              {verificationMsg && (
                <div style={{ 
                  fontSize: "0.78rem", 
                  textAlign: "center",
                  color: verificationStatus === "success" ? "var(--emerald)" : "var(--amber)"
                }}>
                  {verificationMsg}
                </div>
              )}

              {/* Botón 4: PancakeSwap link */}
              <a 
                href={`https://pancakeswap.finance/swap?outputCurrency=${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ opacity: 0.8 }}
              >
                <span>Crear Liquidez en PancakeSwap</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}

        {/* Estado: Error */}
        {status === "error" && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "20px",
            margin: "20px 0"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--danger)", fontWeight: "700", marginBottom: "8px" }}>
              <AlertCircle size={20} />
              <span>No se pudo completar el despliegue</span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#fca5a5", lineHeight: "1.5" }}>
              {error || "Ocurrió un error inesperado al procesar la transacción."}
            </div>
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button 
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: "8px 16px", fontSize: "0.82rem" }}
              >
                Entendido, cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
