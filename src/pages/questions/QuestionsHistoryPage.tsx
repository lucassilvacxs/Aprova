import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  Badge,
  Button,
  LoadingState,
  EmptyState,
} from '@/components/ui';
import { questionService } from '@/services/question.service';

export const QuestionsHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filterCorrect, setFilterCorrect] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await questionService.getAttemptHistory({
        isCorrect: filterCorrect,
        page,
        limit: 20,
      });
      setHistoryItems(res.items);
      setMeta(res.meta);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, filterCorrect]);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/questoes')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Voltar para Questões
            </Button>
            <h1 className="text-xl font-extrabold text-text-primary tracking-tight">
              Histórico de Resoluções
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Registro cronológico das questões que você resolveu na plataforma.
          </p>
        </div>

        {/* Filtro rápido: Todas / Acertos / Erros */}
        <div className="flex items-center gap-1.5 p-1 bg-bg-surface border border-border rounded-xl">
          <button
            onClick={() => {
              setFilterCorrect(undefined);
              setPage(1);
            }}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filterCorrect === undefined
                ? 'bg-brand-500/20 text-brand-300 font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => {
              setFilterCorrect(true);
              setPage(1);
            }}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filterCorrect === true
                ? 'bg-success-500/20 text-success-300 font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-success-400" />
            Acertos
          </button>
          <button
            onClick={() => {
              setFilterCorrect(false);
              setPage(1);
            }}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filterCorrect === false
                ? 'bg-danger-500/20 text-danger-300 font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-danger-400" />
            Erros
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="py-16">
          <LoadingState message="Carregando histórico de resoluções..." />
        </div>
      ) : historyItems.length === 0 ? (
        <EmptyState
          icon={<History className="w-12 h-12 text-text-muted" />}
          title="Nenhuma resolução registrada"
          description="Você ainda não resolveu nenhuma questão com o filtro selecionado."
          action={
            <Button variant="primary" size="sm" onClick={() => navigate('/questoes')}>
              Ir para o Banco de Questões
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-text-muted px-1">
            Total de <strong>{meta.total}</strong> tentativas registradas
          </div>

          {historyItems.map((item) => {
            const dateStr = new Date(item.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card
                key={item.id}
                className="p-4 hover:border-brand-500/40 transition-all cursor-pointer group"
                onClick={() => navigate(`/questoes/${item.questionId}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="pt-1">
                      {item.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-success-400 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-danger-400 shrink-0" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {item.subjectName && (
                          <Badge variant="brand" size="sm">
                            {item.subjectName}
                          </Badge>
                        )}
                        <Badge variant="neutral" size="sm">
                          {item.boardAcronym || 'Banca'} • {item.year}
                        </Badge>
                        <span className="text-text-muted flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {item.durationSeconds}s
                        </span>
                        <span className="text-text-muted">• {dateStr}</span>
                      </div>

                      <p className="text-sm text-text-primary line-clamp-2 leading-relaxed">
                        {item.statement}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-brand-400 font-medium group-hover:translate-x-0.5 transition-transform shrink-0 pt-1">
                    <span>Rever</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Card>
            );
          })}

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
    </div>
  );
};
