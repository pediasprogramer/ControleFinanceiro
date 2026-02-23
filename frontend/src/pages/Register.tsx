import { useState } from "react"
import { registerUser } from "../services/api"
import { useNavigate, Link } from "react-router-dom"

function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleRegister = async () => {
    // Validação básica de campos vazios
    if (!email || !password) {
      setError("Preencha todos os campos obrigatórios.")
      return
    }

    try {
      setLoading(true)
      setError("")

      // Chamada para a API passando apenas as credenciais
      // A lógica de "role_id: 1" para o seu e-mail agora fica no Backend
      const data = await registerUser(email, password)
      
      if (data.message) {
        alert(data.message)
        navigate("/login")
      }
    } catch (err: any) {
      // Captura mensagens de erro específicas vindas do servidor ou do Supabase
      setError(err.message || "Erro ao conectar com o servidor. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-green-500 to-emerald-600">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Criar Conta
        </h2>

        {/* Exibição de alertas de erro */}
        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm font-medium border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail Corporativo</label>
            <input
              type="email"
              placeholder="seu.nome@esporte.gov.br"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              placeholder="********"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            className={`w-full text-white p-3 rounded-lg transition font-semibold shadow-md ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 active:scale-95"
            }`}
          >
            {loading ? "Processando..." : "Cadastrar"}
          </button>
        </div>

        <div className="text-center mt-6 text-sm text-gray-600 border-t pt-4">
          Já possui acesso?{" "}
          <Link to="/login" className="text-green-600 font-bold hover:underline">
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Register