import React, { useState } from "react";
import { 
  History, 
  ExternalLink, 
  Copy, 
  Check, 
  PlusCircle, 
  Trash2,
  Coins
} from "lucide-react";
import { NETWORKS } from "../utils/constants";
import { shortenAddress, formatNumber, formatDate } from "../utils/formatters";

export function DeployedTokensList({ tokens, onClearHistory, onAddToMetaMask }) {
  const [copiedId, setCopiedId] = useState(null);

  if (!tokens || tokens.length === 0) return null;

  const handleCopy = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedId(address);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="history-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <History size={20} style={{ color: "var(--bnb-gold)" }} />
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: "700" }}>
            Tus Tokens Creados ({tokens.length})
          </h3>
        </div>
        <button 
          onClick={onClearHistory}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.78rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
          title="Borrar historial local"
        >
          <Trash2 size={13} /> Limpiar Historial
        </button>
      </div>

      <div className="history-grid">
        {tokens.map((token) => {
          const network = NETWORKS[token.chainId] || NETWORKS[97];
          const isTestnet = token.chainId === 97;
          const isCopied = copiedId === token.address;

          return (
            <div key={token.address} className="history-card">
              <div className="history-card-header">
                <div>
                  <span className="history-token-title">{token.name}</span>
                  <span className="bep20-badge" style={{ marginLeft: "8px" }}>${token.symbol}</span>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {token.creationMethod === "factory" ? (
                    <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(240, 185, 11, 0.15)", color: "var(--bnb-gold)", fontWeight: 700, border: "1px solid rgba(240, 185, 11, 0.3)" }}>
                      Factory (0.01 tBNB)
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(6, 182, 212, 0.15)", color: "var(--cyan)", fontWeight: 600, border: "1px solid rgba(6, 182, 212, 0.3)" }}>
                      Directo
                    </span>
                  )}
                  <span className={`network-chip`} style={{ fontSize: "0.65rem", padding: "2px 8px" }}>
                    {isTestnet ? "Testnet" : "Mainnet"}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Suministro: <strong style={{ color: "#fff" }}>{formatNumber(token.initialSupply)}</strong> ${token.symbol}
              </div>

              <div className="history-address-row">
                <span>{shortenAddress(token.address, 8)}</span>
                <button 
                  onClick={() => handleCopy(token.address)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                  title="Copiar dirección"
                >
                  {isCopied ? <Check size={14} color="var(--emerald)" /> : <Copy size={14} />}
                </button>
              </div>

              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Creado: {formatDate(token.timestamp)}
              </div>

              <div className="history-actions">
                <button 
                  className="history-link-btn"
                  onClick={() => onAddToMetaMask(token.address, token.symbol, token.decimals)}
                  title="Agregar a MetaMask"
                >
                  <PlusCircle size={13} />
                  <span>MetaMask</span>
                </button>

                <a 
                  href={`${network.blockExplorerUrls[0]}/token/${token.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="history-link-btn"
                  title="Ver en BscScan"
                >
                  <span>BscScan</span>
                  <ExternalLink size={12} />
                </a>

                <a 
                  href={`https://pancakeswap.finance/swap?outputCurrency=${token.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="history-link-btn"
                  title="Comerciar en PancakeSwap"
                >
                  <span>PancakeSwap</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
