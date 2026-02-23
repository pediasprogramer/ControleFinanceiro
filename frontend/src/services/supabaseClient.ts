// frontend/src/services/supabaseClient.ts

import { createClient } from '@supabase/supabase-js';  // ← este import deve ser o que está dando erro

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string;

// Validação para debug (abra o console do navegador após rodar o app)
if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL não encontrado! Verifique .env');
}
if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY não encontrado! Verifique .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);