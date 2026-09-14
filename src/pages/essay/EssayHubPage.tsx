import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PenTool,
  Sparkles,
  BookOpen,
  History,
  TrendingUp,
  Award,
  AlertCircle,
  Clock,
  ChevronRight,
  ArrowRight,
  Trash2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  StatCard,
  LoadingState,
  Modal,
} from '@/components/ui';
import {
  essayService,
  EssayDraft,
  EssayUserStats,
  EssayPrompt,
  EssayItem,
} from '@/services/essay.service';

export const EssayHubPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeDraft, setActiveDraft] = useState<EssayDraft | null>(null);
  const [stats, setStats] = useState<EssayUserStats | null>(null);
  const [featuredPrompts, setFeaturedPrompts] = useState<EssayPrompt[]>([]);
  const [recentEssays, setRecentEssays] = useState<EssayItem[]>([]);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [generatingRandom, setGeneratingRandom] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [draftRes, statsRes, promptsRes, essaysRes] = await Promise.all([
        essayService.getActiveDraft().catch(() => null),
        essayService.getUserStats().catch(() => null),
        essayService.listPrompts({ status: 'PUBLISHED' }).catch(() => []),
        essayService.listUserEssays().catch(() => []),
      ]);

      setActiveDraft(draftRes);
      setStats(statsRes);
      setFeaturedPrompts(promptsRes.slice(0, 3));
      setRecentEssays(essaysRes.slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!activeDraft) return;
    setDiscarding(true);
    try {
      await essayService.discardDraft(activeDraft.id);
      setActiveDraft(null);
      setDiscardModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao descartar rascunho.');
    } finally {
      setDiscarding(false);
    }
  };

  const handleRandomTheme = async () => {
    setGeneratingRandom(true);
    try {
      const prompt = await essayService.getRandomPrompt();
      if (prompt && prompt.id) {
        navigate(`/redacao/temas/${prompt.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Não foi possível sortear um tema.');
    } finally {
      setGeneratingRandom(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Carregando central de redação..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-brand-500/10 text-brand-500">
              <PenTool className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-text-primary">Treino de Redação Discursiva</h1>
          </div>
          <p className="text-text-secondary text-sm">
            Prática dissertativa estruturada para PRF, PF e concursos federais, com temas oficiais e correção por critérios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/redacao/temas')}
            leftIcon={<BookOpen className="w-4 h-4" />}
          >
            Explorar Temas
          </Button>
          <Button
            variant="primary"
            onClick={handleRandomTheme}
            disabled={generatingRandom}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            {generatingRandom ? 'Sorteando...' : 'Tema Aleatório'}
          </Button>
        </div>
      </div>

      {/* Banner de Rascunho Ativo */}
      {activeDraft && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700">
                    Rascunho em Andamento
                  </span>
                  <span className="text-xs text-text-muted">
                    Salvo em {new Date(activeDraft.lastSavedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-text-primary mt-1">
                  {activeDraft.title || activeDraft.promptTitle || 'Redação sem título'}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {activeDraft.wordCount} palavras • {activeDraft.lineCount} linhas estimadas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiscardModalOpen(true)}
                className="text-red-500 hover:text-red-600 border-red-500/20 hover:bg-red-500/10"
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Descartar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/redacao/${activeDraft.id}/escrever`)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continuar Redação
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs Estatísticos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Escritas"
          value={stats?.totalEssays ?? 0}
          icon={<FileText className="w-4 h-4" />}
          colorKey="blue"
        />
        <StatCard
          label="Corrigidas"
          value={stats?.correctedCount ?? 0}
          icon={<CheckCircle2 className="w-4 h-4" />}
          colorKey="green"
        />
        <StatCard
          label="Média Geral"
          value={stats?.averageScore ? `${stats.averageScore}` : '—'}
          icon={<TrendingUp className="w-4 h-4" />}
          colorKey="purple"
        />
        <StatCard
          label="Melhor Nota"
          value={stats?.bestScore ? `${stats.bestScore}` : '—'}
          icon={<Award className="w-4 h-4" />}
          colorKey="amber"
        />
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          hoverable
          onClick={() => navigate('/redacao/temas')}
          className="p-5 cursor-pointer border border-border-subtle group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-text-primary">Banco de Temas</h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Propostas completas com textos motivadores organizadas por edital.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors" />
          </div>
        </Card>

        <Card
          hoverable
          onClick={() => navigate('/redacao/historico')}
          className="p-5 cursor-pointer border border-border-subtle group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
              <History className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-text-primary">Meu Histórico</h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Consulte suas redações enviadas, versões e pareceres dos professores.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors" />
          </div>
        </Card>

        <Card
          hoverable
          onClick={() => navigate('/redacao/desempenho')}
          className="p-5 cursor-pointer border border-border-subtle group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-text-primary">Evolução & Diagnóstico</h4>
              <p className="text-xs text-text-secondary mt-0.5">
                Gráficos de progresso, notas por competência e orientações táticas.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors" />
          </div>
        </Card>
      </div>

      {/* Temas em Destaque */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Temas Recomendados para Prática</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/redacao/temas')}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Ver todos ({featuredPrompts.length > 0 ? 'Disponíveis' : '0'})
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredPrompts.map((prompt) => (
            <Card
              key={prompt.id}
              className="p-5 flex flex-col justify-between hover:border-brand-500/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant="brand" size="sm">
                    {prompt.category || 'Segurança Pública'}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{prompt.estimatedMinutes} min</span>
                  </div>
                </div>

                <h3 className="font-semibold text-text-primary line-clamp-2 text-sm leading-snug">
                  {prompt.title}
                </h3>

                <p className="text-xs text-text-secondary line-clamp-3 mt-2">
                  {prompt.statement}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-border-subtle flex items-center justify-between">
                <span className="text-xs text-text-muted font-mono">
                  {prompt.minLines}-{prompt.maxLines} linhas
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/redacao/temas/${prompt.id}`)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Ver Proposta
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Histórico Recente */}
      {recentEssays.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Suas Últimas Redações</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/redacao/historico')}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Histórico Completo
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="divide-y divide-border-subtle">
              {recentEssays.map((essay) => {
                const isCorrected = essay.status === 'CORRECTED';
                const isDraft = essay.status === 'DRAFT';
                return (
                  <div
                    key={essay.id}
                    onClick={() => {
                      if (isDraft) navigate(`/redacao/${essay.id}/escrever`);
                      else navigate(`/redacao/${essay.id}`);
                    }}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-bg-elevated cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-bg-surface border border-border-subtle text-text-muted shrink-0">
                        <PenTool className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-text-primary text-sm truncate">
                          {essay.title || essay.promptTitle || 'Redação Sem Título'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                          <span>{new Date(essay.updatedAt).toLocaleDateString('pt-BR')}</span>
                          <span>•</span>
                          <span>{essay.wordCount} palavras</span>
                          {essay.promptCategory && (
                            <>
                              <span>•</span>
                              <span>{essay.promptCategory}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isCorrected && (
                        <div className="text-right">
                          <span className="text-sm font-bold text-emerald-500">
                            {essay.totalScore}/{essay.maxScore || 100}
                          </span>
                          <span className="block text-[11px] text-text-muted">
                            {essay.percentage}%
                          </span>
                        </div>
                      )}

                      <Badge
                        variant={
                          isCorrected
                            ? 'success'
                            : isDraft
                            ? 'warning'
                            : 'brand'
                        }
                        size="sm"
                      >
                        {isCorrected ? 'Corrigida' : isDraft ? 'Rascunho' : 'Em Correção'}
                      </Badge>

                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Modal Descartar Rascunho */}
      <Modal
        isOpen={discardModalOpen}
        onClose={() => setDiscardModalOpen(false)}
        title="Descartar Rascunho?"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Você tem certeza de que deseja descartar este rascunho? Todo o conteúdo digitado será permanentemente excluído.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setDiscardModalOpen(false)}
              disabled={discarding}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDiscardDraft}
              disabled={discarding}
            >
              {discarding ? 'Descartando...' : 'Sim, Descartar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
