import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Building2,
  ExternalLink,
  Star,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Share2,
  ShieldCheck,
  Tag,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { newsService, NewsItem } from '@/services/news.service';

export const NoticiaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    async function loadNewsDetail() {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const item = await newsService.getNewsById(id);
        setNewsItem(item);
      } catch (err: any) {
        console.error('Erro ao carregar notícia:', err);
        setError(err.message || 'Falha ao carregar os detalhes da notícia.');
      } finally {
        setIsLoading(false);
      }
    }
    loadNewsDetail();
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!newsItem) return;
    const current = newsItem.isFavorite;
    setNewsItem({ ...newsItem, isFavorite: !current });
    try {
      await newsService.toggleFavorite(newsItem.id);
    } catch {
      setNewsItem({ ...newsItem, isFavorite: current });
    }
  };

  const handleToggleReadStatus = async () => {
    if (!newsItem) return;
    const nextState = !newsItem.isRead;
    setNewsItem({ ...newsItem, isRead: nextState });
    try {
      if (nextState) {
        await newsService.markAsRead(newsItem.id);
      } else {
        await newsService.markAsUnread(newsItem.id);
      }
    } catch {
      setNewsItem({ ...newsItem, isRead: !nextState });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="py-20">
        <LoadingState message="Carregando publicação..." />
      </div>
    );
  }

  if (error || !newsItem) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/noticias')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar para Notícias
        </Button>
        <ErrorState
          message={error || 'A notícia solicitada não foi encontrada ou não está publicada.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 animate-fade-in">
      {/* ── BREADCRUMB & VOLTAR ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Link to="/dashboard" className="hover:text-text-primary transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/noticias" className="hover:text-text-primary transition-colors">
            Notícias
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-primary truncate max-w-[200px]">{newsItem.title}</span>
        </div>

        <Button variant="ghost" size="sm" onClick={() => navigate('/noticias')} className="gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </div>

      {/* ── ALERTA DE ATUALIZAÇÃO IMPORTANTE ──────────────────────────── */}
      {newsItem.isImportant && (
        <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-orange-300">Atualização de Alta Prioridade</h4>
            <p className="text-xs text-orange-200/80 mt-0.5 leading-relaxed">
              Esta publicação contém retificações de prazos, comunicados oficiais de banca ou informações
              críticas sobre o cronograma do concurso.
            </p>
          </div>
        </div>
      )}

      {/* ── ARTIGO PRINCIPAL ─────────────────────────────────────────── */}
      <Card className="p-6 md:p-8 space-y-6 border-border bg-bg-surface shadow-sm">
        {/* Metadados Superiores */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-5">
          <div className="flex items-center gap-2 flex-wrap">
            {newsItem.contestTitle ? (
              <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {newsItem.contestSlug?.toUpperCase() || 'CONCURSO'}
              </span>
            ) : (
              <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-neutral-500/10 text-text-muted border border-neutral-500/20">
                GERAL
              </span>
            )}

            <Badge variant="brand" size="sm">
              {newsItem.category}
            </Badge>

            <span className="text-xs text-text-muted flex items-center gap-1.5 ml-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(newsItem.publishedAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex items-center gap-2">
            <Button
              variant={newsItem.isFavorite ? 'primary' : 'secondary'}
              size="xs"
              onClick={handleToggleFavorite}
              className="gap-1.5"
            >
              <Star className={`w-3.5 h-3.5 ${newsItem.isFavorite ? 'fill-current' : ''}`} />
              {newsItem.isFavorite ? 'Favoritada' : 'Favoritar'}
            </Button>

            <Button
              variant="secondary"
              size="xs"
              onClick={handleToggleReadStatus}
              className="gap-1.5"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${newsItem.isRead ? 'text-green-400' : 'text-text-muted'}`} />
              {newsItem.isRead ? 'Lida' : 'Marcar lida'}
            </Button>

            <Button
              variant="secondary"
              size="xs"
              onClick={handleCopyLink}
              className="gap-1.5"
              title="Copiar link da publicação"
            >
              <Share2 className="w-3.5 h-3.5" />
              {copied ? 'Copiado!' : 'Compartilhar'}
            </Button>
          </div>
        </div>

        {/* Título Principal */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary leading-tight tracking-tight">
          {newsItem.title}
        </h1>

        {/* Resumo em destaque */}
        <div className="p-4 rounded-xl bg-bg-elevated/50 border-l-4 border-brand-500 text-sm font-medium text-text-secondary leading-relaxed">
          {newsItem.summary}
        </div>

        {/* Imagem de Capa (se houver) */}
        {newsItem.imageUrl && (
          <div className="rounded-2xl overflow-hidden border border-border">
            <img
              src={newsItem.imageUrl}
              alt={newsItem.title}
              className="w-full h-auto max-h-96 object-cover"
            />
          </div>
        )}

        {/* Conteúdo da Notícia Formatado e Sanitizado */}
        <div className="prose prose-invert max-w-none text-text-secondary leading-relaxed space-y-4 text-sm md:text-base border-t border-border/60 pt-6">
          <div
            dangerouslySetInnerHTML={{ __html: newsItem.content || newsItem.summary }}
            className="space-y-4"
          />
        </div>

        {/* Link para a Fonte Original */}
        {newsItem.externalUrl && (
          <div className="p-4 rounded-2xl bg-bg-elevated/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Fonte Original Declarada</p>
                <p className="text-sm font-bold text-text-primary">{newsItem.sourceName}</p>
                {newsItem.sourceTrustLevel === 'HIGH' && (
                  <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1">
                    ✓ Fonte Oficial Verificada
                  </span>
                )}
              </div>
            </div>

            <a
              href={newsItem.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Button variant="primary" size="sm" className="w-full sm:w-auto gap-2 shadow-sm">
                Ver fonte original <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        )}

        {/* Tags */}
        {newsItem.tags && newsItem.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-border/60">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Tags:
            </span>
            {newsItem.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-bg-elevated text-text-secondary border border-border"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* ── DOCUMENTOS OFICIAIS RELACIONADOS ──────────────────────────── */}
      {newsItem.relatedDocuments && newsItem.relatedDocuments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              Documentos e Editais Relacionados
            </h3>
            <Link to="/editais" className="text-xs text-brand-400 hover:text-brand-300 font-semibold">
              Ver todos os editais →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {newsItem.relatedDocuments.map((doc) => (
              <Card key={doc.id} hoverable className="p-4 flex flex-col justify-between border-border">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="brand" size="xs">
                      {doc.documentType}
                    </Badge>
                    <span className="text-[10px] text-text-muted ml-auto">
                      {new Date(doc.publicationDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary line-clamp-2 leading-snug">
                    {doc.title}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                  <Link to={`/editais/${doc.id}`} className="text-brand-400 hover:text-brand-300 font-semibold">
                    Visualizar documento →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── NOTÍCIAS RELACIONADAS ─────────────────────────────────────── */}
      {newsItem.relatedNews && newsItem.relatedNews.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-400" />
            Outras Notícias deste Concurso
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {newsItem.relatedNews.map((rn) => (
              <Link key={rn.id} to={`/noticias/${rn.id}`} className="block group">
                <Card hoverable className="p-4 h-full flex flex-col justify-between border-border">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="neutral" size="xs">
                        {rn.category}
                      </Badge>
                      <span className="text-[10px] text-text-muted ml-auto">
                        {new Date(rn.publishedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-text-primary group-hover:text-brand-400 transition-colors line-clamp-2 leading-snug">
                      {rn.title}
                    </h4>
                  </div>
                  <div className="mt-3 text-[11px] text-brand-400 font-semibold flex items-center gap-1">
                    Ler publicação <ChevronRight className="w-3 h-3" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
