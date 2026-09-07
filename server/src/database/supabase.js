require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Verificar si las variables de entorno están configuradas con valores no vacíos
const supabaseUrl = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : "";
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();


const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  supabaseUrl.startsWith("http") && 
  !supabaseUrl.includes("TU_PROYECTO")
);

let supabase = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log(`✅ [Persistencia] Cliente Supabase inicializado para: ${supabaseUrl}`);
  } catch (err) {
    console.error("❌ [Persistencia] Error al inicializar cliente Supabase:", err.message);
  }
} else {
  console.log("ℹ️ [Persistencia] Supabase no está configurado en .env. Operando con repositorio en memoria para desarrollo local.");
}

// Almacén en memoria como fallback de desarrollo si Supabase no está configurado todavía
const memoryStore = new Map();

/**
 * Normaliza un objeto de token para la base de datos (snake_case)
 */
function toDbRecord(tokenData) {
  const nowIso = new Date().toISOString();
  return {
    address: tokenData.address.toLowerCase(),
    chain_id: Number(tokenData.chainId || 97),
    name: tokenData.name.trim(),
    symbol: tokenData.symbol.trim().toUpperCase(),
    decimals: Number(tokenData.decimals || 18),
    total_supply: tokenData.totalSupply.toString(),
    creator_address: (tokenData.creatorAddress || tokenData.owner).toLowerCase(),
    tx_hash: tokenData.txHash,
    verified: Boolean(tokenData.verified),
    creation_method: tokenData.creationMethod || "factory",
    factory_address: tokenData.factoryAddress ? tokenData.factoryAddress.toLowerCase() : null,
    fee_paid: tokenData.feePaid || (tokenData.creationMethod === "factory" ? "0.01 tBNB" : "0 tBNB"),
    can_burn: Boolean(tokenData.canBurn),
    can_mint: Boolean(tokenData.canMint),
    created_at: tokenData.createdAt ? new Date(tokenData.createdAt).toISOString() : nowIso,
    updated_at: nowIso
  };
}

/**
 * Normaliza un registro de base de datos a formato de aplicación (camelCase)
 */
function fromDbRecord(record) {
  if (!record) return null;
  return {
    address: record.address,
    chainId: record.chain_id,
    name: record.name,
    symbol: record.symbol,
    decimals: record.decimals,
    totalSupply: record.total_supply,
    creatorAddress: record.creator_address,
    txHash: record.tx_hash,
    verified: record.verified,
    creationMethod: record.creation_method,
    factoryAddress: record.factory_address,
    feePaid: record.fee_paid,
    canBurn: record.can_burn,
    canMint: record.can_mint,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

/**
 * Registra o actualiza un token en la base de datos central
 */
async function upsertToken(tokenData) {
  const record = toDbRecord(tokenData);

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("tokens")
      .upsert(record, { onConflict: "address" })
      .select()
      .single();

    if (error) {
      console.error("❌ Error en Supabase upsertToken:", error);
      throw new Error(`Error en Supabase: ${error.message}`);
    }

    return fromDbRecord(data);
  }

  // Fallback en memoria
  memoryStore.set(record.address, record);
  return fromDbRecord(record);
}

/**
 * Consulta la lista paginada de tokens con filtros y búsqueda
 */
async function getTokens({
  search = "",
  creator = "",
  method = "all",
  chainId = 97,
  page = 1,
  limit = 12,
  sort = "newest"
} = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * limitNum;

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from("tokens")
        .select("*", { count: "exact" })
        .eq("chain_id", Number(chainId));

      if (creator) {
        query = query.ilike("creator_address", `%${creator.trim()}%`);
      }

      if (method && method !== "all") {
        query = query.eq("creation_method", method);
      }

      if (search && search.trim()) {
        const s = search.trim();
        query = query.or(`name.ilike.%${s}%,symbol.ilike.%${s}%,creator_address.ilike.%${s}%,address.ilike.%${s}%`);
      }

      // Ordenamiento
      if (sort === "oldest") {
        query = query.order("created_at", { ascending: true });
      } else if (sort === "name_asc") {
        query = query.order("name", { ascending: true });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      query = query.range(offset, offset + limitNum - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      const total = count || 0;
      return {
        tokens: (data || []).map(fromDbRecord),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        isSupabaseActive: true
      };
    } catch (sbErr) {
      console.warn("⚠️ Aviso: Error al consultar Supabase, usando repositorio local:", sbErr.message);
    }
  }

  // Fallback en memoria
  let items = Array.from(memoryStore.values()).filter(t => t.chain_id === Number(chainId));

  if (creator) {
    const c = creator.trim().toLowerCase();
    items = items.filter(t => t.creator_address.includes(c));
  }

  if (method && method !== "all") {
    items = items.filter(t => t.creation_method === method);
  }

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    items = items.filter(t => 
      t.name.toLowerCase().includes(s) ||
      t.symbol.toLowerCase().includes(s) ||
      t.creator_address.toLowerCase().includes(s) ||
      t.address.toLowerCase().includes(s)
    );
  }

  if (sort === "oldest") {
    items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (sort === "name_asc") {
    items.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const total = items.length;
  const paginated = items.slice(offset, offset + limitNum);

  return {
    tokens: paginated.map(fromDbRecord),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    isSupabaseActive: false
  };
}

/**
 * Obtiene un token por su dirección de contrato
 */
async function getTokenByAddress(address) {
  const addr = address.toLowerCase();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("tokens")
        .select("*")
        .ilike("address", addr)
        .maybeSingle();

      if (error) throw error;
      if (data) return fromDbRecord(data);
    } catch (sbErr) {
      console.warn("⚠️ Aviso: Error al buscar token en Supabase, usando repositorio local:", sbErr.message);
    }
  }

  const record = memoryStore.get(addr);
  return fromDbRecord(record);
}

/**
 * Retorna estadísticas agregadas de la plataforma para BSC Testnet
 */
async function getTokenStats(chainId = 97) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("tokens")
        .select("creation_method, creator_address")
        .eq("chain_id", Number(chainId));

      if (error) throw error;

      const items = data || [];
      const factoryCount = items.filter(t => t.creation_method === "factory").length;
      const directCount = items.filter(t => t.creation_method === "direct").length;
      const uniqueCreators = new Set(items.map(t => t.creator_address)).size;

      return {
        totalTokens: items.length,
        factoryTokens: factoryCount,
        directTokens: directCount,
        uniqueCreators,
        chainId: Number(chainId),
        network: Number(chainId) === 56 ? "BSC Mainnet" : "BSC Testnet",
        isSupabaseActive: true
      };
    } catch (sbErr) {
      console.warn("⚠️ Aviso: Error al consultar estadísticas en Supabase, usando repositorio local:", sbErr.message);
    }
  }

  const items = Array.from(memoryStore.values()).filter(t => t.chain_id === Number(chainId));
  const factoryCount = items.filter(t => t.creation_method === "factory").length;
  const directCount = items.filter(t => t.creation_method === "direct").length;
  const uniqueCreators = new Set(items.map(t => t.creator_address)).size;

  return {
    totalTokens: items.length,
    factoryTokens: factoryCount,
    directTokens: directCount,
    uniqueCreators,
    chainId: Number(chainId),
    network: Number(chainId) === 56 ? "BSC Mainnet" : "BSC Testnet",
    isSupabaseActive: false
  };
}


module.exports = {
  isSupabaseConfigured,
  upsertToken,
  getTokens,
  getTokenByAddress,
  getTokenStats
};
