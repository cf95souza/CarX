-- ============================================================================
-- SCRIPT MESTRE DE CRIAÇÃO DO BANCO DE DADOS - OSSYSTEM (LEGADO SUPABASE)
-- ARQUIVO PRESERVADO PARA SERVIÇOS DE ETL E MIGRAÇÃO NA FASE 4 DO CARX
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('ADM', 'GESTOR', 'OPERADOR');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.loja_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_loja TEXT NOT NULL DEFAULT 'OsSystem',
    logo_url TEXT,
    youtube_id TEXT,
    primary_color TEXT DEFAULT '#059669',
    secondary_color TEXT DEFAULT '#1e293b',
    accent_color TEXT DEFAULT '#4f46e5',
    monitor_bg_color TEXT DEFAULT '#0f172a',
    whatsapp TEXT,
    instagram_url TEXT,
    youtube_social_url TEXT,
    tiktok_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cpf_cnpj TEXT,
    endereco TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    modelo TEXT NOT NULL,
    marca TEXT,
    placa TEXT UNIQUE,
    cor TEXT,
    ano TEXT,
    tipo TEXT,
    porte TEXT DEFAULT 'Hatch',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_base DECIMAL(10,2),
    tempo_estimado INTERVAL,
    categoria TEXT,
    tipo_veiculo TEXT DEFAULT 'AMBOS',
    garantia TEXT DEFAULT '12 meses',
    controle_estoque BOOLEAN DEFAULT false,
    materiais JSONB DEFAULT '[]',
    precos_por_classe JSONB DEFAULT '{}'::jsonb,
    is_combo BOOLEAN DEFAULT false,
    itens_combo JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.estoque_materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    quantidade DECIMAL(10,2) DEFAULT 0,
    unidade TEXT,
    preco_custo DECIMAL(10,2),
    minimo_alerta DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  nome text,
  email text,
  cargo public.user_role DEFAULT 'OPERADOR',
  status boolean DEFAULT true,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ordens_servico (
    id SERIAL PRIMARY KEY,
    cliente_id UUID REFERENCES public.clientes(id),
    veiculo_id UUID REFERENCES public.veiculos(id),
    status TEXT DEFAULT 'AGUARDANDO', 
    progresso INTEGER DEFAULT 0,
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_fim TIMESTAMP WITH TIME ZONE,
    valor_total DECIMAL(10,2),
    desconto DECIMAL(10,2) DEFAULT 0,
    servico TEXT,
    data_agendamento TIMESTAMP WITH TIME ZONE,
    tecnico_id UUID REFERENCES public.profiles(id),
    observacoes TEXT,
    tecnico TEXT,
    servicos_detalhados JSONB DEFAULT '[]',
    tempo_decorrido INTEGER DEFAULT 0,
    valor_pago DECIMAL(10,2) DEFAULT 0,
    historico_pagamentos JSONB DEFAULT '[]',
    tracking_token UUID DEFAULT gen_random_uuid(),
    obs_tecnico TEXT,
    estoque_baixado BOOLEAN DEFAULT false,
    origem TEXT DEFAULT 'LOJA',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.checklist_avarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id INTEGER REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    pontos_avaria JSONB DEFAULT '[]',
    notas TEXT,
    quilometragem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.os_midia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id INTEGER REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    tipo TEXT,
    fase_execucao TEXT DEFAULT 'durante',
    angulo TEXT DEFAULT 'livre',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT DEFAULT 'ALERTA', 
    item_id UUID,
    lida BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.trabalhos_recentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    categoria TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.pesquisas_nps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id INTEGER REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    cliente_nome TEXT,
    veiculo TEXT,
    nota INTEGER NOT NULL CHECK (nota >= 0 AND nota <= 10),
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.qa_auditorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id INTEGER REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    tecnico_id UUID REFERENCES public.profiles(id),
    score INTEGER DEFAULT 5 CHECK (score >= 1 AND score <= 5),
    observacoes TEXT,
    status TEXT DEFAULT 'APROVADO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

