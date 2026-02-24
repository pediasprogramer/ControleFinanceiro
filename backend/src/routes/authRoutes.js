import express from "express";
import { register, login } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createServerClient } from '@supabase/ssr';

// Chave anon hard-coded (do seu supabaseClient.js) para leitura
// Configuração Supabase (usa .env do backend/Render)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://knjmnjsqszwicequojam.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[authRoutes] SUPABASE_URL:', SUPABASE_URL ? 'definida' : 'ausente');
console.log('[authRoutes] SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? `definida (length: ${SUPABASE_ANON_KEY.length})` : 'NÃO DEFINIDA');
console.log('[authRoutes] SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? `definida (length: ${SUPABASE_SERVICE_KEY.length})` : 'NÃO DEFINIDA');

// Client para leitura (anon key)
function getSupabaseRead() {
  if (!SUPABASE_ANON_KEY) throw new Error('SUPABASE_KEY (anon) não definida');
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [], setAll: () => {} }
  });
}

// Client para escrita (service_role - ignora RLS)
function getSupabaseAdmin() {
  if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    cookies: { getAll: () => [], setAll: () => {} }
  });
}

// Rotas públicas
router.post("/register", register);
router.post("/login", login);

// Rotas básicas protegidas
router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({ message: "Área protegida", user: req.user });
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({ email: req.user.email, role: req.user.role });
});

// GET /orcamentos - usa anon para leitura
router.get("/orcamentos", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const mesAno = req.query.mes_ano;
  console.log(`[GET /orcamentos] userId: ${userId}, mesAno: ${mesAno || 'todos'}`);

  try {
    const supabase = getSupabaseRead();
    let query = supabase.from("orcamentos").select("*").eq("user_id", userId);
    if (mesAno) query = query.eq("mes_ano", mesAno);

    const { data, error } = await query.order("data", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('[GET /orcamentos] erro:', err.message || err);
    res.status(500).json({ message: "Erro ao carregar lançamentos" });
  }
});

// POST /orcamentos - usa service_role para insert
router.post("/orcamentos", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { tipo, descricao, valor, data, mes_ano } = req.body;

  if (!tipo || !descricao || !valor || !data || !mes_ano) {
    return res.status(400).json({ message: "Campos obrigatórios faltando" });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("orcamentos").insert({
      user_id: userId,
      tipo,
      descricao,
      valor: Number(valor),
      data,
      mes_ano,
    });

    if (error) throw error;

    res.status(201).json({ message: "Adicionado com sucesso!" });
  } catch (err) {
    console.error('[POST /orcamentos] erro:', err.message || err);
    res.status(500).json({ message: "Erro ao adicionar" });
  }
});

// DELETE /orcamentos/:id - usa service_role
router.delete("/orcamentos/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!id) return res.status(400).json({ message: "ID obrigatório" });

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("orcamentos").delete().eq("id", id).eq("user_id", userId);

    if (error) throw error;

    res.json({ message: "Excluído com sucesso!" });
  } catch (err) {
    console.error('[DELETE /orcamentos] erro:', err.message || err);
    res.status(500).json({ message: "Erro ao excluir" });
  }
});

export default router;