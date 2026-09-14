import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon, Menu, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { SearchInput } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { useSidebarStore, useThemeStore, useAuthStore } from '@/store';
import { MOCK_USER } from '@/data/mockData';

interface NotificationBubbleProps { count?: number }

const NotificationBubble: React.FC<NotificationBubbleProps> = ({ count = 3 }) => (
  <div className="relative">
    <button
      className="w-9 h-9 rounded-xl bg-bg-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-muted transition-all"
      aria-label="Notificações"
    >
      <Bell className="w-4 h-4" />
    </button>
    {count > 0 && (
      <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm leading-none min-w-[18px] px-1">
        {count}
      </span>
    )}
  </div>
);

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    role?: string;
    initials?: string;
  };
}

const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user.initials || user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = user.role === 'admin' ? 'Administrador' : 'Aluno';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-bg-elevated transition-all group"
        aria-label="Menu do usuário"
        aria-expanded={open}
      >
        <Avatar initials={initials} size="sm" />
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold text-text-primary group-hover:text-white leading-none">{user.name.split(' ')[0]}</p>
          <p className="text-[10px] text-text-muted leading-none mt-0.5">{roleLabel}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-bg-elevated border border-border-muted rounded-2xl shadow-xl py-1.5 z-50 animate-scale-in">
          <Link to="/perfil" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-overlay transition-all">
            <User className="w-4 h-4" />
            Meu Perfil
          </Link>
          <Link to="/configuracoes" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-overlay transition-all">
            <Settings className="w-4 h-4" />
            Configurações
          </Link>
          <hr className="my-1 border-border" />
          <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-danger-text hover:bg-danger-light transition-all" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
};

export const Header: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const { openMobile } = useSidebarStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();

  const currentUser = user || MOCK_USER;

  return (
    <header className="h-[68px] border-b border-border bg-bg-surface/90 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 lg:px-6 gap-4">
      {/* Mobile menu button */}
      <button
        onClick={openMobile}
        className="lg:hidden w-9 h-9 rounded-xl bg-bg-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-all shrink-0"
        aria-label="Abrir menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <SearchInput
          placeholder="Pesquisar disciplinas, questões, editais..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl bg-bg-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-border-muted transition-all"
          aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <NotificationBubble count={3} />

        {/* User Menu */}
        <UserMenu user={currentUser} />
      </div>
    </header>
  );
};
