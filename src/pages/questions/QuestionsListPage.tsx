import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  HelpCircle,
  Search,
  Star,
  Bookmark,
  CheckCircle2,
  XCircle,
  ChevronRight,
  TrendingUp,
  History,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  StatCard,
  LoadingState,
  EmptyState,
} from '@/components/ui';
import {
  questionService,
  QuestionItem,
  FilterOptionData,
  QuestionStats,
} from '@/services/question.service';

export const QuestionsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [filterData, setFilterData] = useState<FilterOptionData | null>(null);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Filtros ativos lidos de URL ou estado local
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [contestId, setContestId] = useState(searchParams.get('contestId') || '');
  const [subjectId, setSubjectId] = useState(searchParams.get('subjectId') || '');
  const [topicId, setTopicId] = useState(searchParams.get('topicId') || '');
  const [boardId, setBoardId] = useState(searchParams.get('boardId') || '');
  const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') || '');
  const [format, setFormat] = useState(searchParams.get('format') || '');
  const [year, setYear] = useState(searchParams.get('year') || '');
  const [resolutionStatus, setResolutionStatus] = useState<string>(searchParams.get('resolution') || 'all');
  const [onlyFavorites, setOnlyFavorites] = useState(searchParams.get('favorites') === 'true');
  const [onlyReview, setOnlyReview] = useState(searchParams.get('review') === 'true');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Carrega opções de filtros e estatísticas
  useEffect(() => {
    Promise.all([
      questionService.getFiltersData().catch(() => null),
      questionService.getStats().catch(() => null),
    ]).then(([fData, sData]) => {
      if (fData) setFilterData(fData);
      if (sData) setStats(sData);
    });
  }, []);

  // Carrega listagem de questões
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await questionService.getQuestions({
        search: search.trim() || undefined,
        contestId: contestId || undefined,
        subjectId: subjectId || undefined,
        topicId: topicId || undefined,
        boardId: boardId || undefined,
        difficulty: difficulty || undefined,
        format: format || undefined,
        year: year ? Number(year) : undefined,
        resolutionStatus: resolutionStatus as any,
        onlyFavorites: onlyFavorites || undefined,
        onlyReview: onlyReview || undefined,
        page,
        limit: 15,
      });

      setQuestions(res.items);
      setMeta(res.meta);
    } catch (err) {
      console.error('Erro ao buscar questões:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [page, contestId, subjectId, topicId, boardId, difficulty, format, year, resolutionStatus, onlyFavorites, onlyReview]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  const handleToggleFavorite = async (qId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await questionService.toggleFavorite(qId);
      setQuestions((prev) =>
        prev.map((q) => (q.id === qId ? { ...q, isFavorited: res.favorited } : q))
      );
    } catch (err) {
      console.error('Erro ao favoritar:', err);
    }
  };

  const handleToggleReview = async (qId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await questionService.toggleReview(qId);
      setQuestions((prev) =>
        prev.map((q) => (q.id === qId ? { ...q, isMarkedForReview: res.markedForReview } : q))
      );
    } catch (err) {
      console.error('Erro ao marcar para revisão:', err);
    }
  };

  const clearAllFilters = () => {
    setSearch('');
    setContestId('');
    setSubjectId('');
    setTopicId('');
    setBoardId('');
    setDifficulty('');
    setFormat('');
    setYear('');
    setResolutionStatus('all');
    setOnlyFavorites(false);
    setOnlyReview(false);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || contestId || subjectId || topicId || boardId || difficulty || format || year || resolutionStatus !== 'all' || onlyFavorites || onlyReview
  );

  const filteredTopics = filterData?.topics.filter((t) =>
    subjectId ? t.subjectId === subjectId : true
  ) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Banco de Questões
            </h1>
            <Badge variant="brand" size="sm">Fase 5</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Treine com questões comentadas, gabarito oficial protegido e acompanhamento real de taxa de acertos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/questoes/historico')}
            leftIcon={<History className="w-4 h-4" />}
          >
            Meu Histórico
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/desempenho/questoes')}
            leftIcon={<TrendingUp className="w-4 h-4" />}
          >
            Análise de Desempenho
          </Button>
        </div>
      </div>

      {/* KPI Cards Reais */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Questões Resolvidas"
            value={stats.overall.totalAnswered}
            colorKey="purple"
            icon={<HelpCircle className="w-5 h-5 text-brand-400" />}
          />
          <StatCard
            label="Taxa de Acerto"
            value={`${stats.overall.accuracy}%`}
            colorKey="green"
            icon={<TrendingUp className="w-5 h-5 text-success-400" />}
          />
          <StatCard
            label="Tempo Médio"
            value={`${Math.round(stats.overall.avgDurationSec / 60)} min`}
            colorKey="amber"
            icon={<RotateCcw className="w-5 h-5 text-warning-400" />}
          />
          <StatCard
            label="Disciplinas Mapeadas"
            value={stats.bySubject.length}
            colorKey="blue"
            icon={<Sparkles className="w-5 h-5 text-purple-400" />}
          />
        </div>
      )}

      {/* Barra de Busca e Filtros Rápidos */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por palavras-chave no enunciado ou referência do concurso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant={showFiltersDrawer ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
              leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            >
              Filtros Avançados {hasActiveFilters && '•'}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="md" onClick={clearAllFilters}>
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Abas Rápidas de Resolução */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm border-t border-border/50 pt-3">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mr-2">
            Situação:
          </span>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'unanswered', label: 'Não Resolvidas' },
            { id: 'correct', label: 'Acertadas' },
            { id: 'wrong', label: 'Erradas (Caderno de Erros)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setResolutionStatus(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                resolutionStatus === tab.id
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="h-4 w-px bg-border mx-2" />

          <button
            onClick={() => {
              setOnlyFavorites(!onlyFavorites);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              onlyFavorites
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
            Favoritas
          </button>

          <button
            onClick={() => {
              setOnlyReview(!onlyReview);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              onlyReview
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${onlyReview ? 'fill-purple-400 text-purple-400' : ''}`} />
            Para Revisão
          </button>
        </div>

        {/* Drawer / Painel Expansível de Filtros Avançados */}
        {showFiltersDrawer && filterData && (
          <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-fade-in">
            <div>
              <label className="block text-text-muted font-medium mb-1">Concurso</label>
              <select
                value={contestId}
                onChange={(e) => {
                  setContestId(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                <option value="">Todos os concursos</option>
                {filterData.contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Disciplina</label>
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setTopicId('');
                  setPage(1);
                }}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                <option value="">Todas as disciplinas</option>
                {filterData.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Assunto / Tópico</label>
              <select
                value={topicId}
                onChange={(e) => {
                  setTopicId(e.target.value);
                  setPage(1);
                }}
                disabled={!subjectId}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary disabled:opacity-50"
              >
                <option value="">Todos os assuntos</option>
                {filteredTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Banca Examinadora</label>
              <select
                value={boardId}
                onChange={(e) => {
                  setBoardId(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                <option value="">Todas as bancas</option>
                {filterData.boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.acronym})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Dificuldade</label>
              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                <option value="">Todas as dificuldades</option>
                {filterData.difficulties.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Formato</label>
              <select
                value={format}
                onChange={(e) => {
                  setFormat(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              >
                <option value="">Todos os formatos</option>
                {filterData.formats.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-muted font-medium mb-1">Ano</label>
              <input
                type="number"
                placeholder="Ex: 2021"
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Lista de Questões */}
      {loading ? (
        <div className="py-12">
          <LoadingState message="Carregando banco de questões..." />
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="w-12 h-12 text-text-muted" />}
          title="Nenhuma questão encontrada"
          description="Nenhuma questão corresponde aos filtros selecionados. Tente ajustar os parâmetros de busca."
          action={
            hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                Limpar Filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-text-muted px-1">
            <span>
              Exibindo <strong>{questions.length}</strong> de <strong>{meta.total}</strong> questões
            </span>
            <span>
              Página {meta.page} de {meta.totalPages}
            </span>
          </div>

          {questions.map((q, idx) => {
            const hasAttempt = q.userAttempt !== null && q.userAttempt !== undefined;
            const isCorrect = hasAttempt ? q.userAttempt?.isCorrect : false;

            return (
              <Card
                key={q.id}
                className="p-5 hover:border-brand-500/30 transition-all cursor-pointer group"
                onClick={() => navigate(`/questoes/${q.id}`)}
              >
                <div className="space-y-3">
                  {/* Topo do Card com Metadados */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-text-muted font-mono">
                        #{(meta.page - 1) * meta.limit + idx + 1}
                      </span>
                      {q.subjectName && (
                        <Badge variant="brand" size="sm">
                          {q.subjectName}
                        </Badge>
                      )}
                      {q.topicName && (
                        <span className="text-xs text-text-muted bg-bg-elevated px-2 py-0.5 rounded border border-border/50">
                          {q.topicName}
                        </span>
                      )}
                      <Badge variant="neutral" size="sm">
                        {q.boardAcronym || 'Banca'} • {q.year}
                      </Badge>
                      <Badge
                        variant={
                          q.difficulty === 'easy'
                            ? 'success'
                            : q.difficulty === 'medium'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {q.difficulty === 'easy'
                          ? 'Fácil'
                          : q.difficulty === 'medium'
                          ? 'Média'
                          : q.difficulty === 'hard'
                          ? 'Difícil'
                          : 'Muito Difícil'}
                      </Badge>
                      {q.source === 'DEMO' && (
                        <Badge variant="neutral" size="sm">
                          DEMO
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(q.id, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          q.isFavorited
                            ? 'text-amber-400 hover:bg-amber-400/10'
                            : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                        }`}
                        title={q.isFavorited ? 'Remover dos favoritos' : 'Favoritar questão'}
                      >
                        <Star className={`w-4 h-4 ${q.isFavorited ? 'fill-amber-400' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggleReview(q.id, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          q.isMarkedForReview
                            ? 'text-purple-400 hover:bg-purple-400/10'
                            : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                        }`}
                        title={q.isMarkedForReview ? 'Remover da revisão' : 'Marcar para revisão periódica'}
                      >
                        <Bookmark className={`w-4 h-4 ${q.isMarkedForReview ? 'fill-purple-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Enunciado da questão */}
                  <p className="text-sm text-text-primary line-clamp-3 leading-relaxed">
                    {q.statement}
                  </p>

                  {/* Rodapé do Card */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                      {hasAttempt ? (
                        isCorrect ? (
                          <span className="flex items-center gap-1 text-success-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Você acertou esta questão
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-danger-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            Você errou anteriormente
                          </span>
                        )
                      ) : (
                        <span className="text-text-muted">Ainda não respondida</span>
                      )}
                      {q.contestTitle && (
                        <span>• Concurso: {q.contestTitle}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-brand-400 font-medium group-hover:translate-x-0.5 transition-transform">
                      <span>Resolver</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Paginação */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={meta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-xs font-medium text-text-secondary px-3">
                Página {meta.page} de {meta.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
