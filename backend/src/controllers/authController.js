import express from "express";
import { register, login } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createServerClient } from '@supabase/ssr';

const router = express.Router();

// Configuração Supabase Admin (service_role) – pega do .env
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://knjmnjsqszwicequojam.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Backend authRoutes: SUPABASE_URL carregada?', !!SUPABASE_URL);
console.log('Backend authRoutes: SUPABASE_SERVICE_KEY carregada?', !!SUPABASE_SERVICE_KEY ? 'SIM (comprimento: ' + SUPABASE_SERVICE_KEY.length + ')' : 'NÃO - ERRO CRÍTICO');

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERRO CRÍTICO: SUPABASE_SERVICE_ROLE_KEY não definida no .env ou Render Environment');
}

// Client admin (ignora RLS)
function getSupabaseAdmin() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('Chave service_role não configurada - verifique Render Environment Variables');
  }
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    global: { fetch: (url, options) => fetch(url, { ...options, timeout: 30000 }) }
  });
}

// Rotas públicas
router.post("/register", register);
router.post("/login", login);

// Rotas protegidas básicas
router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({ message: "Bem-vindo à área protegida", user: req.user });
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    email: req.user.email,
    role: req.user.role
  });
});

// GET /orcamentos
router.get("/orcamentos", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const mesAno = req.query.mes_ano;

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("orcamentos").select("*").eq("user_id", userId);

    if (mesAno) {
      query = query.eq("mes_ano", mesAno);
    }

    const { data, error } = await query.order("data", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error("GET /orcamentos erro:", err.message || err);
    res.status(500).json({ message: "Erro ao carregar lançamentos: " + (err.message || 'detalhe desconhecido') });
  }
});

// POST /orcamentos
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

    res.status(201).json({ message: "Lançamento adicionado!" });
  } catch (err) {
    console.error("POST /orcamentos erro:", err.message || err);
    res.status(500).json({ message: "Erro ao adicionar: " + (err.message || 'detalhe desconhecido') });
  }
});

// DELETE /orcamentos/:id
router.delete("/orcamentos/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!id) return res.status(400).json({ message: "ID obrigatório" });

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("orcamentos")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    res.json({ message: "Excluído com sucesso!" });
  } catch (err) {
    console.error("DELETE /orcamentos erro:", err.message || err);
    res.status(500).json({ message: "Erro ao excluir: " + (err.message || 'detalhe desconhecido') });
  }
});

export default router;