-- ==============================================================================
-- BNB TOKEN FORGE - PERSISTENCIA CENTRAL (POSTGRESQL / SUPABASE)
-- TABLA: public.tokens
-- RED: Exclusivamente BNB Smart Chain Testnet (Chain ID 97)
-- ==============================================================================

-- 1. Crear tabla principal de tokens registrados
CREATE TABLE IF NOT EXISTS public.tokens (
  address VARCHAR(42) PRIMARY KEY,                         -- Dirección del contrato (formato 0x...)
  chain_id INTEGER NOT NULL DEFAULT 97,                    -- BSC Testnet (97)
  name VARCHAR(100) NOT NULL,                              -- Nombre del token
  symbol VARCHAR(20) NOT NULL,                             -- Símbolo o Ticker ($SYMBOL)
  decimals SMALLINT NOT NULL DEFAULT 18,                   -- Decimales (0 - 18)
  total_supply VARCHAR(78) NOT NULL,                       -- Suministro total como string numérico
  creator_address VARCHAR(42) NOT NULL,                    -- Wallet creadora
  tx_hash VARCHAR(66) NOT NULL,                            -- Hash de la transacción de creación
  verified BOOLEAN NOT NULL DEFAULT FALSE,                 -- Estado de verificación en BscScan
  creation_method VARCHAR(20) NOT NULL DEFAULT 'factory',  -- 'factory' | 'direct'
  factory_address VARCHAR(42),                             -- Dirección de TokenFactory si aplica
  fee_paid VARCHAR(30) DEFAULT '0.01 tBNB',                -- Tarifa de servicio abonada
  can_burn BOOLEAN NOT NULL DEFAULT FALSE,                 -- Capacidad de quema
  can_mint BOOLEAN NOT NULL DEFAULT FALSE,                 -- Capacidad de emisión adicional
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),           -- Timestamp de creación
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()            -- Timestamp de actualización
);

-- 2. Índices de rendimiento para filtros y búsquedas reactivas
CREATE INDEX IF NOT EXISTS idx_tokens_chain_id ON public.tokens(chain_id);
CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON public.tokens(LOWER(symbol));
CREATE INDEX IF NOT EXISTS idx_tokens_name ON public.tokens(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_tokens_creator ON public.tokens(LOWER(creator_address));
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON public.tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_method ON public.tokens(creation_method);

-- 3. Habilitar Seguridad a Nivel de Fila (Row Level Security - RLS)
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- 4. Política de lectura pública: cualquier usuario o visitante puede explorar los tokens
DROP POLICY IF EXISTS "Permitir lectura publica de tokens" ON public.tokens;
CREATE POLICY "Permitir lectura publica de tokens"
ON public.tokens
FOR SELECT
USING (true);

-- 5. Política de escritura restringida: solo el backend (rol service_role) puede insertar o actualizar
DROP POLICY IF EXISTS "Permitir insercion y actualizacion solo a service_role" ON public.tokens;
CREATE POLICY "Permitir insercion y actualizacion solo a service_role"
ON public.tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Otorgar permisos a los roles de PostgreSQL en Supabase
GRANT ALL ON TABLE public.tokens TO postgres, service_role;
GRANT SELECT ON TABLE public.tokens TO anon, authenticated;

