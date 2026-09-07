import React from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";

export function NetworkBanner({ chainId, switchNetwork }) {
  // Las redes válidas son 97 (Testnet) y 56 (Mainnet)
  const isSupported = chainId === 97 || chainId === 56 || !chainId;

  if (isSupported) return null;

  return (
    <div className="network-banner">
      <div className="network-banner-content">
        <AlertTriangle size={20} />
        <div>
          <strong>Red no compatible detectada (Chain ID: {chainId}).</strong>
          <div>Para desplegar tokens BEP-20 necesitas estar conectado a BNB Smart Chain.</div>
        </div>
      </div>
      <button 
        className="switch-btn-sm"
        onClick={() => switchNetwork(97)}
      >
        Cambiar a BSC Testnet <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
      </button>
    </div>
  );
}
