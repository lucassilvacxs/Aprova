import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  PenTool,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  SearchInput,
  LoadingState,
  EmptyState,
} from '@/components/ui';
import { essayService, EssayItem } from '@/services/essay.service';

export const EssayHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [essays, setEssays] = useState<EssayItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  useEffect(() => {
    loadHistory();
  }, [selectedStatus]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await essayService.listUserEssays({
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        search: search.trim() || undefined,
      });
      setEssays(data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <History className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-text-primary">Meu Histórico de Redações</h1>
          </div>
          <p className="text-text-secondary text-sm">
            Acompanhe todas as suas redações escritas, notas por critérios e pareceres pedagógicos recebidos.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/redacao/temas')}
          leftIcon={<PenTool className="w-4 h-4" />}
        >
          Praticar Novo Tema
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por título do tema ou da redação..."
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-subtle text-xs">
          <span className="text-text-secondary font-medium mr-1">Filtrar por Status:</span>
          {[
            { value: 'ALL', label: 'Todas' },
            { value: 'DRAFT', label: 'Rascunhos' },
            { value: 'SUBMITTED', label: 'Em Correção' },
            { value: 'CORRECTED', label: 'Corrigidas' },
          ].map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => setSelectedStatus(st.value)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedStatus === st.value
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Lista de Redações */}
      {loading ? (
        <div className="py-12">
          <LoadingState message="Carregando histórico de redações..." />
        </div>
      ) : essays.length === 0 ? (
        <EmptyState
          title="Nenhuma redação encontrada"
          description="Você ainda não escreveu nenhuma redação com os filtros selecionados."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/redacao/temas')}
            >
              Escolher um Tema
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {essays.map((essay) => {
            const isCorrected = essay.status === 'CORRECTED';
            const isDraft = essay.status === 'DRAFT';

            return (
              <Card
                key={essay.id}
                className="p-5 hover:border-brand-500/40 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          isCorrected
                            ? 'success'
                            : isDraft
                            ? 'warning'
                            : 'brand'
                        }
                        size="sm"
                      >
                        {isCorrected ? 'Corrigida' : isDraft ? 'Rascunho' : 'Em Avaliação'}
                      </Badge>

                      {essay.promptCategory && (
                        <span className="text-xs text-text-muted px-2 py-0.5 rounded bg-bg-elevated">
                          {essay.promptCategory}
                        </span>
                      )}

                      {essay.contestTitle && (
                        <span className="text-xs text-text-muted">
                          • {essay.contestTitle}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-text-primary">
                      {essay.title || essay.promptTitle || 'Redação Sem Título'}
                    </h3>

                    {essay.promptTitle && essay.title && (
                      <p className="text-xs text-text-secondary">
                        Tema: {essay.promptTitle}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted pt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(essay.updatedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div>
                        {essay.wordCount} palavras • ~{essay.lineCount} linhas
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-border-subtle">
                    {isCorrected && (
                      <div className="text-left md:text-right">
                        <span className="text-lg font-bold text-emerald-500">
                          {essay.totalScore}/{essay.maxScore || 100}
                        </span>
                        <span className="block text-xs text-text-muted">
                          {essay.percentage}% aproveitamento
                        </span>
                      </div>
                    )}

                    <Button
                      variant={isDraft ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (isDraft) navigate(`/redacao/${essay.id}/escrever`);
                        else navigate(`/redacao/${essay.id}`);
                      }}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {isDraft ? 'Continuar Escrita' : isCorrected ? 'Ver Correção' : 'Ver Redação'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
