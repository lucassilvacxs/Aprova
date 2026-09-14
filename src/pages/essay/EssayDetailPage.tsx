import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  PenTool,
  CheckCircle2,
  AlertCircle,
  Award,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  FileText,
  Clock,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  ProgressBar,
  LoadingState,
  EmptyState,
} from '@/components/ui';
import { essayService, EssayDetail } from '@/services/essay.service';

export const EssayDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [essay, setEssay] = useState<EssayDetail | null>(null);

  useEffect(() => {
    if (id) {
      loadEssay(id);
    }
  }, [id]);

  const loadEssay = async (essayId: string) => {
    setLoading(true);
    try {
      const data = await essayService.getEssayDetail(essayId);
      setEssay(data);
    } catch (err: any) {
      console.error('Erro ao carregar detalhes:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Carregando detalhes da redação..." />
      </div>
    );
  }

  if (!essay) {
    return (
      <EmptyState
        title="Redação não encontrada"
        description="Não foi possível localizar o registro solicitado."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/redacao/historico')}
          >
            Voltar ao Histórico
          </Button>
        }
      />
    );
  }

  const isCorrected = essay.status === 'CORRECTED';
  const isDraft = essay.status === 'DRAFT' || essay.status === ('draft' as any);
  const isSubmitted = essay.status === 'SUBMITTED';

  const correction = essay.correction;
  const percentage = correction ? Number(correction.percentage) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Botão Voltar */}
      <button
        onClick={() => navigate('/redacao/historico')}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar ao histórico</span>
      </button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              isCorrected
                ? 'success'
                : isDraft
                ? 'warning'
                : 'brand'
            }
            size="md"
          >
            {isCorrected ? 'Corrigida' : isDraft ? 'Rascunho' : 'Em Avaliação'}
          </Badge>

          {essay.prompt?.category && (
            <Badge variant="neutral" size="md">
              {essay.prompt.category}
            </Badge>
          )}

          <span className="text-xs text-text-muted">
            {essay.submittedAt
              ? `Enviada em ${new Date(essay.submittedAt).toLocaleDateString('pt-BR')}`
              : `Salva em ${new Date(essay.lastSavedAt).toLocaleDateString('pt-BR')}`}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
          {essay.title || essay.prompt?.title || 'Redação Sem Título'}
        </h1>

        {essay.prompt && (
          <p className="text-sm text-text-secondary">
            Tema: <strong>{essay.prompt.title}</strong>
          </p>
        )}
      </div>

      {/* Banner se for Rascunho */}
      {isDraft && (
        <Card className="p-5 border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-text-primary text-sm">Esta redação ainda não foi enviada</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Você pode continuar editando este rascunho a qualquer momento no editor de texto.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/redacao/${essay.id}/escrever`)}
            leftIcon={<PenTool className="w-4 h-4" />}
          >
            Continuar no Editor
          </Button>
        </Card>
      )}

      {/* Banner se for Submetida (Aguardando Correção) */}
      {isSubmitted && (
        <Card className="p-5 border-blue-500/30 bg-blue-500/5 flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-text-primary text-sm">Redação em fila de avaliação</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Sua redação foi recebida e está na fila de correção dos professores. Assim que a avaliação por critérios for concluída, você receberá uma notificação com o parecer completo.
            </p>
          </div>
        </Card>
      )}

      {/* Painel Completo de Correção (quando corrigida) */}
      {isCorrected && correction && (
        <div className="space-y-6">
          {/* Hero Score Card */}
          <Card className="p-6 bg-gradient-to-br from-emerald-500/10 via-bg-surface to-bg-surface border-emerald-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  <Award className="w-4 h-4" />
                  <span>Resultado Oficial da Avaliação</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
                  {correction.totalScore}{' '}
                  <span className="text-lg font-medium text-text-muted">
                    / {correction.maxScore || 100}
                  </span>
                </h2>
                <p className="text-xs text-text-secondary">
                  Aproveitamento global de <strong>{percentage}%</strong> nos critérios da banca examinadora.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <Badge
                  variant={percentage >= 70 ? 'success' : percentage >= 50 ? 'warning' : 'danger'}
                  size="md"
                >
                  {percentage >= 90
                    ? 'Desempenho Excelente'
                    : percentage >= 75
                    ? 'Bom Desempenho'
                    : percentage >= 50
                    ? 'Aprovado no Corte'
                    : 'Abaixo do Corte'}
                </Badge>
                <span className="block text-[11px] text-text-muted mt-1.5">
                  Avaliado em {new Date(correction.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </Card>

          {/* Notas Granulares por Critério */}
          {essay.criteriaScores && essay.criteriaScores.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Desempenho por Critério Avaliado</span>
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {essay.criteriaScores.map((crit, idx) => {
                  const s = Number(crit.score) || 0;
                  const m = Number(crit.maxScore) || 20;
                  const critPct = m > 0 ? (s / m) * 100 : 0;

                  return (
                    <Card key={idx} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-text-primary text-sm">
                            {crit.criterionName || `Critério ${idx + 1}`}
                          </h4>
                          {crit.criterionDescription && (
                            <p className="text-xs text-text-muted line-clamp-1">
                              {crit.criterionDescription}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-sm text-text-primary">
                            {s} / {m}
                          </span>
                          <span className="block text-[11px] text-text-muted">
                            {Math.round(critPct)}%
                          </span>
                        </div>
                      </div>

                      <ProgressBar
                        value={critPct}
                        colorKey={critPct >= 70 ? 'success' : critPct >= 50 ? 'warning' : 'danger'}
                        size="sm"
                      />

                      {crit.feedback && (
                        <div className="pt-2 border-t border-border-subtle text-xs text-text-secondary">
                          <strong>Comentário do avaliador:</strong> {crit.feedback}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Parecer Geral */}
          <Card className="p-5 space-y-2">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-500" />
              <span>Parecer Geral da Banca</span>
            </h3>
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {correction.generalFeedback}
            </div>
          </Card>

          {/* Pontos Fortes, Pontos a Melhorar e Sugestões */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {correction.strengths && (
              <Card className="p-4 space-y-2 border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Pontos Fortes</span>
                </div>
                <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                  {correction.strengths}
                </div>
              </Card>
            )}

            {correction.weaknesses && (
              <Card className="p-4 space-y-2 border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  <ThumbsDown className="w-4 h-4" />
                  <span>Pontos a Melhorar</span>
                </div>
                <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                  {correction.weaknesses}
                </div>
              </Card>
            )}

            {correction.suggestions && (
              <Card className="p-4 space-y-2 border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  <Lightbulb className="w-4 h-4" />
                  <span>Sugestões Táticas</span>
                </div>
                <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                  {correction.suggestions}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Texto Escrito pelo Aluno */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <PenTool className="w-4 h-4 text-text-muted" />
            <span>Texto Enviado</span>
          </h3>

          <div className="text-xs text-text-muted">
            {essay.wordCount} palavras • {essay.characterCount} caracteres • ~{essay.lineCount} linhas
          </div>
        </div>

        <Card className="p-6 sm:p-8 bg-bg-surface font-serif leading-relaxed text-sm sm:text-base text-text-primary whitespace-pre-line border border-border-subtle shadow-sm">
          {essay.title && (
            <h2 className="text-lg sm:text-xl font-bold text-center mb-6 pb-4 border-b border-border-subtle font-sans">
              {essay.title}
            </h2>
          )}
          {essay.content}
        </Card>
      </div>

      {/* Proposta Original de Referência */}
      {essay.prompt && (
        <Card className="p-5 bg-bg-elevated/40 space-y-2">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Proposta de Referência
          </span>
          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
            {essay.prompt.statement}
          </p>
        </Card>
      )}
    </div>
  );
};
