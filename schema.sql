-- ============================================================
-- Resource Pinger — Database Schema
-- Run this in your Supabase SQL Editor or psql client
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------
-- 1. resources
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS resources (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    environment VARCHAR(50)  NOT NULL DEFAULT 'production',
    config      JSONB        NOT NULL DEFAULT '{}',
    action      VARCHAR(100) NOT NULL,
    query       TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 2. ping_history
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ping_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id     UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    status          VARCHAR(20)  NOT NULL,
    response_time_ms INTEGER,
    query_result    JSONB,
    error_message   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ping_history_resource_id ON ping_history(resource_id);
CREATE INDEX IF NOT EXISTS idx_ping_history_created_at  ON ping_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_is_active      ON resources(is_active);
