// backend/src/controllers/authController.js

import { supabase } from '../supabaseClient.js';  // ou supabaseServerClient se você tiver
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'SEGREDO_SUPER_FORTE_MUDE_ISSO_AGORA';

// Registro de usuário
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
    // Verifica se já existe
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      return res.status(409).json({ message: 'E-mail já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insere novo usuário (role_id padrão 4 = Apenas Ler, ou mude para 1 se for admin)
    const { data: newUser, error } = await supabase
      .from('profiles')
      .insert({
        email: normalizedEmail,
        password: hashedPassword,
        role_id: normalizedEmail === 'pedro.pneto@esporte.gov.br' ? 1 : 4,  // seu e-mail como admin
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro no register:', err.message || err);
    res.status(500).json({ message: 'Erro ao cadastrar usuário.' });
  }
};

// Login de usuário
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error || !user) {
      console.log(`Usuário não encontrado: ${normalizedEmail}`);
      return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log(`Senha inválida para: ${normalizedEmail}`);
      return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
    }

    // Gera token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role_id === 1 ? 'Administrador' : 'Ver',  // ajuste conforme sua lógica
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(`Login bem-sucedido: ${normalizedEmail} | Token gerado (primeiros 20 chars): ${token.substring(0, 20)}...`);

    res.json({ token });
  } catch (err) {
    console.error('Erro no login:', err.message || err);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};