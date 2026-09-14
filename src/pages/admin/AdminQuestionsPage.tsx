import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Plus,
  Search,
  Edit2,
  Copy,
  Archive,
  Eye,
  EyeOff,
  Flag,
  Upload,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  IconButton,
  Modal,
  LoadingState,
  EmptyState,
} from '@/components/ui';
import {
  questionService,
  QuestionItem,
  FilterOptionData,
} from '@/services/question.service';

export const AdminQuestionsPage: React.FC = () => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filterData, setFilterData] = useState<FilterOptionData | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [boardId, setBoardId] = useState<string>('');
  const [page, setPage] = useState(1);

  // Tab de Reportes
  const [currentTab, setCurrentTab] = useState<'questions' | 'reports'>('questions');
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Modal de Importação
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Carrega opções de filtros
  useEffect(() => {
    questionService.getFiltersData().then(setFilterData).catch(console.error);
  }, []);

  // Carrega questões
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await questionService.getQuestions({
        search: search.trim() || undefined,
        status: status || undefined,
        subjectId: subjectId || undefined,
        boardId: boardId || undefined,
        page,
        limit: 15,
      });
      setQuestions(res.items);
      setMeta(res.meta);
    } catch (err) {
      console.error('Erro ao buscar questões:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'questions') {
      fetchQuestions();
    } else {
      fetchReports();
    }
  }, [page, status, subjectId, boardId, currentTab]);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await questionService.getReports();
      setReports(res.items);
    } catch (err) {
      console.error('Erro ao buscar reportes:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleDuplicate = async (qId: string) => {
    try {
      const duplicated = await questionService.duplicateQuestion(qId);
      alert('Questão duplicada com sucesso em modo RASCUNHO!');
      fetchQuestions();
      navigate(`/admin/questoes/${duplicated.id}/editar`);
    } catch (err: any) {
      console.error('Erro ao duplicar questão:', err);
      alert('Erro ao duplicar questão: ' + (err.message || 'Desconhecido'));
    }
  };

  const handleTogglePublish = async (qId: string) => {
    try {
      const res = await questionService.togglePublish(qId);
      setQuestions((prev) =>
        prev.map((q) => (q.id === qId ? { ...q, status: res.status as any } : q))
      );
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleArchive = async (qId: string) => {
    if (!confirm('Deseja realmente arquivar esta questão? Ela deixará de ser visível para alunos.')) {
      return;
    }
    try {
      await questionService.archiveQuestion(qId);
      fetchQuestions();
    } catch (err) {
      console.error('Erro ao arquivar:', err);
    }
  };

  const handleResolveReport = async (reportId: string, resolutionStatus: 'resolved' | 'rejected') => {
    try {
      await questionService.resolveReport(reportId, resolutionStatus);
      fetchReports();
    } catch (err) {
      console.error('Erro ao resolver reporte:', err);
    }
  };

  const handleRunImport = async (dryRun: boolean) => {
    setIsImporting(true);
    setImportResult(null);
    try {
      const parsed = JSON.parse(importJson);
      const records = Array.isArray(parsed) ? parsed : [parsed];
      const result = await questionService.importBatch(records, dryRun);
      setImportResult(result);
      if (!dryRun && result.successCount > 0) {
        fetchQuestions();
      }
    } catch (err: any) {
      alert('JSON inválido ou erro no formato: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Topo Administrativo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Gestão do Banco de Questões
            </h1>
            <Badge variant="brand" size="sm">Admin</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Cadastre, edite, duplique e gerencie as questões do acervo com publicação controlada.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowImportModal(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Importar em Lote
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/questoes/nova')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nova Questão
          </Button>
        </div>
      </div>

      {/* Tabs: Questões vs Reportes de Alunos */}
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setCurrentTab('questions')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            currentTab === 'questions'
              ? 'text-brand-400 border-b-2 border-brand-500'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Questões Cadastradas
        </button>
        <button
          onClick={() => setCurrentTab('reports')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            currentTab === 'reports'
              ? 'text-brand-400 border-b-2 border-brand-500'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Flag className="w-4 h-4" />
          Reportes de Inconsistência
        </button>
      </div>

      {currentTab === 'questions' ? (
        <>
          {/* Barra de Filtros */}
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Buscar texto ou referência..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-border rounded-lg text-xs text-text-primary"
                />
              </div>

              <div>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-bg-surface border border-border rounded-lg p-2 text-xs text-text-primary"
                >
                  <option value="">Todos os status (publicado/rascunho)</option>
                  <option value="published">Apenas Publicadas</option>
                  <option value="draft">Apenas Rascunhos</option>
                  <option value="archived">Arquivadas</option>
                </select>
              </div>

              <div>
                <select
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-bg-surface border border-border rounded-lg p-2 text-xs text-text-primary"
                >
                  <option value="">Todas as disciplinas</option>
                  {filterData?.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={boardId}
                  onChange={(e) => {
                    setBoardId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-bg-surface border border-border rounded-lg p-2 text-xs text-text-primary"
                >
                  <option value="">Todas as bancas</option>
                  {filterData?.boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.acronym})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Tabela de Questões */}
          {loading ? (
            <div className="py-16">
              <LoadingState message="Carregando acervo de questões..." />
            </div>
          ) : questions.length === 0 ? (
            <EmptyState
              icon={<HelpCircle className="w-12 h-12 text-text-muted" />}
              title="Nenhuma questão encontrada"
              description="Cadastre uma nova questão ou altere os filtros de busca."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/admin/questoes/nova')}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Nova Questão
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="text-xs text-text-muted px-1">
                Total de <strong>{meta.total}</strong> questões cadastradas
              </div>

              <div className="overflow-x-auto bg-bg-surface border border-border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-elevated border-b border-border text-text-muted uppercase font-semibold">
                    <tr>
                      <th className="p-3.5">Enunciado & Disciplina</th>
                      <th className="p-3.5">Banca / Ano</th>
                      <th className="p-3.5">Dificuldade</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {questions.map((q) => (
                      <tr key={q.id} className="hover:bg-bg-elevated/40 transition-colors">
                        <td className="p-3.5 max-w-md">
                          <div className="flex items-center gap-2 mb-1">
                            {q.subjectName && (
                              <Badge variant="brand" size="sm">
                                {q.subjectName}
                              </Badge>
                            )}
                            {q.topicName && (
                              <span className="text-[11px] text-text-muted">
                                • {q.topicName}
                              </span>
                            )}
                          </div>
                          <p className="text-text-primary line-clamp-2 leading-relaxed font-normal">
                            {q.statement}
                          </p>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-semibold text-text-primary">
                            {q.boardAcronym || 'Banca'}
                          </span>{' '}
                          • <span className="text-text-muted">{q.year}</span>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <Badge
                            variant={
                              q.difficulty === 'easy'
                                ? 'success'
                                : q.difficulty === 'medium'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {q.difficulty === 'easy'
                              ? 'Fácil'
                              : q.difficulty === 'medium'
                              ? 'Média'
                              : q.difficulty === 'hard'
                              ? 'Difícil'
                              : 'Muito Difícil'}
                          </Badge>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <Badge
                            variant={
                              q.status === 'published'
                                ? 'success'
                                : q.status === 'draft'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {q.status === 'published'
                              ? 'Publicada'
                              : q.status === 'draft'
                              ? 'Rascunho'
                              : 'Arquivada'}
                          </Badge>
                        </td>

                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              label={q.status === 'published' ? 'Despublicar questão' : 'Publicar questão'}
                              onClick={() => handleTogglePublish(q.id)}
                              icon={
                                q.status === 'published' ? (
                                  <EyeOff className="w-4 h-4 text-warning-400" />
                                ) : (
                                  <Eye className="w-4 h-4 text-success-400" />
                                )
                              }
                            />
                            <IconButton
                              variant="ghost"
                              size="sm"
                              label="Duplicar como rascunho"
                              onClick={() => handleDuplicate(q.id)}
                              icon={<Copy className="w-4 h-4 text-brand-400" />}
                            />
                            <IconButton
                              variant="ghost"
                              size="sm"
                              label="Editar questão"
                              onClick={() => navigate(`/admin/questoes/${q.id}/editar`)}
                              icon={<Edit2 className="w-4 h-4 text-text-secondary hover:text-brand-400" />}
                            />
                            <IconButton
                              variant="ghost"
                              size="sm"
                              label="Arquivar questão"
                              onClick={() => handleArchive(q.id)}
                              icon={<Archive className="w-4 h-4 text-danger-400" />}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={meta.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs font-medium text-text-secondary px-3">
                    Página {meta.page} de {meta.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Aba de Reportes */
        <div className="space-y-4">
          {loadingReports ? (
            <div className="py-16">
              <LoadingState message="Carregando reportes de inconsistência..." />
            </div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<Flag className="w-12 h-12 text-text-muted" />}
              title="Nenhum reporte pendente"
              description="Nenhum aluno reportou inconsistências nas questões recentemente."
            />
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <Card key={rep.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={rep.status === 'pending' ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {rep.status === 'pending' ? 'Pendente' : rep.status}
                        </Badge>
                        <span className="text-xs font-bold text-text-primary">
                          Tipo: {rep.type}
                        </span>
                        <span className="text-xs text-text-muted">
                          por {rep.userName} ({rep.userEmail})
                        </span>
                      </div>
                      <p className="text-sm text-text-primary mt-2 font-medium">
                        "{rep.description}"
                      </p>
                      <p className="text-xs text-text-muted mt-1 line-clamp-1">
                        Questão: {rep.questionStatement}
                      </p>
                    </div>

                    {rep.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleResolveReport(rep.id, 'rejected')}
                        >
                          Rejeitar
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleResolveReport(rep.id, 'resolved')}
                        >
                          Resolver
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Importação em Lote */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importação em Lote de Questões"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-text-secondary">
            Insira o lote no formato JSON contendo o array de questões estruturadas:
          </p>

          <textarea
            rows={8}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder={`[
  {
    "boardAcronym": "Cebraspe",
    "subjectSlug": "lingua-portuguesa",
    "topicName": "Compreensão e Interpretação",
    "year": 2021,
    "difficulty": "medium",
    "statement": "...",
    "officialExplanation": "...",
    "options": [
      { "letter": "A", "text": "...", "isCorrect": true },
      { "letter": "B", "text": "...", "isCorrect": false }
    ]
  }
]`}
            className="w-full p-3 font-mono text-xs bg-bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />

          {importResult && (
            <div className="p-3 bg-bg-elevated border border-border rounded-xl text-xs space-y-1">
              <div className="font-bold text-text-primary">Resultado da Importação:</div>
              <div className="text-success-400">Sucessos: {importResult.successCount}</div>
              {importResult.errorCount > 0 && (
                <div className="text-danger-400">Erros: {importResult.errorCount}</div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!importJson.trim() || isImporting}
              onClick={() => handleRunImport(true)}
            >
              Simular (Dry-Run)
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!importJson.trim() || isImporting}
              isLoading={isImporting}
              onClick={() => handleRunImport(false)}
            >
              Importar Efetivamente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
