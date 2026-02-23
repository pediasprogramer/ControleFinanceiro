// frontend/src/pages/Login.tsx
import { useState } from "react";
import { loginUser } from "../services/api";
import { Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

const handleLogin = async () => {
  if (!email.trim() || !password.trim()) {
    setError("Preencha e-mail e senha.");
    return;
  }

  setError("");
  setLoading(true);

  try {
    console.log("Iniciando login com e-mail:", email.trim());

    const data = await loginUser(email.trim(), password);

    console.log("Resposta do backend:", data);

    const token = data?.token;

    if (token && typeof token === "string" && token.length > 20) {
      localStorage.setItem("token", token);
      console.log("Token salvo com sucesso:", token.substring(0, 20) + "...");

      // REDIRECIONAMENTO FORÇADO (ignora qualquer bug do React Router)
      console.log("Redirecionando para /dashboard...");
      window.location.href = "/dashboard";  // ← isso sempre funciona

      // Se quiser testar com navigate (comente a linha acima)
      // navigate("/dashboard", { replace: true });
    } else {
      console.warn("Token não encontrado na resposta:", data);
      setError("Login concluído, mas token não retornado corretamente.");
    }
  } catch (err: any) {
    console.error("Erro no login:", err);

    let mensagem = "Erro ao conectar com o servidor.";

    if (err.message?.includes("fetch failed") || err.message?.includes("timeout")) {
      mensagem = "Não foi possível conectar ao servidor. Verifique sua internet.";
    } else if (err.message?.includes("401") || err.message?.includes("incorretos")) {
      mensagem = "E-mail ou senha incorretos.";
    } else if (err.message?.includes("500")) {
      mensagem = "Erro interno no servidor. Tente novamente.";
    } else {
      mensagem = err.message || "Erro desconhecido.";
    }

    setError(mensagem);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl md:p-10 border border-gray-200">
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-800">
          Entrar na Conta
        </h2>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">E-mail</label>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 transition"
          />
        </div>

        <div className="mb-8">
          <label className="mb-2 block text-sm font-medium text-gray-700">Senha</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 transition"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full rounded-lg px-6 py-3 text-lg font-semibold text-white transition ${
            loading
              ? "cursor-not-allowed bg-blue-400"
              : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
          }`}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div className="mt-8 text-center text-sm text-gray-600">
          Ainda não tem conta?{" "}
          <Link
            to="/register"
            className="font-medium text-blue-600 underline hover:text-blue-800 transition"
          >
            Criar uma conta
          </Link>
        </div>
      </div>
    </div>
  );
}