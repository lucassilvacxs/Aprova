import React from 'react';

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  isLoading?: boolean;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  isLoading = false,
  text = 'continue_with',
}) => {
  const buttonContainerRef = React.useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = React.useState(false);
  const [showConfigModal, setShowConfigModal] = React.useState(false);

  const clientId =
    (import.meta as any).env.VITE_GOOGLE_CLIENT_ID ||
    '1084224719266-placeholder.apps.googleusercontent.com';

  const isRealClientId =
    clientId && !clientId.includes('placeholder') && !clientId.includes('YOUR_');

  React.useEffect(() => {
    // Carrega o SDK do Google Identity Services
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.warn('Falha ao carregar script do Google Identity Services.');
    };
    document.body.appendChild(script);

    return () => {
      // Manter script em cache
    };
  }, []);

  React.useEffect(() => {
    if (!scriptLoaded || !window.google?.accounts?.id || !isRealClientId) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          if (response?.credential) {
            onSuccess(response.credential);
          } else {
            onError?.('Não foi possível obter a credencial do Google.');
          }
        },
      });

      if (buttonContainerRef.current) {
        buttonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          theme: 'filled_black',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '100%',
        });
      }
    } catch (err) {
      console.error('Erro ao inicializar Google Sign-In:', err);
    }
  }, [scriptLoaded, isRealClientId, clientId, onSuccess, onError, text]);

  // Se não houver Client ID configurado ou falhar o render, mostra botão elegante customizado
  const handleCustomButtonClick = () => {
    if (isRealClientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      return;
    }

    // Modal amigável para ambiente de desenvolvimento
    setShowConfigModal(true);
  };

  const handleSimulateLogin = (email: string, name: string) => {
    setShowConfigModal(false);
    onSuccess(`mock_google_${email}_${name}`);
  };

  return (
    <>
      <div className="w-full">
        {/* Render oficial do Google quando Client ID está presente */}
        {isRealClientId ? (
          <div ref={buttonContainerRef} className="w-full flex justify-center min-h-[44px]" />
        ) : (
          <button
            type="button"
            onClick={handleCustomButtonClick}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-[#1E222D] hover:bg-[#282D3D] text-slate-100 font-medium text-sm border border-slate-700/60 shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {isLoading
                ? 'Conectando ao Google...'
                : text === 'signup_with'
                  ? 'Cadastrar com o Google'
                  : 'Continuar com o Google'}
            </span>
          </button>
        )}
      </div>

      {/* Modal de Apoio ao Desenvolvedor / Setup do Google */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-surface border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Google Sign-In</h3>
                <p className="text-xs text-text-secondary">Autenticação com a Conta Google</p>
              </div>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              Para produção, adicione sua chave <code className="text-xs bg-bg-elevated px-1.5 py-0.5 rounded text-brand-400">VITE_GOOGLE_CLIENT_ID</code> nas variáveis do Cloudflare/arquivo .env.
            </p>

            <div className="p-3.5 rounded-xl bg-bg-elevated border border-border/80 mb-4">
              <p className="text-xs font-semibold text-text-muted uppercase mb-2">Simular login rápido (Desenvolvimento):</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSimulateLogin('lucassilvaytb1999@gmail.com', 'Lucas Silva')}
                  className="w-full text-left p-2.5 rounded-lg bg-bg-surface hover:bg-brand-500/10 border border-border hover:border-brand-500/40 text-xs text-text-primary font-medium flex items-center justify-between transition-colors"
                >
                  <span>Lucas Silva (Admin)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-bold uppercase">Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateLogin('aluno.google@gmail.com', 'Aluno Concurseiro')}
                  className="w-full text-left p-2.5 rounded-lg bg-bg-surface hover:bg-brand-500/10 border border-border hover:border-brand-500/40 text-xs text-text-primary font-medium flex items-center justify-between transition-colors"
                >
                  <span>Aluno Concurseiro (Novo Aluno)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold uppercase">Aluno</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
