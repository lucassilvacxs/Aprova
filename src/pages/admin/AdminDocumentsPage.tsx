import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Send,
  Archive,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  IconButton,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/ui';
import { documentService, OfficialDocument } from '@/services/document.service';
import { newsService, NewsSource } from '@/services/news.service';
import { contestService, ContestItem } from '@/services/contest.service';

const DOC_TYPES = [
  { value: 'EDITAL', label: 'Edital de Abertura' },
  { value: 'RETIFICATION', label: 'Retificação' },
  { value: 'NOTICE', label: 'Aviso / Comunicado' },
  { value: 'RESULT', label: 'Resultado / Notas' },
  { value: 'CRONOGRAMA', label: 'Cronograma Oficial' },
  { value: 'ANSWER_KEY', label: 'Gabarito' },
  { value: 'CALL', label: 'Convocação' },
  { value: 'OTHER', label: 'Outro Documento' },
];

export const AdminDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<OfficialDocument[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filtros
  const [selectedContest, setSelectedContest] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<OfficialDocument | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Campos do formulário
  const [formContestId, setFormContestId] = useState('');
  const [formSourceId, setFormSourceId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDocumentType, setFormDocumentType] = useState<string>('EDITAL');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [formPublicationDate, setFormPublicationDate] = useState(new Date().toISOString().slice(0, 10));
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');
  const [formIsFeatured, setFormIsFeatured] = useState<boolean>(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    async function loadAux() {
      try {
        const [sourcesRes, contestsRes] = await Promise.all([
          newsService.listAdminSources().catch(() => []),
          contestService.getContests().catch(() => []),
        ]);
        setSources(sourcesRes);
        setContests(contestsRes);
      } catch (err) {
        console.error('Erro ao carregar dados auxiliares:', err);
      }
    }
    loadAux();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await documentService.listAdminDocuments({
        contestId: selectedContest || undefined,
        documentType: selectedType || undefined,
        status: selectedStatus || undefined,
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setDocuments(res.items);
      setPagination(res.pagination);
    } catch (err: any) {
      console.error('Erro ao listar documentos:', err);
      setError(err.message || 'Falha ao buscar documentos oficiais.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedContest, selectedType, selectedStatus, debouncedSearch, pagination.page]);

  const openCreateModal = () => {
    setEditingDoc(null);
    setFormContestId(contests.length > 0 ? contests[0].id : '');
    setFormSourceId(sources.length > 0 ? sources[0].id : '');
    setFormTitle('');
    setFormDescription('');
    setFormDocumentType('EDITAL');
    setFormFileUrl('');
    setFormExternalUrl('');
    setFormPublicationDate(new Date().toISOString().slice(0, 10));
    setFormStatus('PUBLISHED');
    setFormIsFeatured(false);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (doc: OfficialDocument) => {
    setEditingDoc(doc);
    setFormContestId(doc.contestId);
    setFormSourceId(doc.sourceId);
    setFormTitle(doc.title);
    setFormDescription(doc.description || '');
    setFormDocumentType(doc.documentType);
    setFormFileUrl(doc.fileUrl || '');
    setFormExternalUrl(doc.externalUrl || '');
    setFormPublicationDate(doc.publicationDate ? doc.publicationDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setFormStatus(doc.status);
    setFormIsFeatured(doc.isFeatured);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setModalError('O título do documento é obrigatório.');
      return;
    }
    if (!formContestId) {
      setModalError('Selecione o concurso associado.');
      return;
    }
    if (!formSourceId) {
      setModalError('A fonte oficial é obrigatória para assegurar a rastreabilidade.');
      return;
    }

    setIsSaving(true);
    setModalError(null);

    const payload = {
      title: formTitle.trim(),
      contestId: formContestId,
      sourceId: formSourceId,
      description: formDescription.trim() || undefined,
      documentType: formDocumentType,
      fileUrl: formFileUrl.trim() || undefined,
      externalUrl: formExternalUrl.trim() || undefined,
      publicationDate: new Date(formPublicationDate).toISOString(),
      status: formStatus,
      isFeatured: formIsFeatured,
    };

    try {
      if (editingDoc) {
        await documentService.updateDocument(editingDoc.id, payload);
      } else {
        await documentService.createDocument(payload);
      }
      setIsModalOpen(false);
      fetchDocuments();
    } catch (err: any) {
      console.error('Erro ao salvar documento:', err);
      setModalError(err.message || 'Erro ao salvar documento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await documentService.publishDocument(id);
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Erro ao publicar documento.');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await documentService.archiveDocument(id);
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Erro ao arquivar documento.');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o documento "${title}"?`)) {
      return;
    }
    try {
      await documentService.deleteDocument(id);
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir documento.');
    }
  };

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'EDITAL':
        return <Badge variant="brand" size="sm">Edital</Badge>;
      case 'RETIFICATION':
        return <Badge variant="warning" size="sm">Retificação</Badge>;
      case 'RESULT':
        return <Badge variant="success" size="sm">Resultado</Badge>;
      case 'CRONOGRAMA':
        return <Badge variant="info" size="sm">Cronograma</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success" size="sm">Publicado</Badge>;
      case 'DRAFT':
        return <Badge variant="warning" size="sm">Rascunho</Badge>;
      case 'ARCHIVED':
        return <Badge variant="neutral" size="sm">Arquivado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-primary" />
            Editais & Documentos Oficiais
          </h1>
          <p className="text-sm text-text-secondary">
            Repositório de editais de abertura, retificações, convocações e gabaritos oficiais.
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Documento Oficial
        </Button>
      </div>

      {/* Barra de Filtros */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar documento..."
              className="w-full px-3 py-2 pl-9 text-sm rounded-lg border border-border bg-surface-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          </div>

          <div>
            <select
              value={selectedContest}
              onChange={(e) => {
                setSelectedContest(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">Todos os Concursos</option>
              {contests.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.acronym} - {c.agencyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">Todos os Tipos</option>
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">Todos os Status</option>
              <option value="PUBLISHED">Publicados</option>
              <option value="DRAFT">Rascunhos</option>
              <option value="ARCHIVED">Arquivados</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tabela de Documentos */}
      {isLoading ? (
        <LoadingState message="Carregando documentos oficiais..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDocuments} />
      ) : documents.length === 0 ? (
        <EmptyState
          title="Nenhum documento encontrado"
          description="Nenhum edital ou comunicado corresponde aos critérios pesquisados."
        />
      ) : (
        <Card className="overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-secondary/60 text-xs text-text-secondary uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold">Documento</th>
                  <th className="px-4 py-3 font-semibold">Concurso</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Fonte Oficial</th>
                  <th className="px-4 py-3 font-semibold">Publicação</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text-primary line-clamp-1">
                        {doc.title}
                      </div>
                      {doc.description && (
                        <div className="text-xs text-text-muted line-clamp-1">
                          {doc.description}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary">
                        {doc.contestTitle || 'Concurso'}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {getDocTypeBadge(doc.documentType)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-xs text-text-secondary">
                      {doc.sourceName || 'Fonte Oficial'}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-xs text-text-muted">
                      {new Date(doc.publicationDate).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(doc.status)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                      {doc.externalUrl && (
                        <a
                          href={doc.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex p-1 text-text-secondary hover:text-brand-primary"
                          title="Abrir URL externa"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {doc.status !== 'PUBLISHED' && (
                        <IconButton
                          icon={<Send className="w-4 h-4 text-emerald-500" />}
                          label="Publicar documento"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePublish(doc.id)}
                        />
                      )}

                      {doc.status === 'PUBLISHED' && (
                        <IconButton
                          icon={<Archive className="w-4 h-4 text-text-muted" />}
                          label="Arquivar documento"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(doc.id)}
                        />
                      )}

                      <IconButton
                        icon={<Edit2 className="w-4 h-4 text-text-secondary" />}
                        label="Editar documento"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(doc)}
                      />

                      <IconButton
                        icon={<Trash2 className="w-4 h-4 text-rose-500" />}
                        label="Excluir documento"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id, doc.title)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-text-secondary">
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} documentos)
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Modal Criar / Editar Documento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-primary border border-border rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-primary" />
              {editingDoc ? 'Editar Documento Oficial' : 'Cadastrar Documento Oficial'}
            </h2>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Título do Documento <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Edital nº 1 - PRF 2021 (Abertura de Inscrições)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Concurso <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formContestId}
                    onChange={(e) => setFormContestId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  >
                    {contests.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.acronym} - {c.agencyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Fonte Oficial <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSourceId}
                    onChange={(e) => setFormSourceId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  >
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.trustLevel})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Tipo de Documento
                  </label>
                  <select
                    value={formDocumentType}
                    onChange={(e) => setFormDocumentType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Data de Publicação Oficial
                  </label>
                  <input
                    type="date"
                    value={formPublicationDate}
                    onChange={(e) => setFormPublicationDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  URL Externa Oficial (DOU / Banca)
                </label>
                <input
                  type="url"
                  value={formExternalUrl}
                  onChange={(e) => setFormExternalUrl(e.target.value)}
                  placeholder="https://www.in.gov.br/web/dou/-/edital-n-1..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  URL do Arquivo PDF (opcional para visualizador integrado)
                </label>
                <input
                  type="url"
                  value={formFileUrl}
                  onChange={(e) => setFormFileUrl(e.target.value)}
                  placeholder="https://cebraspe.org.br/concursos/arquivos/edital.pdf"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Observações / Ementa do Documento
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Resumo das principais retificações ou instruções constantes no edital..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="PUBLISHED">Publicado</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary border-border bg-surface-primary"
                    />
                    <span className="text-xs font-medium text-text-primary">
                      Destacar este documento
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="bg-brand-primary hover:bg-brand-primary/90 text-white"
                >
                  {isSaving ? 'Salvando...' : editingDoc ? 'Atualizar Documento' : 'Cadastrar Documento'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
