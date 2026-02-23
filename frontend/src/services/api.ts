// frontend/src/services/api.ts

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

// Função auxiliar (trata erro e JSON automaticamente)
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorMessage = data?.message || `Erro ${res.status} na requisição`;
    const err = new Error(errorMessage);
    (err as any).status = res.status;
    (err as any).response = data;
    throw err;
  }

  return data;
}

export async function registerUser(email: string, password: string) {
  if (!email.trim() || !password.trim()) {
    throw new Error("E-mail e senha são obrigatórios.");
  }

  try {
    const data = await apiFetch("/register", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    });

    return data;
  } catch (err: any) {
    if (err.status === 409) {
      throw new Error("Este e-mail já está cadastrado.");
    }
    throw err;
  }
}

export async function loginUser(email: string, password: string) {
  if (!email.trim() || !password.trim()) {
    throw new Error("E-mail e senha são obrigatórios.");
  }

  try {
    const data = await apiFetch("/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    });

    return data; // Deve retornar { token: "eyJ..." }
  } catch (err: any) {
    throw err; // O erro vai para o catch do Login.tsx
  }
}

export async function getDashboard(token: string) {
  if (!token) {
    throw new Error("Token não encontrado. Faça login novamente.");
  }

  try {
    const data = await apiFetch("/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return data;
  } catch (err: any) {
    if (err.status === 401 || err.status === 403) {
      localStorage.removeItem("token");
      throw new Error("Sessão expirada. Faça login novamente.");
    }
    throw err;
  }
}