import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Clock3,
  ArrowLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { simulationService, SimulationStatsData } from '@/services/simulation.service';

export const SimulationsHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<SimulationStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([simulationService.getHistory(), simulationService.getStats()])
      .then(([historyData, statsData]) => {
        setHistory(historyData);
        setStats(statsData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    return `${m} min`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/simulados')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Simulados</span>
        </button>
      </div>

      <div className="bg-bg-surface border border-border p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-400 text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Acompanhamento Contínuo</span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary">
            Histórico & Evolução em Simulados
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Analise seu histórico completo de tentativas, pontuações e evolução temporal.
          </p>
        </div>

        <button
          onClick={() => navigate('/simulados/novo')}
          className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md transition-all shrink-0"
        >
          Fazer Novo Simulado
        </button>
      </div>

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-bg-surface p-4 rounded-2xl border border-border">
          <div className="text-xs text-text-muted">Provas Realizadas</div>
          <div className="text-2xl font-black text-text-primary mt-1">
            {stats?.totalCompleted || 0}
          </div>
        </div>

        <div className="bg-bg-surface p-4 rounded-2xl border border-border">
          <div className="text-xs text-text-muted">Média Geral</div>
          <div className="text-2xl font-black text-brand-400 mt-1">
            {stats?.averagePercentage ? `${stats.averagePercentage}%` : '0%'}
          </div>
        </div>

        <div className="bg-bg-surface p-4 rounded-2xl border border-border">
          <div className="text-xs text-text-muted">Melhor Aproveitamento</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {stats?.bestPercentage ? `${stats.bestPercentage}%` : '0%'}
          </div>
        </div>

        <div className="bg-bg-surface p-4 rounded-2xl border border-border">
          <div className="text-xs text-text-muted">Questões Resolvidas</div>
          <div className="text-2xl font-black text-text-primary mt-1">
            {stats?.totalQuestionsAnswered || 0}
          </div>
        </div>
      </div>

      {/* Gráfico Visual de Evolução */}
      {stats && stats.evolution && stats.evolution.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-extrabold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-400" />
            <span>Curva de Evolução Temporal</span>
          </h3>

          <div className="h-48 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-border">
            {stats.evolution.map((point) => {
              const heightPct = Math.max(8, Math.min(100, point.percentage));
              return (
                <div
                  key={point.index}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative cursor-pointer"
                  onClick={() => navigate(`/simulados/tentativas/${point.attemptId}/resultado`)}
                >
                  {/* Tooltip com hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-bg-elevated border border-border px-2.5 py-1 rounded-lg text-[11px] font-bold text-text-primary shadow-md whitespace-nowrap pointer-events-none z-10">
                    {point.simulationTitle}: {point.percentage}% ({point.date})
                  </div>

                  <span className="text-[10px] font-bold text-text-secondary group-hover:text-brand-400">
                    {point.percentage}%
                  </span>

                  <div
                    className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 group-hover:from-brand-500 group-hover:to-brand-300 transition-all"
                    style={{ height: `${heightPct}%` }}
                  />

                  <span className="text-[10px] text-text-muted truncate max-w-[60px]">
                    #{point.index}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Histórico */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-sm text-text-primary uppercase tracking-wider">
          Todas as Tentativas
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-bg-surface rounded-2xl border border-border animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="bg-bg-surface border border-border rounded-2xl p-10 text-center space-y-2">
            <Clock3 className="w-8 h-8 text-text-muted mx-auto" />
            <p className="text-text-secondary text-xs font-semibold">Nenhum simulado realizado ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((att) => {
              const pct = Number(att.percentage) || 0;
              const isCompleted = att.status === 'COMPLETED' || att.status === 'EXPIRED';

              return (
                <div
                  key={att.attemptId}
                  onClick={() => {
                    if (isCompleted) {
                      navigate(`/simulados/tentativas/${att.attemptId}/resultado`);
                    } else {
                      navigate(`/simulados/${att.simulationId}/prova`);
                    }
                  }}
                  className="bg-bg-surface border border-border hover:border-border-focus rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-sm group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-brand-500/10 text-brand-400">
                        {att.agencyAcronym || 'CONCURSO'}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        {new Date(att.startedAt).toLocaleDateString('pt-BR')} • {new Date(att.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-text-primary group-hover:text-brand-400 transition-colors">
                      {att.simulationTitle}
                    </h4>

                    <div className="text-xs text-text-muted flex items-center gap-3 pt-0.5">
                      <span>Tempo: {formatDuration(att.totalDurationSeconds || 0)}</span>
                      {isCompleted && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">{att.correctCount} acertos</span>
                          <span>•</span>
                          <span className="text-rose-400 font-semibold">{att.wrongCount} erros</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className={`text-xl font-black ${
                        pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {pct.toFixed(1)}%
                      </div>
                      <div className="text-[11px] text-text-muted">
                        {att.totalScore} pts
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
