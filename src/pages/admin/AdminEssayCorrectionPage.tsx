import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Save,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  ProgressBar,
  LoadingState,
} from '@/components/ui';
import {
  essayService,
  EssayDetail,
  EssayCriterionAdmin,
} from '@/services/essay.service';

interface CriterionGrade {
  criterionId: string;
  score: number;
  maxScore: number;
  weight: number;
  name: string;
  description?: string;
  feedback: string;
}

export const AdminEssayCorrectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [essay, setEssay] = useState<EssayDetail | null>(null);
  const [, setCriteria] = useState<EssayCriterionAdmin[]>([]);
  const [grades, setGrades] = useState<CriterionGrade[]>([]);
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [correctionType, setCorrectionType] = useState<'MANUAL' | 'AI' | 'HYBRID'>('MANUAL');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPromptDetails, setShowPromptDetails] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [essayData, criteriaData] = await Promise.all([
          essayService.getEssayDetail(id),
          essayService.getEssayCriteria(id),
        ]);

        setEssay(essayData);
        setCriteria(criteriaData);

        // Pre-fill if already has correction
        if (essayData.correction) {
          setGeneralFeedback(essayData.correction.generalFeedback || '');
          setStrengths(essayData.correction.strengths || '');
          setWeaknesses(essayData.correction.weaknesses || '');
          setSuggestions(essayData.correction.suggestions || '');
          setCorrectionType(
            (essayData.correction.correctionType as 'MANUAL' | 'AI' | 'HYBRID') || 'MANUAL'
          );
        }

        // Initialize criteria grades
        const initialGrades: CriterionGrade[] = criteriaData.map((c) => {
          const existing = essayData.criteriaScores?.find(
            (cs) => cs.criterionId === c.id
          );
          return {
            criterionId: c.id,
            name: c.name,
            description: c.description || undefined,
            maxScore: Number(c.maxScore),
            weight: Number(c.weight),
            score: existing ? Number(existing.score) : 0,
            feedback: existing?.feedback || '',
          };
        });

        setGrades(initialGrades);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados para correção.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleScoreChange = (index: number, newScore: number) => {
    setGrades((prev) => {
      const next = [...prev];
      const max = next[index].maxScore;
      const clamped = Math.max(0, Math.min(max, isNaN(newScore) ? 0 : newScore));
      next[index] = { ...next[index], score: clamped };
      return next;
    });
  };

  const handleFeedbackChange = (index: number, feedback: string) => {
    setGrades((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], feedback };
      return next;
    });
  };

  // Real-time calculated totals
  const calculatedTotals = useMemo(() => {
    let totalScore = 0;
    let maxScore = 0;

    for (const g of grades) {
      const weight = g.weight > 0 ? g.weight : 1;
      totalScore += g.score * weight;
      maxScore += g.maxScore * weight;
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const isPassed = percentage >= 50;

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
      percentage: Math.round(percentage * 10) / 10,
      isPassed,
    };
  }, [grades]);

  const handleSubmitCorrection = async () => {
    if (!id) return;

    if (!generalFeedback.trim()) {
      alert('Por favor, preencha o parecer geral da avaliação antes de finalizar.');
      return;
    }

    if (!window.confirm('Tem certeza de que deseja finalizar e publicar a avaliação desta redação? O aluno terá acesso imediato às notas e pareceres.')) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await essayService.correctEssay(id, {
        generalFeedback,
        strengths: strengths.trim() || undefined,
        weaknesses: weaknesses.trim() || undefined,
        suggestions: suggestions.trim() || undefined,
        correctionType,
        criteriaScores: grades.map((g) => ({
          criterionId: g.criterionId,
          score: g.score,
          feedback: g.feedback.trim() || undefined,
        })),
      });

      alert('Avaliação registrada com sucesso!');
      navigate('/admin/redacoes');
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar correção da redação.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando redação e critérios de avaliação..." />
      </div>
    );
  }

  if (!essay) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Redação não encontrada ou erro no carregamento.</p>
        <Button className="mt-4" onClick={() => navigate('/admin/redacoes')}>
          Voltar para Fila
        </Button>
      </div>
    );
  }

  const paragraphs = (essay.content || '').split('\n').filter((p) => p.trim().length > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/redacoes')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Fila de Redações
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              Bancada de Avaliação Oficial
              <Badge variant={essay.status === 'CORRECTED' ? 'success' : 'warning'} size="sm">
                {essay.status === 'CORRECTED' ? 'Já Corrigida' : 'Aguardando Correção'}
              </Badge>
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Estudante: <span className="text-text-primary font-medium">{essay.studentName || 'Aluno'}</span> ({essay.studentEmail || 'Sem email'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleSubmitCorrection}
            disabled={isSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSubmitting ? 'Salvando...' : 'Finalizar e Publicar Nota'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Student Text and Prompt Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Prompt Summary Card (Collapsible) */}
          <Card className="p-4 border-brand-500/20">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowPromptDetails(!showPromptDetails)}
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-400">
                  Proposta Temática
                </span>
                <h2 className="text-base font-bold text-text-primary mt-0.5">
                  {essay.prompt?.title || 'Tema do Concurso'}
                </h2>
              </div>
              <Button variant="ghost" size="sm">
                {showPromptDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {showPromptDetails && (
              <div className="mt-4 pt-4 border-t border-border space-y-4 text-sm">
                {essay.prompt?.statement && (
                  <div>
                    <h4 className="text-xs font-semibold text-text-muted uppercase mb-1">Comando da Prova:</h4>
                    <p className="text-text-primary bg-bg-elevated p-3 rounded-lg border border-border">
                      {essay.prompt.statement}
                    </p>
                  </div>
                )}

                {essay.prompt?.instructions && (
                  <div>
                    <h4 className="text-xs font-semibold text-text-muted uppercase mb-1">Orientações aos Candidatos:</h4>
                    <p className="text-text-muted text-xs leading-relaxed whitespace-pre-line">
                      {essay.prompt.instructions}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Student Essay Content */}
          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-2">
              <div>
                <span className="text-xs text-text-muted">Título do Texto:</span>
                <h3 className="text-lg font-bold text-text-primary">
                  {essay.title || 'Sem título'}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span>{essay.wordCount || 0} palavras</span>
                <span>•</span>
                <span>{essay.characterCount || 0} caracteres</span>
                <span>•</span>
                <span>{essay.lineCount || 0} linhas</span>
              </div>
            </div>

            {/* Formatted Text with Paragraph Indicators */}
            <div className="bg-bg-elevated/40 p-5 rounded-lg border border-border space-y-4 text-text-primary leading-relaxed font-sans text-base select-text">
              {paragraphs.length === 0 ? (
                <p className="italic text-text-muted">Nenhum texto submetido.</p>
              ) : (
                paragraphs.map((p, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span className="text-xs font-mono text-text-muted select-none w-6 text-right pt-1 opacity-50">
                      §{idx + 1}
                    </span>
                    <p className="flex-1 indent-6 leading-7">{p}</p>
                  </div>
                ))
              )}
            </div>

            <div className="text-xs text-text-muted text-right">
              Submetido em: {essay.submittedAt ? new Date(essay.submittedAt).toLocaleString('pt-BR') : 'Data não registrada'}
            </div>
          </Card>
        </div>

        {/* Right Column: Grading Workbench */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Score Preview Header */}
          <Card className="p-4 sticky top-4 z-10 shadow-lg border-brand-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Pontuação Calculada
              </span>
              <Badge variant={calculatedTotals.isPassed ? 'success' : 'danger'} size="sm">
                {calculatedTotals.isPassed ? 'Aprovado' : 'Abaixo do Corte'}
              </Badge>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-brand-400">
                {calculatedTotals.totalScore.toFixed(1)}
                <span className="text-base text-text-muted font-normal"> / {calculatedTotals.maxScore.toFixed(1)} pts</span>
              </div>
              <div className="text-sm font-semibold text-text-primary">
                {calculatedTotals.percentage.toFixed(1)}%
              </div>
            </div>

            <ProgressBar
              value={calculatedTotals.percentage}
              className="mt-3"
              colorKey={calculatedTotals.isPassed ? 'success' : 'danger'}
            />

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
              <span>Tipo de Avaliação:</span>
              <select
                value={correctionType}
                onChange={(e) => setCorrectionType(e.target.value as any)}
                className="bg-bg-elevated border border-border rounded px-2 py-1 text-xs text-text-primary"
              >
                <option value="MANUAL">Manual (Banca)</option>
                <option value="HYBRID">Híbrida (IA + Banca)</option>
                <option value="AI">Assistida por IA</option>
              </select>
            </div>
          </Card>

          {/* Criteria Scoring Accordion / Form */}
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-400" />
              Critérios Oficiais da Banca
            </h3>

            {grades.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhum critério configurado para este concurso.</p>
            ) : (
              <div className="space-y-4 divide-y divide-border">
                {grades.map((g, idx) => {
                  return (
                    <div key={g.criterionId} className={idx > 0 ? 'pt-4 space-y-2' : 'space-y-2'}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-text-primary">{g.name}</p>
                          {g.description && (
                            <p className="text-xs text-text-muted line-clamp-2">{g.description}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs text-text-muted">Peso: {g.weight}x</span>
                        </div>
                      </div>

                      {/* Score Input */}
                      <div className="flex items-center gap-3 bg-bg-elevated/50 p-2.5 rounded-lg border border-border">
                        <input
                          type="range"
                          min="0"
                          max={g.maxScore}
                          step="0.5"
                          value={g.score}
                          onChange={(e) => handleScoreChange(idx, parseFloat(e.target.value))}
                          className="flex-1 accent-brand-500 cursor-pointer"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max={g.maxScore}
                            step="0.25"
                            value={g.score}
                            onChange={(e) => handleScoreChange(idx, parseFloat(e.target.value))}
                            className="w-16 px-2 py-1 text-sm font-bold text-center bg-bg-card border border-border rounded text-brand-400 focus:outline-none focus:border-brand-500"
                          />
                          <span className="text-xs text-text-muted font-medium">/ {g.maxScore}</span>
                        </div>
                      </div>

                      {/* Specific Feedback per Criterion */}
                      <input
                        type="text"
                        placeholder="Apontamento específico (ex: Desvios de regência nas linhas 12 e 18)"
                        value={g.feedback}
                        onChange={(e) => handleFeedbackChange(idx, e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-bg-card border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Qualitative Feedback Section */}
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              Parecer Pedagógico Oficial
            </h3>

            {/* General Feedback (Required) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-muted flex items-center gap-1">
                Parecer Geral da Banca <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={4}
                value={generalFeedback}
                onChange={(e) => setGeneralFeedback(e.target.value)}
                placeholder="Insira a avaliação global da redação, coesão, coerência, estruturação dos tópicos e atendimento ao comando..."
                className="w-full p-2.5 text-xs bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-500 resize-y"
              />
            </div>

            {/* Strengths */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5" />
                Pontos Fortes Observados
              </label>
              <textarea
                rows={2}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Ex: Excelente domínio do tema, argumentação consistente no tópico 2..."
                className="w-full p-2.5 text-xs bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-500/50 resize-y"
              />
            </div>

            {/* Weaknesses */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                <ThumbsDown className="w-3.5 h-3.5" />
                Aspectos a Desenvolver
              </label>
              <textarea
                rows={2}
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                placeholder="Ex: Erros de concordância verbal, períodos demasiadamente longos..."
                className="w-full p-2.5 text-xs bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-amber-500/50 resize-y"
              />
            </div>

            {/* Suggestions */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" />
                Orientações de Estudo e Prática
              </label>
              <textarea
                rows={2}
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                placeholder="Ex: Praticar temas com foco em tópicos legislativos e revisar regras de pontuação..."
                className="w-full p-2.5 text-xs bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-500/50 resize-y"
              />
            </div>

            <Button
              variant="primary"
              className="w-full mt-2"
              onClick={handleSubmitCorrection}
              disabled={isSubmitting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {isSubmitting ? 'Finalizando Avaliação...' : 'Salvar e Publicar Avaliação'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
