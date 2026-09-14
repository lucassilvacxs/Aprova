import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Lock, User, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store';
import { authService } from '@/services/auth.service';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export const LoginPage: React.FC = () => {
  const [isRegisterMode, setIsRegisterMode] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegisterMode && !name.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Preencha o email e a senha para continuar.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegisterMode) {
        const response = await authService.register(name.trim(), email.trim(), password);
        setUser(response.user);
        navigate('/dashboard');
      } else {
        const response = await authService.login(email.trim(), password);
        setUser(response.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    setError('');
    setIsGoogleLoading(true);

    try {
      const response = await authService.loginWithGoogle(credential);
      setUser(response.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação com o Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  return (
    <div className="min-h-screen bg-bg-base flex">
      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-bg-surface border-r border-border p-10 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-brand-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-[400px] h-[400px] bg-brand-700/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-brand">
            <span className="text-white font-extrabold text-xl leading-none">A</span>
          </div>
          <span className="font-extrabold text-text-primary text-2xl tracking-tight">APROVA</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 max-w-sm">
          <h1 className="text-4xl font-extrabold text-text-primary leading-tight mb-4">
            Prepare-se com<br />
            <span className="text-gradient-brand">inteligência.</span>
          </h1>
          <p className="text-text-secondary leading-relaxed text-base">
            Plataforma de alta performance para concursos públicos. Estudo focado, metodologia analítica e aprovação real.
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-3">
            {[
              'Banco de questões organizado por edital',
              'Simulados com penalidade Cebraspe e estatísticas',
              'Plano de estudos diário e adaptativo',
              'Redações com feedback pedagógico detalhado',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-brand-400" />
                </span>
                <span className="text-sm text-text-secondary">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
          <span>Autenticação rápida e segura com a Conta Google</span>
        </div>
      </div>

      {/* ── Right Panel: Login / Register Form ── */}
      <div className="w-full lg:w-[480px] flex flex-col items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-brand">
            <span className="text-white font-extrabold text-lg leading-none">A</span>
          </div>
          <span className="font-extrabold text-text-primary text-xl tracking-tight">APROVA</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-2xl font-extrabold text-text-primary mb-1.5">
              {isRegisterMode ? 'Criar sua conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-sm text-text-secondary">
              {isRegisterMode
                ? 'Cadastre-se para iniciar seus estudos de alto nível.'
                : 'Acesse sua conta e continue seus estudos.'}
            </p>
          </div>

          {/* Google Sign-In (Destaque Principal) */}
          <div className="mb-5">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              isLoading={isGoogleLoading}
              text={isRegisterMode ? 'signup_with' : 'continue_with'}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs uppercase tracking-wider text-text-muted font-medium">
              ou com e-mail
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
            {/* Nome Completo (apenas no modo cadastro) */}
            {isRegisterMode && (
              <div className="flex flex-col gap-1.5 animate-fade-in">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Nome Completo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    autoComplete="name"
                    required
                    className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 hover:border-border-muted transition-all"
                  />
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 hover:border-border-muted transition-all"
                />
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              </div>
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Senha
                </label>
                {!isRegisterMode && (
                  <button
                    type="button"
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    onClick={() => alert('Recuperação de acesso: solicite redefinição ao administrador.')}
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                  required
                  className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 hover:border-border-muted transition-all"
                />
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-danger-light border border-danger/25 animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <span className="text-danger text-sm font-bold shrink-0">!</span>
                  <p className="text-sm text-danger-text">{error}</p>
                </div>
                {isRegisterMode && error.includes('já está cadastrado') && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(false);
                      setError('');
                    }}
                    className="text-xs font-semibold text-brand-400 hover:text-brand-300 self-start ml-5 underline transition-colors"
                  >
                    Fazer login agora com este e-mail →
                  </button>
                )}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
              leftIcon={isRegisterMode ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              className="mt-2"
            >
              {isRegisterMode ? 'Criar minha conta' : 'Entrar na plataforma'}
            </Button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            {isRegisterMode ? (
              <p className="text-sm text-text-secondary">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError('');
                  }}
                  className="font-semibold text-brand-400 hover:text-brand-300 transition-colors ml-1"
                >
                  Fazer login
                </button>
              </p>
            ) : (
              <p className="text-sm text-text-secondary">
                Ainda não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setError('');
                  }}
                  className="font-semibold text-brand-400 hover:text-brand-300 transition-colors ml-1"
                >
                  Cadastre-se grátis
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
