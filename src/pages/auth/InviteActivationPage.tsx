import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, User, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button, LoadingState } from '@/components/ui';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store';

export const InviteActivationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [isValidating, setIsValidating] = React.useState(true);
  const [inviteData, setInviteData] = React.useState<{ email?: string; role: string } | null>(null);
  const [inviteError, setInviteError] = React.useState('');

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Validação automática do convite ao carregar a tela
  React.useEffect(() => {
    if (!code) {
      setInviteError('Nenhum código de convite informado na URL.');
      setIsValidating(false);
      return;
    }

    authService
      .validateInvite(code)
      .then((res) => {
        setInviteData(res);
        if (res.email) setEmail(res.email);
        setIsValidating(false);
      })
      .catch((err) => {
        setInviteError(err.message || 'Convite inválido ou expirado.');
        setIsValidating(false);
      });
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Por favor, informe seu nome completo.');
      return;
    }

    const finalEmail = inviteData?.email || email;
    if (!finalEmail.trim()) {
      setFormError('Por favor, informe seu email.');
      return;
    }

    if (password.length < 6) {
      setFormError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('As senhas digitadas não coincidem.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.registerWithInvite({
        code,
        name: name.trim(),
        email: finalEmail.trim(),
        password,
      });

      setUser(response.user);
      navigate('/dashboard');
    } catch (err: any) {
      setFormError(err.message || 'Não foi possível ativar sua conta. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
        <LoadingState message="Validando seu convite de acesso..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-brand">
            <span className="text-white font-extrabold text-lg">A</span>
          </div>
          <div>
            <h1 className="font-extrabold text-text-primary text-xl tracking-tight">APROVA</h1>
            <p className="text-[10px] font-semibold text-brand-400 uppercase tracking-widest">Acesso Privado</p>
          </div>
        </div>

        {inviteError ? (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-danger-light border border-danger/25 flex items-center justify-center text-danger text-xl mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-danger-text" />
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-2">Convite Indisponível</h2>
            <p className="text-sm text-text-secondary mb-6">{inviteError}</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Ir para tela de login
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-text-primary mb-1">Ative sua Conta</h2>
              <p className="text-xs text-text-secondary">
                Você foi convidado para a plataforma privada APROVA. Preencha seus dados para começar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Nome */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Nome Completo
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="email"
                    value={inviteData?.email || email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={Boolean(inviteData?.email)}
                    placeholder="seu@email.com"
                    required
                    className={`w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 ${
                      inviteData?.email ? 'opacity-75 cursor-not-allowed bg-border/20' : ''
                    }`}
                  />
                </div>
                {inviteData?.email && (
                  <span className="text-[10px] text-brand-300">Email vinculado ao seu convite</span>
                )}
              </div>

              {/* Senha */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Senha
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60"
                  />
                </div>
              </div>

              {/* Confirmar Senha */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Confirmar Senha
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-elevated border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-danger-light border border-danger/25 text-xs text-danger-text">
                  {formError}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                isLoading={isSubmitting}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
                className="mt-2"
              >
                Concluir Ativação e Entrar
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border text-center">
              <Link to="/login" className="text-xs text-text-muted hover:text-text-primary transition-colors">
                Já possui uma conta ativa? <span className="text-brand-400 font-semibold">Entrar</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
