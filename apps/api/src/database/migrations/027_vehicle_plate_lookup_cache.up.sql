-- ==============================================================================
-- CARX SAAS — MIGRATION 027: CACHE DE CONSULTA DE PLACAS AUTOMOTIVAS (T6.2)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS vehicle_plate_cache (
    plate VARCHAR(10) PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    year INTEGER,
    model_year INTEGER,
    color VARCHAR(50),
    size_class VARCHAR(30) NOT NULL DEFAULT 'sedan',
    chassis_mask VARCHAR(50),
    fipe_price_cents INTEGER,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    consulted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_vehicle_plate_cache_expires ON vehicle_plate_cache(expires_at);

