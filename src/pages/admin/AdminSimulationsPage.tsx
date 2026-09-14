import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock3,
  Plus,
  Edit2,
  Copy,
  Archive,
  Eye,
  EyeOff,
  Search,
  Shield,
} from 'lucide-react';
import { simulationService, SimulationItem } from '@/services/simulation.service';
import { contestService, ContestItem } from '@/services/contest.service';

export const AdminSimulationsPage: React.FC = () => {
  const navigate = useNavigate();

  const [simulations, setSimulations] = useState<SimulationItem[]>([]);
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContest, setSelectedContest] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [simsData, contestsData] = await Promise.all([
        simulationService.list({
          contestId: selectedContest || undefined,
          status: selectedStatus || undefined,
          search: search || undefined,
        }),
        contestService.getContests().catch(() => []),
      ]);
      setSimulations(simsData);
      setContests(contestsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedContest, selectedStatus]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleTogglePublish = async (sim: SimulationItem) => {
    try {
      setActionLoading(sim.id);
      if (sim.status === 'published') {
        await simulationService.adminUnpublish(sim.id);
      } else {
        await simulationService.adminPublish(sim.id);
      }
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      setActionLoading(id);
      await simulationService.adminDuplicate(id);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Deseja realmente arquivar este simulado?')) return;
    try {
      setActionLoading(id);
      await simulationService.adminArchive(id);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Header */}
      <div className="bg-bg-surface border border-border p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Gestão de Simulados (Admin)</span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary">
            Gerenciamento de Simulados
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Crie provas fixas com curadoria manual ou configure geradores aleatórios por filtros.
          </p>
        </div>

        <button
          onClick={() => navigate('/admin/simulados/novo')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Simulado</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-surface p-4 rounded-2xl border border-border">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={selectedContest}
            onChange={(e) => setSelectedContest(e.target.value)}
            aria-label="Filtrar por concurso"
            className="px-3 py-1.5 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
          >
            <option value="">Todos Concursos</option>
            {contests.map((c) => (
              <option key={c.id} value={c.id}>
                {c.acronym ? `${c.acronym} — ${c.agencyName}` : c.agencyName}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filtrar por status"
            className="px-3 py-1.5 rounded-xl bg-bg-elevated border border-border text-text-primary text-xs focus:outline-none focus:border-brand-500"
          >
            <option value="">Todos os Status</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
            <option value="archived">Arquivados</option>
          </select>
        </div>

        <div className="text-xs text-text-muted">
          Total: <strong>{simulations.length}</strong> simulados
        </div>
      </div>

      {/* Tabela de Simulados */}
      <div className="bg-bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 bg-bg-elevated rounded-xl animate-pulse" />
            ))}
          </div>
        ) : simulations.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Clock3 className="w-8 h-8 text-text-muted mx-auto" />
            <p className="text-text-secondary text-xs font-semibold">Nenhum simulado cadastrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-elevated/60 text-text-secondary uppercase tracking-wider font-bold border-b border-border">
                <tr>
                  <th className="py-3.5 px-4">Simulado</th>
                  <th className="py-3.5 px-4">Concurso</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Questões</th>
                  <th className="py-3.5 px-4">Tempo</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {simulations.map((sim) => (
                  <tr key={sim.id} className="hover:bg-bg-elevated/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-text-primary">{sim.title}</div>
                      <div className="text-[11px] text-text-muted truncate max-w-xs">
                        {sim.description || 'Sem descrição'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-text-primary">
                      {sim.agencyAcronym || 'Geral'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-bg-elevated font-semibold text-[11px] text-text-secondary">
                        {sim.type === 'FIXED' ? 'Fixo' : sim.type === 'RANDOM' ? 'Aleatório' : 'Custom'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-text-primary">
                      {sim.totalQuestions}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {sim.durationMinutes} min
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          sim.status === 'published'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : sim.status === 'draft'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {sim.status === 'published' ? 'Publicado' : sim.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => navigate(`/admin/simulados/${sim.id}/editar`)}
                        className="p-1.5 rounded-lg bg-bg-elevated hover:bg-bg-subtle text-text-secondary hover:text-text-primary"
                        title="Editar simulado"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        disabled={actionLoading === sim.id}
                        onClick={() => handleTogglePublish(sim)}
                        className="p-1.5 rounded-lg bg-bg-elevated hover:bg-bg-subtle text-text-secondary hover:text-text-primary"
                        title={sim.status === 'published' ? 'Despublicar' : 'Publicar'}
                      >
                        {sim.status === 'published' ? (
                          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>

                      <button
                        disabled={actionLoading === sim.id}
                        onClick={() => handleDuplicate(sim.id)}
                        className="p-1.5 rounded-lg bg-bg-elevated hover:bg-bg-subtle text-text-secondary hover:text-text-primary"
                        title="Duplicar simulado"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {sim.status !== 'archived' && (
                        <button
                          disabled={actionLoading === sim.id}
                          onClick={() => handleArchive(sim.id)}
                          className="p-1.5 rounded-lg bg-bg-elevated hover:bg-rose-500/20 text-text-secondary hover:text-rose-400"
                          title="Arquivar simulado"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
