import { 
  Sparkles, 
  Coins, 
  Tag, 
  Binary, 
  Layers, 
  ShieldCheck, 
  Flame, 
  Gem, 
  KeyRound, 
  Wallet, 
  ArrowRight, 
  AlertCircle,
  ShieldAlert
} from "lucide-react";
import { getNetworkConfig } from "../utils/constants";
import { shortenAddress } from "../utils/formatters";

export function TokenForm({ 
  formData, 
  setFormData, 
  account, 
  chainId, 
  onDeploy, 
  isDeploying, 
  validationErrors, 
  connectWallet, 
  deployMode = "factory", 
  setDeployMode 
}) {
  const currentNetwork = getNetworkConfig(chainId);
  const isMainnetBlocked = !currentNetwork.isAvailable;

  // Auto-asignar la wallet conectada al campo de owner si está vacío
  useEffect(() => {
    if (account && !formData.owner) {
      setFormData(prev => ({ ...prev, owner: account }));
    }
  }, [account, formData.owner, setFormData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSymbolChange = (e) => {
    const uppercased = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setFormData(prev => ({ ...prev, symbol: uppercased }));
  };

  const handleSetMyWallet = () => {
    if (account) {
      setFormData(prev => ({ ...prev, owner: account }));
    } else {
      connectWallet();
    }
  };

  const isTestnet = chainId === 97;

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-title-group">
          <Sparkles className="card-title-icon" size={20} />
          <h2 className="card-title">Configuración del Token</h2>
        </div>
        <span className="bep20-badge">Solidity 0.8.20</span>
      </div>

      {validationErrors && validationErrors.length > 0 && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "var(--radius-md)",
          padding: "12px 16px",
          marginBottom: "20px",
          color: "#fca5a5",
          fontSize: "0.85rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "6px" }}>
            <AlertCircle size={16} /> Revisa los siguientes campos:
          </div>
          <ul style={{ paddingLeft: "20px" }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); onDeploy(deployMode); }}>
        {/* Sección 1: Información Básica */}
        <div className="form-section">
          <div className="section-label">
            <Coins size={14} /> Información Básica
          </div>

          <div className="form-row">
            <div className="form-group">
              <div className="label-row">
                <label className="form-label" htmlFor="token-name">Nombre del Token *</label>
                <span className="label-hint">Ej. Binance Nova</span>
              </div>
              <div className="input-wrapper">
                <Coins className="input-icon-left" size={16} />
                <input
                  id="token-name"
                  type="text"
                  name="name"
                  className="form-input has-icon"
                  placeholder="Mi Criptomoneda"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={32}
                  required
                />
              </div>
              <div className="char-counter">{formData.name.length}/32</div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label className="form-label" htmlFor="token-symbol">Símbolo (Ticker) *</label>
                <span className="label-hint">Ej. BNOV</span>
              </div>
              <div className="input-wrapper">
                <Tag className="input-icon-left" size={16} />
                <input
                  id="token-symbol"
                  type="text"
                  name="symbol"
                  className="form-input has-icon font-mono"
                  placeholder="BNOV"
                  value={formData.symbol}
                  onChange={handleSymbolChange}
                  maxLength={8}
                  required
                />
              </div>
              <div className="char-counter">{formData.symbol.length}/8</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <div className="label-row">
                <label className="form-label" htmlFor="token-decimals">Decimales *</label>
                <span className="label-hint">18 estándar</span>
              </div>
              <div className="input-wrapper">
                <Binary className="input-icon-left" size={16} />
                <input
                  id="token-decimals"
                  type="number"
                  name="decimals"
                  className="form-input has-icon font-mono"
                  min="0"
                  max="18"
                  value={formData.decimals}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label className="form-label" htmlFor="token-supply">Suministro Total *</label>
                <span className="label-hint">Tokens a emitir</span>
              </div>
              <div className="input-wrapper">
                <Layers className="input-icon-left" size={16} />
                <input
                  id="token-supply"
                  type="number"
                  name="initialSupply"
                  className="form-input has-icon font-mono"
                  placeholder="1000000"
                  min="1"
                  step="any"
                  value={formData.initialSupply}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sección 2: Billetera Administradora */}
        <div className="form-section">
          <div className="section-label">
            <ShieldCheck size={14} /> Billetera Administradora (Owner)
          </div>
          <div className="form-group">
            <div className="label-row">
              <label className="form-label" htmlFor="token-owner">Dirección de Destino *</label>
              <button 
                type="button" 
                className="paste-my-wallet-btn"
                onClick={handleSetMyWallet}
              >
                <Wallet size={12} /> {account ? "Usar mi billetera conectada" : "Conectar billetera"}
              </button>
            </div>
            <input
              id="token-owner"
              type="text"
              name="owner"
              className="form-input font-mono"
              placeholder="0x..."
              value={formData.owner}
              onChange={handleChange}
              required
            />
            <div className="label-hint" style={{ marginTop: "4px" }}>
              Esta dirección recibirá el 100% del suministro inicial y los derechos administrativos del contrato.
            </div>
          </div>
        </div>

        {/* Sección 3: Funcionalidades del Token */}
        <div className="form-section">
          <div className="section-label">
            <Sparkles size={14} /> Capacidades del Smart Contract
          </div>

          <div className="features-grid">
            {/* Burnable */}
            <div 
              className={`toggle-card ${formData.canBurn ? "active" : ""}`}
              onClick={() => setFormData(p => ({ ...p, canBurn: !p.canBurn }))}
            >
              <div className="toggle-info">
                <div className="toggle-title">
                  <Flame size={15} style={{ color: "var(--amber)" }} />
                  Quema (Burnable)
                </div>
                <div className="toggle-desc">Permite destruir tokens para reducir el suministro</div>
              </div>
              <div className={`switch-pill ${formData.canBurn ? "active" : ""}`}>
                <div className="switch-knob"></div>
              </div>
            </div>

            {/* Mintable */}
            <div 
              className={`toggle-card ${formData.canMint ? "active" : ""}`}
              onClick={() => setFormData(p => ({ ...p, canMint: !p.canMint }))}
            >
              <div className="toggle-info">
                <div className="toggle-title">
                  <Gem size={15} style={{ color: "var(--purple)" }} />
                  Emisión (Mintable)
                </div>
                <div className="toggle-desc">Permite al admin emitir más tokens en el futuro</div>
              </div>
              <div className={`switch-pill ${formData.canMint ? "active" : ""}`}>
                <div className="switch-knob"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 4: Método de Creación (Fase 2 TokenFactory vs Flujo Directo) */}
        <div className="form-section">
          <div className="section-label">
            <Layers size={14} /> Método de Creación en {currentNetwork.shortName || currentNetwork.chainName}
          </div>

          <div className="deployment-modes-grid">
            {/* Modo Factory (Fase 2) */}
            <div 
              className={`deploy-mode-card ${deployMode === "factory" ? "selected" : ""}`}
              onClick={() => setDeployMode && setDeployMode("factory")}
            >
              <div className="mode-badge-gold">
                <Sparkles size={11} /> Fase 2 · Recomendado
              </div>
              <div className="mode-title">
                <ShieldCheck size={16} style={{ color: "var(--bnb-gold)" }} />
                Crear mediante TokenFactory
              </div>
              <div className="mode-desc">
                Crea tu BEP-20 a través de la fábrica descentralizada. Asigna 100% de propiedad y suministro a tu wallet.
              </div>
              <div className="mode-fee-tag">
                Tarifa: {currentNetwork.factoryFee || "0.01"} {currentNetwork.symbol} + gas
              </div>
            </div>

            {/* Modo Directo (Flujo Original) */}
            <div 
              className={`deploy-mode-card ${deployMode === "direct" ? "selected direct-mode" : ""}`}
              onClick={() => setDeployMode && setDeployMode("direct")}
            >
              <div className="mode-badge-neutral">
                Flujo Original
              </div>
              <div className="mode-title">
                <ArrowRight size={16} style={{ color: "var(--cyan)" }} />
                Despliegue Directo BEP-20
              </div>
              <div className="mode-desc">
                Despliega StandardBEP20 de forma independiente sin interactuar con el Factory.
              </div>
              <div className="mode-fee-tag" style={{ color: "var(--cyan)" }}>
                Solo gas de {currentNetwork.shortName} (~0.003 {currentNetwork.symbol})
              </div>
            </div>
          </div>
        </div>

        {/* Sección 5: Verificación BscScan (Opcional) */}
        <div className="form-section">
          <div className="section-label">
            <KeyRound size={14} /> BscScan API Key (Opcional para Verificación)
          </div>
          <div className="form-group">
            <input
              id="bscscan-key"
              type="text"
              name="bscscanApiKey"
              className="form-input font-mono"
              placeholder="Ej. QWERTY123456... (deja vacío para verificar después)"
              value={formData.bscscanApiKey || ""}
              onChange={handleChange}
            />
            <div className="label-hint" style={{ marginTop: "4px" }}>
              Permite verificar el código fuente en el explorador BscScan automáticamente tras el despliegue.
            </div>
          </div>
        </div>

        {/* Tarjeta de Verificación de Transacción antes de abrir MetaMask */}
        {account && deployMode === "factory" && !isMainnetBlocked && (
          <div className="tx-verification-card">
            <div className="tx-verification-title">
              <ShieldCheck size={16} />
              <span>Verificación de Transacción antes de Firmar en MetaMask</span>
            </div>
            <div className="tx-verification-list">
              <div className="tx-verification-row">
                <span className="tx-verification-label">Contrato Destino (Factory):</span>
                <span className="tx-verification-val font-mono" style={{ color: "var(--bnb-gold)" }}>
                  {currentNetwork.factoryAddress || "Pendiente de Despliegue"}
                </span>
              </div>
              <div className="tx-verification-row">
                <span className="tx-verification-label">Función a Ejecutar:</span>
                <span className="tx-verification-val font-mono" style={{ color: "var(--cyan)" }}>
                  createToken("{formData.name || '... '}", "{formData.symbol || '...'}", {formData.decimals}, {formData.initialSupply}, {formData.canBurn ? 'true' : 'false'}, {formData.canMint ? 'true' : 'false'})
                </span>
              </div>
              <div className="tx-verification-row">
                <span className="tx-verification-label">Valor de la Transacción (Value):</span>
                <span className="tx-verification-val" style={{ color: "var(--bnb-gold)", fontSize: "0.95rem", fontWeight: 800 }}>
                  {currentNetwork.factoryFee || "0.01"} {currentNetwork.symbol}
                </span>
              </div>
              <div className="tx-verification-row">
                <span className="tx-verification-label">Red Blockchain:</span>
                <span className="tx-verification-val">
                  {currentNetwork.chainName} (Chain ID {currentNetwork.chainIdDecimal})
                </span>
              </div>
              <div className="tx-verification-row">
                <span className="tx-verification-label">Receptor y Propietario (Owner):</span>
                <span className="tx-verification-val font-mono">
                  {account ? shortenAddress(account, 6) : "Tu billetera"} (Recibirá el 100% del suministro)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bloqueo Seguro para Mainnet o Botones de Acción */}
        {isMainnetBlocked ? (
          <div style={{
            background: "rgba(240, 185, 11, 0.08)",
            border: "1px solid rgba(240, 185, 11, 0.3)",
            borderRadius: "var(--radius-md)",
            padding: "16px",
            marginTop: "16px",
            textAlign: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--bnb-gold)", fontWeight: 700, marginBottom: "6px" }}>
              <ShieldAlert size={18} />
              <span>Creación en BSC Mainnet Bloqueada</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "12px" }}>
              {currentNetwork.disabledReason || "BNB Smart Chain Mainnet está en preparación y desactivada para transacciones con fondos reales."}
            </div>
            <button
              type="button"
              className="btn-secondary"
              disabled
              style={{ width: "100%", opacity: 0.6, cursor: "not-allowed", padding: "12px" }}
            >
              🔒 Creación Desactivada en Mainnet
            </button>
          </div>
        ) : account ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            {/* Opción 1: Crear mediante TokenFactory */}
            <button 
              type="button" 
              className="deploy-factory-action-btn"
              disabled={isDeploying}
              onClick={() => onDeploy("factory")}
            >
              <Sparkles size={18} />
              <span>
                {isDeploying && deployMode === "factory" 
                  ? "Procesando en TokenFactory..." 
                  : `Crear token mediante TokenFactory (${currentNetwork.factoryFee || "0.01"} ${currentNetwork.symbol})`}
              </span>
            </button>

            {/* Opción 2: Despliegue Directo Standalone */}
            <button 
              type="button" 
              className="deploy-direct-action-btn"
              disabled={isDeploying}
              onClick={() => onDeploy("direct")}
              title="Despliegue autónomo directo del contrato StandardBEP20"
            >
              <ArrowRight size={16} />
              <span>
                {isDeploying && deployMode === "direct" 
                  ? "Desplegando directo..." 
                  : `Desplegar Token en ${currentNetwork.shortName} (Directo)`}
              </span>
            </button>
          </div>
        ) : (
          <button 
            type="button" 
            className="deploy-action-btn"
            onClick={connectWallet}
          >
            <Wallet size={18} />
            <span>Conectar MetaMask para Desplegar</span>
          </button>
        )}
      </form>
    </div>
  );
}
