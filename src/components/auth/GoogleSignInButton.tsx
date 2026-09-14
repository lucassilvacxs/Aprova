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

  const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '';

  const isRealClientId =
    Boolean(clientId) &&
    !clientId.includes('placeholder') &&
    !clientId.includes('YOUR_');

  React.useEffect(() => {
    // Carrega o SDK oficial do Google Identity Services
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

  const handleCustomButtonClick = () => {
    if (isRealClientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      return;
    }

    onError?.(
      'Para entrar com o Google, configure a chave de integração Google OAuth (VITE_GOOGLE_CLIENT_ID). Você também pode se cadastrar ou entrar normalmente usando seu e-mail e senha abaixo.'
    );
  };

  return (
    <div className="w-full">
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
  );
};
