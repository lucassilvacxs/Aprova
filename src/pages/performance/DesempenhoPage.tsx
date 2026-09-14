import React from 'react';
import { TrendingUp, Target, Clock, BookOpen } from 'lucide-react';
import { Card, SectionHeader, ProgressBar, StatCard } from '@/components/ui';
import { MOCK_DASHBOARD_METRICS, MOCK_SUBJECT_PERFORMANCE, MOCK_EVOLUTION_CHART } from '@/data/mockData';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const radarData = MOCK_SUBJECT_PERFORMANCE.map((s) => ({
  subject: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
  acerto: s.accuracy,
  meta: 80,
}));

export const DesempenhoPage: React.FC = () => {
  const m = MOCK_DASHBOARD_METRICS;
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary">Meu Desempenho</h1>
        <p className="text-sm text-text-secondary mt-1">Análise completa da sua evolução</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Taxa de Acerto" value={`${m.overallAccuracyRate}%`} colorKey="green" icon={<Target className="w-4 h-4" />} />
        <StatCard label="Horas Estudadas" value={`${m.totalStudyHours}h`} colorKey="blue" icon={<Clock className="w-4 h-4" />} />
        <StatCard label="Questões" value={m.totalQuestionsAnswered.toLocaleString('pt-BR')} colorKey="orange" icon={<BookOpen className="w-4 h-4" />} />
        <StatCard label="Sequência" value={`${m.currentStreakDays} dias`} colorKey="purple" icon={<TrendingUp className="w-4 h-4" />} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Line chart: Evolution */}
        <Card>
          <SectionHeader title="Evolução do Acerto" subtitle="30 últimos dias" className="mb-5" />
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={MOCK_EVOLUTION_CHART} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: '#5C6585', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[50, 100]} tick={{ fill: '#5C6585', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1F2235', border: '1px solid #252843', borderRadius: 10, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9BA3C2' }} />
              <Line type="monotone" dataKey="accuracy" stroke="#7C5CFA" strokeWidth={2.5} dot={false} name="% Acerto" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Radar: by subject */}
        <Card>
          <SectionHeader title="Radar por Disciplina" subtitle="Vs. meta de 80%" className="mb-5" />
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#5C6585', fontSize: 10 }} />
              <Radar name="Seu acerto" dataKey="acerto" stroke="#7C5CFA" fill="#7C5CFA" fillOpacity={0.2} />
              <Radar name="Meta" dataKey="meta" stroke="#22C55E" fill="#22C55E" fillOpacity={0.05} />
              <Tooltip contentStyle={{ background: '#1F2235', border: '1px solid #252843', borderRadius: 10, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9BA3C2' }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Subject table */}
      <Card noPadding>
        <div className="p-5 border-b border-border">
          <SectionHeader title="Desempenho por Disciplina" />
        </div>
        <div className="divide-y divide-border">
          {MOCK_SUBJECT_PERFORMANCE.sort((a,b) => b.accuracy - a.accuracy).map((s) => (
            <div key={s.subjectId} className="px-5 py-3.5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary mb-1.5">{s.name}</p>
                <ProgressBar value={s.accuracy} colorKey={s.accuracy >= 80 ? 'green' : s.accuracy >= 70 ? 'orange' : 'rose'} size="xs" />
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums"
                  style={{ color: s.accuracy >= 80 ? '#4ADE80' : s.accuracy >= 70 ? '#FCD34D' : '#F87171' }}>
                  {s.accuracy}%
                </p>
                <p className="text-[10px] text-text-muted">{s.total} questões</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
