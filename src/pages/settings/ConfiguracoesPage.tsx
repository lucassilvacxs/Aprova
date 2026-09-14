import React from 'react';
import { Settings, Moon, Sun, Bell, Shield, Lock } from 'lucide-react';
import { Card, SectionHeader } from '@/components/ui';
import { useThemeStore } from '@/store';

export const ConfiguracoesPage: React.FC = () => {
  const { isDark, toggleTheme } = useThemeStore();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-extrabold text-text-primary">Configurações</h1>

      {/* Appearance */}
      <Card>
        <SectionHeader title="Aparência" icon={<Settings className="w-4 h-4" />} className="mb-4" />
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center gap-3">
            {isDark ? <Moon className="w-4 h-4 text-text-secondary" /> : <Sun className="w-4 h-4 text-text-secondary" />}
            <div>
              <p className="text-sm font-medium text-text-primary">Tema</p>
              <p className="text-xs text-text-muted">{isDark ? 'Modo escuro ativado' : 'Modo claro ativado'}</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-11 h-6 rounded-full transition-all duration-300 ${isDark ? 'bg-brand-500' : 'bg-border'}`}
            aria-label="Alternar tema"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <SectionHeader title="Notificações" icon={<Bell className="w-4 h-4" />} className="mb-4" />
        {[
          { label: 'Notícias dos concursos', desc: 'Atualizações sobre PRF e PF' },
          { label: 'Lembretes de estudo', desc: 'Sequência diária e metas' },
          { label: 'Resultados de simulados', desc: 'Correção e análise disponíveis' },
        ].map((n, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium text-text-primary">{n.label}</p>
              <p className="text-xs text-text-muted">{n.desc}</p>
            </div>
            <div className="w-10 h-5.5 bg-brand-500/20 border border-brand-500/30 rounded-full cursor-not-allowed opacity-50 text-[10px] text-brand-400 flex items-center px-1.5">
              Em breve
            </div>
          </div>
        ))}
      </Card>

      {/* Security */}
      <Card>
        <SectionHeader title="Segurança" icon={<Shield className="w-4 h-4" />} className="mb-4" />
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-text-secondary" />
            <div>
              <p className="text-sm font-medium text-text-primary">Alterar senha</p>
              <p className="text-xs text-text-muted">Disponível na Fase 3</p>
            </div>
          </div>
          <button disabled className="text-xs text-brand-400 opacity-40 cursor-not-allowed">Alterar</button>
        </div>
      </Card>
    </div>
  );
};
