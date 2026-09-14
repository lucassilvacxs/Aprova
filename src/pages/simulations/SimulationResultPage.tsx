import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock3,
  BarChart3,
  HelpCircle,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Flag,
  BookOpen,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { simulationService, SimulationResultData } from '@/services/simulation.service';

export const SimulationResultPage: React.FC = () => {
  const { attemptId, id } = useParams<{ attemptId?: string; id?: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<SimulationResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtro na revisão de questões
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'wrong' | 'blank' | 'marked'>('all');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        let targetAttemptId = attemptId;

        // Se veio pela rota /simulados/:id/resultado, busca o último attempt do simulado
        if (!targetAttemptId && id) {
          const simDetail = await simulationService.getById(id);
          if (simDetail.activeAttempt?.id) {
            targetAttemptId = simDetail.activeAttempt.id;
          } else {
            // Busca o histórico e pega a tentativa mais recente
            const history = await simulationService.getHistory();
            const matching = history.find((h) => h.simulationId === id);
            if (matching) targetAttemptId = matching.attemptId;
          }
        }

        if (!targetAttemptId) {
          throw new Error('Tentativa não identificada.');
        }

        const data = await simulationService.getResult(targetAttemptId);
        setResult(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar resultado do simulado.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId, id]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}min ${s > 0 ? `${s}s` : ''}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-text-secondary text-sm font-semibold">Consolidando resultado e gabarito...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-text-primary">Resultado Indisponível</h2>
        <p className="text-text-secondary text-xs">{error || 'Não foi possível carregar a revisão da prova.'}</p>
        <button
          onClick={() => navigate('/simulados')}
          className="px-4 py-2 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs font-bold"
        >
          Voltar para Central
        </button>
      </div>
    );
  }

  const { attempt, simulation, questions } = result;
  const percentageNum = Number(attempt.percentage) || 0;

  // Filtragem das questões na revisão
  const filteredQuestions = questions.filter((q) => {
    if (reviewFilter === 'correct') return q.userAnswer?.isCorrect === true;
    if (reviewFilter === 'wrong') return q.userAnswer?.isCorrect === false;
    if (reviewFilter === 'blank') return !q.userAnswer?.selectedOptionId;
    if (reviewFilter === 'marked') return q.isMarkedForReview === true;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in">
      {/* Botões Superiores de Navegação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/simulados')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Central de Simulados</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/simulados/${simulation.id}`)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-bg-surface hover:bg-bg-subtle text-text-primary text-xs font-bold transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-brand-400" />
            <span>Refazer Simulado</span>
          </button>
          <button
            onClick={() => navigate('/simulados/historico')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Ver Evolução</span>
          </button>
        </div>
      </div>

      {/* ── CARD PRINCIPAL DE RESULTADO ──────────────────────────────────────── */}
      <div className="bg-bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 shadow-sm overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-400 font-extrabold text-xs">
                {simulation.agencyAcronym || 'CONCURSO'}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-bg-elevated text-text-secondary font-bold text-xs">
                {attempt.status === 'EXPIRED' ? 'Finalizado por Tempo' : 'Concluído'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary">
              Resultado do Simulado
            </h1>
            <p className="text-text-secondary text-sm">
              {simulation.title}
            </p>
          </div>

          {/* Destaque Visual da Nota / Aproveitamento */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-elevated border border-border shrink-0">
            <div className="text-right">
              <div className="text-xs text-text-muted font-bold uppercase tracking-wider">Aproveitamento</div>
              <div className={`text-3xl md:text-4xl font-black ${
                percentageNum >= 75 ? 'text-emerald-400' : percentageNum >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {percentageNum.toFixed(1)}%
              </div>
              <div className="text-[11px] text-text-muted mt-0.5">
                Pontuação: <strong>{attempt.totalScore} pts</strong>
              </div>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              percentageNum >= 75 ? 'bg-emerald-500/15 text-emerald-400' : percentageNum >= 50 ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'
            }`}>
              <Award className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Placar de KPIs Rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-border">
          <div className="p-3.5 rounded-xl bg-bg-elevated/60 text-center">
            <div className="text-xs text-text-muted flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Acertos</span>
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">{attempt.correctCount}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-elevated/60 text-center">
            <div className="text-xs text-text-muted flex items-center justify-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Erros</span>
            </div>
            <div className="text-xl font-black text-rose-400 mt-1">{attempt.wrongCount}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-elevated/60 text-center">
            <div className="text-xs text-text-muted flex items-center justify-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-text-muted" />
              <span>Em Branco</span>
            </div>
            <div className="text-xl font-black text-text-primary mt-1">{attempt.blankCount}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-elevated/60 text-center">
            <div className="text-xs text-text-muted flex items-center justify-center gap-1">
              <Clock3 className="w-3.5 h-3.5 text-brand-400" />
              <span>Tempo</span>
            </div>
            <div className="text-xl font-black text-text-primary mt-1">
              {formatDuration(attempt.totalDurationSeconds)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-elevated/60 text-center col-span-2 sm:col-span-1">
            <div className="text-xs text-text-muted flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Total</span>
            </div>
            <div className="text-xl font-black text-text-primary mt-1">{attempt.totalQuestions} q</div>
          </div>
        </div>
      </div>

      {/* ── DESEMPENHO POR DISCIPLINA & ASSUNTOS ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Disciplinas */}
        <div className="bg-bg-surface border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-extrabold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-400" />
            <span>Desempenho por Disciplina</span>
          </h3>

          <div className="space-y-3.5">
            {attempt.subjectBreakdown?.map((s: any, idx: number) => {
              const pct = Number(s.percentage) || 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary">{s.subjectName}</span>
                    <span className="font-extrabold text-brand-400">
                      {s.correct}/{s.total} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assuntos: Pontos Fortes e Atenção */}
        <div className="bg-bg-surface border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-extrabold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-400" />
            <span>Diagnóstico por Assunto</span>
          </h3>

          <div className="space-y-4 text-xs">
            {/* Pontos Fortes */}
            <div>
              <div className="text-emerald-400 font-bold flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pontos Fortes (Aproveitamento ≥ 70%)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {attempt.topicBreakdown?.filter((t: any) => t.isStrength).length > 0 ? (
                  attempt.topicBreakdown
                    .filter((t: any) => t.isStrength)
                    .map((t: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 font-semibold text-[11px]"
                      >
                        {t.topicName} ({t.percentage}%)
                      </span>
                    ))
                ) : (
                  <span className="text-text-muted text-[11px]">Nenhum assunto atingiu 70%.</span>
                )}
              </div>
            </div>

            {/* Pontos de Atenção */}
            <div className="pt-3 border-t border-border">
              <div className="text-amber-400 font-bold flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Assuntos que Exigem Atenção (&lt; 50%)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {attempt.topicBreakdown?.filter((t: any) => t.needsAttention).length > 0 ? (
                  attempt.topicBreakdown
                    .filter((t: any) => t.needsAttention)
                    .map((t: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 font-semibold text-[11px]"
                      >
                        {t.topicName} ({t.percentage}%)
                      </span>
                    ))
                ) : (
                  <span className="text-emerald-400 text-[11px]">Nenhum ponto crítico abaixo de 50%!</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO DE REVISÃO DETALHADA DAS RESPOSTAS COM GABARITO ─────────────── */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-text-primary flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-400" />
              <span>Revisão Detalhada da Prova</span>
            </h2>
            <p className="text-text-muted text-xs mt-0.5">
              Navegue pelas questões, confira seu gabarito e leia os comentários explicativos.
            </p>
          </div>

          {/* Filtros de Revisão */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `Todas (${questions.length})` },
              { id: 'correct', label: `Acertos (${attempt.correctCount})` },
              { id: 'wrong', label: `Erros (${attempt.wrongCount})` },
              { id: 'blank', label: `Em Branco (${attempt.blankCount})` },
              { id: 'marked', label: 'Marcadas' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setReviewFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reviewFilter === f.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-bg-surface border border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Questões em Modo Revisão */}
        <div className="space-y-6">
          {filteredQuestions.map((q) => {
            const isCorrect = q.userAnswer?.isCorrect === true;
            const isWrong = q.userAnswer?.isCorrect === false;

            return (
              <div
                key={q.id}
                className="bg-bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm"
              >
                {/* Cabeçalho da Questão */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-brand-500 text-white font-extrabold text-xs">
                      Questão {q.orderIndex}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-bg-elevated text-text-secondary font-bold text-xs">
                      {q.subjectName}
                    </span>
                    <span className="text-xs text-text-muted hidden sm:inline">
                      {q.topicName}
                    </span>
                  </div>

                  {/* Badge de Resultado */}
                  <div className="flex items-center gap-2">
                    {q.isMarkedForReview && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold text-[10px] flex items-center gap-1">
                        <Flag className="w-3 h-3 fill-amber-400" /> Marcada
                      </span>
                    )}

                    {isCorrect ? (
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-extrabold text-xs flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Acertou
                      </span>
                    ) : isWrong ? (
                      <span className="px-3 py-1 rounded-lg bg-rose-500/15 text-rose-400 font-extrabold text-xs flex items-center gap-1.5">
                        <X className="w-3.5 h-3.5 stroke-[3]" /> Errou
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-lg bg-bg-elevated text-text-muted font-bold text-xs">
                        Em Branco
                      </span>
                    )}
                  </div>
                </div>

                {/* Enunciado */}
                <div className="text-sm font-medium text-text-primary leading-relaxed whitespace-pre-wrap">
                  {q.statement}
                </div>

                {/* Alternativas com Gabarito Destacado */}
                <div className="space-y-2 pt-1">
                  {q.options.map((opt) => {
                    const isUserChoice = q.userAnswer?.selectedOptionId === opt.id;
                    const isRightOption = opt.isCorrect === true;

                    let rowStyle = 'border-border bg-bg-elevated/30 text-text-secondary';
                    let badgeStyle = 'border-border text-text-muted bg-bg-surface';

                    if (isRightOption) {
                      rowStyle = 'border-emerald-500/50 bg-emerald-500/10 text-text-primary font-medium';
                      badgeStyle = 'bg-emerald-500 text-white font-extrabold';
                    } else if (isUserChoice && !isRightOption) {
                      rowStyle = 'border-rose-500/50 bg-rose-500/10 text-rose-200';
                      badgeStyle = 'bg-rose-500 text-white font-extrabold';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${rowStyle}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 border ${badgeStyle}`}
                        >
                          {opt.letter}
                        </div>
                        <div className="flex-1 text-xs md:text-sm leading-relaxed pt-0.5">
                          {opt.text}
                        </div>
                        {isRightOption && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase shrink-0">
                            Gabarito
                          </span>
                        )}
                        {isUserChoice && !isRightOption && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase shrink-0">
                            Sua escolha
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Comentário Explicativo Oficial */}
                {q.officialExplanation && (
                  <div className="mt-4 p-4 rounded-xl bg-brand-500/8 border border-brand-500/20 space-y-1.5">
                    <div className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                      <span>Comentário do Gabarito Oficial</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                      {q.officialExplanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
