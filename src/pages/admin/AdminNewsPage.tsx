import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Newspaper,
  Plus,
  Search,
  Flame,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  Edit,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  IconButton,
  StatCard,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/ui';
import { newsService, NewsItem, AdminNewsStats } from '@/services/news.service';
import { contestService, ContestItem } from '@/services/contest.service';

export const AdminNewsPage: React.FC = () => {

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<AdminNewsStats | null>(null);
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filtros
  const [selectedContest, setSelectedContest] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    async function loadAux() {
      try {
        const [statsData, contestsData] = await Promise.all([
          newsService.getAdminStats().catch(() => null),
          contestService.getContests().catch(() => []),
        ]);
        setStats(statsData);
        setContests(contestsData);
      } catch (e) {
        console.error('Erro ao carregar dados auxiliares:', e);
      }
    }
    loadAux();
  }, []);

  const fetchNews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await newsService.listAdminNews({
        contestId: selectedContest || undefined,
        status: selectedStatus || undefined,
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setNewsList(res.items);
      setPagination(res.pagination);

      // Atualiza estatísticas
      const updatedStats = await newsService.getAdminStats().catch(() => null);
      if (updatedStats) setStats(updatedStats);
    } catch (err: any) {
      console.error('Erro ao listar notícias:', err);
      setError(err.message || 'Falha ao carregar lista de notícias.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [selectedContest, selectedStatus, debouncedSearch, pagination.page]);

  const handleToggleFeatured = async (id: string) => {
    try {
      await newsService.toggleFeatured(id);
      fetchNews();
    } catch (e: any) {
      alert(e.message || 'Erro ao alternar destaque.');
    }
  };

  const handleToggleImportant = async (id: string) => {
    try {
      await newsService.toggleImportant(id);
      fetchNews();
    } catch (e: any) {
      alert(e.message || 'Erro ao alternar importante.');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await newsService.publishNews(id);
      fetchNews();
    } catch (e: any) {
      alert(e.message || 'Erro ao publicar notícia.');
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Deseja realmente arquivar esta notícia?')) return;
    try {
      await newsService.archiveNews(id);
      fetchNews();
    } catch (e: any) {
      alert(e.message || 'Erro ao arquivar notícia.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Atenção: A exclusão é permanente. Deseja continuar?')) return;
    try {
      await newsService.deleteNews(id);
      fetchNews();
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir notícia.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1">
            <ShieldCheck className="w-4 h-4" />
            Gestão Administrativa
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            Central de Notícias
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Gerencie comunicados, rascunhos, publicação, destaques e fontes oficiais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/admin/noticias/fontes">
            <Button variant="secondary" size="sm" className="gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              Fontes Confiáveis
            </Button>
          </Link>

          <Link to="/admin/editais">
            <Button variant="secondary" size="sm" className="gap-2">
              <Building2 className="w-4 h-4 text-brand-400" />
              Editais & Docs
            </Button>
          </Link>

          <Link to="/admin/noticias/nova">
            <Button variant="primary" size="sm" className="gap-2 shadow-brand">
              <Plus className="w-4 h-4" />
              Nova Notícia
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPIs DO PAINEL ────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total de Notícias"
            value={stats.total}
            icon={<Newspaper className="w-5 h-5 text-brand-400" />}
            colorKey="purple"
          />
          <StatCard
            label="Publicadas"
            value={stats.published}
            icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
            colorKey="green"
          />
          <StatCard
            label="Rascunhos"
            value={stats.drafts}
            icon={<Clock className="w-5 h-5 text-amber-400" />}
            colorKey="amber"
          />
          <StatCard
            label="Importantes"
            value={stats.important}
            icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
            colorKey="rose"
          />
        </div>
      )}

      {/* ── BARRA DE PESQUISA & FILTROS ───────────────────────────────── */}
      <Card className="p-4 border-border bg-bg-surface space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Pesquisar notícias pelo título ou resumo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-elevated/70 border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="w-full md:w-52">
            <select
              value={selectedContest}
              onChange={(e) => setSelectedContest(e.target.value)}
              className="w-full px-3 py-2 bg-bg-elevated/70 border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="">Todos os Concursos</option>
              {contests.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.acronym} — {c.agencyName}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-44">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-bg-elevated/70 border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="">Todos os Status</option>
              <option value="PUBLISHED">Publicadas</option>
              <option value="DRAFT">Rascunho</option>
              <option value="ARCHIVED">Arquivadas</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ── TABELA DE NOTÍCIAS ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-12">
          <LoadingState message="Carregando fila de notícias..." />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchNews} />
      ) : newsList.length === 0 ? (
        <EmptyState
          title="Nenhuma notícia encontrada"
          description="Nenhuma notícia corresponde aos filtros selecionados."
          action={
            <Link to="/admin/noticias/nova">
              <Button variant="primary" size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Criar primeira notícia
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden bg-bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg-elevated/50 text-xs text-text-muted uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Notícia</th>
                  <th className="py-3.5 px-4">Concurso</th>
                  <th className="py-3.5 px-4">Fonte</th>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Destaque</th>
                  <th className="py-3.5 px-4 text-center">Importante</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {newsList.map((item) => (
                  <tr key={item.id} className="hover:bg-bg-elevated/30 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-text-primary line-clamp-1">{item.title}</div>
                      <div className="text-xs text-text-muted line-clamp-1">{item.summary}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.contestTitle ? (
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          {item.contestSlug?.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-xs text-text-disabled">Geral</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-text-secondary">{item.sourceName}</div>
                      <div className="text-[10px] text-text-muted">{item.sourceTrustLevel}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-text-muted">
                      {new Date(item.publishedAt).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge
                        variant={
                          item.status === 'PUBLISHED'
                            ? 'success'
                            : item.status === 'DRAFT'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="xs"
                      >
                        {item.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleFeatured(item.id)}
                        className={`p-1 rounded transition-colors ${
                          item.isFeatured ? 'text-orange-400 hover:text-orange-300' : 'text-text-disabled hover:text-text-muted'
                        }`}
                        title="Alternar destaque"
                      >
                        <Flame className={`w-4 h-4 mx-auto ${item.isFeatured ? 'fill-orange-400' : ''}`} />
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleImportant(item.id)}
                        className={`p-1 rounded transition-colors ${
                          item.isImportant ? 'text-amber-400 hover:text-amber-300' : 'text-text-disabled hover:text-text-muted'
                        }`}
                        title="Alternar importante"
                      >
                        <AlertTriangle className={`w-4 h-4 mx-auto ${item.isImportant ? 'fill-amber-400' : ''}`} />
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handlePublish(item.id)}
                            className="text-green-400 hover:text-green-300 text-xs"
                          >
                            Publicar
                          </Button>
                        )}

                        {item.status === 'PUBLISHED' && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleArchive(item.id)}
                            className="text-text-muted hover:text-amber-400 text-xs"
                            title="Arquivar notícia"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        <Link to={`/admin/noticias/${item.id}/editar`}>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            icon={<Edit className="w-3.5 h-3.5 text-brand-400" />}
                            label="Editar notícia"
                          />
                        </Link>

                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          icon={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
                          label="Excluir notícia"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
              <span>
                Mostrando {newsList.length} de {pagination.total} notícias
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </Button>

                <span className="font-semibold">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <Button
                  variant="secondary"
                  size="xs"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="gap-1"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
