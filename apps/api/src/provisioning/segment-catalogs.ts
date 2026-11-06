import { AutomotiveSegment, ChecklistItemDto } from '@carx/shared';

export interface BaseServiceSeed {
  name: string;
  description: string;
  price_cents: number;
  estimated_minutes: number;
  category: string;
}

export interface BaseChecklistSeed {
  name: string;
  description: string;
  items: ChecklistItemDto[];
}

export interface SegmentCatalogSeed {
  segment: AutomotiveSegment;
  name: string;
  services: BaseServiceSeed[];
  checklist: BaseChecklistSeed;
}

export const SEGMENT_CATALOGS: Record<AutomotiveSegment, SegmentCatalogSeed> = {
  ppf: {
    segment: 'ppf',
    name: 'PPF (Paint Protection Film)',
    services: [
      {
        name: 'Aplicação de PPF Frontal Completo (Capô, Para-choque e Retrovisores)',
        description: 'Proteção de poliuretano termoplástico autorregenerativo nas áreas com maior incidência de impactos.',
        price_cents: 450000,
        estimated_minutes: 480,
        category: 'Proteção de Pintura',
      },
      {
        name: 'Aplicação de PPF Full Body (Lataria Completa)',
        description: 'Revestimento total da carroceria com película transparente de alta resistência contra arranhões e pedriscos.',
        price_cents: 1800000,
        estimated_minutes: 1440,
        category: 'Proteção de Pintura',
      },
      {
        name: 'Proteção PPF Soleiras, Conchas de Maçaneta e Borda de Porta',
        description: 'Kit de proteção localizada contra riscos de unhas, sapatos e batidas de porta.',
        price_cents: 65000,
        estimated_minutes: 120,
        category: 'Kits de Proteção',
      },
      {
        name: 'Remoção Técnica de Película PPF Antiga',
        description: 'Remoção a vapor controlada sem agressão ao verniz original, com eliminação de resíduos.',
        price_cents: 80000,
        estimated_minutes: 180,
        category: 'Manutenção',
      },
      {
        name: 'Revitalização e Selagem Hidrofóbica de PPF',
        description: 'Tratamento de manutenção para películas PPF com reforço de hidrorrepelência e brilho.',
        price_cents: 55000,
        estimated_minutes: 120,
        category: 'Manutenção',
      },
    ],
    checklist: {
      name: 'Checklist de Recepção e Avaliação de Pintura para PPF',
      description: 'Inspeção prévia milimétrica de pintura antes da instalação de películas de proteção.',
      items: [
        {
          id: 'ppf-01',
          label: 'Medição de Micragem da Pintura (Espessura por Painel)',
          type: 'text',
          required: true,
          category: 'Pintura',
        },
        {
          id: 'ppf-02',
          label: 'Presença de Repintura Prévia ou Massa Plástica',
          type: 'boolean',
          required: true,
          category: 'Pintura',
        },
        {
          id: 'ppf-03',
          label: 'Registro Fotográfico de Chips de Pedra e Lascas no Para-choque/Capô',
          type: 'photo',
          required: true,
          category: 'Avarias',
        },
        {
          id: 'ppf-04',
          label: 'Inspeção de Riscos Profundos e Micro-riscos no Verniz',
          type: 'boolean',
          required: true,
          category: 'Pintura',
        },
        {
          id: 'ppf-05',
          label: 'Alinhamento de Vãos, Folgas e Faróis',
          type: 'boolean',
          required: false,
          category: 'Montagem',
        },
        {
          id: 'ppf-06',
          label: 'Estado dos Emblemas e Letreiros Originais',
          type: 'boolean',
          required: false,
          category: 'Acessórios',
        },
      ],
    },
  },

  insulfilm: {
    segment: 'insulfilm',
    name: 'Insulfilm e Controle Solar',
    services: [
      {
        name: 'Aplicação Película Nano Cerâmica Térmica Completa (UV/IR Reject)',
        description: 'Película de alta performance com redução de até 90% do calor infravermelho e 99% UV.',
        price_cents: 180000,
        estimated_minutes: 240,
        category: 'Película Térmica',
      },
      {
        name: 'Aplicação Película de Segurança Antivandalismo PS8 / PS12',
        description: 'Película reforçada que retém estilhaços e retarda tentativas de arrombamento de vidros laterais.',
        price_cents: 240000,
        estimated_minutes: 300,
        category: 'Segurança',
      },
      {
        name: 'Aplicação Película Solar Térmica Para-brisa (Transparência Legal 70%)',
        description: 'Controle térmico frontal em total conformidade com a resolução do CONTRAN.',
        price_cents: 65000,
        estimated_minutes: 120,
        category: 'Película Térmica',
      },
      {
        name: 'Remoção de Película Antiga com Limpeza Química de Cola',
        description: 'Descolagem sem danificar as linhas térmicas do desembaçador do vidro traseiro.',
        price_cents: 35000,
        estimated_minutes: 120,
        category: 'Desinstalação',
      },
      {
        name: 'Cristalização e Repelência de Água em Vidros Automotivos',
        description: 'Tratamento hidrofóbico para vidros melhorando a visibilidade sob chuva forte.',
        price_cents: 28000,
        estimated_minutes: 60,
        category: 'Estética de Vidros',
      },
    ],
    checklist: {
      name: 'Checklist de Inspeção de Vidros e Guarnições para Insulfilm',
      description: 'Inspeção de filetes térmicos, borrachas e canaletas antes da aplicação de películas.',
      items: [
        {
          id: 'ins-01',
          label: 'Integridade dos Filetes do Desembaçador Térmico Traseiro',
          type: 'boolean',
          required: true,
          category: 'Vidros',
        },
        {
          id: 'ins-02',
          label: 'Estado das Borrachas, Palhetas e Canaletas dos Vidros Laterais',
          type: 'boolean',
          required: true,
          category: 'Guarnições',
        },
        {
          id: 'ins-03',
          label: 'Registro de Piques, Trincas ou Riscos Prévios nos Vidros',
          type: 'photo',
          required: true,
          category: 'Vidros',
        },
        {
          id: 'ins-04',
          label: 'Funcionamento dos Motores Elétricos dos Vidros',
          type: 'boolean',
          required: true,
          category: 'Elétrica',
        },
        {
          id: 'ins-05',
          label: 'Medição Fotométrica / Nível de Transparência Original',
          type: 'text',
          required: false,
          category: 'Conformidade',
        },
      ],
    },
  },

  detailing: {
    segment: 'detailing',
    name: 'Estética Automotiva e Detalhamento',
    services: [
      {
        name: 'Polimento Técnico e Correção de Verniz Multi-Etapas',
        description: 'Eliminação de swirls, riscos médios e restauração de profundidade de cor e brilho espelhado.',
        price_cents: 120000,
        estimated_minutes: 360,
        category: 'Pintura',
      },
      {
        name: 'Vitrificação Cerâmica de Pintura 9H (Graphene / Ceramic Coating)',
        description: 'Aplicação de nano revestimento de alta durabilidade com proteção química e extrema repelência.',
        price_cents: 220000,
        estimated_minutes: 480,
        category: 'Proteção',
      },
      {
        name: 'Higienização Interna Completa com Oxi-Sanitização',
        description: 'Limpeza profunda de estofados, carpete, forro de teto e eliminação de odores e bactérias por ozônio.',
        price_cents: 65000,
        estimated_minutes: 240,
        category: 'Interior',
      },
      {
        name: 'Hidratação e Proteção Cerâmica para Bancos de Couro',
        description: 'Nutrição contra ressecamento e rachaduras, finalizada com selante fosco original de fábrica.',
        price_cents: 42000,
        estimated_minutes: 120,
        category: 'Interior',
      },
      {
        name: 'Detalhamento Técnico de Motor e Caixas de Rodas',
        description: 'Limpeza a vapor de componentes do cofre do motor com proteção térmica de plásticos e mangueiras.',
        price_cents: 38000,
        estimated_minutes: 120,
        category: 'Cofre do Motor',
      },
    ],
    checklist: {
      name: 'Checklist de Entrada para Detalhamento e Vitrificação',
      description: 'Mapeamento visual e técnico de defeitos na pintura, interior e rodas.',
      items: [
        {
          id: 'det-01',
          label: 'Espessura Média do Verniz por Painel (Micragem)',
          type: 'text',
          required: true,
          category: 'Pintura',
        },
        {
          id: 'det-02',
          label: 'Presença de Hologramas, Marcas de Boina e Chuva Ácida',
          type: 'boolean',
          required: true,
          category: 'Pintura',
        },
        {
          id: 'det-03',
          label: 'Estado de Conservação e Fissuras nos Bancos de Couro',
          type: 'photo',
          required: true,
          category: 'Interior',
        },
        {
          id: 'det-04',
          label: 'Nível de Contaminação Férrea e Marcas nas Rodas',
          type: 'boolean',
          required: false,
          category: 'Rodas',
        },
        {
          id: 'det-05',
          label: 'Integridade de Emblemas, Borrachas e Plásticos Externos',
          type: 'boolean',
          required: false,
          category: 'Externo',
        },
      ],
    },
  },

  mecanica: {
    segment: 'mecanica',
    name: 'Oficina Mecânica e Centro Automotivo',
    services: [
      {
        name: 'Revisão Preventiva Geral (Troca de Óleo Sintético, Filtros e Checkup)',
        description: 'Substituição de óleo, filtro de óleo, filtro de combustível, filtro de ar e inspeção de 40 itens.',
        price_cents: 38000,
        estimated_minutes: 90,
        category: 'Manutenção Preventiva',
      },
      {
        name: 'Troca de Discos e Pastilhas de Freio com Sangria de Fluido',
        description: 'Substituição das pastilhas e discos dianteiros, teste de empenamento e troca de fluido DOT 4/5.1.',
        price_cents: 45000,
        estimated_minutes: 120,
        category: 'Freios',
      },
      {
        name: 'Diagnóstico Eletrônico Computadorizado via Scanner OBD-II',
        description: 'Varredura completa de módulos eletrônicos de injeção, ABS, airbag e transmissão com emissão de laudo.',
        price_cents: 18000,
        estimated_minutes: 45,
        category: 'Diagnóstico',
      },
      {
        name: 'Alinhamento 3D de Direção e Balanceamento de Rodas',
        description: 'Aferição computadorizada de cambagem, cáster, convergência e balanceamento dinâmico.',
        price_cents: 16000,
        estimated_minutes: 60,
        category: 'Geometria',
      },
      {
        name: 'Troca de Kit de Correia Dentada, Tensor e Bomba d\'Água',
        description: 'Substituição preventiva do sincronismo do motor para prevenir colisão de válvulas.',
        price_cents: 85000,
        estimated_minutes: 240,
        category: 'Motor',
      },
    ],
    checklist: {
      name: 'Checklist de Inspeção Mecânica de Segurança de Entrada',
      description: 'Inspeção técnica dos componentes de segurança ativa e fluidos operacionais.',
      items: [
        {
          id: 'mec-01',
          label: 'Nível e Condição dos Fluidos (Freio, Arrefecimento e Óleo de Motor)',
          type: 'text',
          required: true,
          category: 'Fluidos',
        },
        {
          id: 'mec-02',
          label: 'Espessura Restante das Pastilhas de Freio (mm)',
          type: 'text',
          required: true,
          category: 'Freios',
        },
        {
          id: 'mec-03',
          label: 'Folgas em Pivôs, Terminais de Direção e Buchas de Suspensão',
          type: 'boolean',
          required: true,
          category: 'Suspensão',
        },
        {
          id: 'mec-04',
          label: 'Códigos de Falhas Ativos no Scanner de Injeção Eletrônica',
          type: 'text',
          required: false,
          category: 'Diagnóstico',
        },
        {
          id: 'mec-05',
          label: 'Registro de Desgaste e TWI dos Pneus (Fotos dos 4 Pneus)',
          type: 'photo',
          required: true,
          category: 'Pneus',
        },
        {
          id: 'mec-06',
          label: 'Teste de Carga e Saúde da Bateria (CCA e Voltagem)',
          type: 'text',
          required: false,
          category: 'Elétrica',
        },
      ],
    },
  },
};

