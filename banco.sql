-- Habilitar extensão de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE VEÍCULOS
CREATE TABLE IF NOT EXISTS public.veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placa VARCHAR(10) UNIQUE NOT NULL,
    prefixo VARCHAR(20) UNIQUE NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    ano INT NOT NULL,
    km_atual INT NOT NULL DEFAULT 0,
    tipo VARCHAR(50) NOT NULL,
    unidade VARCHAR(50) NOT NULL,
    motorista_habitual VARCHAR(100),
    situacao VARCHAR(30) NOT NULL DEFAULT 'disponivel', -- disponivel, em_manutencao, parado
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE MECÂNICOS
CREATE TABLE IF NOT EXISTS public.mecanicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    especialidade VARCHAR(50),
    empresa_oficina VARCHAR(100) DEFAULT 'Interna',
    status VARCHAR(20) DEFAULT 'ativo', -- ativo, inativo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE OCORRÊNCIAS
CREATE TABLE IF NOT EXISTS public.ocorrencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_ocorrencia SERIAL UNIQUE,
    veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    km_momento INT NOT NULL,
    motorista VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL, -- motor, cambio, embreagem, freios, suspensao, pneus, eletrico, arrefecimento, combustivel, direcao, outros
    descricao TEXT NOT NULL,
    sintomas TEXT,
    localizacao VARCHAR(150),
    prioridade VARCHAR(20) NOT NULL DEFAULT 'media', -- baixa, media, alta, critica
    status VARCHAR(30) NOT NULL DEFAULT 'aberta', -- aberta, em_diagnostico, aguardando_pecas, em_reparo, concluida, reaberta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE ORDENS DE SERVIÇO (CONSERTOS)
CREATE TABLE IF NOT EXISTS public.ordens_servico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_os SERIAL UNIQUE,
    ocorrencia_id UUID REFERENCES public.ocorrencias(id) ON DELETE SET NULL,
    veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
    mecanico_id UUID REFERENCES public.mecanicos(id) ON DELETE SET NULL,
    oficina_terceira VARCHAR(100),
    outros_profissionais TEXT,
    data_entrada DATE DEFAULT CURRENT_DATE,
    data_inicio DATE,
    data_conclusao DATE,
    diagnostico_tecnico TEXT,
    causa_provavel TEXT,
    descricao_reparo TEXT,
    km_reparo INT NOT NULL,
    valor_maos_obra NUMERIC(10,2) DEFAULT 0.00,
    valor_pecas NUMERIC(10,2) DEFAULT 0.00,
    outros_custos NUMERIC(10,2) DEFAULT 0.00,
    valor_total NUMERIC(10,2) GENERATED ALWAYS AS (valor_maos_obra + valor_pecas + outros_custos) STORED,
    garantia_dias INT DEFAULT 0,
    garantia_km INT DEFAULT 0,
    teste_pos_reparo BOOLEAN DEFAULT FALSE,
    resultado_teste TEXT,
    pendencias_pos_reparo TEXT,
    observacoes_mecanico TEXT,
    responsavel_aprovacao VARCHAR(100),
    status VARCHAR(30) DEFAULT 'em_andamento', -- em_andamento, concluido, cancelado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE PEÇAS UTILIZADAS
CREATE TABLE IF NOT EXISTS public.pecas_utilizadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    nome_peca VARCHAR(100) NOT NULL,
    codigo_peca VARCHAR(50),
    quantidade INT NOT NULL DEFAULT 1,
    valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    acao VARCHAR(20) DEFAULT 'substituida' -- substituida, reparada
);

-- 6. TABELA DE ANEXOS / FOTOS
CREATE TABLE IF NOT EXISTS public.anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ocorrencia_id UUID REFERENCES public.ocorrencias(id) ON DELETE CASCADE,
    os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    url_arquivo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE HISTÓRICO DE ALTERAÇÕES (AUDITORIA)
CREATE TABLE IF NOT EXISTS public.historico_alteracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela VARCHAR(50) NOT NULL,
    registro_id UUID NOT NULL,
    acao VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    dados_anteriores JSONB,
    dados_novos JSONB,
    usuario_email VARCHAR(100),
    data_alteracao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HABILITAR RLS (ROW LEVEL SECURITY)
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mecanicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pecas_utilizadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_alteracoes ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO PARA USUÁRIOS AUTENTICADOS
CREATE POLICY "Acesso total para usuarios autenticados em veiculos" ON public.veiculos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para usuarios autenticados em mecanicos" ON public.mecanicos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para usuarios autenticados em ocorrencias" ON public.ocorrencias
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para usuarios autenticados em ordens_servico" ON public.ordens_servico
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para usuarios autenticados em pecas_utilizadas" ON public.pecas_utilizadas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para usuarios autenticados em anexos" ON public.anexos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Leitura de historico para usuarios autenticados" ON public.historico_alteracoes
    FOR SELECT TO authenticated USING (true);