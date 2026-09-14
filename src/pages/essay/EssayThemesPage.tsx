import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Sparkles,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  SearchInput,
  LoadingState,
  EmptyState,
} from '@/components/ui';
import { essayService, EssayPrompt } from '@/services/essay.service';

export const EssayThemesPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<EssayPrompt[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [generatingRandom, setGeneratingRandom] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, [selectedCategory, selectedDifficulty, selectedStatus]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const data = await essayService.listPrompts({
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        difficulty: selectedDifficulty !== 'ALL' ? selectedDifficulty : undefined,
        userStatus: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: search.trim() || undefined,
      });
      setPrompts(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar temas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPrompts();
  };

  const handleRandomTheme = async () => {
    setGeneratingRandom(true);
    try {
      const prompt = await essayService.getRandomPrompt({
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        difficulty: selectedDifficulty !== 'ALL' ? selectedDifficulty : undefined,
      });
      if (prompt && prompt.id) {
        navigate(`/redacao/temas/${prompt.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao sortear tema.');
    } finally {
      setGeneratingRandom(false);
    }
  };

  const categories = [
    'ALL',
    'Segurança Pública',
    'Direitos Humanos',
    'Tecnologia',
    'Meio Ambiente',
  ];

  const difficulties = [
    { value: 'ALL', label: 'Todas as Dificuldades' },
    { value: 'EASY', label: 'Fácil' },
    { value: 'MEDIUM', label: 'Média' },
    { value: 'HARD', label: 'Difícil' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-text-primary">Catálogo de Temas de Redação</h1>
          </div>
          <p className="text-text-secondary text-sm">
            Explore temas oficiais e simulados com textos motivadores completos, propostas detalhadas e critérios de banca.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleRandomTheme}
          disabled={generatingRandom}
          leftIcon={<Sparkles className="w-4 h-4" />}
        >
          {generatingRandom ? 'Sorteando...' : 'Sortear Tema Aleatório'}
        </Button>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por título ou tema..."
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border-subtle">
          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          {/* Categorias Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                {cat === 'ALL' ? 'Todas as Áreas' : cat}
              </button>
            ))}
          </div>

          {/* Dificuldade Select */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="text-xs bg-bg-surface border border-border-subtle rounded-lg px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {difficulties.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          {/* Status do Aluno Select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-bg-surface border border-border-subtle rounded-lg px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos os Status</option>
            <option value="not_started">Não Feitos</option>
            <option value="in_progress">Em Rascunho</option>
            <option value="completed">Concluídos</option>
          </select>
        </div>
      </Card>

      {/* Grid de Temas */}
      {loading ? (
        <div className="py-12">
          <LoadingState message="Carregando temas..." />
        </div>
      ) : prompts.length === 0 ? (
        <EmptyState
          title="Nenhum tema encontrado"
          description="Tente alterar os filtros selecionados ou o termo da busca para encontrar outros temas."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedDifficulty('ALL');
                setSelectedStatus('all');
                setSearch('');
              }}
            >
              Limpar Filtros
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {prompts.map((prompt) => {
            const hasDraft = prompt.studentStatus === 'in_progress';
            const isCompleted = prompt.studentStatus === 'completed';

            return (
              <Card
                key={prompt.id}
                className="p-5 flex flex-col justify-between hover:border-brand-500/40 transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge variant="brand" size="sm">
                      {prompt.category || 'Geral'}
                    </Badge>

                    {hasDraft && (
                      <Badge variant="warning" size="sm">
                        Em Rascunho
                      </Badge>
                    )}

                    {isCompleted && (
                      <Badge variant="success" size="sm">
                        Concluído
                      </Badge>
                    )}

                    {!hasDraft && !isCompleted && (
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{prompt.estimatedMinutes} min</span>
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-text-primary text-base leading-snug group-hover:text-brand-500 transition-colors">
                    {prompt.title}
                  </h3>

                  <p className="text-xs text-text-secondary line-clamp-3 mt-2.5">
                    {prompt.statement}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-border-subtle flex items-center justify-between">
                  <div className="text-xs text-text-muted">
                    <span className="font-medium text-text-secondary">{prompt.minLines}-{prompt.maxLines}</span> linhas
                    <span className="mx-1.5">•</span>
                    <span>{prompt.minWords}-{prompt.maxWords} palavras</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/redacao/temas/${prompt.id}`)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Ver Proposta
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
