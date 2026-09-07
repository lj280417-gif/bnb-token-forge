import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Copy, 
  Check, 
  PlusCircle, 
  Coins, 
  Layers, 
  Zap, 
  Users, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  ArrowUpDown,
  X,
  Plus
} from "lucide-react";
import { API_BASE_URL, NETWORKS } from "../utils/constants";
import { shortenAddress, formatNumber, formatDate } from "../utils/formatters";

export function TokenExplorer({ 
  account, 
  chainId, 
  onAddToMetaMask, 
  onNavigateToForge 
}) {
  const [tokens, setTokens] = useState([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [stats, setStats] = useState({
    totalTokens: 0,
    factoryTokens: 0,
    directTokens: 0,
    uniqueCreators: 0
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("all"); // 'all' | 'factory' | 'direct' | 'mine'
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest' | 'name_asc'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(null);

  // Generar un color degradado determinista según la dirección del token
  const getAvatarGradient = (address) => {
    const clean = (address || "0x").replace("0x", "").slice(0, 6);
    const num = parseInt(clean, 16) || 123456;
    const hue1 = num % 360;
    const hue2 = (hue1 + 45) % 360;
    return `linear-gradient(135deg, hsl(${hue1}, 80%, 45%), hsl(${hue2}, 90%, 55%))`;
  };

  const activeChain = chainId === 56 ? 56 : 97;

  // Cargar estadísticas globales
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tokens/stats/summary?chainId=${activeChain}`);
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.warn("No se pudieron obtener estadísticas del directorio:", err);
    }
  };

  // Cargar lista de tokens
  const fetchTokens = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("chainId", activeChain.toString());
      params.append("page", page.toString());
      params.append("limit", "12");
      params.append("sort", sortBy);

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      if (selectedMethod === "mine" && account) {
        params.append("creator", account.toLowerCase());
      } else if (selectedMethod === "factory" || selectedMethod === "direct") {
        params.append("method", selectedMethod);
      }

      const res = await fetch(`${API_BASE_URL}/tokens?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setTokens(data.tokens || []);
        setTotalTokens(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Error al cargar tokens del directorio:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [page, sortBy, selectedMethod, searchQuery, account]);

  const handleCopy = (address) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedMethod("all");
    setSortBy("newest");
    setPage(1);
  };

  return (
    <div className="explorer-container">
      {/* Header del Directorio */}
      <div className="explorer-header">
        <div className="explorer-title-area">
          <div className="explorer-badge">
            <Layers size={14} /> Directorio Público Descentralizado
          </div>
          <h2 className="explorer-title">
            Explora Tokens en <span className="hero-title-gradient">BNB Smart Chain</span>
          </h2>
          <p className="explorer-desc">
            Directorio multi-usuario en tiempo real de criptomonedas BEP-20 forjadas en BSC Testnet. 
            Verifica contratos, consulta suministros y agrégalos a tu billetera en un clic.
          </p>
        </div>

        <button 
          className="create-token-action-btn"
          onClick={onNavigateToForge}
          title="Ir al creador de tokens"
        >
          <Plus size={16} />
          <span>Forjar Nuevo Token</span>
        </button>
      </div>

      {/* Tarjetas de Métricas de la Plataforma */}
      <div className="explorer-stats-grid">
        <div className="explorer-stat-card">
          <div className="stat-icon-wrap gold">
            <Coins size={20} />
          </div>
          <div>
            <div className="stat-val">{stats.totalTokens}</div>
            <div className="stat-lbl">Tokens Forjados</div>
          </div>
        </div>

        <div className="explorer-stat-card">
          <div className="stat-icon-wrap yellow">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="stat-val">{stats.factoryTokens}</div>
            <div className="stat-lbl">Vía TokenFactory</div>
          </div>
        </div>

        <div className="explorer-stat-card">
          <div className="stat-icon-wrap cyan">
            <Users size={20} />
          </div>
          <div>
            <div className="stat-val">{stats.uniqueCreators}</div>
            <div className="stat-lbl">Creadores Únicos</div>
          </div>
        </div>

        <div className="explorer-stat-card">
          <div className="stat-icon-wrap emerald">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="stat-val" style={{ fontSize: "1rem", color: "var(--emerald)" }}>
              <span className="network-dot testnet" style={{ display: "inline-block", marginRight: "6px" }}></span>
              BSC Testnet (97)
            </div>
            <div className="stat-lbl">Red Desplegada</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Ordenamiento */}
      <div className="explorer-controls-bar">
        {/* Input de Búsqueda */}
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text"
            className="search-input"
            placeholder="Buscar por nombre, ticker ($BNB) o dirección (0x...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
          {searchQuery && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
              title="Borrar búsqueda"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Píldoras de Filtro por Método */}
        <div className="filter-pills-group">
          <button 
            className={`filter-pill ${selectedMethod === "all" ? "active" : ""}`}
            onClick={() => { setSelectedMethod("all"); setPage(1); }}
          >
            Todos
          </button>
          <button 
            className={`filter-pill ${selectedMethod === "factory" ? "active" : ""}`}
            onClick={() => { setSelectedMethod("factory"); setPage(1); }}
          >
            <Zap size={13} style={{ marginRight: "4px" }} />
            TokenFactory (0.01 tBNB)
          </button>
          <button 
            className={`filter-pill ${selectedMethod === "direct" ? "active" : ""}`}
            onClick={() => { setSelectedMethod("direct"); setPage(1); }}
          >
            Directo
          </button>
          {account && (
            <button 
              className={`filter-pill ${selectedMethod === "mine" ? "active" : ""}`}
              onClick={() => { setSelectedMethod("mine"); setPage(1); }}
            >
              Mis Tokens
            </button>
          )}
        </div>

        {/* Selector de Orden y Refrescar */}
        <div className="sort-and-refresh">
          <div className="sort-select-wrap">
            <ArrowUpDown size={14} className="sort-icon" />
            <select 
              value={sortBy} 
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="sort-select"
            >
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguos</option>
              <option value="name_asc">Nombre (A - Z)</option>
            </select>
          </div>

          <button 
            className={`refresh-btn ${isRefreshing ? "spin" : ""}`}
            onClick={() => { fetchTokens(true); fetchStats(); }}
            title="Refrescar directorio"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Cuícula de Tokens */}
      {isLoading ? (
        <div className="tokens-grid-skeleton">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="token-card-skeleton" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="empty-directory-state">
          <Coins size={44} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
          <h3>No se encontraron tokens</h3>
          <p>
            {searchQuery || selectedMethod !== "all" 
              ? "No hay resultados para los filtros seleccionados. Prueba a cambiar tu búsqueda."
              : "Aún no se han registrado tokens en la plataforma. ¡Sé el primero en forjar uno!"}
          </p>
          {(searchQuery || selectedMethod !== "all") ? (
            <button className="reset-filter-btn" onClick={handleResetFilters}>
              Restablecer Filtros
            </button>
          ) : (
            <button className="create-token-action-btn" onClick={onNavigateToForge} style={{ marginTop: "16px" }}>
              <Plus size={16} /> Forjar Primer Token
            </button>
          )}
        </div>
      ) : (
        <div className="tokens-directory-grid">
          {tokens.map((token) => {
            const isCopied = copiedAddress === token.address;
            const isMyToken = account && token.creatorAddress?.toLowerCase() === account.toLowerCase();
            const explorerUrl = `https://testnet.bscscan.com/token/${token.address}`;
            const pancakeUrl = `https://pancakeswap.finance/swap?outputCurrency=${token.address}`;

            return (
              <div key={token.address} className="token-dir-card">
                {/* Cabecera de la Tarjeta */}
                <div className="token-card-top">
                  <div className="token-avatar-badge" style={{ background: getAvatarGradient(token.address) }}>
                    {token.symbol?.slice(0, 3) || "BEP"}
                  </div>
                  <div className="token-title-block">
                    <div className="token-name-row">
                      <h4 className="token-card-name" title={token.name}>{token.name}</h4>
                      <span className="bep20-badge" style={{ fontSize: "0.68rem" }}>${token.symbol}</span>
                    </div>
                    <div className="token-method-row">
                      {token.creationMethod === "factory" ? (
                        <span className="badge-factory-method">
                          <Zap size={10} /> TokenFactory (0.01 tBNB)
                        </span>
                      ) : (
                        <span className="badge-direct-method">
                          Despliegue Directo
                        </span>
                      )}
                      {isMyToken && (
                        <span className="badge-my-token">Creado por ti</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Datos Principales */}
                <div className="token-card-meta">
                  <div className="meta-row">
                    <span className="meta-label">Suministro Total:</span>
                    <strong className="meta-val">{formatNumber(token.totalSupply)} ${token.symbol}</strong>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Decimales:</span>
                    <span className="meta-val">{token.decimals}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Creador:</span>
                    <a 
                      href={`https://testnet.bscscan.com/address/${token.creatorAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="meta-link"
                      title="Ver creador en BscScan"
                    >
                      {shortenAddress(token.creatorAddress, 4)}
                    </a>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Forjado:</span>
                    <span className="meta-val-muted">{formatDate(token.createdAt)}</span>
                  </div>
                </div>

                {/* Fila de Dirección del Contrato */}
                <div className="token-address-box">
                  <span className="contract-address-text">{shortenAddress(token.address, 8)}</span>
                  <button 
                    className="copy-icon-btn"
                    onClick={() => handleCopy(token.address)}
                    title="Copiar dirección de contrato"
                  >
                    {isCopied ? <Check size={14} color="var(--emerald)" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="token-card-actions">
                  <button 
                    className="btn-add-metamask"
                    onClick={() => onAddToMetaMask(token.address, token.symbol, token.decimals)}
                    title="Agregar token a tu billetera MetaMask"
                  >
                    <PlusCircle size={13} />
                    <span>MetaMask</span>
                  </button>

                  <a 
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-card-link"
                    title="Ver contrato en BscScan Testnet"
                  >
                    <span>BscScan</span>
                    <ExternalLink size={12} />
                  </a>

                  <a 
                    href={pancakeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-card-link"
                    title="Ver en PancakeSwap Testnet"
                  >
                    <span>Pancake</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="explorer-pagination">
          <button 
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className="pagination-info">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalTokens} tokens)
          </span>
          <button 
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
