import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// Interfaces
interface Orcamento {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  data: string;
  mes_ano: string;
}

interface GraficoData {
  name: string;
  value: number;
}

interface EvolucaoData {
  mes_ano: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

const COLORS = ["#10B981", "#EF4444"]; // verde = receitas, vermelho = despesas

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [evolucao, setEvolucao] = useState<EvolucaoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState<string>(getMesAtual());
  const [anoSelecionado, setAnoSelecionado] = useState<string>(new Date().getFullYear().toString());

  // Formulário
  const [tipo, setTipo] = useState<"receita" | "despesa">("receita");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataLancamento, setDataLancamento] = useState(getDataAtual());

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const inicializar = async () => {
      try {
        const userData = await apiFetch("/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userData);

        await carregarOrcamentos(token);
        await carregarEvolucao(token);
      } catch (err) {
        console.error("Erro ao inicializar dashboard:", err);
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    inicializar();
  }, [navigate, mesSelecionado, anoSelecionado]);

  const carregarOrcamentos = async (token: string) => {
    try {
      const data = await apiFetch(`/orcamentos?mes_ano=${mesSelecionado}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrcamentos(data || []);
    } catch (err) {
      console.error("Erro ao carregar orçamentos:", err);
    }
  };

  const carregarEvolucao = async (token: string) => {
    try {
      const orcamentosAno = await apiFetch(`/orcamentos?ano=${anoSelecionado}`, {
        headers: { Authorization: `Bearer ${token}` },
      }) as Orcamento[];

      const meses: string[] = [...new Set(orcamentosAno.map(o => o.mes_ano))].sort();

      const evolucaoData: EvolucaoData[] = meses.map((mes: string) => {
        const lancamentosMes: Orcamento[] = orcamentosAno.filter(o => o.mes_ano === mes);

        const receitas: number = lancamentosMes
          .filter(o => o.tipo === "receita")
          .reduce((sum: number, o: Orcamento) => sum + Math.abs(o.valor || 0), 0);

        const despesas: number = lancamentosMes
          .filter(o => o.tipo === "despesa")
          .reduce((sum: number, o: Orcamento) => sum + Math.abs(o.valor || 0), 0);

        return {
          mes_ano: mes,
          receitas,
          despesas,
          saldo: receitas - despesas,
        };
      });

      setEvolucao(evolucaoData);
    } catch (err) {
      console.error("Erro ao carregar evolução:", err);
    }
  };

  const adicionarLancamento = async () => {
    if (!descricao.trim() || !valor.trim() || !dataLancamento) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    const valorNum = Number(valor.replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) {
      alert("Valor inválido! Use números positivos.");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const mesAno = dataLancamento.slice(0, 7);

      await apiFetch("/orcamentos", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tipo,
          descricao: descricao.trim(),
          valor: tipo === "despesa" ? -valorNum : valorNum,
          data: dataLancamento,
          mes_ano: mesAno,
        }),
      });

      alert("Lançamento adicionado com sucesso!");
      setDescricao("");
      setValor("");
      setDataLancamento(getDataAtual());
      carregarOrcamentos(token!);
      carregarEvolucao(token!);
    } catch (err: any) {
      alert("Erro ao adicionar lançamento: " + (err.message || "Tente novamente."));
    }
  };

  const excluirLancamento = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;

    const token = localStorage.getItem("token");

    try {
      await apiFetch(`/orcamentos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Lançamento excluído com sucesso!");
      carregarOrcamentos(token!);
      carregarEvolucao(token!);
    } catch (err: any) {
      alert("Erro ao excluir lançamento: " + (err.message || "Tente novamente."));
    }
  };

  const exportarCSV = () => {
    const csvData = orcamentos.map(o => ({
      Data: new Date(o.data).toLocaleDateString("pt-BR"),
      Tipo: o.tipo === "receita" ? "Receita" : "Despesa",
      Descrição: o.descricao,
      Valor: `R$ ${Math.abs(o.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `lancamentos_${mesSelecionado}.csv`;
    link.click();
  };

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(orcamentos.map(o => ({
      Data: new Date(o.data).toLocaleDateString("pt-BR"),
      Tipo: o.tipo === "receita" ? "Receita" : "Despesa",
      Descrição: o.descricao,
      Valor: Math.abs(o.valor),
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    XLSX.writeFile(wb, `lancamentos_${mesSelecionado}.xlsx`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Cálculos para gráfico de pizza
  const totalReceitas = orcamentos
    .filter((o) => o.tipo === "receita")
    .reduce((sum, o) => sum + Math.abs(o.valor || 0), 0);

  const totalDespesas = orcamentos
    .filter((o) => o.tipo === "despesa")
    .reduce((sum, o) => sum + Math.abs(o.valor || 0), 0);

  const saldo = totalReceitas - totalDespesas;

  const dadosGrafico: GraficoData[] = [
    { name: "Receitas", value: totalReceitas },
    { name: "Despesas", value: totalDespesas },
  ].filter((item) => item.value > 0);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-lg">Carregando dados...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-800">Meu Controle Financeiro</h1>
        <div className="flex items-center gap-4">
          {user?.role === "Administrador" && (
            <button
              onClick={() => navigate("/admin")}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg transition font-medium"
            >
              Administração
            </button>
          )}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg transition font-medium"
          >
            Sair
          </button>
        </div>
      </nav>

      <main className="p-6 md:p-10 max-w-7xl mx-auto">
        {/* Saudação */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900">
            Olá, {user?.email?.split("@")[0] || "Usuário"}!
          </h2>
          <p className="text-gray-600 mt-1">
            Nível de acesso: {user?.role || "Usuário"}
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-5 rounded-xl shadow-sm">
          <label className="font-medium text-gray-700 text-lg">Filtrar por mês:</label>
          <input
            type="month"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />

          <label className="font-medium text-gray-700 text-lg ml-4">Ano:</label>
          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            {/* Adicione mais anos conforme necessário */}
          </select>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-green-700 mb-1">Receitas</h3>
            <p className="text-3xl font-bold text-green-800">
              R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-red-700 mb-1">Despesas</h3>
            <p className="text-3xl font-bold text-red-800">
              R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className={`rounded-xl p-6 shadow-sm hover:shadow-md transition border ${
            saldo >= 0 ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"
          }`}>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Saldo do mês</h3>
            <p className={`text-3xl font-bold ${
              saldo >= 0 ? "text-blue-800" : "text-red-800"
            }`}>
              R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Botões de exportação */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={exportarCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition font-medium"
          >
            Exportar CSV
          </button>
          <button
            onClick={exportarExcel}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-medium"
          >
            Exportar Excel
          </button>
        </div>

        {/* Gráfico de pizza */}
        {dadosGrafico.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 mb-10">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Distribuição Receitas × Despesas ({mesSelecionado})
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosGrafico}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={110}
                    dataKey="value"
                    // @ts-ignore
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {dadosGrafico.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center mb-10 text-gray-700">
            Nenhum lançamento registrado neste mês para exibir no gráfico.
          </div>
        )}

        {/* Gráfico de linha */}
        {evolucao.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-8 mb-10">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Evolução Receitas × Despesas ({anoSelecionado})
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes_ano" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  <Legend />
                  <Line type="monotone" dataKey="receitas" stroke="#10B981" name="Receitas" />
                  <Line type="monotone" dataKey="despesas" stroke="#EF4444" name="Despesas" />
                  <Line type="monotone" dataKey="saldo" stroke="#3B82F6" name="Saldo" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Formulário novo lançamento */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-10">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Adicionar Lançamento</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as "receita" | "despesa")}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
              <input
                type="date"
                value={dataLancamento}
                onChange={(e) => setDataLancamento(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Salário mensal, Supermercado, Conta de luz..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$)</label>
              <input
                type="text"
                value={valor}
                onChange={(e) => setValor(e.target.value.replace(/[^0-9,]/g, ""))}
                placeholder="0,00"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <button
            onClick={adicionarLancamento}
            className="mt-8 w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg transition font-semibold text-lg"
          >
            Adicionar Lançamento
          </button>
        </div>

        {/* Lista de lançamentos com exclusão */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            Lançamentos de {mesSelecionado || "selecione um mês"}
          </h3>

          {orcamentos.length === 0 ? (
            <p className="text-gray-500 text-center py-12 text-lg">
              Nenhum lançamento registrado neste mês.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-700 uppercase tracking-wider">
                      Valor (R$)
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-700 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orcamentos.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(o.data).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                            o.tipo === "receita" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {o.tipo === "receita" ? "Receita" : "Despesa"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{o.descricao}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <span className={o.valor >= 0 ? "text-green-600" : "text-red-600"}>
                          R$ {Math.abs(o.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => excluirLancamento(o.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Helpers
function getMesAtual() {
  const hoje = new Date();
  return hoje.toISOString().slice(0, 7); // YYYY-MM
}

function getDataAtual() {
  const hoje = new Date();
  return hoje.toISOString().slice(0, 10); // YYYY-MM-DD
}