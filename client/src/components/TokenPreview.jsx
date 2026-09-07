import React, { useState } from "react";
import { 
  Copy, 
  Check, 
  Fuel, 
  ShieldCheck, 
  Flame, 
  Gem, 
  Lock, 
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { NETWORKS } from "../utils/constants";
import { formatNumber, shortenAddress } from "../utils/formatters";

export function TokenPreview({ formData, chainId, networkStats }) {
  const [copied, setCopied] = useState(false);
  const currentNetwork = NETWORKS[chainId] || NETWORKS[97];
  const isTestnet = chainId === 97;

  const handleCopyOwner = () => {
    if (!formData.owner) return;
    navigator.clipboard.writeText(formData.owner);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const symbolInitial = formData.symbol ? formData.symbol.slice(0, 3) : "BNB";

  // Gas estimado
  const gasPriceGwei = networkStats?.gasPriceGwei || "3.00";
  const estimatedBNB = networkStats?.estimatedDeployCostBNB || "0.0045";
  const bnbPriceUSD = 600; // Referencia aproximada para cálculo informativo
  const estimatedUSD = (parseFloat(estimatedBNB) * bnbPriceUSD).toFixed(2);

  return (
    <div className="preview-container">
      {/* Tarjeta Holográfica del Token */}
      <div className="token-hologram-card">
        <div className="token-card-top">
          <div className="token-avatar-circle">
            {symbolInitial}
          </div>
          <div className="network-chip">
            <span className={`network-dot ${isTestnet ? "testnet" : ""}`}></span>
            {isTestnet ? "BSC Testnet" : "BSC Mainnet"}
          </div>
        </div>

        <div className="token-info-hero">
          <div className="token-name-large">
            {formData.name || "Nombre del Token"}
            <span className="token-symbol-badge">
              ${formData.symbol || "SYM"}
            </span>
          </div>

          <div className="token-supply-stat">
            <div className="supply-label">Suministro Total Inicial</div>
            <div className="supply-value">
              {formatNumber(formData.initialSupply)} <span style={{ fontSize: "0.9rem", color: "var(--bnb-gold-light)" }}>{formData.symbol || ""}</span>
            </div>
          </div>
        </div>

        <div className="token-spec-grid">
          <div className="spec-item">
            <div className="spec-label">Decimales</div>
            <div className="spec-val">{formData.decimals || 18}</div>
          </div>
          <div className="spec-item">
            <div className="spec-label">Estándar</div>
            <div className="spec-val">BEP-20 (EVM)</div>
          </div>
          <div className="spec-item" style={{ gridColumn: "span 2" }}>
            <div className="spec-label">Wallet Propietaria (Owner)</div>
            <div className="spec-val" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{formData.owner ? shortenAddress(formData.owner, 6) : "No asignada aún"}</span>
              {formData.owner && (
                <button 
                  onClick={handleCopyOwner}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                  title="Copiar dirección"
                >
                  {copied ? <Check size={14} color="var(--emerald)" /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Features activas */}
        <div className="features-pills-row">
          {!formData.canMint && (
            <span className="feature-pill-active standard">
              <Lock size={12} /> Suministro Fijo (Inmutable)
            </span>
          )}
          {formData.canBurn && (
            <span className="feature-pill-active burn">
              <Flame size={12} /> Quema Habilitada
            </span>
          )}
          {formData.canMint && (
            <span className="feature-pill-active mint">
              <Gem size={12} /> Emisión Habilitada
            </span>
          )}
        </div>
      </div>

      {/* Estimación de Gas y Costo */}
      <div className="gas-cost-card">
        <div className="gas-cost-info">
          <div className="gas-cost-title">
            <Fuel size={14} style={{ color: "var(--bnb-gold)" }} /> Costo Estimado de Gas
          </div>
          <div className="gas-cost-value">
            ~{estimatedBNB} {currentNetwork.nativeCurrency.symbol}
          </div>
          <div className="gas-fiat">
            {isTestnet ? "Costo: 0.00 USD (tBNB gratis de Faucet)" : `Aprox. $${estimatedUSD} USD (a ${gasPriceGwei} Gwei)`}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Red Gas Actual</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "600" }}>
            {gasPriceGwei} Gwei
          </div>
        </div>
      </div>

      {/* Caja de Confianza y Seguridad */}
      <div style={{
        background: "rgba(16, 185, 129, 0.05)",
        border: "1px solid rgba(16, 185, 129, 0.2)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px"
      }}>
        <ShieldCheck size={20} style={{ color: "var(--emerald)", flexShrink: 0, marginTop: "2px" }} />
        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
          <strong style={{ color: "#fff" }}>Despliegue 100% Descentralizado:</strong> 
          {" "}Tú mantienes el control total de tus claves privadas. MetaMask firmará la transacción en tu navegador y el contrato quedará registrado a tu nombre.
        </div>
      </div>
    </div>
  );
}
