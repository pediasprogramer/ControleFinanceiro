// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api"; // função auxiliar do api.ts
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Interface simples para os dados do gráfico (resolve erro no entry)
interface GraficoData {
  name: string;
  value: number;
}

const COLORS = ["#10B981", "#EF4444"]; // verde = receitas, vermelho = despesas

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState<string>(getMesAtual());

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
        // Opcional: pegar dados do usuário logado via backend
        const userData = await apiFetch("/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(userData);

        await carregarOrcamentos(token);
      } catch (err) {
        console.error("Erro ao inicializar dashboard:", err);
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    inicializar();
  }, [navigate, mesSelecionado]);

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
    } catch (err: any) {
      alert("Erro ao adicionar lançamento: " + (err.message || "Tente novamente."));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Cálculos
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

        {/* Filtro de mês */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-5 rounded-xl shadow-sm">
          <label className="font-medium text-gray-700 text-lg">Filtrar por mês:</label>
          <input
            type="month"
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
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

        {/* Gráfico - abordagem simples e sem erro de tipagem */}
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
                    // Label simples - sem tipagem explícita para evitar erro
                    label={({ name, percent }) => {
                      const p = Number(percent);
                      if (isNaN(p)) return name;
                      return `${name} ${(p * 100).toFixed(0)}%`;
                    }}
                  >
                    {dadosGrafico.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    // Formatter simples e seguro
                    formatter={(value) => {
                      const num = Number(value);
                      if (isNaN(num)) return "R$ 0,00";
                      return `R$ ${num.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`;
                    }}
                  />
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

        {/* Lista de lançamentos */}
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
                            o.tipo === "receita"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
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