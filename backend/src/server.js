// backend/src/server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';

// Carrega .env (só para JWT_SECRET, se existir)
dotenv.config();

// Porta
const PORT = Number(process.env.PORT) || 3000;

// Log rápido
console.log('🚀 Iniciando backend...');
console.log('   Porta:', PORT);
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? 'definida' : 'usando fallback');

// App
const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',               // dev local (Vite)
    'http://localhost:3000',               // fallback local
    'https://controlefinanceiro-e4fg.onrender.com',  // URL do seu frontend no Render (ajuste o ID se mudar)
    'https://controlefinanceiro.onrender.com'        // se tiver outra variação
    // '*',  // opcional para testes (permite todos, menos seguro - use só temporariamente)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'],     // headers que o frontend envia
  credentials: true,                                     // permite cookies/tokens
}));

app.use(express.json());

// Rotas
app.use('/api', authRoutes);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend vivo!' });
});

// Erros
app.use((err, req, res, next) => {
  console.error('ERRO:', err);
  res.status(500).json({ message: 'Erro no servidor' });
});

app.listen(PORT, () => {
  console.log(`🎉 Servidor rodando na porta ${PORT}`);
  console.log(`   Teste: http://localhost:${PORT}/health`);
});


export default app;