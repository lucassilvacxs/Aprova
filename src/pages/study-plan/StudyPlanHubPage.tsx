import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  PlusCircle,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Flame,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Award,
  RefreshCw,
  HelpCircle,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  StudyPlanFrontendService,
  StudyPlanItem,
  StudyPlanDetail,
  StudyPlanStats,
  StudySessionItem,
} from '@/services/study-plan.service';

export const StudyPlanHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<StudyPlanItem[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlanDetail | null>(null);
  const [stats, setStats] = useState<StudyPlanStats | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<StudySessionItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allPlans, currentActive] = await Promise.all([
        StudyPlanFrontendService.listUserPlans().catch(() => []),
        StudyPlanFrontendService.getActivePlan().catch(() => null),
      ]);

      setPlans(allPlans);
      setActivePlan(currentActive);

      if (currentActive) {
        const [planStats, sessions] = await Promise.all([
          StudyPlanFrontendService.getPlanStats(currentActive.id).catch(() => null),
          StudyPlanFrontendService.getSessions(currentActive.id, {
            startDate: new Date().toISOString().split('T')[0],
          }).catch(() => []),
        ]);
        setStats(planStats);
        setUpcomingSessions(sessions.slice(0, 4));
      } else {
        setStats(null);
        setUpcomingSessions([]);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do plano de estudos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePause = async () => {
    if (!activePlan) return;
    try {
      setActionLoading(true);
      if (activePlan.status === 'ACTIVE') {
        await StudyPlanFrontendService.pausePlan(activePlan.id);
        setActionMessage({ type: 'success', text: 'Plano pausado com sucesso.' });
      } else {
        await StudyPlanFrontendService.resumePlan(activePlan.id);
        setActionMessage({ type: 'success', text: 'Plano retomado com sucesso!' });
      }
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Erro ao alterar status do plano.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReorganize = async () => {
    if (!activePlan) return;
    try {
      setActionLoading(true);
      const res = await StudyPlanFrontendService.reorganizeSessions(activePlan.id);
      setActionMessage({
        type: 'success',
        text: res.message || `${res.movedSessionsCount} sessões reorganizadas com sucesso!`,
      });
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Erro ao reorganizar sessões atrasadas.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (planId: string) => {
    try {
      setActionLoading(true);
      await StudyPlanFrontendService.activatePlan(planId);
      setActionMessage({ type: 'success', text: 'Plano ativado com sucesso!' });
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Erro ao ativar plano.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este plano de estudos?')) return;
    try {
      setActionLoading(true);
      await StudyPlanFrontendService.deletePlan(planId);
      setActionMessage({ type: 'success', text: 'Plano excluído com sucesso.' });
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Erro ao excluir plano.' });
    } finally {
      setActionLoading(false);
    }
  };

  const getSessionTypeBadge = (type: string) => {
    switch (type) {
      case 'LESSON':
        return { label: 'Teoria', icon: BookOpen, bg: 'bg-blue-500/15 text-blue-400 border-blue-500/20' };
      case 'QUESTIONS':
        return { label: 'Questões', icon: HelpCircle, bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' };
      case 'SIMULATION':
        return { label: 'Simulado', icon: Award, bg: 'bg-purple-500/15 text-purple-400 border-purple-500/20' };
      case 'REVIEW':
      case 'REVISION':
        return { label: 'Revisão', icon: RefreshCw, bg: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };
      default:
        return { label: 'Misto', icon: BookOpen, bg: 'bg-slate-500/15 text-slate-400 border-slate-500/20' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-bg-surface rounded-xl w-1/3"></div>
        <div className="h-64 bg-bg-surface rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-bg-surface rounded-2xl"></div>
          <div className="h-28 bg-bg-surface rounded-2xl"></div>
          <div className="h-28 bg-bg-surface rounded-2xl"></div>
          <div className="h-28 bg-bg-surface rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Mensagem Toast */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs underline hover:opacity-80"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              Plano de Estudos Inteligente
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/25">
              <Sparkles className="w-3 h-3" /> Adaptativo
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1 max-w-2xl">
            Distribuição matemática ponderada por peso do edital, histórico de acertos e repetição espaçada.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => navigate('/plano-estudos/calendario')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-bg-surface border border-border hover:border-brand-500/40 text-text-primary text-sm font-semibold transition-all hover:bg-bg-subtle"
          >
            <CalendarIcon className="w-4 h-4 text-text-muted" />
            <span>Calendário</span>
          </button>

          <button
            onClick={() => navigate('/plano-estudos/desempenho')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-bg-surface border border-border hover:border-brand-500/40 text-text-primary text-sm font-semibold transition-all hover:bg-bg-subtle"
          >
            <BarChart3 className="w-4 h-4 text-text-muted" />
            <span>Aderência</span>
          </button>

          <button
            onClick={() => navigate('/plano-estudos/novo')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-md shadow-brand-500/20 transition-all transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Plano</span>
          </button>
        </div>
      </div>

      {/* PLANO ATIVO OU EMPTY STATE */}
      {!activePlan ? (
        <div className="bg-gradient-to-b from-bg-surface to-bg-subtle border border-border rounded-3xl p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
            <CalendarDays className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-text-primary">
              Você ainda não possui um Plano de Estudos ativo
            </h2>
            <p className="text-sm text-text-muted max-w-lg mx-auto">
              Organize seus estudos de forma profissional. Nosso algoritmo inteligente calcula o tempo exato
              para cada disciplina com base no edital, suas fraquezas e revisões periódicas.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/plano-estudos/novo')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm shadow-xl shadow-brand-500/25 transition-all transform hover:scale-105"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Criar Meu Plano de Estudos Agora</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card do Plano Ativo */}
          <div className="relative overflow-hidden bg-gradient-to-r from-bg-surface via-bg-surface to-brand-500/5 border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                      activePlan.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {activePlan.status === 'ACTIVE' ? 'Plano Ativo' : 'Plano Pausado'}
                  </span>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-bg-subtle text-text-muted border border-border">
                    {activePlan.contestTitle || 'Concurso Alvo'}
                  </span>

                  <span className="text-xs font-bold text-brand-400">
                    Estratégia: {activePlan.strategy}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                  {activePlan.name}
                </h2>

                <p className="text-sm text-text-muted leading-relaxed">
                  {activePlan.description || 'Planejamento adaptativo orientado a alta performance.'}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-text-secondary pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-brand-400" />
                    <span>
                      <strong>{activePlan.weeklyHours}h</strong> semanais (~
                      {Math.round(activePlan.dailyMinutes / 60)}h/dia)
                    </span>
                  </div>
                  {activePlan.targetDate && (
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-purple-400" />
                      <span>
                        Meta: <strong>{new Date(activePlan.targetDate).toLocaleDateString('pt-BR')}</strong>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span>
                      <strong>{activePlan.subjects?.length || 0}</strong> disciplinas incluídas
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
                <button
                  onClick={() => navigate('/plano-estudos/hoje')}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25 transition-all transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Estudar Hoje</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePause}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-bg-subtle hover:bg-border text-text-primary text-xs font-bold border border-border transition-all"
                  >
                    {activePlan.status === 'ACTIVE' ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Retomar</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleReorganize}
                    disabled={actionLoading}
                    title="Move sessões pendentes e atrasadas para os próximos dias com capacidade disponível"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-bg-subtle hover:bg-border text-text-primary text-xs font-bold border border-border transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reorganizar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de KPIs do Plano Ativo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-bg-surface border border-border rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-text-primary">
                  {stats ? `${stats.adherenceRate.toFixed(1)}%` : '100%'}
                </div>
                <div className="text-xs text-text-muted font-semibold mt-0.5">Taxa de Aderência</div>
              </div>
            </div>

            <div className="bg-bg-surface border border-border rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-text-primary">
                  {stats ? `${stats.totalCompletedHours.toFixed(1)}h` : '0h'}
                </div>
                <div className="text-xs text-text-muted font-semibold mt-0.5">
                  de {stats ? `${stats.totalPlannedHours.toFixed(1)}h` : '0h'} planejadas
                </div>
              </div>
            </div>

            <div className="bg-bg-surface border border-border rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-text-primary">
                  {stats ? `${stats.currentStreak} dias` : '0 dias'}
                </div>
                <div className="text-xs text-text-muted font-semibold mt-0.5">Sequência Ativa</div>
              </div>
            </div>

            <div className="bg-bg-surface border border-border rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-text-primary">
                  {stats ? `${stats.totalCompletedSessions}/${stats.totalPlannedSessions}` : '0/0'}
                </div>
                <div className="text-xs text-text-muted font-semibold mt-0.5">Sessões Concluídas</div>
              </div>
            </div>
          </div>

          {/* Próximas Sessões do Cronograma */}
          <div className="bg-bg-surface border border-border rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-brand-400" />
                <h3 className="text-base font-extrabold text-text-primary">
                  Próximas Sessões no Seu Cronograma
                </h3>
              </div>
              <button
                onClick={() => navigate('/plano-estudos/calendario')}
                className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
              >
                <span>Ver calendário completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-text-muted py-4 text-center">
                Nenhuma sessão futura encontrada no horizonte atual.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {upcomingSessions.map((s) => {
                  const badge = getSessionTypeBadge(s.type);
                  const Icon = badge.icon;
                  const dateFormatted = new Date(s.sessionDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                  });

                  return (
                    <div
                      key={s.id}
                      className="p-4 rounded-2xl bg-bg-subtle/70 border border-border/80 hover:border-brand-500/40 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.bg}`}>
                            <Icon className="w-3 h-3" />
                            {badge.label}
                          </span>
                          <span className="text-xs font-bold text-text-muted">
                            {dateFormatted} • {s.startTime}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-text-primary truncate">
                          {s.subjectName}
                        </h4>

                        <p className="text-xs text-text-muted truncate">
                          {s.lessonTitle || s.simulationTitle || s.explanation || `${s.plannedMinutes} minutos de foco`}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-text-primary">
                          {s.plannedMinutes} min
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Todos os Planos de Estudo do Aluno */}
      {plans.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-text-primary">
              Histórico & Outros Planos ({plans.length})
            </h3>
          </div>

          <div className="divide-y divide-border">
            {plans.map((p) => {
              const isActive = p.id === activePlan?.id;
              return (
                <div
                  key={p.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-bold text-text-primary">{p.name}</h4>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase ${
                          p.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                            : p.status === 'PAUSED'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                            : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span>{p.contestTitle || 'Concurso'}</span>
                      <span>•</span>
                      <span>{p.weeklyHours}h/semana</span>
                      <span>•</span>
                      <span>Criado em {new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && p.status !== 'ACTIVE' && (
                      <button
                        onClick={() => handleActivate(p.id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all"
                      >
                        Tornar Ativo
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={actionLoading || isActive}
                      title={isActive ? 'Pause ou troque de plano antes de excluir' : 'Excluir plano'}
                      className={`p-2 rounded-xl border border-border text-rose-400 hover:bg-rose-500/10 transition-all ${
                        isActive ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
