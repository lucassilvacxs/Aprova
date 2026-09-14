import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Edit3,
  Award,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Card, Badge, Button, SectionHeader, LoadingState, StatCard } from '@/components/ui';
import { essayService, EssayItem } from '@/services/essay.service';

export const AdminEssaysPage: React.FC = () => {
  const navigate = useNavigate();
  const [essays, setEssays] = useState<EssayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CORRECTED' | 'DRAFT'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  const loadQueue = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await essayService.listAdminQueue();
      setEssays(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar fila de redações');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const stats = useMemo(() => {
    const total = essays.length;
    const pending = essays.filter((e) => e.status === 'SUBMITTED' || e.status === 'UNDER_REVIEW').length;
    const corrected = essays.filter((e) => e.status === 'CORRECTED').length;
    const drafts = essays.filter((e) => e.status === 'DRAFT').length;
    const avgScore =
      corrected > 0
        ? (
            essays
              .filter((e) => e.score !== null && e.score !== undefined)
              .reduce((acc, curr) => acc + Number(curr.score || 0), 0) / corrected
          ).toFixed(1)
        : '-';

    return { total, pending, corrected, drafts, avgScore };
  }, [essays]);

  const filteredEssays = useMemo(() => {
    return essays.filter((item) => {
      // Status filter
      if (statusFilter === 'PENDING') {
        if (item.status !== 'SUBMITTED' && item.status !== 'UNDER_REVIEW') return false;
      } else if (statusFilter === 'CORRECTED') {
        if (item.status !== 'CORRECTED') return false;
      } else if (statusFilter === 'DRAFT') {
        if (item.status !== 'DRAFT') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q) || false;
        const matchesPrompt = item.promptTitle?.toLowerCase().includes(q) || false;
        const matchesStudent = item.studentName?.toLowerCase().includes(q) || false;
        const matchesEmail = item.studentEmail?.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesPrompt && !matchesStudent && !matchesEmail) return false;
      }

      return true;
    });
  }, [essays, statusFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Carregando fila de redações para avaliação..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Bancada de Correção de Redações"
        subtitle="Gerencie envios de alunos, realize avaliações com base nos critérios de bancas e emita notas com feedback detalhado."
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aguardando Correção"
          value={stats.pending}
          icon={<Clock className="w-4 h-4" />}
          colorKey="amber"
        />
        <StatCard
          label="Redações Corrigidas"
          value={stats.corrected}
          icon={<CheckCircle2 className="w-4 h-4" />}
          colorKey="green"
        />
        <StatCard
          label="Média Geral das Notas"
          value={stats.avgScore !== '-' ? `${stats.avgScore} pts` : 'N/A'}
          icon={<Award className="w-4 h-4" />}
          colorKey="purple"
        />
        <StatCard
          label="Total de Registros"
          value={stats.total}
          icon={<FileText className="w-4 h-4" />}
          colorKey="blue"
        />
      </div>

      {/* Filter Tabs & Search */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-text-muted hover:text-text-primary bg-surface-hover/30'
              }`}
            >
              Aguardando Correção ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter('CORRECTED')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'CORRECTED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-text-muted hover:text-text-primary bg-surface-hover/30'
              }`}
            >
              Corrigidas ({stats.corrected})
            </button>
            <button
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'DRAFT'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-text-muted hover:text-text-primary bg-surface-hover/30'
              }`}
            >
              Rascunhos ({stats.drafts})
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/40'
                  : 'text-text-muted hover:text-text-primary bg-surface-hover/30'
              }`}
            >
              Todas ({stats.total})
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por tema ou aluno..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-surface-card border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>
      </Card>

      {/* Essays Table / Queue */}
      {error && (
        <Card className="p-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {filteredEssays.length === 0 ? (
        <Card className="p-6 text-center py-12">
          <FileText className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-lg font-semibold text-text-primary">Nenhuma redação encontrada</p>
          <p className="text-sm text-text-muted max-w-sm mx-auto mt-1">
            Não há textos correspondentes aos filtros selecionados no momento.
          </p>
        </Card>
      ) : (
        <Card noPadding className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-surface-hover/40 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  <th className="py-3.5 px-4">Estudante</th>
                  <th className="py-3.5 px-4">Tema / Proposta</th>
                  <th className="py-3.5 px-4">Concurso</th>
                  <th className="py-3.5 px-4">Data Envio</th>
                  <th className="py-3.5 px-4">Extensão</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Nota</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-sm">
                {filteredEssays.map((essay) => {
                  const isPending = essay.status === 'SUBMITTED' || essay.status === 'UNDER_REVIEW';

                  return (
                    <tr
                      key={essay.id}
                      className="hover:bg-surface-hover/20 transition-colors group cursor-pointer"
                      onClick={() => {
                        if (isPending) {
                          navigate(`/admin/redacoes/${essay.id}/corrigir`);
                        } else {
                          navigate(`/redacao/${essay.id}`);
                        }
                      }}
                    >
                      {/* Estudante */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-xs">
                            {essay.studentName?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary group-hover:text-brand-primary transition-colors">
                              {essay.studentName || 'Aluno'}
                            </p>
                            <p className="text-xs text-text-muted">{essay.studentEmail || 'Sem email'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tema */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-medium text-text-primary line-clamp-1">
                          {essay.promptTitle || essay.title || 'Tema sem título'}
                        </p>
                        <p className="text-xs text-text-muted line-clamp-1 italic">
                          "{essay.title || 'Sem título'}"
                        </p>
                      </td>

                      {/* Concurso */}
                      <td className="py-3.5 px-4">
                        <Badge variant="neutral" size="sm">
                          {essay.contestTitle || essay.category || 'Geral'}
                        </Badge>
                      </td>

                      {/* Data Envio */}
                      <td className="py-3.5 px-4 text-text-muted text-xs">
                        {essay.submittedAt
                          ? new Date(essay.submittedAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Não submetida'}
                      </td>

                      {/* Extensão */}
                      <td className="py-3.5 px-4 text-text-muted text-xs">
                        <div>{essay.wordCount || 0} palavras</div>
                        <div className="text-[11px] opacity-75">{essay.lineCount || 0} linhas</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {essay.status === 'CORRECTED' && (
                          <Badge variant="success" size="sm">
                            Corrigida
                          </Badge>
                        )}
                        {essay.status === 'SUBMITTED' && (
                          <Badge variant="warning" size="sm">
                            Aguardando
                          </Badge>
                        )}
                        {essay.status === 'UNDER_REVIEW' && (
                          <Badge variant="info" size="sm">
                            Em Correção
                          </Badge>
                        )}
                        {essay.status === 'DRAFT' && (
                          <Badge variant="neutral" size="sm">
                            Rascunho
                          </Badge>
                        )}
                      </td>

                      {/* Nota */}
                      <td className="py-3.5 px-4 text-center">
                        {essay.status === 'CORRECTED' && essay.score !== null ? (
                          <span className="font-bold text-emerald-400">
                            {Number(essay.score).toFixed(1)}
                            <span className="text-xs text-text-muted font-normal">/{essay.maxScore || 20}</span>
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {isPending ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => navigate(`/admin/redacoes/${essay.id}/corrigir`)}
                            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                          >
                            Corrigir
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/redacao/${essay.id}`)}
                            rightIcon={<ChevronRight className="w-4 h-4" />}
                          >
                            Ver
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
