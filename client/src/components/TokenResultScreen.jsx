import React, { useState } from "react";
import { 
  CheckCircle2, 
  PlusCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Loader2, 
  ArrowUpRight,
  RotateCcw,
  Sparkles,
  Coins
} from "lucide-react";
import { NETWORKS } from "../utils/constants";
import { shortenAddress, formatNumber } from "../utils/formatters";

export function TokenResultScreen({
  token,
  onAddToMetaMask,
  onVerifyContract,
  onCreateAnother,
  chainId
}) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [addedToWallet, setAddedToWallet] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null); // 'verifying' | 'success' | 'error'
  const [verificationMsg, setVerificationMsg] = useState("");

  if (!token) return null;

  const currentNetwork = NETWORKS[chainId] || NETWORKS[token.chainId] || NETWORKS[97];
  const explorerUrl = currentNetwork.blockExplorerUrls[0];
  const isFactory = token.creationMethod === "factory";

  const handleCopy = () => {
    navigator.clipboard.writeText(token.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleAddToken = async () => {
    const success = await onAddToMetaMask(token.address, token.symbol, token.decimals);
    if (success) {
      setAddedToWallet(true);
      setTimeout(() => setAddedToWallet(false), 3000);
    }
  };

  const handleVerify = async () => {
    if (!onVerifyContract) return;
    setVerificationStatus("verifying");
    setVerificationMsg("Enviando código fuente a BscScan...");
    const res = await onVerifyContract(token.address);
    if (res.success) {
      setVerificationStatus("success");
      setVerificationMsg("¡Código verificado exitosamente en BscScan!");
    } else {
      setVerificationStatus("error");
      setVerificationMsg(res.message || "No se pudo verificar automáticamente.");
    }
  };

  return (
    <div className="glass-card" style={{ border: "1px solid rgba(16, 185, 129, 0.4)", animation: "modalAppear 0.3s ease" }}>
      {/* Cabecera de Éxito */}
      <div className="card-header" style={{ borderBottomColor: "rgba(16, 185, 129, 0.2)" }}>
        <div className="card-title-group">
          <CheckCircle2 size={22} style={{ color: "var(--emerald)" }} />
          <div>
            <h2 className="card-title" style={{ color: "var(--emerald)" }}>
              ¡Token Creado con Éxito!
            </h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Contrato desplegado y minado en BNB Smart Chain
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span className="bep20-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--emerald)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
            Activo On-Chain
          </span>
        </div>
      </div>

      {/* Resumen del Método y Red */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: isFactory ? "rgba(240, 185, 11, 0.08)" : "rgba(6, 182, 212, 0.08)",
        border: `1px solid ${isFactory ? "rgba(240, 185, 11, 0.25)" : "rgba(6, 182, 212, 0.25)"}`,
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        marginBottom: "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={16} style={{ color: isFactory ? "var(--bnb-gold)" : "var(--cyan)" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isFactory ? "var(--bnb-gold)" : "var(--cyan)" }}>
            {isFactory ? "Creado vía TokenFactory (Fase 2)" : "Despliegue Directo BEP-20"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className="network-chip" style={{ fontSize: "0.72rem" }}>
            <span className="network-dot testnet"></span>
            {currentNetwork.chainName}
          </span>
        </div>
      </div>

      {/* Tarjeta de Identidad del Token */}
      <div style={{
        background: "rgba(0, 0, 0, 0.3)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
        marginBottom: "16px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {token.name}
              <span className="bep20-badge" style={{ marginLeft: "8px" }}>
                ${token.symbol}
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Suministro Inicial: <strong style={{ color: "var(--bnb-gold-light)" }}>{formatNumber(token.initialSupply)}</strong> ${token.symbol}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            <div>Decimales: <strong style={{ color: "var(--text-primary)" }}>{token.decimals}</strong></div>
            <div>Tarifa: <strong style={{ color: isFactory ? "var(--bnb-gold)" : "var(--emerald)" }}>{token.feePaid || "0.01 tBNB"}</strong></div>
          </div>
        </div>

        {/* Dirección del Contrato */}
        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
          Dirección del Contrato Creado:
        </div>
        <div className="result-address-bar" style={{ marginBottom: "12px" }}>
          <span style={{ fontSize: "0.82rem" }}>{token.address}</span>
          <button 
            className="copy-btn" 
            onClick={handleCopy}
            title="Copiar dirección del contrato"
          >
            {copiedAddress ? <Check size={16} color="var(--emerald)" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Hash de Transacción */}
        {token.txHash && (
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Transacción de despliegue:</span>
            <a 
              href={`${explorerUrl}/tx/${token.txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: "var(--bnb-gold-light)", textDecoration: "none", fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: "4px" }}
              title="Ver transacción en BscScan"
            >
              {shortenAddress(token.txHash, 8)} <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {/* Botones de Acción */}
      <div className="action-buttons-group" style={{ marginTop: "12px" }}>
        {/* BOTÓN PRINCIPAL REQUERIDO: Agregar token a MetaMask */}
        <button 
          className="btn-metamask-add"
          onClick={handleAddToken}
          style={{
            padding: "14px",
            fontSize: "0.95rem",
            background: addedToWallet ? "rgba(16, 185, 129, 0.2)" : "rgba(240, 185, 11, 0.16)",
            borderColor: addedToWallet ? "var(--emerald)" : "var(--bnb-gold)",
            color: addedToWallet ? "var(--emerald)" : "var(--bnb-gold-light)"
          }}
          title="Importar token a tu extensión MetaMask"
        >
          {addedToWallet ? (
            <>
              <Check size={18} />
              <span>¡Token Agregado a MetaMask!</span>
            </>
          ) : (
            <>
              <PlusCircle size={18} />
              <span>Agregar token a MetaMask</span>
            </>
          )}
        </button>

        {/* Botón 2: Ver Contrato en BscScan */}
        <a 
          href={`${explorerUrl}/token/${token.address}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          <span>Abrir Contrato en BscScan</span>
          <ArrowUpRight size={16} />
        </a>

        {/* Botón 3: Verificar Código Fuente */}
        {onVerifyContract && (
          <button 
            className="btn-secondary"
            onClick={handleVerify}
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
                <span>¡Contrato Verificado en BscScan!</span>
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Verificar Código en BscScan</span>
              </>
            )}
          </button>
        )}

        {verificationMsg && (
          <div style={{ 
            fontSize: "0.78rem", 
            textAlign: "center",
            color: verificationStatus === "success" ? "var(--emerald)" : "var(--amber)"
          }}>
            {verificationMsg}
          </div>
        )}

        {/* Botón 4: PancakeSwap Link */}
        <a 
          href={`https://pancakeswap.finance/swap?outputCurrency=${token.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ opacity: 0.85 }}
        >
          <span>Crear Liquidez en PancakeSwap</span>
          <ExternalLink size={14} />
        </a>

        {/* Botón 5: Crear Otro Token */}
        <button 
          onClick={onCreateAnother}
          className="btn-secondary"
          style={{ 
            marginTop: "6px",
            background: "transparent",
            borderColor: "rgba(255, 255, 255, 0.15)",
            color: "var(--text-secondary)"
          }}
          title="Regresar al formulario para crear otro token"
        >
          <RotateCcw size={15} />
          <span>Crear Otro Token</span>
        </button>
      </div>
    </div>
  );
}
