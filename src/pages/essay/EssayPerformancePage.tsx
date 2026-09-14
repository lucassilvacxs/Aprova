import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Award,
  PenTool,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  Target,
  BarChart3,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  ProgressBar,
  StatCard,
  LoadingState,
} from '@/components/ui';
import {
  essayService,
  EssayUserStats,
  EssayRecommendation,
} from '@/services/essay.service';

export const EssayPerformancePage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EssayUserStats | null>(null);
  const [rec, setRec] = useState<EssayRecommendation | null>(null);

  useEffect(() => {
    loadPerformance();
  }, []);

  const loadPerformance = async () => {
    setLoading(true);
    try {
      const [statsRes, recRes] = await Promise.all([
        essayService.getUserStats(),
        essayService.getRecommendations(),
      ]);
      setStats(statsRes);
      setRec(recRes);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Compilando diagnóstico de evolução..." />
      </div>
    );
  }

  const hasEvaluations = (stats?.correctedCount || 0) > 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-text-primary">Evolução & Análise de Desempenho</h1>
          </div>
          <p className="text-text-secondary text-sm">
            Diagnóstico pedagógico detalhado de competências dissertativas, histórico de notas e recomendações táticas.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/redacao/temas')}
          leftIcon={<PenTool className="w-4 h-4" />}
        >
          Escrever Nova Redação
        </Button>
      </div>

      {/* KPIs Estatísticos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Redações Corrigidas"
          value={stats?.correctedCount ?? 0}
          icon={<CheckCircle2 className="w-4 h-4" />}
          colorKey="green"
        />
        <StatCard
          label="Média Geral"
          value={hasEvaluations ? `${stats?.averageScore}` : '—'}
          icon={<TrendingUp className="w-4 h-4" />}
          colorKey="purple"
        />
        <StatCard
          label="Melhor Nota"
          value={hasEvaluations ? `${stats?.bestScore}` : '—'}
          icon={<Award className="w-4 h-4" />}
          colorKey="amber"
        />
        <StatCard
          label="Média de Palavras"
          value={stats?.averageWordCount ? `${stats.averageWordCount}` : '—'}
          icon={<PenTool className="w-4 h-4" />}
          colorKey="blue"
        />
      </div>

      {/* Se ainda não possui correções */}
      {!hasEvaluations && (
        <Card className="p-8 text-center space-y-4 border-dashed border-border-subtle">
          <div className="w-12 h-12 rounded-full bg-brand-500/10 text-brand-500 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-semibold text-text-primary text-base">Seu gráfico de evolução aparecerá aqui</h3>
            <p className="text-xs text-text-secondary">
              Escreva sua primeira redação e envie para correção. O sistema compilará seus gráficos cronológicos e análise por competência automaticamente.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/redacao/temas')}>
            Escolher Tema para Escrever
          </Button>
        </Card>
      )}

      {/* Gráfico Visual de Evolução Cronológica (quando houver correções) */}
      {hasEvaluations && stats && stats.evolutionSeries.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-500" />
                <span>Histórico Cronológico de Notas</span>
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Pontuações obtidas nas redações avaliadas sucessivamente
              </p>
            </div>
            <span className="text-xs text-text-muted">
              {stats.evolutionSeries.length} prova(s) avaliada(s)
            </span>
          </div>

          <div className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {stats.evolutionSeries.map((point, index) => {
                const pct = point.percentage;
                return (
                  <div
                    key={point.essayId}
                    onClick={() => navigate(`/redacao/${point.essayId}`)}
                    className="p-4 rounded-xl bg-bg-elevated border border-border-subtle hover:border-brand-500/50 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-text-muted">
                        Treino #{index + 1}
                      </span>
                      <span className="text-[11px] text-text-muted flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {point.date}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-text-primary group-hover:text-brand-500 transition-colors">
                        {point.totalScore}
                      </span>
                      <span className="text-xs font-semibold text-text-muted">
                        / {point.maxScore} ({pct}%)
                      </span>
                    </div>

                    <ProgressBar
                      value={pct}
                      colorKey={pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'danger'}
                      size="sm"
                    />

                    <p className="text-xs text-text-secondary truncate pt-1">
                      {point.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Desempenho por Competência / Critério */}
      {hasEvaluations && stats && stats.criteriaPerformance.length > 0 && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              <span>Aproveitamento Médio por Competência</span>
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Identifique com precisão seus pontos fortes e onde você perde mais pontos
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {stats.criteriaPerformance.map((c) => {
              const pct = c.averagePercentage;
              return (
                <div key={c.criterionId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary">
                      {c.criterionName}
                    </span>
                    <span className="font-mono text-text-muted">
                      Média: <strong>{c.averageScore}</strong> / {c.averageMaxScore} ({pct}%)
                    </span>
                  </div>

                  <ProgressBar
                    value={pct}
                    colorKey={pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'danger'}
                    size="md"
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Diagnóstico Pedagógico e Plano de Ação */}
      {rec && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Diagnóstico */}
          <Card className="p-6 space-y-4 border-l-4 border-l-purple-500">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
              <Lightbulb className="w-4 h-4" />
              <span>Diagnóstico Pedagógico</span>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              {rec.diagnosticAdvice}
            </p>

            {rec.weakestCompetence && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  Principal Ponto de Atenção:
                </span>
                <p className="text-text-secondary">
                  <strong>{rec.weakestCompetence}</strong> com aproveitamento atual de{' '}
                  <strong>{rec.weakestPercentage}%</strong>.
                </p>
              </div>
            )}
          </Card>

          {/* Plano de Ação Recomendado */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4" />
              <span>Plano Tático de Ação</span>
            </div>

            <ul className="space-y-2.5 text-xs text-text-secondary">
              {rec.actionPlan.map((action, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  <span className="leading-relaxed">{action}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Temas Sugeridos pelo Diagnóstico */}
      {rec && rec.recommendedPrompts && rec.recommendedPrompts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span>Temas Estratégicos Sugeridos para o seu Momento</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rec.recommendedPrompts.map((p) => (
              <Card
                key={p.id}
                className="p-5 flex flex-col justify-between hover:border-brand-500/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="brand" size="sm">
                      {p.category}
                    </Badge>
                    <span className="text-xs text-text-muted">
                      {p.difficulty}
                    </span>
                  </div>

                  <h4 className="font-semibold text-text-primary text-sm line-clamp-2">
                    {p.title}
                  </h4>
                </div>

                <div className="mt-4 pt-3 border-t border-border-subtle flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/redacao/temas/${p.id}`)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Ver Proposta
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
