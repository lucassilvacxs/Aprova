import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  PenTool,
  Award,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  LoadingState,
  EmptyState,
} from '@/components/ui';
import { essayService, EssayPrompt } from '@/services/essay.service';

export const EssayThemeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [prompt, setPrompt] = useState<EssayPrompt | null>(null);

  useEffect(() => {
    if (id) {
      loadPromptDetail(id);
    }
  }, [id]);

  const loadPromptDetail = async (promptId: string) => {
    setLoading(true);
    try {
      const data = await essayService.getPromptById(promptId);
      setPrompt(data);
    } catch (err) {
      console.error('Erro ao carregar tema:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWriting = async () => {
    if (!prompt) return;
    setStarting(true);
    try {
      const essay = await essayService.startEssay({
        promptId: prompt.id,
        contestId: prompt.contestId || undefined,
        title: prompt.title,
      });

      navigate(`/redacao/${essay.id}/escrever`);
    } catch (err: any) {
      alert(err.message || 'Erro ao iniciar redação.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Carregando proposta de redação..." />
      </div>
    );
  }

  if (!prompt) {
    return (
      <EmptyState
        title="Tema não encontrado"
        description="O tema solicitado pode ter sido arquivado ou não está mais disponível."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/redacao/temas')}
          >
            Voltar ao Catálogo
          </Button>
        }
      />
    );
  }

  const hasActiveDraft = prompt.userEssay && (prompt.userEssay.status === 'DRAFT' || prompt.userEssay.status === 'draft');
  const isCompleted = prompt.userEssay && (prompt.userEssay.status === 'CORRECTED' || prompt.userEssay.status === 'evaluated');

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Botão Voltar */}
      <button
        onClick={() => navigate('/redacao/temas')}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar ao catálogo de temas</span>
      </button>

      {/* Header do Tema */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand" size="md">
            {prompt.category || 'Segurança Pública'}
          </Badge>
          <Badge variant="neutral" size="md">
            {prompt.contestTitle || 'Concurso Federal'}
          </Badge>
          <span className="text-xs text-text-muted">
            Dificuldade: <strong className="text-text-secondary">{prompt.difficulty}</strong>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight">
          {prompt.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary pt-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-text-muted" />
            <span>Tempo sugerido: <strong>{prompt.estimatedMinutes} minutos</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <PenTool className="w-4 h-4 text-text-muted" />
            <span>Extensão: <strong>{prompt.minLines} a {prompt.maxLines} linhas</strong> ({prompt.minWords} a {prompt.maxWords} palavras)</span>
          </div>
        </div>
      </div>

      {/* Card de Ação Principal */}
      <Card className="p-5 border-brand-500/30 bg-gradient-to-r from-brand-500/5 via-transparent to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-text-primary text-base">
              {hasActiveDraft
                ? 'Você possui um rascunho em andamento deste tema'
                : isCompleted
                ? 'Você já submeteu uma redação deste tema'
                : 'Pronto para começar seu treino?'}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {hasActiveDraft
                ? 'Continue de onde parou. Suas alterações são salvas automaticamente em tempo real.'
                : isCompleted
                ? 'Sua redação já foi corrigida pelos critérios oficiais. Você pode praticar novamente criando uma nova versão.'
                : 'Ambiente de escrita focado, contagem em tempo real e correção formal por critérios da banca.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isCompleted && (
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate(`/redacao/${prompt.userEssay.id}`)}
                leftIcon={<FileCheck className="w-4 h-4" />}
              >
                Ver Correção
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={handleStartWriting}
              disabled={starting}
              leftIcon={<PenTool className="w-4 h-4" />}
            >
              {starting
                ? 'Iniciando...'
                : hasActiveDraft
                ? 'Continuar Rascunho'
                : isCompleted
                ? 'Escrever Novamente'
                : 'Começar Redação'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Proposta de Redação (Statement) */}
      <Card className="p-6 border-l-4 border-l-brand-500 space-y-3 bg-bg-surface">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-bold text-text-primary uppercase tracking-wide">
            Proposta de Redação
          </h2>
        </div>
        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-line font-serif sm:text-base">
          {prompt.statement}
        </div>
      </Card>

      {/* Textos Motivadores (Context) */}
      {prompt.context && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <span>Textos Motivadores</span>
          </h2>

          <Card className="p-6 space-y-4 bg-bg-surface">
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line prose prose-sm dark:prose-invert max-w-none">
              {prompt.context}
            </div>

            {prompt.source && (
              <div className="pt-3 border-t border-border-subtle text-xs text-text-muted italic">
                Fonte: {prompt.source}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Instruções Formais */}
      {prompt.instructions && prompt.instructions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-text-muted" />
            <span>Instruções da Prova Discursiva</span>
          </h2>

          <Card className="p-4 bg-bg-elevated/40">
            <ul className="space-y-2 text-xs text-text-secondary list-disc pl-5">
              {prompt.instructions.map((inst, idx) => (
                <li key={idx} className="leading-relaxed">
                  {inst}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Critérios de Avaliação */}
      {prompt.criteria && prompt.criteria.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-500" />
            <span>Critérios Oficiais de Avaliação</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {prompt.criteria.map((crit) => (
              <Card key={crit.id} className="p-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Até {crit.maxScore} pontos
                  </span>
                  <h4 className="font-semibold text-text-primary text-sm mt-1">
                    {crit.name}
                  </h4>
                  {crit.description && (
                    <p className="text-xs text-text-secondary mt-1 line-clamp-3">
                      {crit.description}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
