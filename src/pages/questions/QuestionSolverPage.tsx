import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Star,
  Bookmark,
  CheckCircle2,
  XCircle,
  Sparkles,
  Send,
  Flag,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  IconButton,
  Modal,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import {
  questionService,
  QuestionDetail,
  AttemptResult,
} from '@/services/question.service';

export const QuestionSolverPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado da resolução
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<AttemptResult | null>(null);

  // Cronômetro da questão
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // Modal de Reporte de Erro
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('statement_error');
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Carrega a questão do backend
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setAttemptResult(null);
    setSelectedOptionId(null);
    setElapsedSeconds(0);

    questionService
      .getQuestion(id)
      .then((data) => {
        setQuestion(data);
        // Se o aluno já tinha respondido previamente, preenche o estado
        if (data.hasAttempted && data.latestAttempt) {
          setSelectedOptionId(data.latestAttempt.selectedOptionId);
          const correctOpt = data.options.find((o) => o.isCorrect);
          if (correctOpt) {
            setAttemptResult({
              attemptId: 'cached',
              isCorrect: data.latestAttempt.isCorrect,
              selectedOptionId: data.latestAttempt.selectedOptionId,
              correctOptionId: correctOpt.id,
              explanation: data.officialExplanation || '',
            });
          }
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar questão:', err);
        setError('Não foi possível carregar esta questão. Verifique se ela está publicada.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Inicia o cronômetro enquanto não estiver respondida
  useEffect(() => {
    if (question && !attemptResult) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [question, attemptResult]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optId: string) => {
    if (attemptResult) return; // Não altera após submissão
    setSelectedOptionId(optId);
  };

  const handleConfirmAnswer = async () => {
    if (!id || !selectedOptionId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await questionService.submitAttempt(id, {
        selectedOptionId,
        durationSeconds: elapsedSeconds,
        source: 'direct_practice',
      });

      setAttemptResult(result);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: any) {
      console.error('Erro ao enviar tentativa:', err);
      alert('Ocorreu um erro ao submeter sua resposta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!id || !question) return;
    try {
      const res = await questionService.toggleFavorite(id);
      setQuestion({ ...question, isFavorited: res.favorited });
    } catch (err) {
      console.error('Erro ao alternar favorito:', err);
    }
  };

  const handleToggleReview = async () => {
    if (!id || !question) return;
    try {
      const res = await questionService.toggleReview(id);
      setQuestion({ ...question, isMarkedForReview: res.markedForReview });
    } catch (err) {
      console.error('Erro ao alternar revisão:', err);
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reportDescription.trim()) return;

    setIsReporting(true);
    try {
      await questionService.reportQuestion(id, {
        type: reportType,
        description: reportDescription.trim(),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportDescription('');
      }, 1500);
    } catch (err) {
      console.error('Erro ao enviar reporte:', err);
    } finally {
      setIsReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <LoadingState message="Carregando enunciado da questão..." />
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="py-12 max-w-2xl mx-auto">
        <ErrorState
          title="Questão indisponível"
          message={error || 'Questão não encontrada.'}
          onRetry={() => navigate('/questoes')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Bar / Navegação e Metadados */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/questoes')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Voltar
          </Button>

          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            {question.subjectName && (
              <Badge variant="brand" size="sm">
                {question.subjectName}
              </Badge>
            )}
            {question.topicName && (
              <span className="bg-bg-elevated px-2 py-0.5 rounded border border-border/50">
                {question.topicName}
              </span>
            )}
            <Badge variant="neutral" size="sm">
              {question.boardAcronym || 'Banca'} • {question.year}
            </Badge>
            <Badge
              variant={
                question.difficulty === 'easy'
                  ? 'success'
                  : question.difficulty === 'medium'
                  ? 'warning'
                  : 'danger'
              }
              size="sm"
            >
              {question.difficulty === 'easy'
                ? 'Fácil'
                : question.difficulty === 'medium'
                ? 'Média'
                : question.difficulty === 'hard'
                ? 'Difícil'
                : 'Muito Difícil'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Cronômetro */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface border border-border rounded-lg text-xs font-mono font-medium text-text-secondary">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Favoritar */}
          <IconButton
            variant={question.isFavorited ? 'primary' : 'secondary'}
            size="sm"
            label={question.isFavorited ? 'Remover dos favoritos' : 'Favoritar questão'}
            onClick={handleToggleFavorite}
            icon={<Star className={`w-4 h-4 ${question.isFavorited ? 'fill-current' : ''}`} />}
          />

          {/* Marcar Revisão */}
          <IconButton
            variant={question.isMarkedForReview ? 'primary' : 'secondary'}
            size="sm"
            label={question.isMarkedForReview ? 'Remover da revisão' : 'Marcar para revisão periódica'}
            onClick={handleToggleReview}
            icon={<Bookmark className={`w-4 h-4 ${question.isMarkedForReview ? 'fill-current' : ''}`} />}
          />

          {/* Reportar Erro */}
          <IconButton
            variant="ghost"
            size="sm"
            label="Reportar erro nesta questão"
            onClick={() => setShowReportModal(true)}
            icon={<Flag className="w-4 h-4 text-text-muted hover:text-danger-400" />}
          />
        </div>
      </div>

      {/* Card do Enunciado */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 text-xs text-text-muted">
          <span>
            {question.contestTitle ? `Concurso: ${question.contestTitle}` : 'Questão de Concurso Público'}
          </span>
          {question.sourceReference && (
            <span className="font-mono bg-bg-elevated px-2 py-0.5 rounded">
              Ref: {question.sourceReference}
            </span>
          )}
        </div>

        {/* Texto do Enunciado */}
        <div className="text-base text-text-primary leading-relaxed whitespace-pre-line font-normal">
          {question.statement}
        </div>

        {/* Alternativas */}
        <div className="space-y-3 pt-2">
          {question.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            let optionStyle =
              'border-border/80 bg-bg-surface hover:border-brand-500/40 hover:bg-bg-elevated text-text-primary';
            let badgeStyle = 'bg-bg-elevated text-text-secondary border-border';

            if (attemptResult) {
              const isCorrectOption = attemptResult.correctOptionId === opt.id;
              if (isCorrectOption) {
                // Opção correta sempre em verde
                optionStyle = 'border-success-500/60 bg-success-500/10 text-success-300 font-medium';
                badgeStyle = 'bg-success-500 text-white font-bold border-success-400';
              } else if (isSelected && !isCorrectOption) {
                // Opção errada que o aluno escolheu
                optionStyle = 'border-danger-500/60 bg-danger-500/10 text-danger-300 line-through';
                badgeStyle = 'bg-danger-500 text-white font-bold border-danger-400';
              } else {
                optionStyle = 'border-border/40 bg-bg-surface/50 text-text-muted opacity-60';
                badgeStyle = 'bg-bg-surface text-text-muted border-border/40';
              }
            } else if (isSelected) {
              optionStyle = 'border-brand-500 bg-brand-500/10 text-brand-200 font-medium shadow-sm';
              badgeStyle = 'bg-brand-500 text-white font-bold border-brand-400';
            }

            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none ${optionStyle}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 border ${badgeStyle}`}
                >
                  {opt.letter}
                </div>
                <div className="flex-1 text-sm pt-0.5 leading-relaxed">
                  {opt.text}
                </div>

                {attemptResult && attemptResult.correctOptionId === opt.id && (
                  <CheckCircle2 className="w-5 h-5 text-success-400 shrink-0 mt-0.5" />
                )}
                {attemptResult && isSelected && attemptResult.correctOptionId !== opt.id && (
                  <XCircle className="w-5 h-5 text-danger-400 shrink-0 mt-0.5" />
                )}
              </div>
            );
          })}
        </div>

        {/* Ação de Confirmar Resposta */}
        {!attemptResult ? (
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <span className="text-xs text-text-muted">
              {selectedOptionId
                ? 'Opção selecionada. Clique em confirmar para registrar sua tentativa.'
                : 'Selecione uma das alternativas acima para responder.'}
            </span>
            <Button
              variant="primary"
              size="md"
              disabled={!selectedOptionId || isSubmitting}
              isLoading={isSubmitting}
              onClick={handleConfirmAnswer}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Confirmar Resposta
            </Button>
          </div>
        ) : (
          /* Banner de Feedback Imediato */
          <div className="pt-4 border-t border-border/40 space-y-4">
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                attemptResult.isCorrect
                  ? 'bg-success-500/15 border-success-500/30 text-success-300'
                  : 'bg-danger-500/15 border-danger-500/30 text-danger-300'
              }`}
            >
              {attemptResult.isCorrect ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-success-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Parabéns! Você acertou esta questão!</h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      Sua taxa de acertos e progresso na disciplina foram atualizados em tempo real.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-danger-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Resposta incorreta.</h4>
                    <p className="text-xs opacity-90 mt-0.5">
                      Esta questão foi adicionada ao seu histórico e você pode marcá-la para revisão periódica.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Comentário Oficial do Professor / Explicação */}
            {attemptResult.explanation && (
              <div className="p-5 bg-bg-elevated border border-brand-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-brand-400 font-semibold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Comentário Oficial do Professor</span>
                </div>
                <div className="text-sm text-text-primary leading-relaxed whitespace-pre-line pt-1">
                  {attemptResult.explanation}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Modal de Reporte de Erro */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Reportar Erro na Questão"
      >
        {reportSuccess ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-success-400 mx-auto" />
            <h3 className="text-base font-bold text-text-primary">Reporte enviado com sucesso!</h3>
            <p className="text-xs text-text-muted">
              Nossa equipe pedagógica analisará o apontamento. Obrigado por colaborar!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendReport} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                Tipo de Inconsistência
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-xl p-2.5 text-sm text-text-primary"
              >
                <option value="statement_error">Erro de digitação ou formatação no enunciado</option>
                <option value="wrong_answer_key">Gabarito oficial discordante da banca</option>
                <option value="suspicious_explanation">Comentário do professor confuso ou incorreto</option>
                <option value="classification_error">Classificação incorreta de disciplina/assunto</option>
                <option value="other">Outro motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase mb-1">
                Descrição Detalhada do Problema
              </label>
              <textarea
                required
                rows={4}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Explique detalhadamente o erro identificado para agilizar a revisão..."
                className="w-full bg-bg-surface border border-border rounded-xl p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowReportModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isReporting}
              >
                Enviar Reporte
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
