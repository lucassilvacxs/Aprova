import React from 'react';
import { Link } from 'react-router-dom';
import {
  Target, CheckSquare, Percent, Clock, Flame,
  BookOpen, TrendingUp, ChevronRight, Newspaper, Play, AlertCircle, HelpCircle,
  CalendarDays, Sparkles, PenTool,
} from 'lucide-react';
import { StatCard, Card, SectionHeader, ProgressBar, Badge, EmptyState, LoadingState } from '@/components/ui';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid,
} from 'recharts';
import { useAuthStore, useContestStore } from '@/store';
import { dashboardService, DashboardData } from '@/services/dashboard.service';
import { progressService, ContinueStudyingData } from '@/services/progress.service';
import { contestService } from '@/services/contest.service';
import { questionService, RecommendedQuestion } from '@/services/question.service';
import { essayService, EssayDraft, EssayStats } from '@/services/essay.service';
import {
  MOCK_EVOLUTION_CHART,
  MOCK_NEWS,
  MOCK_TODAY_ACTIVITIES,
  MOCK_STUDIED_DAYS,
} from '@/data/mockData';

// ── Mini Calendar ─────────────────────────────────────────────────────────────
const MiniCalendar: React.FC = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const studiedSet = new Set(MOCK_STUDIED_DAYS);

  return (
    <div>
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 capitalize">{monthName}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <span key={i} className="text-[10px] font-bold text-text-disabled py-0.5">{d}</span>
        ))}
        {cells.map((day, idx) => (
          <div
            key={idx}
            className={`aspect-square flex items-center justify-center rounded-lg text-[11px] font-medium transition-all ${
              !day ? '' :
              day === today ? 'bg-brand-500 text-white font-bold shadow-brand text-xs' :
              studiedSet.has(day) ? 'bg-success/20 text-success-text border border-success/25' :
              'text-text-muted hover:bg-bg-elevated cursor-default'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success/60 border border-success/40" />
          <span className="text-[10px] text-text-muted">Estudou</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
          <span className="text-[10px] text-text-muted">Hoje</span>
        </div>
      </div>
    </div>
  );
};

// ── Dashboard Page Conectada ao Banco Real (Fases 3 & 4) ───────────────────────
export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedContestId, selectedContestAcronym, setSelectedContest } = useContestStore();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [contests, setContests] = React.useState<Array<{ id: string; acronym: string; agencyName: string }>>([]);
  const [continueData, setContinueData] = React.useState<ContinueStudyingData | null>(null);
  const [recommendedQuestions, setRecommendedQuestions] = React.useState<RecommendedQuestion[]>([]);
  const [essayDraft, setEssayDraft] = React.useState<EssayDraft | null>(null);
  const [essayStats, setEssayStats] = React.useState<EssayStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [continueLoading, setContinueLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadDashboard = React.useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [res, contestList, recs, draftData, statsData] = await Promise.all([
        dashboardService.getDashboard(),
        contestService.getContests().catch(() => []),
        questionService.getRecommendations(undefined, 2).catch(() => []),
        essayService.getActiveDraft().catch(() => null),
        essayService.getUserStats().catch(() => null),
      ]);
      setData(res);
      setContests(contestList.map(c => ({ id: c.id, acronym: c.acronym, agencyName: c.agencyName })));
      setRecommendedQuestions(recs);
      setEssayDraft(draftData);
      setEssayStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar as métricas do dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadContinueStudying = React.useCallback(async () => {
    setContinueLoading(true);
    try {
      const contRes = await progressService.getContinueStudying(selectedContestId || undefined);
      setContinueData(contRes);
    } catch {
      setContinueData(null);
    } finally {
      setContinueLoading(false);
    }
  }, [selectedContestId]);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  React.useEffect(() => {
    loadContinueStudying();
  }, [loadContinueStudying]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando dados reais do seu painel..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-bg-card border border-border rounded-2xl">
        <AlertCircle className="w-8 h-8 text-danger-text mx-auto mb-3" />
        <h3 className="text-base font-bold text-text-primary mb-1">Erro ao carregar dados</h3>
        <p className="text-xs text-text-muted mb-4">{error || 'Dados indisponíveis no momento.'}</p>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const { metrics, subjectPerformance } = data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.name ? user.name.split(' ')[0] : 'Aluno';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">
            {greeting}, <span className="text-gradient-brand">{firstName}</span> 👋
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {data.hasStartedStudying
              ? 'Continue de onde parou. Seus dados de desempenho estão sincronizados com o banco.'
              : 'Bem-vindo! Comece seus estudos selecionando um concurso ou disciplina.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-kpi-rose-bg border border-kpi-rose-border/30 rounded-xl">
            <Flame className="w-4 h-4 text-kpi-rose-text" />
            <span className="text-sm font-bold text-kpi-rose-text tabular-nums">{metrics.currentStreakDays} dias</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-kpi-blue-bg border border-kpi-blue-border/30 rounded-xl">
            <Clock className="w-4 h-4 text-kpi-blue-text" />
            <span className="text-sm font-bold text-kpi-blue-text tabular-nums">{metrics.totalStudyHours}h</span>
          </div>
        </div>
      </div>

      {/* Contest Switcher Bar */}
      {contests.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-text-muted font-medium shrink-0 mr-1">Foco ativo:</span>
          <button
            onClick={() => setSelectedContest(null)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
              !selectedContestId
                ? 'bg-brand-500 text-white shadow-brand'
                : 'bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-brand-500/40'
            }`}
          >
            Todos os Concursos
          </button>
          {contests.map((c) => {
            const isSelected = selectedContestId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedContest(isSelected ? null : { id: c.id, acronym: c.acronym, agencyName: c.agencyName })}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-brand-500 text-white shadow-brand'
                    : 'bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-brand-500/40'
                }`}
              >
                <span>{c.acronym}</span>
                <span className="text-[10px] opacity-75 font-normal">({c.agencyName})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Banner de Simulado em Andamento (Fase 6) */}
      {data.activeSimulation && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-brand-500/10 to-bg-surface border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse-slow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Simulado em Andamento
                </span>
                <span className="text-text-muted text-xs">
                  Tempo restante: <strong>{Math.floor(data.activeSimulation.remainingSeconds / 60)} min</strong>
                </span>
              </div>
              <h4 className="font-bold text-sm text-text-primary mt-0.5">
                {data.activeSimulation.simulationTitle}
              </h4>
            </div>
          </div>

          <Link
            to={`/simulados/${data.activeSimulation.simulationId}/prova`}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-sm transition-all shrink-0 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Continuar Simulado</span>
          </Link>
        </div>
      )}

      {/* KPI Cards reais do banco */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Disciplinas"
          value={metrics.activeSubjectsCount}
          colorKey="orange"
          icon={<BookOpen className="w-4 h-4" />}
        />
        <StatCard
          label="Aulas Feitas"
          value={metrics.completedLessonsCount}
          colorKey="purple"
          icon={<CheckSquare className="w-4 h-4" />}
        />
        <StatCard
          label="Taxa Acerto"
          value={`${metrics.overallAccuracyRate}%`}
          colorKey="green"
          icon={<Percent className="w-4 h-4" />}
        />
        <StatCard
          label="Questões"
          value={metrics.totalQuestionsAnswered.toLocaleString('pt-BR')}
          colorKey="rose"
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Horas Estudo"
          value={`${metrics.totalStudyHours}h`}
          colorKey="blue"
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Sequência"
          value={`${metrics.currentStreakDays} dias`}
          colorKey="amber"
          icon={<Flame className="w-4 h-4" />}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Plano de Estudos de Hoje (Fase 7) */}
          {data?.todayStudyPlan?.hasActivePlan && (
            <div>
              <SectionHeader
                title="Plano de Estudos de Hoje"
                subtitle={data.todayStudyPlan.plan?.name || 'Rotina Personalizada'}
                icon={<CalendarDays className="w-5 h-5 text-brand-400" />}
                action={
                  <Link
                    to="/plano-estudos/hoje"
                    className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    Abrir agenda diária <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                }
                className="mb-4"
              />
              <Card noPadding className="p-5 border-brand-500/20 bg-gradient-to-r from-bg-card via-bg-card to-brand-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-brand-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Cronograma Ativo
                      </span>
                      <span className="text-xs text-text-muted">
                        • {data.todayStudyPlan.summary.completedSessions}/{data.todayStudyPlan.summary.totalSessions} sessões concluídas hoje
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-text-primary">
                      {data.todayStudyPlan.summary.totalSessions === 0
                        ? 'Dia livre programado para descanso'
                        : `${data.todayStudyPlan.summary.plannedMinutes} minutos de foco programados`}
                    </h3>
                    <p className="text-xs text-text-muted">
                      {data.todayStudyPlan.sessions.length > 0
                        ? `Próxima: ${data.todayStudyPlan.sessions[0].subjectName} (${data.todayStudyPlan.sessions[0].startTime})`
                        : 'Aproveite para revisar ou descansar.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                      to="/plano-estudos/calendario"
                      className="px-3.5 py-2 rounded-xl bg-bg-elevated hover:bg-border text-text-primary text-xs font-semibold border border-border transition-all"
                    >
                      Calendário
                    </Link>
                    <Link
                      to="/plano-estudos/hoje"
                      className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-brand transition-all"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Estudar Agora
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Continue Estudando */}
          <div>
            <SectionHeader
              title="Continue Estudando"
              subtitle={selectedContestAcronym ? `Foco selecionado: ${selectedContestAcronym}` : 'Retome de onde parou'}
              icon={<BookOpen className="w-5 h-5" />}
              action={
                <Link to="/disciplinas" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 transition-colors">
                  Ver todas <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              }
              className="mb-4"
            />

            {continueLoading ? (
              <div className="p-8 text-center bg-bg-card border border-border rounded-2xl">
                <LoadingState message="Buscando próxima aula recomendada..." />
              </div>
            ) : continueData ? (
              <Card noPadding hoverable className="border-brand-500/30 bg-gradient-to-r from-bg-card via-bg-card to-brand-500/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      <BookOpen className="w-6 h-6 text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {continueData.subjectName && (
                          <Badge variant="brand" size="xs">{continueData.subjectName}</Badge>
                        )}
                        <span className="text-xs text-text-muted font-medium truncate">
                          {continueData.courseTitle}
                        </span>
                        {continueData.estimatedDurationMin && (
                          <Badge variant="neutral" size="xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {continueData.estimatedDurationMin} min
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-text-primary mb-1 line-clamp-1">
                        {continueData.lessonTitle}
                      </h3>
                      <p className="text-xs text-text-muted line-clamp-1">
                        Módulo: <span className="text-text-secondary">{continueData.moduleTitle}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    <Link
                      to={`/cursos/${continueData.courseId}`}
                      className="text-xs font-semibold text-text-muted hover:text-text-primary transition-colors px-3 py-2 rounded-xl hover:bg-bg-elevated"
                    >
                      Ver Curso
                    </Link>
                    <Link
                      to={`/aulas/${continueData.lessonId}`}
                      className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-brand transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Continuar Aula
                    </Link>
                  </div>
                </div>
              </Card>
            ) : (
              <Card noPadding className="p-6 text-center border-dashed border-border">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400 mx-auto mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Nenhuma aula em andamento</h3>
                <p className="text-xs text-text-muted max-w-md mx-auto mb-4">
                  Selecione um concurso ou disciplina para começar seus estudos e acompanhar seu progresso em tempo real.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link
                    to="/concursos"
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-brand transition-all"
                  >
                    Explorar Concursos
                  </Link>
                  <Link
                    to="/disciplinas"
                    className="px-4 py-2 bg-bg-elevated hover:bg-bg-card border border-border text-text-primary rounded-xl text-xs font-semibold transition-all"
                  >
                    Ver Disciplinas
                  </Link>
                </div>
              </Card>
            )}
          </div>

          {/* Questões Recomendadas (Fase 5) */}
          {recommendedQuestions.length > 0 && (
            <div>
              <SectionHeader
                title="Questões Recomendadas para Treino"
                subtitle="Seleção algorítmica baseada nos seus pontos fracos"
                icon={<HelpCircle className="w-5 h-5 text-brand-400" />}
                action={
                  <Link to="/questoes" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 transition-colors">
                    Ver banco completo <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                }
                className="mb-4"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedQuestions.map((rec) => (
                  <Card key={rec.id} noPadding hoverable className="p-4 border-brand-500/20 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {rec.subjectName && (
                          <Badge variant="brand" size="xs">{rec.subjectName}</Badge>
                        )}
                        <span className="text-[10px] text-text-muted">{rec.boardAcronym} • {rec.year}</span>
                      </div>
                      <p className="text-xs text-text-primary line-clamp-2 leading-relaxed">
                        {rec.statement}
                      </p>
                      <p className="text-[10px] text-amber-400/90 font-medium">
                        💡 {rec.recommendationReason}
                      </p>
                    </div>
                    <div className="pt-3 mt-2 border-t border-border/40 flex justify-end">
                      <Link
                        to={`/questoes/${rec.id}`}
                        className="text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1"
                      >
                        Resolver Questão <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Card de Acesso a Simulados (Fase 6) */}
          <Card noPadding className="p-5 bg-gradient-to-br from-bg-card via-bg-card to-brand-500/5 border-brand-500/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-brand-400 text-xs font-bold uppercase tracking-wider">
                  <Clock className="w-4 h-4" />
                  <span>Modo Exame • Fase 6</span>
                </div>
                <h3 className="text-base font-extrabold text-text-primary">
                  Treinamento Cronometrado com Provas Reais
                </h3>
                <p className="text-xs text-text-muted max-w-lg">
                  Realize simulados com contagem regressiva, marcação para revisão, auto-save e diagnóstico completo de desempenho por disciplina e assunto.
                </p>
                <div className="flex items-center gap-4 pt-1 text-xs text-text-secondary">
                  <span>Simulados Concluídos: <strong className="text-text-primary">{metrics.simulationsCompleted || 0}</strong></span>
                  <span>•</span>
                  <span>Melhor Aproveitamento: <strong className="text-emerald-400">{metrics.bestSimulationPercentage || '0'}%</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  to="/simulados"
                  className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-brand transition-all flex items-center gap-1.5"
                >
                  <span>Fazer um Simulado</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/simulados/novo"
                  className="px-3.5 py-2.5 bg-bg-elevated hover:bg-bg-subtle border border-border text-text-primary rounded-xl text-xs font-semibold transition-all"
                >
                  Monte o Seu
                </Link>
              </div>
            </div>
          </Card>

          {/* Card de Treino de Redação Discursiva (Fase 8) */}
          <Card noPadding className="p-5 bg-gradient-to-br from-bg-card via-bg-card to-amber-500/5 border-amber-500/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <PenTool className="w-4 h-4" />
                  <span>Laboratório de Redação • Fase 8</span>
                </div>
                <h3 className="text-base font-extrabold text-text-primary">
                  Treino Discursivo com Critérios Oficiais de Bancas
                </h3>
                <p className="text-xs text-text-muted max-w-lg">
                  Escreva com cronômetro e contadores em tempo real, receba correções detalhadas por competência e monitore sua pontuação rumo à aprovação.
                </p>

                {essayDraft && (
                  <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Rascunho ativo: <strong>{essayDraft.title || essayDraft.promptTitle || 'Sem título'}</strong> ({essayDraft.wordCount || 0} palavras)</span>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-1 text-xs text-text-secondary">
                  <span>Redações Submetidas: <strong className="text-text-primary">{essayStats?.submittedCount || essayStats?.totalEssays || 0}</strong></span>
                  <span>•</span>
                  <span>Média das Notas: <strong className="text-emerald-400">{essayStats?.averageScore ? `${essayStats.averageScore} pts` : '—'}</strong></span>
                  <span>•</span>
                  <span>Aproveitamento: <strong className="text-brand-400">{essayStats?.averagePercentage ? `${essayStats.averagePercentage}%` : '—'}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {essayDraft ? (
                  <Link
                    to={`/redacao/${essayDraft.id}/escrever`}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span>Continuar Rascunho</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    to="/redacao"
                    className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-brand transition-all flex items-center gap-1.5"
                  >
                    <span>Hub de Redação</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                <Link
                  to="/redacao/temas"
                  className="px-3.5 py-2.5 bg-bg-elevated hover:bg-bg-subtle border border-border text-text-primary rounded-xl text-xs font-semibold transition-all"
                >
                  Ver Temas
                </Link>
              </div>
            </div>
          </Card>

          {/* Gráfico de Evolução */}
          <div>
            <SectionHeader
              title="Evolução de Desempenho"
              subtitle="Últimos 30 dias"
              icon={<TrendingUp className="w-5 h-5" />}
              className="mb-4"
            />
            <Card noPadding>
              <div className="p-5">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={MOCK_EVOLUTION_CHART} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#7C5CFA" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#7C5CFA" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" tick={{ fill: '#5C6585', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[50, 100]} tick={{ fill: '#5C6585', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#1F2235', border: '1px solid #252843', borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: '#9BA3C2' }}
                      itemStyle={{ color: '#A78BFA' }}
                      formatter={(v: number) => [`${v}%`, 'Acerto']}
                    />
                    <Area
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#7C5CFA"
                      strokeWidth={2.5}
                      fill="url(#accuracyGradient)"
                      dot={false}
                      activeDot={{ r: 5, fill: '#7C5CFA', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Desempenho por Disciplina (Consumido da API Real) */}
          <div>
            <SectionHeader
              title="Desempenho por Disciplina"
              subtitle="Taxa de acerto acumulada no banco"
              action={
                <Link to="/desempenho" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 transition-colors">
                  Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              }
              className="mb-4"
            />
            <Card noPadding>
              <div className="p-5">
                {subjectPerformance.length === 0 ? (
                  <EmptyState
                    title="Nenhuma disciplina iniciada"
                    description="Resolva questões para visualizar seu gráfico de acertos por disciplina."
                  />
                ) : (
                  <div className="space-y-3.5">
                    {subjectPerformance.map((s) => (
                      <div key={s.subjectId}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-medium text-text-secondary">{s.name}</span>
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{
                              color: s.accuracy >= 80 ? '#4ADE80' : s.accuracy >= 70 ? '#FCD34D' : '#F87171',
                            }}
                          >
                            {s.accuracy}%
                          </span>
                        </div>
                        <ProgressBar
                          value={s.accuracy}
                          colorKey={s.accuracy >= 80 ? 'green' : s.accuracy >= 70 ? 'orange' : 'rose'}
                          size="xs"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Pontos Fracos identificados pela API */}
                {metrics.weakestSubjects.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-border">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                      ⚠ Pontos de Atenção (Abaixo de 70%)
                    </p>
                    <div className="space-y-2">
                      {metrics.weakestSubjects.map((s) => (
                        <div key={s.subjectId} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-danger-light border border-danger/20">
                          <div>
                            <span className="text-xs font-semibold text-text-primary">{s.subjectName}</span>
                            {s.recommendedAction && (
                              <p className="text-[10px] text-text-muted">{s.recommendedAction}</p>
                            )}
                          </div>
                          <Badge variant="danger" size="xs">{s.accuracyPercentage}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Right Sidebar (1/3) */}
        <div className="space-y-5">
          {/* Mini Bar Chart */}
          <Card>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
              Questões — Últimos 7 dias
            </p>
            <div className="mt-1">
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={MOCK_EVOLUTION_CHART.slice(-7)} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fill: '#5C6585', fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1F2235', border: '1px solid #252843', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#9BA3C2' }}
                    itemStyle={{ color: '#A78BFA' }}
                    formatter={(v: number) => [v, 'Questões']}
                  />
                  <Bar dataKey="questions" fill="#7C5CFA" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Calendar */}
          <Card>
            <MiniCalendar />
          </Card>

          {/* Agenda */}
          <Card>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Agenda de Hoje</p>
            {MOCK_TODAY_ACTIVITIES.length === 0 ? (
              <EmptyState title="Nenhuma atividade hoje" description="Crie seu plano de estudos para ver a agenda." />
            ) : (
              <div className="space-y-2">
                {MOCK_TODAY_ACTIVITIES.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-bg-elevated border border-border hover:border-border-muted transition-all">
                    <span className="text-[10px] font-bold text-text-muted tabular-nums mt-0.5 w-10 shrink-0">{act.time}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary">{act.label}</p>
                      <p className="text-[10px] text-text-muted truncate">{act.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* News */}
          <div>
            <SectionHeader
              title="Notícias Oficiais"
              subtitle="PRF e PF"
              icon={<Newspaper className="w-5 h-5" />}
              action={
                <Link to="/noticias" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 transition-colors">
                  Ver todas <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              }
              className="mb-4"
            />
            <div className="space-y-3">
              {data?.latestNews && data.latestNews.length > 0 ? (
                data.latestNews.slice(0, 3).map((news) => (
                  <Link key={news.id} to={`/noticias/${news.id}`} className="block group">
                    <Card hoverable noPadding className="group-hover:border-brand-500/40 transition-colors">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 shrink-0">
                            {news.contestTitle && (
                              <span className="text-xs font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-lg">
                                {news.contestTitle}
                              </span>
                            )}
                            {news.isImportant && <Badge variant="danger" size="xs" dot>Urgente</Badge>}
                          </div>
                          <span className="text-[10px] text-text-muted shrink-0">
                            {new Date(news.publishedAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug group-hover:text-brand-400 transition-colors">
                          {news.title}
                        </h4>
                        <p className="text-xs text-text-muted mt-1 line-clamp-2">{news.summary}</p>
                        <p className="text-[10px] text-text-disabled mt-2">Fonte: {news.sourceName}</p>
                      </div>
                    </Card>
                  </Link>
                ))
              ) : (
                MOCK_NEWS.slice(0, 3).map((news) => (
                  <Card key={news.id} hoverable noPadding>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-lg">
                            {news.contestAcronym}
                          </span>
                          {news.isOfficial && <Badge variant="success" size="xs" dot>Oficial</Badge>}
                        </div>
                        <span className="text-[10px] text-text-muted shrink-0">{news.timeAgo}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-text-primary line-clamp-2 leading-snug">
                        {news.title}
                      </h4>
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">{news.summary}</p>
                      <p className="text-[10px] text-text-disabled mt-2">Fonte: {news.source}</p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
