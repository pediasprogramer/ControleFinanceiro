// backend/src/controllers/authController.js

import { supabase } from '../supabaseClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'SEGREDO_SUPER_FORTE_MUDE_ISSO_AGORA';

export const register = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Senha deve ter pelo menos 6 caracteres.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Verifica duplicado
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      return res.status(409).json({ message: 'E-mail já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const roleIdFinal = normalizedEmail === 'pedro.pneto@esporte.gov.br' ? 1 : 4;

    const { error } = await supabase
      .from('profiles')
      .insert([{
        email: normalizedEmail,
        password: hashedPassword,
        role_id: roleIdFinal,
        updated_at: new Date().toISOString(),
      }]);

    if (error) throw error;

    console.log(`Novo usuário cadastrado: ${normalizedEmail} (role: ${roleIdFinal})`);

    res.status(201).json({ message: 'Cadastro realizado com sucesso!' });
  } catch (err) {
    console.error('Erro no register:', err.message, err.details || err.code || '');
    res.status(400).json({ message: err.message || 'Erro ao cadastrar.' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  // Validação inicial
  if (!email || !password) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
  }

  // Normaliza o e-mail ANTES de qualquer uso
  const normalizedEmail = email.toLowerCase().trim();

  try {
    console.log(`Tentativa de login: ${normalizedEmail}`);

    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, password, role_id')
      .eq('email', normalizedEmail)
      .single();

    if (error) {
      console.error('Erro Supabase no login:', error.message, error.code);
      return res.status(500).json({ message: 'Erro ao consultar o banco de dados.' });
    }

    if (!user) {
      console.log(`Usuário não encontrado: ${normalizedEmail}`);
      return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log(`Senha inválida para: ${normalizedEmail}`);
      return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
    }

    // Gera token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role_id === 1 ? 'Administrador' : 'Ver',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(`Login bem-sucedido: ${normalizedEmail} | Token gerado (primeiros 20 chars): ${token.substring(0, 20)}...`);

    res.json({ token });
  } catch (err) {
    console.error('Erro crítico no login:', err.message || err);
    res.status(500).json({ message: 'Erro interno no servidor. Tente novamente mais tarde.' });
  }
};