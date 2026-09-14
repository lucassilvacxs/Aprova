import React from 'react';
import { Avatar } from '@/components/ui';
import { Card, SectionHeader } from '@/components/ui';
import { MOCK_USER, MOCK_USER_CONTESTS } from '@/data/mockData';
import { GraduationCap, Mail, Calendar } from 'lucide-react';

export const ProfilePage: React.FC = () => (
  <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
    <h1 className="text-2xl font-extrabold text-text-primary">Meu Perfil</h1>

    {/* Avatar card */}
    <Card>
      <div className="flex items-center gap-5">
        <Avatar
          initials={MOCK_USER.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          size="xl"
        />
        <div>
          <h2 className="text-xl font-bold text-text-primary">{MOCK_USER.name}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
            <Mail className="w-3.5 h-3.5" />
            {MOCK_USER.email}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
            <Calendar className="w-3.5 h-3.5" />
            Membro desde janeiro de 2026
          </div>
        </div>
      </div>
    </Card>

    {/* Contests */}
    <Card>
      <SectionHeader title="Concursos Vinculados" icon={<GraduationCap className="w-5 h-5" />} className="mb-4" />
      <div className="space-y-2">
        {MOCK_USER_CONTESTS.map((c) => (
          <div key={c.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-bg-elevated border border-border">
            <span className="text-xs font-bold text-brand-300 w-10 shrink-0">{c.acronym}</span>
            <span className="text-sm text-text-secondary">{c.agencyName}</span>
            <span className="ml-auto text-xs text-text-muted">{c.userProgress}% concluído</span>
          </div>
        ))}
      </div>
    </Card>
  </div>
);
