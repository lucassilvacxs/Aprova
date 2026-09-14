import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Download,
  ExternalLink,
  Calendar,
  Building2,
  ShieldCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  EmptyState,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { documentService, OfficialDocument } from '@/services/document.service';
import { newsService, NewsSource } from '@/services/news.service';
import { contestService, ContestItem } from '@/services/contest.service';
import { useAuthStore } from '@/store';

const DOCUMENT_TYPES = [
  { value: '', label: 'Todos os Tipos' },
  { value: 'EDITAL', label: 'Edital de Abertura' },
  { value: 'RETIFICATION', label: 'Retificação de Edital' },
  { value: 'CRONOGRAMA', label: 'Cronograma' },
  { value: 'NOTICE', label: 'Comunicado Oficial' },
  { value: 'ANSWER_KEY', label: 'Gabarito' },
  { value: 'RESULT', label: 'Resultado' },
  { value: 'CALL', label: 'Convocação' },
  { value: 'OTHER', label: 'Outro Documento' },
];

const PERIODS = [
  { value: 'all', label: 'Todo o Período' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Últimos 7 dias' },
  { value: 'month', label: 'Último mês' },
  { value: 'year', label: 'Último ano' },
];

export const EditaisPage: React.FC = () => {
  const { user } = useAuthStore();

  const [documents, setDocuments] = useState<OfficialDocument[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // Filtros
  const [selectedContest, setSelectedContest] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce busca (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Carga inicial
  useEffect(() => {
    async function loadAux() {
      try {
        const [sourcesData, contestsData] = await Promise.all([
          newsService.listSources().catch(() => []),
          contestService.getContests().catch(() => []),
        ]);
        setSources(sourcesData);
        setContests(contestsData);
      } catch (e) {
        console.error('Erro ao carregar dados auxiliares:', e);
      }
    }
    loadAux();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await documentService.listDocuments({
        contestId: selectedContest || undefined,
        documentType: selectedType || undefined,
        sourceId: selectedSource || undefined,
        period: selectedPeriod !== 'all' ? (selectedPeriod as any) : undefined,
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setDocuments(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error('Erro ao buscar documentos:', err);
      setError(err.message || 'Falha ao carregar documentos oficiais.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedContest, selectedType, selectedSource, selectedPeriod, debouncedSearch, pagination.page]);

  const handleClearFilters = () => {
    setSelectedContest('');
    setSelectedType('');
    setSelectedSource('');
    setSelectedPeriod('all');
    setSearchTerm('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters =
    Boolean(selectedContest) ||
    Boolean(selectedType) ||
    Boolean(selectedSource) ||
    selectedPeriod !== 'all' ||
    Boolean(searchTerm);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return 'Tamanho n/d';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeBadgeVariant = (type: string): 'brand' | 'warning' | 'info' | 'success' | 'neutral' => {
    switch (type) {
      case 'EDITAL':
        return 'brand';
      case 'RETIFICATION':
        return 'warning';
      case 'CRONOGRAMA':
        return 'info';
      case 'RESULT':
        return 'success';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* ── CABEÇALHO ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1">
            <FileText className="w-4 h-4" />
            Repositório Oficial
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            Editais e Documentos
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Acesse na íntegra os editais de abertura, retificações, cronogramas e atos oficiais publicados pelas bancas e órgãos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/noticias">
            <Button variant="secondary" size="sm" className="gap-2">
              <Building2 className="w-4 h-4 text-brand-400" />
              Ver Notícias
            </Button>
          </Link>
          {user?.roles?.includes('admin') && (
            <Link to="/admin/editais">
              <Button variant="primary" size="sm" className="gap-2 shadow-brand">
                <ShieldCheck className="w-4 h-4" />
                Gerenciar Editais
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── BARRA DE FILTROS ─────────────────────────────────────────── */}
      <Card className="p-5 space-y-4 border-border bg-bg-surface/90 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por número do edital, cargo ou palavra-chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated/70 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            )}
          </div>

          <div className="w-full lg:w-48">
            <select
              value={selectedContest}
              onChange={(e) => {
                setSelectedContest(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2.5 bg-bg-elevated/70 border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
            >
              <option value="">Todos os Concursos</option>
              {contests.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.acronym} — {c.agencyName}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-48">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2.5 bg-bg-elevated/70 border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-48">
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2.5 bg-bg-elevated/70 border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
            >
              <option value="">Todas as Fontes</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-40">
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2.5 bg-bg-elevated/70 border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border/50">
          <div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleClearFilters}
                className="text-text-muted hover:text-red-400 gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar filtros
              </Button>
            )}
          </div>
          <span className="font-medium">
            {pagination.total} documento{pagination.total === 1 ? '' : 's'} localizado{pagination.total === 1 ? '' : 's'}
          </span>
        </div>
      </Card>

      {/* ── LISTAGEM DE DOCUMENTOS ────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-12">
          <LoadingState message="Carregando repositório de documentos..." />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDocuments} />
      ) : documents.length === 0 ? (
        <EmptyState
          title="Nenhum documento encontrado"
          description={
            hasActiveFilters
              ? 'Nenhum edital ou comunicado corresponde aos critérios filtrados. Tente limpar os filtros.'
              : 'Não há documentos oficiais cadastrados no momento.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Limpar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              hoverable
              noPadding
              className="flex flex-col justify-between border-border bg-bg-surface overflow-hidden group transition-all duration-200"
            >
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {doc.contestSlug?.toUpperCase() || 'CONCURSO'}
                  </span>

                  <Badge variant={getTypeBadgeVariant(doc.documentType)} size="xs">
                    {doc.documentType}
                  </Badge>

                  {doc.isFeatured && (
                    <span className="text-[10px] font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md">
                      Destaque
                    </span>
                  )}

                  <span className="ml-auto text-[11px] text-text-muted flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(doc.publicationDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <Link to={`/editais/${doc.id}`} className="block group-hover:text-brand-400 transition-colors mb-2">
                  <h3 className="text-base font-bold text-text-primary leading-snug line-clamp-2">
                    {doc.title}
                  </h3>
                </Link>

                {doc.description && (
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 mb-4 flex-1">
                    {doc.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-text-muted pt-3 border-t border-border/60">
                  <div className="flex items-center gap-1.5 truncate max-w-[170px]" title={doc.sourceName}>
                    <span className="font-semibold text-text-secondary truncate">{doc.sourceName}</span>
                    {doc.sourceTrustLevel === 'HIGH' && (
                      <span title="Fonte Oficial Confiável">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <span>{formatFileSize(doc.fileSizeBytes)}</span>
                </div>
              </div>

              {/* Ações */}
              <div className="px-5 py-3 bg-bg-elevated/40 border-t border-border/50 flex items-center justify-between gap-2">
                <Link to={`/editais/${doc.id}`}>
                  <Button variant="secondary" size="xs" className="gap-1.5 font-semibold">
                    <Eye className="w-3.5 h-3.5" /> Visualizar
                  </Button>
                </Link>

                <div className="flex items-center gap-2">
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-text-muted hover:text-brand-400 hover:bg-bg-elevated transition-colors"
                      title="Baixar arquivo PDF do documento"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}

                  {doc.externalUrl && (
                    <a
                      href={doc.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-text-muted hover:text-brand-400 hover:bg-bg-elevated transition-colors"
                      title="Abrir no portal da fonte original"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── PAGINAÇÃO ────────────────────────────────────────────────── */}
      {pagination.totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-border">
          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>

          <span className="text-xs font-semibold text-text-secondary px-4">
            Página {pagination.page} de {pagination.totalPages}
          </span>

          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="gap-1"
          >
            Próxima <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
