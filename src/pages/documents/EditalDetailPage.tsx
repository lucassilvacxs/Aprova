import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Download,
  FileText,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  FileDown,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { documentService, OfficialDocument } from '@/services/document.service';

export const EditalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<OfficialDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDoc() {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const item = await documentService.getDocumentById(id);
        setDoc(item);
      } catch (err: any) {
        console.error('Erro ao carregar documento:', err);
        setError(err.message || 'Falha ao obter os detalhes do documento oficial.');
      } finally {
        setIsLoading(false);
      }
    }
    loadDoc();
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-20">
        <LoadingState message="Carregando documento oficial..." />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/editais')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar para Editais
        </Button>
        <ErrorState
          message={error || 'Documento oficial não encontrado ou indisponível.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return 'Tamanho n/d';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-fade-in">
      {/* ── BREADCRUMB ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Link to="/dashboard" className="hover:text-text-primary transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/editais" className="hover:text-text-primary transition-colors">
            Editais & Documentos
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-primary truncate max-w-[200px]">{doc.title}</span>
        </div>

        <Button variant="ghost" size="sm" onClick={() => navigate('/editais')} className="gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </div>

      {/* ── CABEÇALHO DO DOCUMENTO ────────────────────────────────────── */}
      <Card className="p-6 md:p-8 space-y-6 border-border bg-bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {doc.contestSlug?.toUpperCase() || 'CONCURSO'}
            </span>

            <Badge variant="brand" size="sm">
              {doc.documentType}
            </Badge>

            <span className="text-xs text-text-muted flex items-center gap-1.5 ml-1">
              <Calendar className="w-3.5 h-3.5" />
              Publicado em {new Date(doc.publicationDate).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {doc.fileUrl && (
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" size="xs" className="gap-1.5 shadow-brand">
                  <Download className="w-3.5 h-3.5" /> Baixar PDF
                </Button>
              </a>
            )}

            {doc.externalUrl && (
              <a href={doc.externalUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="xs" className="gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Fonte Original
                </Button>
              </a>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary leading-tight tracking-tight">
            {doc.title}
          </h1>
          {doc.description && (
            <p className="text-sm text-text-secondary mt-3 leading-relaxed">
              {doc.description}
            </p>
          )}
        </div>

        {/* Metadados da Fonte Oficial */}
        <div className="p-4 rounded-2xl bg-bg-elevated/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Órgão / Banca Emissora</p>
              <p className="text-sm font-bold text-text-primary">{doc.sourceName || 'Órgão Oficial'}</p>
              {doc.sourceTrustLevel === 'HIGH' && (
                <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1">
                  ✓ Fonte Confiável Verificada
                </span>
              )}
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-border/60 sm:pl-6">
            <p className="text-xs text-text-muted">Arquivo Oficial</p>
            <p className="text-sm font-semibold text-text-secondary">{formatFileSize(doc.fileSizeBytes)}</p>
          </div>
        </div>

        {/* ── VISUALIZADOR DE DOCUMENTO / PDF ─────────────────────────── */}
        <div className="space-y-4 pt-4 border-t border-border/70">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              Visualização do Documento
            </h3>

            {doc.fileUrl && (
              <span className="text-xs text-text-muted">
                Visualizador integrado compatível
              </span>
            )}
          </div>

          {doc.fileUrl ? (
            <div className="border border-border rounded-2xl overflow-hidden bg-bg-elevated">
              {/* Iframe do PDF ou Fallback com botão de download */}
              <iframe
                src={doc.fileUrl}
                title={doc.title}
                className="w-full h-[650px] border-0 rounded-2xl"
              />
              <div className="p-4 bg-bg-surface border-t border-border flex items-center justify-between text-xs text-text-muted">
                <span>Caso o visualizador não carregue em seu dispositivo móvel:</span>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1">
                  <FileDown className="w-4 h-4" /> Baixar arquivo original
                </a>
              </div>
            </div>
          ) : doc.externalUrl ? (
            <div className="p-8 rounded-2xl bg-bg-elevated/40 border border-border text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-brand-400 mx-auto" />
              <div className="max-w-md mx-auto">
                <h4 className="text-base font-bold text-text-primary">
                  Documento Hospedado no Portal Oficial
                </h4>
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                  Este ato oficial foi publicado exclusivamente no endereço eletrônico da banca organizadora ou órgão regulador.
                </p>
              </div>
              <a href={doc.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                <Button variant="primary" size="sm" className="gap-2 shadow-brand">
                  Acessar documento no portal oficial <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-bg-elevated/40 border border-border text-center text-text-muted text-xs">
              Nenhum arquivo ou endereço externo cadastrado para este documento.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
