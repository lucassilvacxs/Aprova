import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Flame,
  Star,
  ExternalLink,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  EmptyState,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { newsService, NewsItem, NewsSource } from '@/services/news.service';
import { contestService, ContestItem } from '@/services/contest.service';
import { useAuthStore } from '@/store';

const CATEGORIES = [
  { value: '', label: 'Todas as Categorias' },
  { value: 'EDITAL', label: 'Edital' },
  { value: 'RETIFICATION', label: 'Retificação' },
  { value: 'NOTICE', label: 'Comunicado' },
  { value: 'EXAM', label: 'Provas e Etapas' },
  { value: 'REGISTRATION', label: 'Inscrições' },
  { value: 'RESULT', label: 'Resultados e Notas' },
  { value: 'APPOINTMENT', label: 'Convocação e Posse' },
  { value: 'CAREER', label: 'Carreira e Remuneração' },
  { value: 'STUDY', label: 'Dicas de Estudo' },
  { value: 'CONTEST', label: 'Concurso Geral' },
];

const PERIODS = [
  { value: 'all', label: 'Todo o Período' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Últimos 7 dias' },
  { value: 'month', label: 'Último mês' },
  { value: 'year', label: 'Último ano' },
];

export const NoticiasPage: React.FC = () => {
  const { user } = useAuthStore();

  // Estados de dados
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [featuredNews, setFeaturedNews] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // Estados de Filtro
  const [selectedContest, setSelectedContest] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [onlyImportant, setOnlyImportant] = useState<boolean>(false);
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [onlyUnread, setOnlyUnread] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Estados de controle de UI
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce do campo de busca (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Carga inicial de fontes e concursos
  useEffect(() => {
    async function loadAuxData() {
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
    loadAuxData();
  }, []);

  // Busca de notícias em destaque
  useEffect(() => {
    async function loadFeatured() {
      try {
        const featured = await newsService.getFeaturedNews(selectedContest || undefined);
        setFeaturedNews(featured);
      } catch (e) {
        console.error('Erro ao buscar notícias em destaque:', e);
      }
    }
    loadFeatured();
  }, [selectedContest]);

  // Busca principal de notícias
  const fetchNews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await newsService.listNews({
        contestId: selectedContest || undefined,
        category: selectedCategory || undefined,
        sourceId: selectedSource || undefined,
        period: selectedPeriod !== 'all' ? (selectedPeriod as any) : undefined,
        isImportant: onlyImportant ? true : undefined,
        onlyFavorites: onlyFavorites || undefined,
        onlyUnread: onlyUnread || undefined,
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setNewsList(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error('Erro ao buscar notícias:', err);
      setError(err.message || 'Falha ao carregar notícias. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [
    selectedContest,
    selectedCategory,
    selectedSource,
    selectedPeriod,
    onlyImportant,
    onlyFavorites,
    onlyUnread,
    debouncedSearch,
    pagination.page,
  ]);

  // Alternar favorito com atualização otimista
  const handleToggleFavorite = async (newsId: string, currentFav?: boolean) => {
    setNewsList((prev) =>
      prev.map((item) =>
        item.id === newsId ? { ...item, isFavorite: !currentFav } : item
      )
    );
    try {
      await newsService.toggleFavorite(newsId);
    } catch (e) {
      // Reverte em caso de erro
      setNewsList((prev) =>
        prev.map((item) =>
          item.id === newsId ? { ...item, isFavorite: currentFav } : item
        )
      );
    }
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setSelectedContest('');
    setSelectedCategory('');
    setSelectedSource('');
    setSelectedPeriod('all');
    setOnlyImportant(false);
    setOnlyFavorites(false);
    setOnlyUnread(false);
    setSearchTerm('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters =
    Boolean(selectedContest) ||
    Boolean(selectedCategory) ||
    Boolean(selectedSource) ||
    selectedPeriod !== 'all' ||
    onlyImportant ||
    onlyFavorites ||
    onlyUnread ||
    Boolean(searchTerm);

  const formatPublishDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHrs < 1) return 'Pouco tempo atrás';
      if (diffHrs < 24) return `Há ${diffHrs}h`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays === 1) return 'Ontem';
      if (diffDays < 7) return `Há ${diffDays} dias`;

      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* ── CABEÇALHO PRINCIPAL ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1">
            <Newspaper className="w-4 h-4" />
            Central de Notícias e Editais
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Notícias</h1>
          <p className="text-sm text-text-secondary mt-1">
            Acompanhe comunicados, retificações e atualizações oficiais dos concursos em tempo real.
          </p>
        </div>

        {/* Links rápidos para Editais */}
        <div className="flex items-center gap-3">
          <Link to="/editais">
            <Button variant="secondary" size="sm" className="gap-2">
              <Building2 className="w-4 h-4 text-brand-400" />
              Editais & Documentos
            </Button>
          </Link>
          {user?.roles?.includes('admin') && (
            <Link to="/admin/noticias">
              <Button variant="primary" size="sm" className="gap-2 shadow-brand">
                <ShieldCheck className="w-4 h-4" />
                Painel Admin
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── SEÇÃO EM DESTAQUE (HERO CARDS) ───────────────────────────── */}
      {featuredNews.length > 0 && !hasActiveFilters && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>Em Destaque</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredNews.slice(0, 3).map((item) => (
              <Card
                key={`featured-${item.id}`}
                hoverable
                noPadding
                className="relative flex flex-col justify-between overflow-hidden border-border/80 bg-gradient-to-br from-bg-surface via-bg-surface to-brand-500/5 group"
              >
                {/* Linha de acento de destaque */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-orange-500 to-brand-600" />

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {item.contestTitle && (
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          {item.contestSlug?.toUpperCase() || 'CONCURSO'}
                        </span>
                      )}
                      <Badge variant="brand" size="xs">
                        {item.category}
                      </Badge>
                      {item.isImportant && (
                        <Badge variant="warning" size="xs" className="gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3" /> Importante
                        </Badge>
                      )}
                      <span className="ml-auto text-[11px] text-text-muted flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatPublishDate(item.publishedAt)}
                      </span>
                    </div>

                    <Link to={`/noticias/${item.id}`} className="block group-hover:text-brand-400 transition-colors">
                      <h3 className="text-base font-bold text-text-primary leading-snug line-clamp-2 mb-2">
                        {item.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-text-muted truncate max-w-[200px]">
                      <span className="font-semibold truncate">{item.sourceName}</span>
                      {item.sourceTrustLevel === 'HIGH' && (
                        <span title="Fonte Oficial Confiável" className="shrink-0 text-green-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <Link to={`/noticias/${item.id}`}>
                      <Button variant="ghost" size="xs" className="text-brand-400 hover:text-brand-300 font-semibold gap-1">
                        Ler notícia <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── BARRA DE FILTROS E BUSCA ─────────────────────────────────── */}
      <Card className="p-5 space-y-4 border-border bg-bg-surface/90 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Pesquisar por título, termos do edital ou assunto..."
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

          {/* Seletor de Concurso */}
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

          {/* Seletor de Categoria */}
          <div className="w-full lg:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2.5 bg-bg-elevated/70 border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-500 transition-all cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Fonte */}
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

          {/* Seletor de Período */}
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

        {/* Linha de filtros rápidos e contador */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-text-secondary hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={onlyImportant}
                onChange={(e) => {
                  setOnlyImportant(e.target.checked);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-4 h-4 rounded border-border text-brand-500 focus:ring-brand-500 cursor-pointer"
              />
              <span className="flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Apenas importantes
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-text-secondary hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={onlyFavorites}
                onChange={(e) => {
                  setOnlyFavorites(e.target.checked);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-4 h-4 rounded border-border text-brand-500 focus:ring-brand-500 cursor-pointer"
              />
              <span className="flex items-center gap-1 font-medium">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Apenas favoritas
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-text-secondary hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={onlyUnread}
                onChange={(e) => {
                  setOnlyUnread(e.target.checked);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-4 h-4 rounded border-border text-brand-500 focus:ring-brand-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-brand-500" /> Não lidas
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3">
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

            <span className="text-text-muted font-medium">
              {pagination.total} notícia{pagination.total === 1 ? '' : 's'} encontrada{pagination.total === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </Card>

      {/* ── GRID DE NOTÍCIAS ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-12">
          <LoadingState message="Buscando notícias e atualizações..." />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchNews} />
      ) : newsList.length === 0 ? (
        <EmptyState
          title="Nenhuma notícia encontrada"
          description={
            hasActiveFilters
              ? 'Não encontramos nenhuma atualização para os filtros aplicados. Tente ajustar os parâmetros ou limpar a busca.'
              : 'Ainda não há notícias cadastradas nesta seção.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Limpar todos os filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {newsList.map((item) => (
            <Card
              key={item.id}
              hoverable
              noPadding
              className="flex flex-col justify-between border-border bg-bg-surface overflow-hidden group transition-all duration-200 hover:shadow-md"
            >
              <div className="p-5 flex-1 flex flex-col">
                {/* Header do Card */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {item.contestTitle ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      {item.contestSlug?.toUpperCase() || 'GERAL'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-neutral-500/10 text-text-muted border border-neutral-500/20">
                      GERAL
                    </span>
                  )}

                  <Badge variant="neutral" size="xs">
                    {item.category}
                  </Badge>

                  {item.isImportant && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                      <AlertTriangle className="w-2.5 h-2.5" /> Importante
                    </span>
                  )}

                  {/* Indicador de Leitura */}
                  <span className="ml-auto flex items-center gap-1">
                    {item.isRead ? (
                      <span className="text-[10px] text-text-disabled flex items-center gap-1" title="Notícia já lida">
                        <CheckCircle2 className="w-3 h-3 text-green-500/70" /> Lida
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" title="Nova notícia não lida" />
                    )}
                  </span>
                </div>

                {/* Título com Link */}
                <Link to={`/noticias/${item.id}`} className="block group-hover:text-brand-400 transition-colors mb-2">
                  <h3 className="text-base font-bold text-text-primary leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                </Link>

                {/* Resumo */}
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 mb-4 flex-1">
                  {item.summary}
                </p>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={`${item.id}-${tag}`}
                        className="text-[9px] font-semibold text-text-muted bg-bg-elevated px-1.5 py-0.5 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metadados da Fonte */}
                <div className="flex items-center justify-between text-[11px] text-text-muted pt-3 border-t border-border/60">
                  <div className="flex items-center gap-1.5 truncate max-w-[170px]" title={item.sourceName}>
                    <span className="font-semibold text-text-secondary truncate">{item.sourceName}</span>
                    {item.sourceTrustLevel === 'HIGH' && (
                      <span title="Fonte Oficial Confiável">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <span className="shrink-0">{formatPublishDate(item.publishedAt)}</span>
                </div>
              </div>

              {/* Footer do Card com Ações */}
              <div className="px-5 py-3 bg-bg-elevated/40 border-t border-border/50 flex items-center justify-between">
                <button
                  onClick={() => handleToggleFavorite(item.id, item.isFavorite)}
                  className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs ${
                    item.isFavorite
                      ? 'text-amber-400 hover:text-amber-300'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                  title={item.isFavorite ? 'Remover dos favoritos' : 'Favoritar notícia'}
                >
                  <Star className={`w-4 h-4 ${item.isFavorite ? 'fill-amber-400' : ''}`} />
                  <span className="text-[11px] font-medium hidden sm:inline">
                    {item.isFavorite ? 'Favorita' : 'Favoritar'}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  {item.externalUrl && (
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-text-muted hover:text-brand-400 transition-colors"
                      title="Abrir fonte original externa"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <Link to={`/noticias/${item.id}`}>
                    <Button variant="secondary" size="xs" className="font-semibold gap-1">
                      Ler <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
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
