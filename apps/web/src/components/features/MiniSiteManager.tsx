import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  MessageCircle,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Save,
  Phone,
  Car,
  Filter,
} from 'lucide-react';
import { api } from '../../services/api';
import { useBrand } from '../../contexts/BrandContext';
import type {
  MiniSitePortfolioItemDto,
  MiniSiteLeadDto,
  CreateMiniSitePortfolioItemInputDto,
  UpdateMiniSiteSettingsInputDto,
} from '@carx/shared';
import { toast } from '../../utils/toast';

export const MiniSiteManager: React.FC = () => {
  const queryClient = useQueryClient();
  const brand = useBrand();

  const [activeTab, setActiveTab] = useState<'config' | 'portfolio' | 'leads'>('portfolio');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('');

  // Formulário de Novo Item de Portfólio
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState<CreateMiniSitePortfolioItemInputDto>({
    title: '',
    category: 'PPF',
    beforeImageUrl: '',
    afterImageUrl: '',
    description: '',
    isFeatured: false,
    displayOrder: 0,
  });

  // Formulário de Configuração do Mini-Site
  const [configForm, setConfigForm] = useState<UpdateMiniSiteSettingsInputDto>({
    minisiteEnabled: true,
    headline: '',
    about: '',
    address: '',
    whatsappPhone: '',
  });

  // Consultas
  const { data: portfolioItems = [], isLoading: isLoadingPortfolio } = useQuery<MiniSitePortfolioItemDto[]>({
    queryKey: ['minisite-portfolio'],
    queryFn: () => api.minisite.listPortfolio(),
  });

  const { data: leads = [], isLoading: isLoadingLeads } = useQuery<MiniSiteLeadDto[]>({
    queryKey: ['minisite-leads', leadStatusFilter],
    queryFn: () => api.minisite.listLeads(leadStatusFilter || undefined),
  });

  // Mutações
  const createPortfolioMutation = useMutation({
    mutationFn: (data: CreateMiniSitePortfolioItemInputDto) => api.minisite.createPortfolioItem(data),
    onSuccess: () => {
      toast.success('Trabalho adicionado ao portfólio com sucesso!');
      setIsAddingPortfolio(false);
      setNewPortfolio({
        title: '',
        category: 'PPF',
        beforeImageUrl: '',
        afterImageUrl: '',
        description: '',
        isFeatured: false,
        displayOrder: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['minisite-portfolio'] });
    },
    onError: () => toast.error('Erro ao adicionar item ao portfólio.'),
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: (id: string) => api.minisite.deletePortfolioItem(id),
    onSuccess: () => {
      toast.success('Item removido do portfólio.');
      queryClient.invalidateQueries({ queryKey: ['minisite-portfolio'] });
    },
    onError: () => toast.error('Erro ao excluir item.'),
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'new' | 'contacted' | 'converted' | 'discarded' }) =>
      api.minisite.updateLeadStatus(id, status),
    onSuccess: () => {
      toast.success('Status do lead atualizado.');
      queryClient.invalidateQueries({ queryKey: ['minisite-leads'] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: UpdateMiniSiteSettingsInputDto) => api.minisite.updateSettings(data),
    onSuccess: () => {
      toast.success('Configurações do mini-site salvas com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar configurações.'),
  });

  const handleCreatePortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolio.title.trim() || !newPortfolio.afterImageUrl.trim()) {
      toast.warning('Título e URL da foto final são obrigatórios.');
      return;
    }
    createPortfolioMutation.mutate({
      ...newPortfolio,
      beforeImageUrl: newPortfolio.beforeImageUrl?.trim() || undefined,
      description: newPortfolio.description?.trim() || undefined,
    });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(configForm);
  };

  const currentSlug = brand.slug || 'minha-oficina';
  const publicMiniSiteUrl = `${window.location.origin}/loja/${currentSlug}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* 1. HEADER DO MINI-SITE & LINK PÚBLICO */}
      <div
        style={{
          background: '#0E1116',
          border: '1px solid #1B2129',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  background: '#C8F52E',
                  color: '#0E1116',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                }}
              >
                T6.9 Mini-Site Oficial
              </span>
              <span style={{ color: '#9AA7B8', fontSize: '13px' }}>SEO Local & Captação</span>
            </div>
            <h3
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '22px',
                fontWeight: 700,
                color: '#fff',
                margin: '6px 0 2px',
              }}
            >
              Mini-Site Institucional da sua Oficina
            </h3>
            <p style={{ color: '#9AA7B8', fontSize: '13px', margin: 0 }}>
              Sua vitrine pública de alta conversão com fotos antes/depois, catálogo e captação de orçamentos.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a
              href={`/loja/${currentSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: '42px',
                padding: '0 18px',
                borderRadius: '12px',
                background: '#C8F52E',
                color: '#0E1116',
                font: '700 13px Inter, sans-serif',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
            >
              <Globe size={16} />
              <span>Visualizar Mini-Site ↗</span>
            </a>
          </div>
        </div>

        {/* Link Copiável */}
        <div
          style={{
            background: '#151A21',
            borderRadius: '12px',
            padding: '10px 14px',
            border: '1px solid #2B3544',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '13px',
          }}
        >
          <span style={{ color: '#9AA7B8' }}>
            Link público da sua loja:{' '}
            <b style={{ color: '#C8F52E', fontWeight: 600 }}>{publicMiniSiteUrl}</b>
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(publicMiniSiteUrl);
              toast.success('Link do mini-site copiado para a área de transferência!');
            }}
            style={{
              background: '#0E1116',
              border: '1px solid #2B3544',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Copiar Link
          </button>
        </div>
      </div>

      {/* 2. ABAS DE NAVEGAÇÃO INTERNA */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E1E6EC', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('portfolio')}
          style={{
            height: '40px',
            padding: '0 18px',
            borderRadius: '12px',
            border: 0,
            background: activeTab === 'portfolio' ? '#0E1116' : 'transparent',
            color: activeTab === 'portfolio' ? '#C8F52E' : '#5B6674',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ImageIcon size={16} />
          <span>Portfólio & Trabalhos ({portfolioItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          style={{
            height: '40px',
            padding: '0 18px',
            borderRadius: '12px',
            border: 0,
            background: activeTab === 'leads' ? '#0E1116' : 'transparent',
            color: activeTab === 'leads' ? '#C8F52E' : '#5B6674',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Phone size={16} />
          <span>Orçamentos & Leads Recebidos ({leads.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          style={{
            height: '40px',
            padding: '0 18px',
            borderRadius: '12px',
            border: 0,
            background: activeTab === 'config' ? '#0E1116' : 'transparent',
            color: activeTab === 'config' ? '#C8F52E' : '#5B6674',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Save size={16} />
          <span>Textos & Apresentação</span>
        </button>
      </div>

      {/* 3. CONTEÚDO DA ABA: PORTFÓLIO */}
      {activeTab === 'portfolio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0E1116' }}>
                Trabalhos Publicados na Galeria
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#5B6674' }}>
                Fotos de alta qualidade dos serviços que você entrega aumentam o fechamento de propostas em até 40%.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingPortfolio(!isAddingPortfolio)}
              style={{
                height: '40px',
                padding: '0 16px',
                borderRadius: '12px',
                background: '#0E1116',
                color: '#C8F52E',
                font: '700 13px Inter, sans-serif',
                border: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={16} />
              <span>{isAddingPortfolio ? 'Cancelar' : 'Adicionar Novo Trabalho'}</span>
            </button>
          </div>

          {/* Modal / Card para Adicionar Trabalho */}
          {isAddingPortfolio && (
            <form
              onSubmit={handleCreatePortfolio}
              style={{
                background: '#fff',
                border: '1px solid #E1E6EC',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0E1116' }}>
                Cadastrar Novo Trabalho no Portfólio
              </h5>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Título do Trabalho *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPortfolio.title}
                    onChange={(e) => setNewPortfolio({ ...newPortfolio, title: e.target.value })}
                    placeholder="Ex: PPF Frontal & Vitrificação - Porsche 911 GT3"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    Categoria
                  </label>
                  <select
                    value={newPortfolio.category}
                    onChange={(e) => setNewPortfolio({ ...newPortfolio, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="PPF">PPF (Paint Protection Film)</option>
                    <option value="Vitrificação">Vitrificação Cerâmica</option>
                    <option value="Polimento">Polimento Técnico</option>
                    <option value="Insulfilm">Insulfilm Alta Performance</option>
                    <option value="Higienização">Higienização Detalhada</option>
                    <option value="Martelinho">Martelinho de Ouro</option>
                    <option value="Geral">Serviço Geral</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    URL da Foto Final (Depois) *
                  </label>
                  <input
                    type="url"
                    required
                    value={newPortfolio.afterImageUrl}
                    onChange={(e) => setNewPortfolio({ ...newPortfolio, afterImageUrl: e.target.value })}
                    placeholder="https://..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                    URL da Foto de Entrada (Antes - Opcional)
                  </label>
                  <input
                    type="url"
                    value={newPortfolio.beforeImageUrl || ''}
                    onChange={(e) => setNewPortfolio({ ...newPortfolio, beforeImageUrl: e.target.value })}
                    placeholder="https://... (ativa comparador interativo)"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
                  Descrição Curta do Trabalho
                </label>
                <textarea
                  rows={2}
                  value={newPortfolio.description || ''}
                  onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                  placeholder="Materiais usados, tempo de execução e detalhes de acabamento..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddingPortfolio(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#fff',
                    color: '#5B6674',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createPortfolioMutation.isPending}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 0,
                    background: '#0E1116',
                    color: '#C8F52E',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {createPortfolioMutation.isPending ? 'Salvando...' : 'Publicar Trabalho'}
                </button>
              </div>
            </form>
          )}

          {/* Grid de Trabalhos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {portfolioItems.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  border: '1px solid #E1E6EC',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ height: '160px', background: '#F1F4F9', position: 'relative' }}>
                  <img
                    src={item.afterImageUrl}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: '#0E1116',
                      color: '#C8F52E',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {item.category}
                  </span>
                  {item.beforeImageUrl && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '6px',
                      }}
                    >
                      Antes/Depois
                    </span>
                  )}
                </div>

                <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h5 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0E1116' }}>
                      {item.title}
                    </h5>
                    {item.description && (
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #F1F4F9' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja remover este trabalho do portfólio?')) {
                          deletePortfolioMutation.mutate(item.id);
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 0,
                        color: '#EF4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CONTEÚDO DA ABA: LEADS RECEBIDOS */}
      {activeTab === 'leads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0E1116' }}>
                Solicitações de Orçamento Recebidas
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#5B6674' }}>
                Leads em potencial captados diretamente através do mini-site da sua loja.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {['', 'new', 'contacted', 'converted', 'discarded'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setLeadStatusFilter(st)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E1E6EC',
                    background: leadStatusFilter === st ? '#0E1116' : '#fff',
                    color: leadStatusFilter === st ? '#C8F52E' : '#5B6674',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {st === '' ? 'Todos' : st === 'new' ? 'Novos' : st === 'contacted' ? 'Contatados' : st === 'converted' ? 'Fechados' : 'Descartados'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leads.length > 0 ? (
              leads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #E1E6EC',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: '240px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <b style={{ fontSize: '15px', color: '#0E1116' }}>{lead.name}</b>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background:
                            lead.status === 'new'
                              ? '#FEF3C7'
                              : lead.status === 'converted'
                              ? '#DCFCE7'
                              : lead.status === 'contacted'
                              ? '#E0F2FE'
                              : '#F1F5F9',
                          color:
                            lead.status === 'new'
                              ? '#B45309'
                              : lead.status === 'converted'
                              ? '#15803D'
                              : lead.status === 'contacted'
                              ? '#0369A1'
                              : '#64748B',
                          textTransform: 'uppercase',
                        }}
                      >
                        {lead.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#5B6674', marginTop: '4px' }}>
                      <span>🚗 {lead.vehicleModel || 'Modelo não informado'}</span>
                      {lead.serviceInterest && <span> · Interesse: <b>{lead.serviceInterest}</b></span>}
                    </div>

                    {lead.message && (
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                        "{lead.message}"
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a
                      href={lead.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (lead.status === 'new') {
                          updateLeadStatusMutation.mutate({ id: lead.id, status: 'contacted' });
                        }
                      }}
                      style={{
                        height: '36px',
                        padding: '0 14px',
                        borderRadius: '10px',
                        background: '#25D366',
                        color: '#0E1116',
                        fontSize: '12px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                      }}
                    >
                      <MessageCircle size={15} />
                      <span>Falar no WhatsApp</span>
                    </a>

                    <select
                      value={lead.status}
                      onChange={(e) =>
                        updateLeadStatusMutation.mutate({
                          id: lead.id,
                          status: e.target.value as any,
                        })
                      }
                      style={{
                        height: '36px',
                        padding: '0 8px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="new">Novo</option>
                      <option value="contacted">Contatado</option>
                      <option value="converted">Fechado ✓</option>
                      <option value="discarded">Descartado</option>
                    </select>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E1E6EC',
                  borderRadius: '16px',
                  padding: '32px',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: '13px',
                }}
              >
                Nenhuma solicitação de orçamento encontrada para este filtro.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. CONTEÚDO DA ABA: CONFIGURAÇÃO DE TEXTOS & APRESENTAÇÃO */}
      {activeTab === 'config' && (
        <form
          onSubmit={handleSaveSettings}
          style={{
            background: '#fff',
            border: '1px solid #E1E6EC',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0E1116' }}>
                Personalização dos Textos do Mini-Site
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#5B6674' }}>
                Destaque a autoridade da sua oficina, anos de tradição e localização.
              </p>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
              Headline Principal de Impacto
            </label>
            <input
              type="text"
              value={configForm.headline || ''}
              onChange={(e) => setConfigForm({ ...configForm, headline: e.target.value })}
              placeholder="Ex: Centro Especializado em Proteção de Pintura (PPF) e Estética Automotiva de Alta Performance"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
              Sobre a Oficina (Biografia Institucional)
            </label>
            <textarea
              rows={4}
              value={configForm.about || ''}
              onChange={(e) => setConfigForm({ ...configForm, about: e.target.value })}
              placeholder="Conte a história da oficina, marcas que atende, instalações (sala climatizada, sala de espera) e certificações técnicas..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                boxSizing: 'border-box',
                resize: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5B6674', marginBottom: '4px' }}>
              Endereço Completo para Visitação
            </label>
            <input
              type="text"
              value={configForm.address || ''}
              onChange={(e) => setConfigForm({ ...configForm, address: e.target.value })}
              placeholder="Ex: Rua das Oficinas, 500 - Bairro Nobre, Cidade - UF"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              style={{
                height: '42px',
                padding: '0 24px',
                borderRadius: '12px',
                border: 0,
                background: '#0E1116',
                color: '#C8F52E',
                font: '700 13px Inter, sans-serif',
                cursor: 'pointer',
              }}
            >
              {updateSettingsMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

