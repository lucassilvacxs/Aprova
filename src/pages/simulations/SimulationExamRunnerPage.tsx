import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock3,
  Flag,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Send,
  RotateCcw,
} from 'lucide-react';
import { simulationService, ExamAttemptData } from '@/services/simulation.service';

export const SimulationExamRunnerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [examData, setExamData] = useState<ExamAttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado da prova
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [markedList, setMarkedList] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [savingAnswer, setSavingAnswer] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Modais e gavetas
  const [showFinishModal, setShowFinishModal] = useState<boolean>(false);
  const [finishing, setFinishing] = useState<boolean>(false);
  const [showExpiredModal, setShowExpiredModal] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // Referência para tempo gasto na questão
  const questionStartTimeRef = useRef<number>(Date.now());

  // Carrega dados da tentativa ativa (sem gabarito - ANTI-CHEAT)
  useEffect(() => {
    if (!id) return;
    simulationService
      .getAttempt(id)
      .then((data) => {
        if (data.expired) {
          setShowExpiredModal(true);
          return;
        }
        setExamData(data);
        setAnswers(data.savedAnswers || {});
        setMarkedList(data.attempt.markedQuestions || []);
        setRemainingSeconds(data.remainingSeconds);
      })
      .catch((err) => {
        setError(err.message || 'Erro ao carregar prova.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Cronômetro autoritativo
  useEffect(() => {
    if (remainingSeconds <= 0 || !examData) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, examData]);

  // Auto-expiração chamada quando o relógio atinge 0
  const handleAutoExpire = async () => {
    if (!examData) return;
    setShowExpiredModal(true);
    try {
      await simulationService.finishAttempt(examData.attempt.id);
    } catch (e) {
      console.warn('Auto expire finish notice:', e);
    }
  };

  // Seleciona e salva uma alternativa (Auto-Save)
  const handleSelectOption = async (optionId: string | null) => {
    if (!examData) return;
    const currentQuestion = examData.questions[currentIndex];
    if (!currentQuestion) return;

    const timeSpent = Math.max(1, Math.floor((Date.now() - questionStartTimeRef.current) / 1000));
    questionStartTimeRef.current = Date.now();

    // Atualização otimista na interface
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));

    try {
      setSavingAnswer(true);
      const res = await simulationService.saveAnswer(
        examData.attempt.id,
        currentQuestion.id,
        optionId,
        timeSpent
      );

      if (res.expired) {
        setShowExpiredModal(true);
        return;
      }

      setLastSavedTime(new Date().toLocaleTimeString('pt-BR'));
    } catch (err: any) {
      console.error('Falha no auto-save:', err);
    } finally {
      setSavingAnswer(false);
    }
  };

  // Alterna marcação de questão para revisão
  const handleToggleMark = async () => {
    if (!examData) return;
    const currentQuestion = examData.questions[currentIndex];
    if (!currentQuestion) return;

    try {
      const res = await simulationService.toggleMark(examData.attempt.id, currentQuestion.id);
      setMarkedList(res.markedQuestions);
    } catch (err) {
      console.error('Erro ao marcar questão:', err);
    }
  };

  // Finalização formal pelo usuário
  const handleConfirmFinish = async () => {
    if (!examData) return;
    try {
      setFinishing(true);
      await simulationService.finishAttempt(examData.attempt.id);
      navigate(`/simulados/tentativas/${examData.attempt.id}/resultado`);
    } catch (err: any) {
      setError(err.message || 'Erro ao finalizar simulado.');
      setFinishing(false);
    }
  };

  // Navegação por teclado (A, B, C, D, E, Setas)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showFinishModal || showExpiredModal || !examData) return;

      const currentQuestion = examData.questions[currentIndex];
      if (!currentQuestion) return;

      const key = e.key.toUpperCase();
      const option = currentQuestion.options.find((o) => o.letter.toUpperCase() === key);

      if (option) {
        handleSelectOption(option.id);
      } else if (e.key === 'ArrowRight' && currentIndex < examData.questions.length - 1) {
        setCurrentIndex((i) => i + 1);
        questionStartTimeRef.current = Date.now();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
        questionStartTimeRef.current = Date.now();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, examData, showFinishModal, showExpiredModal]);

  // Formatação do cronômetro
  const formatTimer = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-text-secondary text-sm font-semibold">Carregando ambiente de exame...</p>
      </div>
    );
  }

  if (error || !examData) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-text-primary">Não foi possível carregar a prova</h2>
        <p className="text-text-secondary text-xs">{error || 'Tentativa expirada ou não encontrada.'}</p>
        <button
          onClick={() => navigate('/simulados')}
          className="px-4 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs font-bold"
        >
          Voltar para Central
        </button>
      </div>
    );
  }

  const currentQuestion = examData.questions[currentIndex];
  const totalQuestions = examData.questions.length;
  const answeredCount = Object.values(answers).filter((v) => v !== null && v !== undefined).length;
  const unansweredCount = totalQuestions - answeredCount;
  const isMarked = currentQuestion && markedList.includes(currentQuestion.id);

  // Timer urgency
  const isWarning = remainingSeconds < 600; // < 10 min
  const isUrgent = remainingSeconds < 300; // < 5 min

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-[calc(100vh-5rem)] pb-2 animate-fade-in select-none">
      {/* ── BARRA SUPERIOR FIXA DO EXAME ────────────────────────────────────── */}
      <header className="bg-bg-surface border border-border px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-sm shrink-0 mb-4">
        {/* Título e Concurso */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden p-2 rounded-lg bg-bg-elevated text-text-secondary hover:text-text-primary"
            title="Abrir mapa de questões"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="truncate">
            <h1 className="text-sm font-bold text-text-primary truncate">
              {examData.attempt.simulationTitle}
            </h1>
            <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
              <span>Questão {currentIndex + 1} de {totalQuestions}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{answeredCount} respondidas</span>
            </div>
          </div>
        </div>

        {/* Centro: Cronômetro Autoritativo */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-extrabold text-sm tracking-wider shadow-inner transition-colors ${
            isUrgent
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse'
              : isWarning
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : 'bg-bg-elevated border-border text-text-primary'
          }`}
        >
          <Clock3 className={`w-4 h-4 ${isUrgent ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-brand-400'}`} />
          <span>{formatTimer(remainingSeconds)}</span>
        </div>

        {/* Ações de Topo: Marcar para Revisão & Finalizar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMark}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              isMarked
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-bg-elevated border-border text-text-secondary hover:text-text-primary hover:bg-bg-subtle'
            }`}
            title="Marcar questão para revisar depois"
          >
            <Flag className={`w-3.5 h-3.5 ${isMarked ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span className="hidden sm:inline">
              {isMarked ? 'Marcada para Revisão' : 'Marcar para Revisão'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowFinishModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finalizar Prova</span>
          </button>
        </div>
      </header>

      {/* ── ÁREA PRINCIPAL: QUESTÃO (ESQUERDA) + MAPA DE QUESTÕES (DIREITA) ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 overflow-hidden">
        {/* Questão Ativa (3/4 Desktop) */}
        <div className="lg:col-span-3 bg-bg-surface border border-border rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm">
          {/* Topo da Questão */}
          <div className="p-4 sm:p-6 border-b border-border bg-bg-elevated/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-brand-500 text-white font-extrabold text-xs">
                Questão {currentIndex + 1}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-bg-elevated text-text-secondary font-bold text-xs">
                {currentQuestion.subjectName}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-text-muted hidden sm:inline">
                {currentQuestion.topicName}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted">
                Banca: <strong>{currentQuestion.boardName}</strong>
              </span>
              {currentQuestion.year && (
                <span className="text-text-muted">• {currentQuestion.year}</span>
              )}
              {savingAnswer ? (
                <span className="text-brand-400 font-semibold text-[11px] flex items-center gap-1">
                  <div className="w-2.5 h-2.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : lastSavedTime ? (
                <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Salva
                </span>
              ) : null}
            </div>
          </div>

          {/* Enunciado e Alternativas com Scroll Suave */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* Enunciado */}
            <div className="text-sm md:text-base font-medium text-text-primary leading-relaxed whitespace-pre-wrap">
              {currentQuestion.statement}
            </div>

            {/* Alternativas */}
            <div className="space-y-3 pt-2">
              {currentQuestion.options.map((option) => {
                const isSelected = answers[currentQuestion.id] === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectOption(option.id)}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all group ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/10 text-text-primary shadow-sm shadow-brand-500/10'
                        : 'border-border bg-bg-elevated/40 hover:bg-bg-elevated text-text-secondary hover:text-text-primary hover:border-border-focus'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-brand-500 text-white'
                          : 'bg-bg-surface border border-border text-text-secondary group-hover:border-brand-500 group-hover:text-brand-400'
                      }`}
                    >
                      {option.letter}
                    </div>
                    <div className="text-xs md:text-sm font-medium leading-relaxed pt-0.5">
                      {option.text}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Ação de Limpar Resposta (Deixar em branco) */}
            {answers[currentQuestion.id] && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSelectOption(null)}
                  className="text-xs text-text-muted hover:text-rose-400 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Deixar esta questão em branco</span>
                </button>
              </div>
            )}
          </div>

          {/* Navegação Inferior (Anterior / Próxima) */}
          <footer className="p-4 border-t border-border bg-bg-elevated/20 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => {
                setCurrentIndex((i) => i - 1);
                questionStartTimeRef.current = Date.now();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-bg-surface hover:bg-bg-elevated disabled:opacity-30 disabled:cursor-not-allowed text-text-primary font-bold text-xs transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <span className="text-xs text-text-muted font-medium hidden sm:inline">
              Dica: Use as teclas A, B, C, D, E ou ← → do teclado para navegar.
            </span>

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex((i) => i + 1);
                  questionStartTimeRef.current = Date.now();
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-sm transition-all"
              >
                <span>Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowFinishModal(true)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                <span>Revisar & Finalizar</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </footer>
        </div>

        {/* ── MAPA DE QUESTÕES / NAVEGAÇÃO LATERAL (1/4 Desktop) ─────────────── */}
        <aside className="hidden lg:flex flex-col bg-bg-surface border border-border rounded-2xl p-4 overflow-hidden shadow-sm">
          <div className="pb-3 border-b border-border space-y-1 shrink-0">
            <h3 className="font-extrabold text-xs text-text-primary uppercase tracking-wider">
              Mapa da Prova
            </h3>
            <p className="text-[11px] text-text-muted">
              {answeredCount} de {totalQuestions} respondidas
            </p>
          </div>

          {/* Legenda rápida */}
          <div className="grid grid-cols-2 gap-2 py-2.5 text-[10px] text-text-muted border-b border-border shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-brand-500" />
              <span>Respondida</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-bg-elevated border border-border" />
              <span>Em branco</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/60" />
              <span>Para revisar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded ring-2 ring-brand-400 bg-bg-surface" />
              <span>Atual</span>
            </div>
          </div>

          {/* Matriz de Botões de Questão com Scroll */}
          <div className="flex-1 overflow-y-auto py-3 grid grid-cols-5 gap-1.5 content-start">
            {examData.questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const hasAnswer = answers[q.id] !== null && answers[q.id] !== undefined;
              const isFlagged = markedList.includes(q.id);

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    questionStartTimeRef.current = Date.now();
                  }}
                  className={`h-9 rounded-lg font-bold text-xs relative flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'ring-2 ring-brand-400 bg-brand-500/20 text-brand-300 font-extrabold'
                      : hasAnswer
                      ? 'bg-brand-500 text-white'
                      : 'bg-bg-elevated text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                  }`}
                >
                  <span>{idx + 1}</span>
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Botão Inferior de Finalização */}
          <div className="pt-3 border-t border-border shrink-0">
            <button
              type="button"
              onClick={() => setShowFinishModal(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-bg-elevated hover:bg-bg-subtle border border-border text-text-primary font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5 text-brand-400" />
              <span>Finalizar Simulado</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ── GAVETA MOBILE DE QUESTÕES (DRAWER) ───────────────────────────────── */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative ml-auto w-72 h-full bg-bg-surface border-l border-border flex flex-col p-4 z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-extrabold text-sm text-text-primary">Mapa de Questões</h3>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-lg bg-bg-elevated text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 grid grid-cols-5 gap-2 content-start">
              {examData.questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const hasAnswer = answers[q.id] !== null && answers[q.id] !== undefined;
                const isFlagged = markedList.includes(q.id);

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      questionStartTimeRef.current = Date.now();
                      setMobileDrawerOpen(false);
                    }}
                    className={`h-10 rounded-lg font-bold text-xs relative flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'ring-2 ring-brand-400 bg-brand-500/20 text-brand-300 font-extrabold'
                        : hasAnswer
                        ? 'bg-brand-500 text-white'
                        : 'bg-bg-elevated text-text-secondary'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setMobileDrawerOpen(false);
                setShowFinishModal(true);
              }}
              className="w-full py-3 rounded-xl bg-brand-500 text-white font-extrabold text-xs shadow-md"
            >
              Finalizar Prova
            </button>
          </aside>
        </div>
      )}

      {/* ── MODAL DE CONFIRMAÇÃO DE FINALIZAÇÃO ──────────────────────────────── */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-text-primary">
                  Finalizar Simulado?
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Confira o balanço da sua prova antes de enviar.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-bg-elevated border border-border space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Questões Respondidas:</span>
                <span className="font-extrabold text-emerald-400">{answeredCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Questões em Branco:</span>
                <span className={`font-extrabold ${unansweredCount > 0 ? 'text-amber-400' : 'text-text-muted'}`}>
                  {unansweredCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Marcadas para Revisão:</span>
                <span className="font-extrabold text-brand-400">{markedList.length}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-text-muted">Tempo Restante:</span>
                <span className="font-bold text-text-primary font-mono">{formatTimer(remainingSeconds)}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Você ainda possui <strong>{unansweredCount} questão(ões) sem resposta</strong>. Deseja realmente finalizar agora?
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border bg-bg-elevated hover:bg-bg-subtle text-text-primary font-bold text-xs transition-all"
              >
                Continuar Prova
              </button>

              <button
                type="button"
                disabled={finishing}
                onClick={handleConfirmFinish}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {finishing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Calculando...</span>
                  </>
                ) : (
                  <span>Sim, Finalizar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE TEMPO ESGOTADO (AUTO-EXPIRE) ────────────────────────────── */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-surface border border-rose-500/40 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-400 mx-auto flex items-center justify-center animate-bounce">
              <Clock3 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-text-primary">
                O Tempo da Prova Encerrou-se!
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                O cronômetro autoritativo do servidor expirou. Suas respostas salvas foram consolidadas e o gabarito oficial foi liberado.
              </p>
            </div>

            <button
              onClick={() => {
                if (examData) {
                  navigate(`/simulados/tentativas/${examData.attempt.id}/resultado`);
                } else {
                  navigate('/simulados');
                }
              }}
              className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs shadow-lg shadow-brand-500/25 transition-all"
            >
              Visualizar Resultado & Revisão
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
