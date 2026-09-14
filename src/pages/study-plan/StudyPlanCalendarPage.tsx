import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Award,
  RefreshCw,
  CheckCircle2,
  X,
  Play,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  StudyPlanFrontendService,
  StudyPlanDetail,
  StudySessionItem,
} from '@/services/study-plan.service';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const StudyPlanCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<StudyPlanDetail | null>(null);
  const [sessions, setSessions] = useState<StudySessionItem[]>([]);

  // Navegação de Data
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  // Modal de Detalhes da Sessão
  const [selectedSession, setSelectedSession] = useState<StudySessionItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Carrega plano e sessões do mês
  const loadData = async () => {
    try {
      setLoading(true);
      const plan = await StudyPlanFrontendService.getActivePlan();
      setActivePlan(plan);

      if (plan) {
        // Calcula limites do mês atual para a query
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, month + 2, 0).toISOString().split('T')[0];

        const sessionList = await StudyPlanFrontendService.getSessions(plan.id, {
          startDate: firstDay,
          endDate: lastDay,
          status: filterStatus || undefined,
          type: filterType || undefined,
        });
        setSessions(sessionList);
      }
    } catch (err) {
      console.error('Erro ao carregar sessões do calendário:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate.getMonth(), currentDate.getFullYear(), filterStatus, filterType]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Funções de Ação na Sessão
  const handleStartSession = async (sess: StudySessionItem) => {
    try {
      await StudyPlanFrontendService.startSession(sess.id);
      // Redireciona para a atividade correspondente
      if (sess.type === 'LESSON' && sess.lessonId) {
        navigate(`/aulas/${sess.lessonId}`);
      } else if (sess.type === 'SIMULATION' && sess.simulationId) {
        navigate(`/simulados/${sess.simulationId}/prova`);
      } else {
        navigate(`/questoes?subjectId=${sess.subjectId}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteSession = async (sess: StudySessionItem) => {
    try {
      setModalLoading(true);
      await StudyPlanFrontendService.completeSession(sess.id, {
        actualMinutes: sess.plannedMinutes,
        completedQuestions: sess.targetQuestionsCount || 0,
      });
      setSelectedSession(null);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedSession || !rescheduleDate) return;
    try {
      setModalLoading(true);
      await StudyPlanFrontendService.rescheduleSession(selectedSession.id, rescheduleDate);
      setRescheduleOpen(false);
      setSelectedSession(null);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSkip = async (sess: StudySessionItem) => {
    if (!window.confirm('Deseja realmente pular esta sessão de estudos?')) return;
    try {
      setModalLoading(true);
      await StudyPlanFrontendService.skipSession(sess.id, 'Dispensada pelo aluno');
      setSelectedSession(null);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleReorganize = async () => {
    if (!activePlan) return;
    try {
      setLoading(true);
      const res = await StudyPlanFrontendService.reorganizeSessions(activePlan.id);
      alert(res.message || 'Sessões reorganizadas com sucesso!');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao reorganizar sessões.');
    } finally {
      setLoading(false);
    }
  };

  const getSessionBadge = (type: string) => {
    switch (type) {
      case 'LESSON':
        return { label: 'Teoria', icon: BookOpen, bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'QUESTIONS':
        return { label: 'Questões', icon: HelpCircle, bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'SIMULATION':
        return { label: 'Simulado', icon: Award, bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'REVIEW':
      case 'REVISION':
        return { label: 'Revisão', icon: RefreshCw, bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      default:
        return { label: 'Misto', icon: BookOpen, bg: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
    }
  };

  // Construção dos dias do mês
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const calendarDays: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

  // Dias do mês anterior
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevDate = new Date(year, month - 1, d);
    calendarDays.push({
      dateStr: prevDate.toISOString().split('T')[0],
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  // Dias do mês atual
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = dateObj.toISOString().split('T')[0];
    calendarDays.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  // Completa até fechar a grade (múltiplo de 7)
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      calendarDays.push({
        dateStr: nextDate.toISOString().split('T')[0],
        dayNum: d,
        isCurrentMonth: false,
      });
    }
  }

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-bg-surface rounded-xl w-1/3"></div>
        <div className="h-14 bg-bg-surface rounded-2xl"></div>
        <div className="h-96 bg-bg-surface rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              Calendário & Cronograma
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              4 Semanas
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Visualização completa da distribuição diária de estudos e ciclo de revisões.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReorganize}
            title="Redistribui sessões não concluídas nos próximos dias com folga de horário"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-bg-surface border border-border hover:border-brand-500/40 text-text-primary text-xs font-bold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reorganizar Atrasadas</span>
          </button>

          <button
            onClick={() => navigate('/plano-estudos/hoje')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Ver Dia de Hoje</span>
          </button>
        </div>
      </div>

      {/* Barra de Controles: Navegação de Mês & Filtros */}
      <div className="bg-bg-surface border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navegação de Mês */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-border hover:bg-bg-subtle text-text-primary transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <h2 className="text-base font-black text-text-primary capitalize min-w-40 text-center">
            {monthName}
          </h2>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-border hover:bg-bg-subtle text-text-primary transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-bg-subtle border border-border hover:bg-border text-xs font-bold text-text-primary transition-all"
          >
            Hoje
          </button>
        </div>

        {/* Filtros de Tipo e Status */}
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-bg-subtle border border-border text-xs font-bold text-text-primary focus:outline-none"
          >
            <option value="">Todos os Tipos</option>
            <option value="LESSON">Teoria (Aulas)</option>
            <option value="QUESTIONS">Questões</option>
            <option value="SIMULATION">Simulados</option>
            <option value="REVIEW">Revisões</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-bg-subtle border border-border text-xs font-bold text-text-primary focus:outline-none"
          >
            <option value="">Todos os Status</option>
            <option value="PLANNED">Planejadas</option>
            <option value="COMPLETED">Concluídas</option>
            <option value="IN_PROGRESS">Em Andamento</option>
          </select>
        </div>
      </div>

      {/* GRADE DO CALENDÁRIO MENSAL */}
      <div className="bg-bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
        {/* Cabeçalho dos Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-border bg-bg-subtle/50 text-center text-xs font-black text-text-secondary py-3">
          {WEEKDAYS.map((wd) => (
            <div key={wd}>{wd}</div>
          ))}
        </div>

        {/* Células de Dias */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border">
          {calendarDays.map((cDay) => {
            const isToday = cDay.dateStr === todayStr;
            const daySessions = sessions.filter((s) => s.sessionDate === cDay.dateStr);

            return (
              <div
                key={cDay.dateStr}
                className={`min-h-[120px] p-2 flex flex-col transition-colors ${
                  cDay.isCurrentMonth ? 'bg-bg-surface' : 'bg-bg-subtle/30 opacity-50'
                } ${isToday ? 'ring-2 ring-inset ring-brand-500/40 bg-brand-500/[0.02]' : ''}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-brand-500 text-white font-black'
                        : cDay.isCurrentMonth
                        ? 'text-text-primary'
                        : 'text-text-muted'
                    }`}
                  >
                    {cDay.dayNum}
                  </span>

                  {daySessions.length > 0 && (
                    <span className="text-[10px] font-bold text-text-muted">
                      {daySessions.length} {daySessions.length === 1 ? 'sessão' : 'sessões'}
                    </span>
                  )}
                </div>

                {/* Lista de Sessões do Dia */}
                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-28 pr-0.5">
                  {daySessions.map((sess) => {
                    const badge = getSessionBadge(sess.type);
                    const isDone = sess.status === 'COMPLETED';

                    return (
                      <button
                        key={sess.id}
                        onClick={() => setSelectedSession(sess)}
                        className={`w-full text-left p-1.5 rounded-lg border text-[11px] transition-all flex flex-col gap-0.5 ${
                          isDone
                            ? 'bg-emerald-500/10 border-emerald-500/25 opacity-70'
                            : 'bg-bg-subtle hover:border-brand-500/50 border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-text-primary truncate">
                            {sess.subjectName}
                          </span>
                          {isDone ? (
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <span className="text-[9px] font-bold text-text-muted shrink-0">
                              {sess.startTime}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] font-extrabold px-1 rounded ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="text-[9px] text-text-muted">
                            {sess.plannedMinutes}m
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE DETALHES DA SESSÃO */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-surface border border-border rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      getSessionBadge(selectedSession.type).bg
                    }`}
                  >
                    {getSessionBadge(selectedSession.type).label}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      selectedSession.status === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        : selectedSession.status === 'IN_PROGRESS'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                    }`}
                  >
                    {selectedSession.status}
                  </span>
                </div>

                <h3 className="text-lg font-black text-text-primary">
                  {selectedSession.subjectName}
                </h3>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="p-1.5 rounded-xl border border-border text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-bg-subtle border border-border space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Data & Horário:</span>
                <span className="font-bold text-text-primary">
                  {new Date(selectedSession.sessionDate + 'T00:00:00').toLocaleDateString('pt-BR')} • {selectedSession.startTime} às {selectedSession.endTime}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-text-muted">Duração Planejada:</span>
                <span className="font-bold text-brand-400">{selectedSession.plannedMinutes} minutos</span>
              </div>

              {selectedSession.targetQuestionsCount && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Meta de Questões:</span>
                  <span className="font-bold text-text-primary">{selectedSession.targetQuestionsCount} questões</span>
                </div>
              )}

              {selectedSession.lessonTitle && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Aula Vinculada:</span>
                  <span className="font-bold text-text-primary">{selectedSession.lessonTitle}</span>
                </div>
              )}
            </div>

            {/* Explicação Pedagógica */}
            {selectedSession.explanation && (
              <div className="p-3.5 rounded-2xl bg-brand-500/5 border border-brand-500/20 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-[11px] font-black text-brand-400 uppercase tracking-wider">
                    Justificativa Pedagógica
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {selectedSession.explanation}
                  </p>
                </div>
              </div>
            )}

            {/* Painel de Reprogramação */}
            {rescheduleOpen ? (
              <div className="p-4 rounded-2xl bg-bg-subtle border border-border space-y-3">
                <label className="text-xs font-bold text-text-secondary">Selecione a Nova Data</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg-surface border border-border text-text-primary text-xs font-bold"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReschedule}
                    disabled={modalLoading || !rescheduleDate}
                    className="flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold"
                  >
                    Confirmar Mudança
                  </button>
                  <button
                    onClick={() => setRescheduleOpen(false)}
                    className="px-3 py-2 rounded-xl bg-bg-surface border border-border text-xs font-bold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}

            {/* Ações do Modal */}
            <div className="flex items-center gap-2 pt-2">
              {selectedSession.status !== 'COMPLETED' ? (
                <>
                  <button
                    onClick={() => handleStartSession(selectedSession)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Iniciar Estudo</span>
                  </button>

                  <button
                    onClick={() => handleCompleteSession(selectedSession)}
                    disabled={modalLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Concluir</span>
                  </button>

                  <button
                    onClick={() => setRescheduleOpen(true)}
                    className="px-3 py-2.5 rounded-xl border border-border hover:bg-bg-subtle text-text-primary text-xs font-bold"
                  >
                    Reprogramar
                  </button>

                  <button
                    onClick={() => handleSkip(selectedSession)}
                    className="px-3 py-2.5 rounded-xl border border-border hover:bg-rose-500/10 text-rose-400 text-xs font-bold"
                  >
                    Pular
                  </button>
                </>
              ) : (
                <div className="w-full text-center py-2 text-xs font-bold text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sessão concluída com sucesso!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
