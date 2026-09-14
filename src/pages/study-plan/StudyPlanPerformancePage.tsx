import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import {
  StudyPlanFrontendService,
  StudyPlanDetail,
  StudyPlanStats,
} from '@/services/study-plan.service';

export const StudyPlanPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<StudyPlanDetail | null>(null);
  const [stats, setStats] = useState<StudyPlanStats | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const plan = await StudyPlanFrontendService.getActivePlan();
        setActivePlan(plan);

        if (plan) {
          const statsData = await StudyPlanFrontendService.getPlanStats(plan.id);
          setStats(statsData);
        }
      } catch (err) {
        console.error('Erro ao carregar estatísticas do plano:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-bg-surface rounded-xl w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-bg-surface rounded-2xl"></div>
          <div className="h-28 bg-bg-surface rounded-2xl"></div>
          <div className="h-28 bg-bg-surface rounded-2xl"></div>
          <div className="h-28 bg-bg-surface rounded-2xl"></div>
        </div>
        <div className="h-64 bg-bg-surface rounded-3xl"></div>
      </div>
    );
  }

  if (!activePlan || !stats) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-text-primary">Nenhum plano ativo encontrado</h2>
        <p className="text-sm text-text-muted">
          Ative um plano de estudos para acompanhar métricas de aderência e consistência.
        </p>
        <button
          onClick={() => navigate('/plano-estudos/novo')}
          className="px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm shadow-md shadow-brand-500/20"
        >
          Criar Meu Plano
        </button>
      </div>
    );
  }

  const adherenceColor =
    stats.adherenceRate >= 85
      ? 'text-emerald-400'
      : stats.adherenceRate >= 65
      ? 'text-amber-400'
      : 'text-rose-400';

  return (
    <div className="space-y-8 pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              Aderência & Desempenho do Plano
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {activePlan.name}
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Diagnóstico de consistência, cumprimento de horas e equilíbrio entre disciplinas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/plano-estudos/calendario')}
            className="px-4 py-2 rounded-xl bg-bg-surface border border-border hover:bg-bg-subtle text-text-primary text-xs font-bold transition-all"
          >
            Ver Calendário
          </button>
          <button
            onClick={() => navigate('/plano-estudos/hoje')}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
          >
            Agenda de Hoje
          </button>
        </div>
      </div>

      {/* KPIs Centrais de Aderência */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa Geral */}
        <div className="bg-bg-surface border border-border rounded-3xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-text-muted tracking-wider">
              Aderência Geral
            </span>
            <CheckCircle2 className={`w-5 h-5 ${adherenceColor}`} />
          </div>
          <div className={`text-3xl font-black ${adherenceColor}`}>
            {stats.adherenceRate.toFixed(1)}%
          </div>
          <p className="text-xs text-text-muted">
            {stats.totalCompletedSessions} de {stats.totalPlannedSessions} sessões executadas
          </p>
        </div>

        {/* Horas Cumpridas */}
        <div className="bg-bg-surface border border-border rounded-3xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-text-muted tracking-wider">
              Horas de Estudo
            </span>
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-text-primary">
            {stats.totalCompletedHours.toFixed(1)}h
          </div>
          <p className="text-xs text-text-muted">
            de {stats.totalPlannedHours.toFixed(1)}h programadas no período
          </p>
        </div>

        {/* Sequência Ativa */}
        <div className="bg-bg-surface border border-border rounded-3xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-text-muted tracking-wider">
              Sequência Ativa
            </span>
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">
            {stats.currentStreak} dias
          </div>
          <p className="text-xs text-text-muted">
            Recorde pessoal: {stats.maxStreak} dias seguidos
          </p>
        </div>

        {/* Sessões Remanejadas / Puladas */}
        <div className="bg-bg-surface border border-border rounded-3xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase text-text-muted tracking-wider">
              Desvios de Rotina
            </span>
            <RotateCcw className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-text-primary">
            {stats.rescheduledSessions + stats.skippedSessions}
          </div>
          <p className="text-xs text-text-muted">
            {stats.rescheduledSessions} reprogramadas • {stats.skippedSessions} puladas
          </p>
        </div>
      </div>

      {/* Diagnóstico Pedagógico & Recomendações */}
      {stats.recommendations && stats.recommendations.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-3xl p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-extrabold text-text-primary">
              Diagnóstico de Consistência & Recomendações
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {stats.recommendations.map((rec, idx) => {
              const isCrit = rec.type === 'CRITICAL';
              const isWarn = rec.type === 'WARNING';
              const isSucc = rec.type === 'SUCCESS';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                    isCrit
                      ? 'bg-rose-500/5 border-rose-500/25'
                      : isWarn
                      ? 'bg-amber-500/5 border-amber-500/25'
                      : isSucc
                      ? 'bg-emerald-500/5 border-emerald-500/25'
                      : 'bg-brand-500/5 border-brand-500/25'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isCrit ? (
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : isSucc ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Info className="w-5 h-5 text-brand-400" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-text-primary">{rec.title}</h4>
                    <p className="text-xs text-text-muted leading-relaxed">{rec.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CUMPRIMENTO POR DISCIPLINA */}
      <div className="bg-bg-surface border border-border rounded-3xl p-6 sm:p-7 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-extrabold text-text-primary flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-400" />
              <span>Cumprimento por Disciplina</span>
            </h3>
            <p className="text-xs text-text-muted">
              Equilíbrio da carga horária efetivamente executada em relação à meta planejada.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {stats.subjectsBreakdown.map((sub) => {
            const plannedHours = (sub.plannedMinutes / 60).toFixed(1);
            const completedHours = (sub.completedMinutes / 60).toFixed(1);
            const pct = Math.min(100, Math.round(sub.completionRate));

            return (
              <div
                key={sub.subjectId}
                className="p-4 rounded-2xl bg-bg-subtle border border-border space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-text-primary">{sub.name}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-text-muted font-medium">
                      <strong>{completedHours}h</strong> de {plannedHours}h planejadas
                    </span>

                    <span
                      className={`font-black px-2 py-0.5 rounded-md text-xs ${
                        pct >= 80
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : pct >= 50
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full h-2 rounded-full bg-bg-surface border border-border overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
