import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  HelpCircle,
  Clock3,
  CalendarDays,
  PenTool,
  Newspaper,
  FileText,
  TrendingUp,
  Settings,
  Shield,
  X,
  Users,
  MailPlus,
  BookMarked,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { useSidebarStore, useAuthStore } from '@/store';

interface NavItem {
  label: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Estudos',
    items: [
      { label: 'Dashboard',       href: '/dashboard',    icon: LayoutDashboard },
      { label: 'Meus Concursos',  href: '/concursos',    icon: GraduationCap },
      { label: 'Disciplinas',     href: '/disciplinas',  icon: BookOpen },
      { label: 'Banco de Questões',href: '/questoes',    icon: HelpCircle },
      { label: 'Simulados',       href: '/simulados',    icon: Clock3 },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { label: 'Plano de Estudos', href: '/plano-estudos', icon: CalendarDays },
      { label: 'Treino de Redação',href: '/redacao',       icon: PenTool },
      { label: 'Desempenho',       href: '/desempenho',    icon: TrendingUp },
    ],
  },
  {
    label: 'Informações',
    items: [
      { label: 'Notícias',  href: '/noticias', icon: Newspaper },
      { label: 'Editais',   href: '/editais',  icon: FileText },
    ],
  },
  {
    label: 'Conta',
    items: [
      { label: 'Configurações', href: '/configuracoes', icon: Settings },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Painel Admin',   href: '/admin',           icon: Shield,    adminOnly: true },
      { label: 'Usuários',       href: '/admin/usuarios',  icon: Users,     adminOnly: true },
      { label: 'Convites',       href: '/admin/convites',  icon: MailPlus,  adminOnly: true },
      { label: 'Concursos',      href: '/admin/concursos', icon: BookMarked,adminOnly: true },
      { label: 'Cursos e Aulas', href: '/admin/cursos',    icon: GraduationCap, adminOnly: true },
      { label: 'Banco de Questões', href: '/admin/questoes', icon: HelpCircle, adminOnly: true },
      { label: 'Simulados',       href: '/admin/simulados', icon: Clock3,    adminOnly: true },
      { label: 'Redações (Fila)', href: '/admin/redacoes',  icon: PenTool,   adminOnly: true },
      { label: 'Notícias',        href: '/admin/noticias',  icon: Newspaper, adminOnly: true },
      { label: 'Fontes Oficiais', href: '/admin/noticias/fontes', icon: Globe, adminOnly: true },
      { label: 'Editais',         href: '/admin/editais',   icon: FileText,  adminOnly: true },
    ],
  },
];

const SidebarNavItem: React.FC<{ item: NavItem; onClick?: () => void }> = ({ item, onClick }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
          isActive
            ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-text-muted group-hover:text-text-secondary')} />
          <span className="truncate">{item.label}</span>
          {isActive && <ChevronRight className="w-3 h-3 ml-auto shrink-0" />}
        </>
      )}
    </NavLink>
  );
};

const SidebarContent: React.FC<{ onItemClick?: () => void }> = ({ onItemClick }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0 shadow-brand">
            <span className="text-white font-extrabold text-base leading-none">A</span>
          </div>
          <div>
            <span className="font-extrabold text-text-primary text-lg leading-none tracking-tight">APROVA</span>
            <div className="text-[10px] font-semibold text-brand-400 uppercase tracking-widest mt-0.5">Privado</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scroll-x-hidden">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((i) => !i.adminOnly || isAdmin);
          if (!visibleItems.length) return null;
          return (
            <div key={group.label}>
              {group.label !== 'Estudos' && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-disabled">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <SidebarNavItem key={item.href} item={item} onClick={onItemClick} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Private access footer */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-brand-500/8 border border-brand-500/20">
          <Shield className="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-brand-300">Acesso Privado</p>
            <p className="text-[10px] text-text-muted">Restrito a convidados</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Desktop Sidebar ────────────────────────────────────────────────────────────
export const Sidebar: React.FC = () => (
  <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-bg-surface border-r border-border overflow-hidden">
    <SidebarContent />
  </aside>
);

// ── Mobile Sidebar (overlay) ───────────────────────────────────────────────────
export const MobileSidebar: React.FC = () => {
  const { isMobileOpen, closeMobile } = useSidebarStore();
  const location = useLocation();

  // Close on route change
  React.useEffect(() => { closeMobile(); }, [location.pathname, closeMobile]);

  if (!isMobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeMobile} aria-hidden />
      {/* Panel */}
      <aside className="relative w-72 h-full bg-bg-surface border-r border-border flex flex-col animate-slide-in">
        <button
          onClick={closeMobile}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-all z-10"
          aria-label="Fechar menu"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onItemClick={closeMobile} />
      </aside>
    </div>
  );
};
