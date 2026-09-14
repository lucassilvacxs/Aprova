import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Plus,
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  IconButton,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/ui';
import { newsService, NewsSource } from '@/services/news.service';

export const AdminNewsSourcesPage: React.FC = () => {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Campos do formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [sourceType, setSourceType] = useState<'OFFICIAL' | 'EDUCATIONAL' | 'NEWS' | 'OTHER'>('OFFICIAL');
  const [trustLevel, setTrustLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [isActive, setIsActive] = useState<boolean>(true);

  const fetchSources = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await newsService.listAdminSources();
      setSources(data);
    } catch (err: any) {
      console.error('Erro ao carregar fontes:', err);
      setError(err.message || 'Falha ao buscar fontes cadastradas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const openCreateModal = () => {
    setEditingSource(null);
    setName('');
    setDescription('');
    setWebsiteUrl('');
    setSourceType('OFFICIAL');
    setTrustLevel('HIGH');
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (source: NewsSource) => {
    setEditingSource(source);
    setName(source.name);
    setDescription(source.description || '');
    setWebsiteUrl(source.websiteUrl);
    setSourceType(source.sourceType);
    setTrustLevel(source.trustLevel);
    setIsActive(source.isActive);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('O nome da fonte é obrigatório.');
      return;
    }
    if (!websiteUrl.trim()) {
      setModalError('A URL do portal da fonte é obrigatória.');
      return;
    }

    setIsSaving(true);
    setModalError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      websiteUrl: websiteUrl.trim(),
      sourceType,
      trustLevel,
      isActive,
    };

    try {
      if (editingSource) {
        await newsService.updateSource(editingSource.id, payload);
      } else {
        await newsService.createSource(payload);
      }
      setIsModalOpen(false);
      fetchSources();
    } catch (err: any) {
      console.error('Erro ao salvar fonte:', err);
      setModalError(err.message || 'Erro ao salvar fonte.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await newsService.toggleSourceActive(id);
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
      );
    } catch (err: any) {
      alert(err.message || 'Erro ao alternar status da fonte');
    }
  };

  const handleDelete = async (id: string, sourceName: string) => {
    if (!window.confirm(`Tem certeza que deseja desativar/excluir a fonte "${sourceName}"?`)) {
      return;
    }
    try {
      await newsService.deleteSource(id);
      fetchSources();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir fonte.');
    }
  };

  const filteredSources = sources.filter((s) => {
    const q = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.websiteUrl.toLowerCase().includes(q);
  });

  const getTrustBadge = (level: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (level) {
      case 'HIGH':
        return (
          <Badge variant="success" size="sm" className="gap-1">
            <ShieldCheck className="w-3 h-3" /> Alta Confiabilidade
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge variant="warning" size="sm" className="gap-1">
            <Shield className="w-3 h-3" /> Média Confiabilidade
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm" className="gap-1">
            <ShieldAlert className="w-3 h-3" /> Baixa Confiabilidade
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/noticias"
            className="p-2 rounded-lg border border-border hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors"
            title="Voltar para notícias"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Globe className="w-6 h-6 text-brand-primary" />
              Fontes & Rastreabilidade de Notícias
            </h1>
            <p className="text-sm text-text-secondary">
              Gerencie órgãos oficiais, bancas examinadoras e portais credenciados para validação de conteúdo.
            </p>
          </div>
        </div>

        <Button variant="primary" onClick={openCreateModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Fonte Oficial
        </Button>
      </div>

      {/* Barra de Busca */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nome ou URL..."
            className="w-full px-3 py-2 pl-9 text-sm rounded-lg border border-border bg-surface-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
        </div>
      </Card>

      {/* Conteúdo Principal */}
      {isLoading ? (
        <LoadingState message="Carregando fontes credenciadas..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchSources} />
      ) : filteredSources.length === 0 ? (
        <EmptyState
          title="Nenhuma fonte encontrada"
          description="Não há fontes correspondentes aos filtros aplicados."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map((source) => (
            <Card
              key={source.id}
              className={`p-5 flex flex-col justify-between transition-all border ${
                source.isActive
                  ? 'border-border hover:border-brand-primary/40'
                  : 'opacity-60 bg-surface-secondary/30 border-dashed border-border'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-secondary border border-border flex items-center justify-center text-brand-primary font-bold text-xs">
                      {source.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary text-base leading-tight">
                        {source.name}
                      </h3>
                      <span className="text-xs text-text-muted">
                        {source.sourceType === 'OFFICIAL'
                          ? 'Órgão Oficial'
                          : source.sourceType === 'EDUCATIONAL'
                          ? 'Educacional'
                          : source.sourceType === 'NEWS'
                          ? 'Portal Noticioso'
                          : 'Outros'}
                      </span>
                    </div>
                  </div>
                  {getTrustBadge(source.trustLevel)}
                </div>

                {source.description && (
                  <p className="text-xs text-text-secondary line-clamp-2 mb-3">
                    {source.description}
                  </p>
                )}

                <a
                  href={source.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline break-all mb-4"
                >
                  {source.websiteUrl}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleActive(source.id)}
                  className="flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                >
                  {source.isActive ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-500">Ativa</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-text-muted" />
                      <span className="text-text-muted">Inativa</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1">
                  <IconButton
                    icon={<Edit2 className="w-4 h-4 text-text-secondary" />}
                    label="Editar fonte"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(source)}
                  />
                  <IconButton
                    icon={<Trash2 className="w-4 h-4 text-rose-500" />}
                    label="Excluir fonte"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(source.id, source.name)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-primary border border-border rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">
              {editingSource ? 'Editar Fonte Oficial' : 'Cadastrar Nova Fonte'}
            </h2>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Nome da Fonte / Instituição <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Imprensa Nacional (DOU) ou Cebraspe"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  URL Oficial <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://www.in.gov.br"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Tipo de Fonte
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e: any) => setSourceType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="OFFICIAL">Órgão Oficial / DOU</option>
                    <option value="EDUCATIONAL">Banca Examinadora</option>
                    <option value="NEWS">Portal de Notícias</option>
                    <option value="OTHER">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Nível de Confiabilidade
                  </label>
                  <select
                    value={trustLevel}
                    onChange={(e: any) => setTrustLevel(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="HIGH">Alta (Oficial / DOU / Diário)</option>
                    <option value="MEDIUM">Média (Portais conceituados)</option>
                    <option value="LOW">Baixa (Fontes secundárias)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Descrição / Notas de Procedência
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notas sobre a confiabilidade ou abrangência da fonte..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary border-border bg-surface-primary"
                />
                <span className="text-sm font-medium text-text-primary">
                  Fonte Ativa para Ingestão e Classificação
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="bg-brand-primary hover:bg-brand-primary/90 text-white"
                >
                  {isSaving ? 'Salvando...' : editingSource ? 'Atualizar Fonte' : 'Cadastrar Fonte'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
