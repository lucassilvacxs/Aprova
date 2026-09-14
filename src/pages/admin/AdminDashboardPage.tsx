import React from 'react';
import { Shield, Users, MailPlus, BookMarked, Activity } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { Link } from 'react-router-dom';

const ADMIN_LINKS = [
  { href: '/admin/usuarios',  icon: Users,    label: 'Usuários',        desc: 'Gerenciar contas e permissões',  count: '2 ativos' },
  { href: '/admin/convites',  icon: MailPlus, label: 'Convites',        desc: 'Criar e gerenciar convites',     count: '0 pendentes' },
  { href: '/admin/concursos', icon: BookMarked,label: 'Concursos',      desc: 'CRUD de concursos e órgãos',    count: '2 ativos' },
];

export const AdminDashboardPage: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-danger-light border border-danger/25 flex items-center justify-center">
        <Shield className="w-5 h-5 text-danger-text" />
      </div>
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary">Painel Administrativo</h1>
        <p className="text-sm text-text-secondary mt-0.5">Acesso restrito — apenas administradores</p>
      </div>
    </div>

    {/* Warning */}
    <div className="p-4 bg-warning-light border border-warning/25 rounded-xl flex items-start gap-3">
      <Activity className="w-4 h-4 text-warning-text shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-warning-text">Fase 2 — Interface demonstrativa</p>
        <p className="text-xs text-warning-text/80 mt-0.5">
          A autenticação e autorização reais serão implementadas na Fase 3. Este painel é apenas visual.
        </p>
      </div>
    </div>

    {/* Summary */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[
        { label: 'Usuários cadastrados', value: '2', color: 'text-kpi-blue-text' },
        { label: 'Convites pendentes',   value: '0', color: 'text-kpi-orange-text' },
        { label: 'Concursos ativos',     value: '2', color: 'text-kpi-green-text' },
      ].map((s) => (
        <Card key={s.label} className="text-center">
          <p className={`text-3xl font-extrabold tabular-nums ${s.color}`}>{s.value}</p>
          <p className="text-xs text-text-muted mt-1">{s.label}</p>
        </Card>
      ))}
    </div>

    {/* Quick access */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {ADMIN_LINKS.map(({ href, icon: Icon, label, desc, count }) => (
        <Link key={href} to={href}>
          <Card hoverable noPadding>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/12 border border-brand-500/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-brand-400" />
                </div>
                <Badge variant="neutral" size="xs">{count}</Badge>
              </div>
              <h3 className="text-sm font-bold text-text-primary">{label}</h3>
              <p className="text-xs text-text-muted mt-1">{desc}</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  </div>
);
