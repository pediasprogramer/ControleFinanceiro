// backend/src/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// Chaves hard-coded do frontend (temporário - depois volte para .env)
const supabaseUrl = 'https://knjmnjsqszwicequojam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtuam1uanNxc3p3aWNlcXVvamFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MTQ3ODAsImV4cCI6MjA4NzE5MDc4MH0.wK0M7cwR6CASVPsI-J0wEYL2i6Stcq2hlVOe8nbgM54';

console.log('Supabase client no backend (hard-coded):');
console.log('   URL:', supabaseUrl);
console.log('   Key (primeiros 10 chars):', supabaseKey.substring(0, 10) + '...');

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url, options) => fetch(url, { ...options, timeout: 30000 })  // 30 segundos
  }
});

console.log('Supabase client criado com sucesso (hard-coded)');