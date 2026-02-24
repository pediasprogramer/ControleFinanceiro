// backend/src/supabaseServerClient.js
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.SUPABASE_URL || 'https://knjmnjsqszwicequojam.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;  // ← chave SECRET, NUNCA no frontend!

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não definida no .env do backend');
}

export function createSupabaseServer() {
  return createServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      getAll() {
        // Em Express puro, você pode ignorar cookies ou implementar manualmente se precisar de auth refresh
        return [];
      },
      setAll() {
        // Ignorar por agora (ou implementar se precisar)
      },
    },
  });
}