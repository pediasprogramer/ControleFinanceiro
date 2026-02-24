import express from "express"
import { register, login } from "../controllers/authController.js"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { supabase } from '../supabaseClient.js';

const router = express.Router()

// Rotas Públicas (Acessadas pelo Register.tsx e Login.tsx)
// Lembre-se: Essas rotas só aceitam POST. Se tentar abrir no navegador, dará erro.
router.post("/register", register)
router.post("/login", login)

// Rotas Protegidas (Exigem o Token JWT no cabeçalho Authorization)
router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({ 
    message: "Bem-vindo à área protegida do MESP 🔐",
    user: req.user // Retorna os dados do seu e-mail e nível
  })
})

// Rota para o Frontend verificar o perfil e o nível de acesso (role)
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    email: req.user.email,
    role: req.user.role // Aqui aparecerá 'Administrador' para o seu e-mail
  })
})

router.get("/orcamentos", authMiddleware, async (req, res) => {
  const userId = req.user.id; // vem do token JWT

  const mesAno = req.query.mes_ano; // ?mes_ano=2026-02

  try {
    let query = supabase
      .from("orcamentos")
      .select("*")
      .eq("user_id", userId);

    if (mesAno) {
      query = query.eq("mes_ano", mesAno);
    }

    const { data, error } = await query.order("data", { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error("Erro ao listar orçamentos:", err);
    res.status(500).json({ message: "Erro ao carregar lançamentos." });
  }
});


// POST /api/orcamentos (adicionar)
router.post("/orcamentos", authMiddleware, async (req, res) => {
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
      valor,
      data,
      mes_ano,
    });

    if (error) throw error;

    res.status(201).json({ message: "Lançamento adicionado com sucesso!" });
  } catch (err) {
    console.error("Erro ao adicionar lançamento:", err);
    res.status(500).json({ message: "Erro ao salvar lançamento." });
  }
});

// Nova rota DELETE para excluir lançamento
router.delete("/orcamentos/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // Pega do middleware JWT

  if (!id) {
    return res.status(400).json({ message: "ID do lançamento obrigatório." });
  }

  try {
    const { error } = await supabase
      .from("orcamentos")
      .delete()
      .eq("id", id)
      .eq("user_id", userId); // Segurança: só deleta se for do usuário logado

    if (error) throw error;

    res.status(200).json({ message: "Lançamento excluído com sucesso!" });
  } catch (err) {
    console.error("Erro ao excluir lançamento:", err);
    res.status(500).json({ message: "Erro ao excluir lançamento." });
  }
});

export default router