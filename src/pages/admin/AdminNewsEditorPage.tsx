import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  Sparkles,
  Eye,
  Edit3,
  Building2,
  Globe,
  Tag,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Flame,
  Star,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  Card,
  Button,
  LoadingState,
} from '@/components/ui';
import { newsService, NewsSource } from '@/services/news.service';
import { contestService, ContestItem } from '@/services/contest.service';

const CATEGORY_OPTIONS = [
  { value: 'EDITAL', label: 'Edital & Retificação' },
  { value: 'CRONOGRAMA', label: 'Cronograma & Prazos' },
  { value: 'CONVOCACAO', label: 'Convocação & Nomeação' },
  { value: 'LEGISLACAO', label: 'Legislação & Normas' },
  { value: 'JURISPRUDENCIA', label: 'Jurisprudência' },
  { value: 'GERAL', label: 'Geral / Concursos' },
];

export const AdminNewsEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  // Estados de dados auxiliares
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [isLoadingAux, setIsLoadingAux] = useState<boolean>(true);

  // Estados do formulário
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [contestId, setContestId] = useState<string>('');
  const [sourceId, setSourceId] = useState<string>('');
  const [category, setCategory] = useState<string>('GERAL');
  const [externalUrl, setExternalUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 16));

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pageLoading, setPageLoading] = useState(isEditing);

  // Auto-gerar slug a partir do título quando for novo
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing) {
      const generatedSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  // Carregar dados iniciais (fontes e concursos)
  useEffect(() => {
    async function loadAux() {
      try {
        const [sourcesRes, contestsRes] = await Promise.all([
          newsService.listAdminSources().catch(() => []),
          contestService.getContests().catch(() => []),
        ]);
        setSources(sourcesRes);
        setContests(contestsRes);
        if (sourcesRes.length > 0 && !sourceId) {
          setSourceId(sourcesRes[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar fontes e concursos:', err);
      } finally {
        setIsLoadingAux(false);
      }
    }
    loadAux();
  }, []);

  // Se for edição, carrega a notícia
  useEffect(() => {
    if (!id) return;
    async function loadNews() {
      setPageLoading(true);
      try {
        const item = await newsService.getNewsById(id as string);
        setTitle(item.title);
        setSlug(item.slug || '');
        setSummary(item.summary || '');
        setContent(item.content || '');
        setContestId(item.contestId || '');
        setSourceId(item.sourceId || '');
        setCategory(item.category || 'GERAL');
        setExternalUrl(item.externalUrl || '');
        setImageUrl(item.imageUrl || '');
        setIsFeatured(Boolean(item.isFeatured));
        setIsImportant(Boolean(item.isImportant));
        setStatus(item.status);
        if (item.publishedAt) {
          setPublishedAt(new Date(item.publishedAt).toISOString().slice(0, 16));
        }
        if (item.tags && Array.isArray(item.tags)) {
          setTags(item.tags);
        }
      } catch (err: any) {
        console.error('Erro ao buscar notícia para edição:', err);
        setFeedbackMessage({ type: 'error', text: err.message || 'Falha ao carregar notícia' });
      } finally {
        setPageLoading(false);
      }
    }
    loadNews();
  }, [id]);

  // Adicionar tag
  const handleAddTag = () => {
    const clean = tagInput.trim();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Classificação Heurística Determinística
  const handleAutoClassify = async () => {
    if (!title && !content && !summary) {
      setFeedbackMessage({
        type: 'error',
        text: 'Preencha ao menos o título ou resumo para executar a classificação automática.',
      });
      return;
    }

    setIsClassifying(true);
    setFeedbackMessage(null);
    try {
      const result = await newsService.classify({
        title,
        summary,
        content,
      });

      if (result.category) {
        setCategory(result.category);
      }
      if (result.isImportant !== undefined) {
        setIsImportant(result.isImportant);
      }
      if (result.tags && result.tags.length > 0) {
        // Une tags mantendo valores únicos
        const combined = Array.from(new Set([...tags, ...result.tags]));
        setTags(combined);
      }
      if (result.suggestedContestAcronym) {
        const found = contests.find(
          (c) => c.acronym.toUpperCase() === result.suggestedContestAcronym?.toUpperCase()
        );
        if (found) {
          setContestId(found.id);
        }
      }

      setFeedbackMessage({
        type: 'success',
        text: 'Classificação automática aplicada! Categoria, relevância, concurso e tags foram sugeridos.',
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Erro ao classificar conteúdo.',
      });
    } finally {
      setIsClassifying(false);
    }
  };

  // Submissão do formulário
  const handleSubmit = async (targetStatus?: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim()) {
      setFeedbackMessage({ type: 'error', text: 'O título é obrigatório.' });
      return;
    }
    if (!summary.trim()) {
      setFeedbackMessage({ type: 'error', text: 'O resumo/subtítulo é obrigatório.' });
      return;
    }
    if (!sourceId) {
      setFeedbackMessage({ type: 'error', text: 'Selecione uma fonte cadastrada.' });
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      summary: summary.trim(),
      content: content.trim() || summary.trim(),
      contestId: contestId || null,
      sourceId,
      category,
      externalUrl: externalUrl.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      isFeatured,
      isImportant,
      status: targetStatus || status,
      publishedAt: new Date(publishedAt).toISOString(),
      tags,
    };

    try {
      if (isEditing && id) {
        await newsService.updateNews(id, payload);
        if (targetStatus === 'PUBLISHED' && status !== 'PUBLISHED') {
          await newsService.publishNews(id);
        }
        setFeedbackMessage({ type: 'success', text: 'Notícia atualizada com sucesso!' });
      } else {
        const created = await newsService.createNews(payload);
        if (targetStatus === 'PUBLISHED') {
          await newsService.publishNews(created.id);
        }
        setFeedbackMessage({ type: 'success', text: 'Notícia criada com sucesso!' });
      }

      setTimeout(() => {
        navigate('/admin/noticias');
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao salvar notícia:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Erro ao salvar notícia. Verifique os campos e tente novamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (pageLoading || isLoadingAux) {
    return (
      <div className="p-8">
        <LoadingState message="Carregando dados da notícia..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header com navegação e ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/noticias"
            className="p-2 rounded-lg border border-border hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors"
            title="Voltar para notícias"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {isEditing ? 'Editar Notícia' : 'Nova Notícia'}
            </h1>
            <p className="text-sm text-text-secondary">
              Preencha os dados da publicação, vincule fontes oficiais e classifique os temas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit('DRAFT')}
            disabled={isSaving}
            className="gap-1.5"
          >
            <Save className="w-4 h-4" />
            Salvar Rascunho
          </Button>

          <Button
            variant="primary"
            onClick={() => handleSubmit('PUBLISHED')}
            disabled={isSaving}
            className="gap-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white"
          >
            <Send className="w-4 h-4" />
            {isEditing && status === 'PUBLISHED' ? 'Atualizar & Publicar' : 'Publicar Notícia'}
          </Button>
        </div>
      </div>

      {/* Banner de Feedback */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-500'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Botão de Classificação Automática */}
      <Card className="p-4 bg-gradient-to-r from-brand-primary/10 via-brand-primary/5 to-transparent border border-brand-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-primary/20 text-brand-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-sm">Classificação Determinística Heurística</h3>
            <p className="text-xs text-text-secondary">
              Analisa título e texto para identificar automaticamente o concurso (PRF/PF), categoria, urgência e tags normativas.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoClassify}
          disabled={isClassifying}
          className="gap-2 border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 font-medium"
        >
          <Sparkles className={`w-4 h-4 ${isClassifying ? 'animate-spin' : ''}`} />
          {isClassifying ? 'Analisando...' : 'Auto-Classificar Notícia'}
        </Button>
      </Card>

      {/* Grid Principal: Form e Painel Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal: Conteúdo do Artigo */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Título da Notícia <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex: PRF publica edital com 1.500 vagas para Policial Rodoviário"
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-primary text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Slug (URL amigável)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="prf-publica-edital-1500-vagas"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-secondary/50 text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  URL da Imagem de Destaque
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full px-3 py-2 pl-9 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                  <ImageIcon className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Resumo / Lide <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Breve resumo da notícia exibido em cards, listagens e notificações..."
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              />
            </div>

            {/* Alternador Editor / Pré-visualização */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-text-primary">
                  Corpo da Notícia
                </label>
                <div className="flex items-center gap-1 bg-surface-secondary p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'edit'
                        ? 'bg-brand-primary text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-brand-primary text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Visualizar Prévia
                  </button>
                </div>
              </div>

              {activeTab === 'edit' ? (
                <div>
                  <textarea
                    rows={12}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Conteúdo completo da matéria jornalística ou comunicado oficial (suporta formatação Markdown ou HTML básico)..."
                    className="w-full px-4 py-3 rounded-lg border border-border bg-surface-primary text-text-primary font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y"
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Dica: Você pode estruturar o texto com subtítulos, parágrafos claros e links para editais oficiais.
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-lg border border-border bg-surface-secondary/30 min-h-[300px] prose prose-invert max-w-none">
                  <h2 className="text-xl font-bold text-text-primary mb-2">{title || 'Título da Notícia'}</h2>
                  <p className="text-sm text-text-secondary italic mb-4 border-l-2 border-brand-primary pl-3">
                    {summary || 'Resumo da notícia aparecerá aqui...'}
                  </p>
                  <div className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
                    {content || 'Sem conteúdo inserido até o momento.'}
                  </div>
                </div>
              )}
            </div>

            {/* Gerenciamento de Tags */}
            <div className="border-t border-border pt-4">
              <label className="block text-sm font-semibold text-text-primary mb-1.5">
                Tags & Palavras-chave
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Ex: cronograma, vagas, cebraspe..."
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <Button variant="secondary" size="sm" onClick={handleAddTag}>
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-secondary text-text-secondary border border-border"
                  >
                    <Tag className="w-3 h-3 text-text-muted" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-rose-500 transition-colors ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                {tags.length === 0 && (
                  <span className="text-xs text-text-muted">Nenhuma tag vinculada.</span>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Coluna Lateral: Metadados, Concurso e Fonte */}
        <div className="space-y-6">
          {/* Card de Publicação e Status */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-primary" />
              Publicação & Status
            </h3>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Status</label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                <option value="DRAFT">Rascunho (Não visível para alunos)</option>
                <option value="PUBLISHED">Publicado (Visível na Central)</option>
                <option value="ARCHIVED">Arquivado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Data / Horário de Publicação
              </label>
              <input
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            <div className="pt-2 border-t border-border space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary border-border bg-surface-primary"
                />
                <div className="text-sm">
                  <span className="font-semibold text-text-primary flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/30" /> Notícia em Destaque
                  </span>
                  <p className="text-xs text-text-muted">Aparece no carrossel e topo da página</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 border-border bg-surface-primary"
                />
                <div className="text-sm">
                  <span className="font-semibold text-rose-500 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 fill-rose-500/20" /> Urgente / Importante
                  </span>
                  <p className="text-xs text-text-muted">Gera alertas e destaque visual prioritário</p>
                </div>
              </label>
            </div>
          </Card>

          {/* Card de Classificação e Concurso */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-primary" />
              Concurso & Categoria
            </h3>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Concurso Associado
              </label>
              <select
                value={contestId}
                onChange={(e) => setContestId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                <option value="">Geral / Todos os Concursos</option>
                {contests.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.acronym} - {c.agencyName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-muted mt-1">
                Se associado, será priorizado na trilha dos alunos deste concurso.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Categoria da Notícia
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Card de Fonte Oficial e Rastreabilidade */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              Fonte Oficial & Rastreabilidade
            </h3>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Fonte Cadastrada <span className="text-rose-500">*</span>
              </label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.trustLevel === 'HIGH' ? 'Confiança Alta' : s.trustLevel})
                  </option>
                ))}
              </select>
              <div className="mt-1 flex justify-end">
                <Link
                  to="/admin/noticias/fontes"
                  className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                >
                  Gerenciar fontes <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                URL da Matéria Original / Link Oficial
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://www.in.gov.br/..."
                  className="w-full px-3 py-2 pl-9 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <Globe className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
              </div>
              <p className="text-xs text-text-muted mt-1">
                Usado para deduplicação canônica e auditoria de fidedignidade.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
