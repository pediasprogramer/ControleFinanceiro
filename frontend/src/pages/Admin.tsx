// frontend/src/pages/Admin.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

// Define a base URL igual ao api.ts (para não depender de export)
const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

interface User {
  id: string;
  email: string;
  role_id: number;
  updated_at: string;
}

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAndLoad = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate('/login');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Verifica token e role via backend usando API_BASE
        const res = await fetch(`${API_BASE}/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem("token");
            navigate('/login');
            return;
          }

          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Erro ${res.status} ao verificar permissão`);
        }

        const { role } = await res.json();

        if (role !== 'Administrador') {
          alert('Acesso restrito a administradores.');
          navigate('/dashboard');
          return;
        }

        // Carrega lista de usuários do Supabase
        const { data, error: supabaseError } = await supabase
          .from('profiles')
          .select('id, email, role_id, updated_at')
          .order('email');

        if (supabaseError) throw supabaseError;

        setUsers(data || []);
      } catch (err: any) {
        console.error('Erro no Admin:', err);
        setError(err.message || 'Erro ao carregar dados. Verifique sua conexão ou tente novamente.');
        if (err.message?.includes('401') || err.message?.includes('token')) {
          localStorage.removeItem("token");
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndLoad();
  }, [navigate]);

  const updateRole = async (userId: string, newRole: number) => {
    if (!confirm(`Tem certeza que deseja alterar o role para ${newRole}?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role_id: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Atualiza lista local
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role_id: newRole } : u));
      alert('Nível de acesso atualizado com sucesso!');
    } catch (err: any) {
      alert('Erro ao atualizar role: ' + (err.message || 'Tente novamente'));
      console.error('Erro updateRole:', err);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando usuários...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-600">
        <p className="text-xl mb-4">Erro</p>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Página de Administração</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.role_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <select
                    value={user.role_id}
                    onChange={e => updateRole(user.id, Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1}>1 - Acesso Total</option>
                    <option value={2}>2 - Editar</option>
                    <option value={3}>3 - Editar partes específicas</option>
                    <option value={4}>4 - Apenas Ler</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <p className="text-center py-8 text-gray-500">Nenhum usuário encontrado.</p>
        )}
      </div>
    </div>
  );
}