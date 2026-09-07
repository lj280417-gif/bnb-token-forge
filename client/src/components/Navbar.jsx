import { 
  Coins, 
  Wallet, 
  LogOut, 
  Droplets, 
  CheckCircle2, 
  ChevronDown,
  Layers,
  Zap,
  Globe
} from "lucide-react";
import { NETWORKS } from "../utils/constants";
import { shortenAddress } from "../utils/formatters";

export function Navbar({ 
  account, 
  chainId, 
  balance, 
  isConnecting, 
  connectWallet, 
  disconnectWallet, 
  switchNetwork,
  activeTab = "forge",
  setActiveTab
}) {
  const currentNetwork = NETWORKS[chainId] || null;
  const isTestnet = chainId === 97;

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => { setActiveTab?.("forge"); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
        <div className="nav-logo-icon">
          <Coins size={22} />
        </div>
        <div className="nav-title-group">
          <h1>
            BNB Token Forge
            <span className="bep20-badge">BEP-20</span>
          </h1>
          <span className="nav-tagline">Generador Descentralizado de Criptomonedas</span>
        </div>
      </div>

      {/* Selector Central de Pestañas: Forjar vs Explorar (Fase 3) */}
      <div className="nav-tabs-switcher">
        <button 
          className={`nav-tab-btn ${activeTab === "forge" ? "active" : ""}`}
          onClick={() => { setActiveTab?.("forge"); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        >
          <Zap size={15} />
          <span>Forjar Token</span>
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === "explore" ? "active" : ""}`}
          onClick={() => { setActiveTab?.("explore"); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        >
          <Globe size={15} />
          <span>Explorar Tokens</span>
        </button>
      </div>


      <div className="nav-actions">
        {/* Faucet Link para Testnet */}
        {isTestnet && (
          <a 
            href="https://www.bnbchain.org/en/testnet-faucet" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="faucet-badge-btn"
            title="Obtener tBNB gratis para desplegar tokens de prueba"
          >
            <Droplets size={14} />
            <span>tBNB Faucet</span>
          </a>
        )}

        {/* Network Selector Multi-Red */}
        <div className="network-selector">
          <button 
            className="network-dropdown-btn"
            onClick={() => switchNetwork(isTestnet ? 56 : 97)}
            title={isTestnet ? "Cambiar a BSC Mainnet (En Preparación)" : "Cambiar a BSC Testnet (Activo)"}
          >
            <span className={`network-dot ${isTestnet ? "testnet" : ""}`}></span>
            <span>{currentNetwork ? (currentNetwork.shortName || currentNetwork.chainName) : "Cambiar Red"}</span>
            <span style={{ 
              fontSize: "0.68rem", 
              padding: "1px 6px", 
              borderRadius: "4px", 
              background: isTestnet ? "rgba(16, 185, 129, 0.15)" : "rgba(240, 185, 11, 0.15)",
              color: isTestnet ? "var(--emerald)" : "var(--bnb-gold)",
              fontWeight: 700,
              marginLeft: "4px"
            }}>
              {isTestnet ? "Activo" : "En Prep."}
            </span>
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Wallet Connection */}
        {account ? (
          <div className="connected-user-pill">
            <div className="user-avatar-badge">
              <Wallet size={15} />
            </div>
            <div>
              <div className="user-balance-text">{balance} {currentNetwork?.nativeCurrency.symbol || "BNB"}</div>
              <div className="user-address-text">{shortenAddress(account, 4)}</div>
            </div>
            <button 
              className="disconnect-icon-btn" 
              onClick={disconnectWallet}
              title="Desconectar Billetera"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button 
            className="connect-wallet-btn" 
            onClick={connectWallet}
            disabled={isConnecting}
          >
            <Wallet size={16} />
            <span>{isConnecting ? "Conectando..." : "Conectar MetaMask"}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
