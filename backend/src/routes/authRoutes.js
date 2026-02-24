// backend/src/routes/authRoutes.js

import express from "express";
import { createServerClient } from '@supabase/ssr';  // ← novo import (instale o pacote!)
import { register, login } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

// Instale isso no backend: npm install @supabase/ssr
// (é essencial para rodar Supabase no server-side com bypass de RLS)

const router = express.Router();

// Chave secreta SERVICE_ROLE (NUNCA exponha isso no frontend!)
const SUPABASE_URL = 'https://knjmnjsqszwicequojam.supabase.co';
const SUPABASE_SERVICE_KEY = 'sua-chave-service_role-aqui';  // ← pegue no Supabase Dashboard → Settings → API → service_role key

// Função auxiliar para criar client com permissões totais (ignora RLS)
function getSupabaseAdmin() {
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    global: {
      fetch: (url, options) => fetch(url, { ...options, timeout: 30000 }),
    },
  });
}

// Rotas públicas (não mudam)
router.post("/register", register);
router.post("/login", login);

// Rotas protegidas (agora usam client admin)
router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({ 
    message: "Bem-vindo à área protegida do MESP 🔐",
    user: req.user
  });
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    email: req.user.email,
    role: req.user.role
  });
});

// GET /orcamentos - agora com client admin
router.get("/orcamentos", authMiddleware, async (req, res) => {
  const supabase = getSupabaseAdmin();  // ← client com service_role
  const userId = req.user.id;
  const mesAno = req.query.mes_ano;

  try {
    let query = supabase
      .from("orcamentos")
      .select("*")
      .eq("user_id", userId);

    if (mesAno) {
      query = query.eq("mes_ano", mesAno);
    }

    const { data, error } = await query.order("data", { ascending: false });

    if (error) {
      console.error("Erro Supabase (GET orcamentos):", error);
      throw error;
    }

    res.json(data || []);
  } catch (err) {
    console.error("Erro ao listar orçamentos:", err.message || err);
    res.status(500).json({ message: "Erro ao carregar lançamentos." });
  }
});

// POST /orcamentos - adicionar
router.post("/orcamentos", authMiddleware, async (req, res) => {
  const supabase = getSupabaseAdmin();
  const userId = req.user.id;
  const { tipo, descricao, valor, data, mes_ano } = req.body;

  if (!tipo || !descricao || !valor || !data || !mes_ano) {
    return res.status(400).json({ message: "Campos obrigatórios faltando." });
  }

  try {
    const { error } = await supabase.from("orcamentos").insert({
      user_id: userId,
      tipo,
      descricao,
      valor: Number(valor),          // garanta que é número
      data,
      mes_ano,
    });

    if (error) {
      console.error("Erro Supabase (POST orcamentos):", error);
      throw error;
    }

    res.status(201).json({ message: "Lançamento adicionado com sucesso!" });
  } catch (err) {
    console.error("Erro ao adicionar lançamento:", err.message || err);
    res.status(500).json({ message: "Erro ao salvar lançamento." });
  }
});

// DELETE /orcamentos/:id
router.delete("/orcamentos/:id", authMiddleware, async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { id } = req.params;
  const userId = req.user.id;

  if (!id) {
    return res.status(400).json({ message: "ID do lançamento obrigatório." });
  }

  try {
    const { error } = await supabase
      .from("orcamentos")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);  // segurança extra

    if (error) {
      console.error("Erro Supabase (DELETE orcamentos):", error);
      throw error;
    }

    res.status(200).json({ message: "Lançamento excluído com sucesso!" });
  } catch (err) {
    console.error("Erro ao excluir lançamento:", err.message || err);
    res.status(500).json({ message: "Erro ao excluir lançamento." });
  }
});

export default router;