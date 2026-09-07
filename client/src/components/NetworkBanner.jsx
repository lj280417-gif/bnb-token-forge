import React from "react";
import { AlertTriangle, Info, ArrowRight, ShieldAlert } from "lucide-react";
import { getNetworkConfig } from "../utils/constants";

export function NetworkBanner({ chainId, switchNetwork }) {
  if (!chainId) return null;

  // 1. Caso: Conectado a BSC Mainnet (Chain ID 56) mientras está en preparación
  if (chainId === 56) {
    const mainnetConfig = getNetworkConfig(56);
    if (!mainnetConfig.isAvailable) {
      return (
        <div style={{
          background: "rgba(240, 185, 11, 0.12)",
          border: "1px solid rgba(240, 185, 11, 0.35)",
          borderRadius: "var(--radius-md)",
          padding: "12px 18px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--bnb-gold-light)", fontSize: "0.86rem" }}>
            <Info size={18} style={{ color: "var(--bnb-gold)", flexShrink: 0 }} />
            <div>
              <strong>Conectado a BNB Smart Chain Mainnet (Modo Observador / En Preparación).</strong>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", marginTop: "2px" }}>
                La creación de tokens con BNB real está bloqueada temporalmente hasta el lanzamiento oficial. Puedes crear y probar tokens gratis en BSC Testnet.
              </div>
            </div>
          </div>
          <button 
            className="switch-btn-sm"
            onClick={() => switchNetwork(97)}
            style={{ whiteSpace: "nowrap" }}
          >
            Cambiar a BSC Testnet <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </button>
        </div>
      );
    }
    return null;
  }

  // 2. Caso: Red compatible (BSC Testnet 97)
  if (chainId === 97) return null;

  // 3. Caso: Red totalmente no compatible (Ethereum, Polygon, Arbitrum, etc.)
  return (
    <div className="network-banner">
      <div className="network-banner-content">
        <AlertTriangle size={20} />
        <div>
          <strong>Red no compatible detectada (Chain ID: {chainId}).</strong>
          <div>Para forjar tokens BEP-20 necesitas estar conectado a BNB Smart Chain.</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button 
          className="switch-btn-sm"
          onClick={() => switchNetwork(97)}
        >
          Cambiar a BSC Testnet <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </button>
      </div>
    </div>
  );
}
