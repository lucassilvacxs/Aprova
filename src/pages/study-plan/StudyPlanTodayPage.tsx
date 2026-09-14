import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Play,
  Pause,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Award,
  RefreshCw,
  Coffee,
  Check,
  ChevronRight,
  Flame,
} from 'lucide-react';
import {
  StudyPlanFrontendService,
  TodayScheduleData,
  StudySessionItem,
} from '@/services/study-plan.service';

export const StudyPlanTodayPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TodayScheduleData | null>(null);

  // Cronômetro / Timer em tempo real
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);

  // Modal de conclusão rápida
  const [completingSession, setCompletingSession] = useState<StudySessionItem | null>(null);
  const [completedQuestionsInput, setCompletedQuestionsInput] = useState<number>(20);
  const [actualMinutesInput, setActualMinutesInput] = useState<number>(60);
  const [notesInput, setNotesInput] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [nextReviewDateAlert, setNextReviewDateAlert] = useState<string | null>(null);

  const loadTodayData = async () => {
    try {
      setLoading(true);
      const res = await StudyPlanFrontendService.getTodaySessions();
      setData(res);

      // Se há sessão em andamento, sincroniza
      const inProg = res.sessions.find((s) => s.status === 'IN_PROGRESS');
      if (inProg && !activeSessionId) {
        setActiveSessionId(inProg.id);
        setActualMinutesInput(inProg.plannedMinutes);
      }
    } catch (err) {
      console.error('Erro ao carregar agenda de hoje:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayData();
  }, []);

  // Efeito do Cronômetro
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h.toString().padStart(2, '0')}:` : ''}${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = async (sess: StudySessionItem) => {
    setActiveSessionId(sess.id);
    setActualMinutesInput(sess.plannedMinutes);
    setCompletedQuestionsInput(sess.targetQuestionsCount || 20);
    setIsTimerRunning(true);
    try {
      await StudyPlanFrontendService.startSession(sess.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResumeTimer = () => {
    setIsTimerRunning(true);
  };

  const handleOpenCompleteModal = (sess: StudySessionItem) => {
    setCompletingSession(sess);
    const elapsedMinutes = Math.max(1, Math.round(timerSeconds / 60));
    setActualMinutesInput(elapsedMinutes > 0 && activeSessionId === sess.id ? elapsedMinutes : sess.plannedMinutes);
    setCompletedQuestionsInput(sess.targetQuestionsCount || 20);
  };

  const handleConfirmComplete = async () => {
    if (!completingSession) return;
    try {
      setActionLoading(true);
      const res = await StudyPlanFrontendService.completeSession(completingSession.id, {
        actualMinutes: actualMinutesInput,
        completedQuestions: completedQuestionsInput,
        notes: notesInput || undefined,
      });

      setIsTimerRunning(false);
      setTimerSeconds(0);
      setActiveSessionId(null);
      setCompletingSession(null);

      if (res.nextReviewDate) {
        setNextReviewDateAlert(res.nextReviewDate);
      }

      await loadTodayData();
    } catch (err: any) {
      alert(err.message || 'Erro ao concluir sessão.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async (sess: StudySessionItem) => {
    if (!window.confirm('Tem certeza que deseja pular esta sessão de hoje?')) return;
    try {
      setActionLoading(true);
      await StudyPlanFrontendService.skipSession(sess.id, 'Pular sessão de hoje');
      await loadTodayData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNavigateToStudy = (sess: StudySessionItem) => {
    if (sess.type === 'LESSON' && sess.lessonId) {
      navigate(`/aulas/${sess.lessonId}`);
    } else if (sess.type === 'SIMULATION' && sess.simulationId) {
      navigate(`/simulados/${sess.simulationId}/prova`);
    } else {
      navigate(`/questoes?subjectId=${sess.subjectId}`);
    }
  };

  const getSessionBadge = (type: string) => {
    switch (type) {
      case 'LESSON':
        return { label: 'Teoria', icon: BookOpen, bg: 'bg-blue-500/15 text-blue-400 border-blue-500/25' };
      case 'QUESTIONS':
        return { label: 'Questões', icon: HelpCircle, bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' };
      case 'SIMULATION':
        return { label: 'Simulado', icon: Award, bg: 'bg-purple-500/15 text-purple-400 border-purple-500/25' };
      case 'REVIEW':
      case 'REVISION':
        return { label: 'Revisão', icon: RefreshCw, bg: 'bg-amber-500/15 text-amber-400 border-amber-500/25' };
      default:
        return { label: 'Misto', icon: BookOpen, bg: 'bg-slate-500/15 text-slate-400 border-slate-500/25' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-bg-surface rounded-xl w-1/3"></div>
        <div className="h-40 bg-bg-surface rounded-3xl"></div>
        <div className="space-y-3">
          <div className="h-20 bg-bg-surface rounded-2xl"></div>
          <div className="h-20 bg-bg-surface rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!data?.hasActivePlan) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-5">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
          <CalendarDays className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-text-primary">Nenhum plano de estudos ativo</h2>
        <p className="text-sm text-text-muted">
          Você precisa ativar um plano de estudos para visualizar a rotina de hoje.
        </p>
        <button
          onClick={() => navigate('/plano-estudos/novo')}
          className="px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm shadow-lg shadow-brand-500/25"
        >
          Criar Plano Agora
        </button>
      </div>
    );
  }

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const percentDone =
    data.summary.totalSessions > 0
      ? Math.round((data.summary.completedSessions / data.summary.totalSessions) * 100)
      : 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Alerta de Próxima Revisão Agendada */}
      {nextReviewDateAlert && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>
              Sessão concluída! Próxima revisão espaçada (D+1) agendada automaticamente para{' '}
              <strong>{new Date(nextReviewDateAlert + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>.
            </span>
          </div>
          <button onClick={() => setNextReviewDateAlert(null)} className="text-xs underline">
            Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              Agenda de Hoje
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/25">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Foco Diário
            </span>
          </div>
          <p className="text-sm text-text-muted capitalize mt-0.5">{todayFormatted}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/plano-estudos/calendario')}
            className="px-3.5 py-2 rounded-xl bg-bg-surface border border-border hover:bg-bg-subtle text-text-primary text-xs font-bold transition-all"
          >
            Ver Calendário
          </button>
        </div>
      </div>

      {/* Card de Progresso do Dia & Cronômetro */}
      <div className="bg-gradient-to-r from-bg-surface via-bg-surface to-brand-500/5 border border-border rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-text-muted">Progresso do Dia</span>
            <div className="text-2xl font-black text-text-primary">
              {data.summary.completedSessions} de {data.summary.totalSessions} sessões concluídas
            </div>
            <div className="text-xs text-text-muted">
              {data.summary.completedMinutes} min cumpridos de {data.summary.plannedMinutes} min planejados
            </div>
          </div>

          {/* Painel do Cronômetro */}
          {activeSessionId && (
            <div className="p-4 rounded-2xl bg-bg-subtle border border-border flex items-center gap-4 shrink-0">
              <div>
                <div className="text-[10px] font-black uppercase text-brand-400 tracking-wider">
                  Tempo em Foco
                </div>
                <div className="text-2xl font-black font-mono text-text-primary">
                  {formatTimer(timerSeconds)}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isTimerRunning ? (
                  <button
                    onClick={handlePauseTimer}
                    className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black transition-all"
                    title="Pausar cronômetro"
                  >
                    <Pause className="w-4 h-4 fill-slate-950" />
                  </button>
                ) : (
                  <button
                    onClick={handleResumeTimer}
                    className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black transition-all"
                    title="Retomar cronômetro"
                  >
                    <Play className="w-4 h-4 fill-white" />
                  </button>
                )}

                <button
                  onClick={() => {
                    const sess = data.sessions.find((s) => s.id === activeSessionId);
                    if (sess) handleOpenCompleteModal(sess);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold transition-all"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Progresso */}
        <div className="w-full h-2.5 rounded-full bg-bg-subtle border border-border overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${percentDone}%` }}
          />
        </div>
      </div>

      {/* SESSÕES DE HOJE OU DIA LIVRE */}
      {data.sessions.length === 0 ? (
        <div className="bg-bg-surface border border-border rounded-3xl p-10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Coffee className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-text-primary">Dia Livre Planejado!</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">
              Nenhuma sessão programada para hoje na sua grade semanal. Aproveite para descansar, recarregar as energias ou antecipar matérias no calendário.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="text-xs font-black uppercase tracking-wider text-text-secondary px-1">
            Linha do Tempo de Estudos ({data.sessions.length})
          </div>

          <div className="space-y-3">
            {data.sessions.map((sess, idx) => {
              const badge = getSessionBadge(sess.type);
              const Icon = badge.icon;
              const isCompleted = sess.status === 'COMPLETED';
              const isActive = activeSessionId === sess.id;

              return (
                <div
                  key={sess.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCompleted
                      ? 'bg-bg-subtle/50 border-border/60 opacity-80'
                      : isActive
                      ? 'bg-brand-500/5 border-brand-500 ring-2 ring-brand-500/20'
                      : 'bg-bg-surface border-border hover:border-brand-500/40'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Número de ordem ou Check */}
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : isActive
                          ? 'bg-brand-500 text-white animate-pulse'
                          : 'bg-bg-subtle text-text-muted border border-border'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.bg}`}>
                          <Icon className="w-3 h-3" />
                          {badge.label}
                        </span>

                        <span className="text-xs font-bold text-text-muted">
                          {sess.startTime} às {sess.endTime} ({sess.plannedMinutes} min)
                        </span>

                        {sess.targetQuestionsCount && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-bg-subtle text-text-muted border border-border">
                            Meta: {sess.targetQuestionsCount} questões
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-text-primary">
                        {sess.subjectName}
                      </h3>

                      <p className="text-xs text-text-muted">
                        {sess.lessonTitle || sess.simulationTitle || sess.explanation || 'Sessão focada de estudos.'}
                      </p>
                    </div>
                  </div>

                  {/* Ações da Sessão */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!isCompleted ? (
                      <>
                        <button
                          onClick={() => handleNavigateToStudy(sess)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bg-subtle hover:bg-border text-text-primary text-xs font-bold border border-border transition-all"
                        >
                          <span>Abrir Atividade</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {!isActive ? (
                          <button
                            onClick={() => handleStartTimer(sess)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Iniciar</span>
                          </button>
                        ) : null}

                        <button
                          onClick={() => handleOpenCompleteModal(sess)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Concluir</span>
                        </button>

                        <button
                          onClick={() => handleSkip(sess)}
                          title="Pular esta sessão hoje"
                          className="p-2 rounded-xl border border-border text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        >
                          Pular
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Concluída</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CONCLUSÃO */}
      {completingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-surface border border-border rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-text-primary flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Registrar Conclusão</span>
              </h3>
              <p className="text-xs text-text-muted">
                {completingSession.subjectName} — Confirme os dados da sessão para alimentar suas estatísticas e agendar a revisão espaçada.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary">Minutos Estudados</label>
                <input
                  type="number"
                  min={1}
                  value={actualMinutesInput}
                  onChange={(e) => setActualMinutesInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-bg-subtle border border-border text-xs font-bold text-text-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary">Questões Respondidas</label>
                <input
                  type="number"
                  min={0}
                  value={completedQuestionsInput}
                  onChange={(e) => setCompletedQuestionsInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-bg-subtle border border-border text-xs font-bold text-text-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary">Anotações / Dúvidas</label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Ex.: Revisar prazo do recurso no art. 53."
                  className="w-full px-3 py-2 rounded-xl bg-bg-subtle border border-border text-xs font-medium text-text-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleConfirmComplete}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
              >
                {actionLoading ? 'Gravando...' : 'Salvar & Concluir Sessão'}
              </button>

              <button
                onClick={() => setCompletingSession(null)}
                className="px-4 py-2.5 rounded-xl bg-bg-subtle border border-border text-xs font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
