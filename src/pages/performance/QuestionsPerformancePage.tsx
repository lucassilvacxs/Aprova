import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Award,
  XCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Target,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  StatCard,
  LoadingState,
} from '@/components/ui';
import {
  questionService,
  QuestionStats,
  RecommendedQuestion,
} from '@/services/question.service';

export const QuestionsPerformancePage: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      questionService.getStats().catch(() => null),
      questionService.getRecommendations(undefined, 4).catch(() => []),
    ]).then(([sData, rData]) => {
      if (sData) setStats(sData);
      if (rData) setRecommendations(rData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="py-20">
        <LoadingState message="Calculando métricas e recomendações de desempenho..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/questoes')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Voltar para Questões
            </Button>
            <h1 className="text-xl font-extrabold text-text-primary tracking-tight">
              Desempenho em Resolução de Questões
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Análise em tempo real de taxas de acerto, tempo gasto e pontos de atenção por disciplina.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/questoes')}
          leftIcon={<Target className="w-4 h-4" />}
        >
          Praticar Mais Questões
        </Button>
      </div>

      {/* Cartões Principais */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Taxa de Acerto Geral"
            value={`${stats.overall.accuracy}%`}
            colorKey="green"
            icon={<TrendingUp className="w-5 h-5 text-brand-400" />}
          />
          <StatCard
            label="Total Respondidas"
            value={stats.overall.totalAnswered}
            colorKey="purple"
            icon={<Award className="w-5 h-5 text-purple-400" />}
          />
          <StatCard
            label="Tempo Médio por Questão"
            value={`${stats.overall.avgDurationSec}s`}
            colorKey="amber"
            icon={<Clock className="w-5 h-5 text-warning-400" />}
          />
          <StatCard
            label="Caderno de Erros"
            value={stats.overall.totalWrong}
            colorKey="rose"
            icon={<XCircle className="w-5 h-5 text-danger-400" />}
          />
        </div>
      )}

      {/* Grid: Desempenho por Disciplina & Recomendações Algorítmicas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 e 2: Quebra por Disciplina */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-text-primary">
                  Rendimento por Disciplina
                </h3>
              </div>
              <span className="text-xs text-text-muted">
                {stats?.bySubject.length || 0} disciplinas praticadas
              </span>
            </div>

            {stats && stats.bySubject.length > 0 ? (
              <div className="space-y-4">
                {stats.bySubject.map((sub) => {
                  const isLow = sub.accuracy < 60;
                  const isHigh = sub.accuracy >= 80;

                  return (
                    <div key={sub.subjectId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-text-primary">
                          {sub.subjectName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted">
                            {sub.correct}/{sub.answered} acertos
                          </span>
                          <span
                            className={`font-bold ${
                              isHigh
                                ? 'text-success-400'
                                : isLow
                                ? 'text-danger-400'
                                : 'text-warning-400'
                            }`}
                          >
                            {sub.accuracy}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-bg-surface h-2 rounded-full overflow-hidden border border-border/50">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isHigh
                              ? 'bg-success-500'
                              : isLow
                              ? 'bg-danger-500'
                              : 'bg-warning-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, sub.accuracy))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-text-muted">
                Nenhuma resposta registrada ainda para gerar o relatório por disciplina.
              </div>
            )}
          </Card>

          {/* Quebra por Banca & Dificuldade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Desempenho por Banca
              </h4>
              {stats && stats.byBoard.length > 0 ? (
                <div className="space-y-2">
                  {stats.byBoard.map((b) => (
                    <div
                      key={b.boardId}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-bg-surface border border-border/50"
                    >
                      <span className="font-medium text-text-primary">{b.boardAcronym}</span>
                      <span className="font-mono text-brand-400 font-bold">{b.accuracy}% ({b.answered} q)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted">Sem dados de bancas.</p>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Desempenho por Dificuldade
              </h4>
              {stats && stats.byDifficulty.length > 0 ? (
                <div className="space-y-2">
                  {stats.byDifficulty.map((d) => (
                    <div
                      key={d.difficulty}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-bg-surface border border-border/50"
                    >
                      <span className="capitalize text-text-primary">
                        {d.difficulty === 'easy'
                          ? 'Fácil'
                          : d.difficulty === 'medium'
                          ? 'Média'
                          : d.difficulty === 'hard'
                          ? 'Difícil'
                          : 'Muito Difícil'}
                      </span>
                      <span className="font-mono text-brand-400 font-bold">{d.accuracy}% ({d.answered} q)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted">Sem dados de dificuldade.</p>
              )}
            </Card>
          </div>
        </div>

        {/* Coluna 3: Recomendações Algorítmicas de Estudo */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4 border-brand-500/20 bg-gradient-to-b from-bg-surface to-brand-950/10">
            <div className="flex items-center gap-2 text-brand-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-sm font-bold text-text-primary">
                Questões Recomendadas
              </h3>
            </div>
            <p className="text-xs text-text-secondary">
              Seleção algorítmica orientada a cobrir suas maiores fraquezas e tópicos marcados para revisão.
            </p>

            {recommendations.length > 0 ? (
              <div className="space-y-3 pt-1">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => navigate(`/questoes/${rec.id}`)}
                    className="p-3 bg-bg-elevated border border-border/60 hover:border-brand-500/40 rounded-xl space-y-2 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      {rec.subjectName && (
                        <Badge variant="brand" size="sm">
                          {rec.subjectName}
                        </Badge>
                      )}
                      <span className="text-text-muted text-[10px]">
                        {rec.boardAcronym} • {rec.year}
                      </span>
                    </div>

                    <p className="text-xs text-text-primary line-clamp-2 leading-relaxed">
                      {rec.statement}
                    </p>

                    <div className="pt-1 text-[11px] text-amber-400/90 font-medium">
                      💡 {rec.recommendationReason}
                    </div>

                    <div className="flex items-center justify-end text-xs text-brand-400 font-semibold group-hover:translate-x-0.5 transition-transform pt-1">
                      <span>Resolver agora</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-text-muted">
                Nenhuma recomendação pendente no momento.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
