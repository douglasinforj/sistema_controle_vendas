const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');

require('dotenv').config();


const app = express();
const port = process.env.PORT || 3000;

// Configurações do servidor
const JWT_SECRET = process.env.JWT_SECRET;          //Usando variavel de ambiente
if (!JWT_SECRET) {
  console.error('Erro: JWT_SECRET não definido no .env');
  process.exit(1);
}



// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));



// JWT Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Token inválido' });
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Token não fornecido' });
  }
};




// Define o caminho do banco de dados
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'sistema_vendas.db');

// Cria o diretório pai do banco de dados se não existir(para o deploy no Render, Cria a pasta data se não exitir la)
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true }); // 'recursive: true' cria diretórios aninhados se necessário
  console.log(`Diretório do banco de dados criado: ${dbDir}`);
}




// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to SQLite:', err.message);
    process.exit(1); // Encerra o processo em caso de erro grave
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});



// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL,
        telefone TEXT NOT NULL,
        cpf TEXT,
        endereco TEXT,
        dataCadastro TEXT NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        preco REAL NOT NULL,
        estoque INTEGER NOT NULL,
        descricao TEXT,
        dataCadastro TEXT NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS vendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clienteId INTEGER,
        clienteNome TEXT,
        produtoId INTEGER,
        produtoNome TEXT,
        quantidade INTEGER,
        desconto REAL,
        total REAL,
        tipo TEXT,
        pagamento TEXT,
        parcelas INTEGER,
        data TEXT,
        status TEXT,
        FOREIGN KEY (clienteId) REFERENCES clientes(id),
        FOREIGN KEY (produtoId) REFERENCES produtos(id)
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS contas_receber (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendaId INTEGER,
        clienteId INTEGER,
        clienteNome TEXT,
        parcela INTEGER,
        totalParcelas INTEGER,
        valor REAL,
        vencimento TEXT,
        status TEXT,
        dataPagamento TEXT,
        FOREIGN KEY (vendaId) REFERENCES vendas(id),
        FOREIGN KEY (clienteId) REFERENCES clientes(id)
      )
    `);
    // Insert default user if none exists (for testing)
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (row.count === 0) {
        bcrypt.hash('geice#123', 10, (err, hash) => {
          if (!err) {
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hash]);
          }
        });
      }
    });
  });
}

// Helper to run queries with promise
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Login Endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected Routes
app.get('/api/clientes', authenticateJWT, async (req, res) => {
  try {
    const clientes = await getQuery('SELECT * FROM clientes');
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clientes', authenticateJWT, async (req, res) => {
  const { nome, email, telefone, cpf, endereco } = req.body;
  try {
    await runQuery(
      'INSERT INTO clientes (nome, email, telefone, cpf, endereco, dataCadastro) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, email, telefone, cpf || '', endereco || '', new Date().toISOString()]
    );
    res.status(201).json({ message: 'Cliente criado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clientes/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { nome, email, telefone, cpf, endereco } = req.body;
  try {
    await runQuery(
      'UPDATE clientes SET nome = ?, email = ?, telefone = ?, cpf = ?, endereco = ? WHERE id = ?',
      [nome, email, telefone, cpf || '', endereco || '', id]
    );
    res.json({ message: 'Cliente atualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clientes/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery('DELETE FROM clientes WHERE id = ?', [id]);
    res.json({ message: 'Cliente excluído' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/produtos', authenticateJWT, async (req, res) => {
  try {
    const produtos = await getQuery('SELECT * FROM produtos');
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/produtos', authenticateJWT, async (req, res) => {
  const { nome, preco, estoque, descricao } = req.body;
  try {
    await runQuery(
      'INSERT INTO produtos (nome, preco, estoque, descricao, dataCadastro) VALUES (?, ?, ?, ?, ?)',
      [nome, preco, estoque, descricao || '', new Date().toISOString()]
    );
    res.status(201).json({ message: 'Produto criado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/produtos/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery('DELETE FROM produtos WHERE id = ?', [id]);
    res.json({ message: 'Produto excluído' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vendas', authenticateJWT, async (req, res) => {
  try {
    const vendas = await getQuery('SELECT * FROM vendas');
    res.json(vendas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vendas', authenticateJWT, async (req, res) => {
  const { clienteId, clienteNome, produtoId, produtoNome, quantidade, desconto, total, tipo, pagamento, parcelas, dataVencimento } = req.body;
  try {
    await runQuery('UPDATE produtos SET estoque = estoque - ? WHERE id = ?', [quantidade, produtoId]);
    const result = await runQuery(
      'INSERT INTO vendas (clienteId, clienteNome, produtoId, produtoNome, quantidade, desconto, total, tipo, pagamento, parcelas, data, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [clienteId, clienteNome, produtoId, produtoNome, quantidade, desconto || 0, total, tipo, pagamento, parcelas || 1, new Date().toISOString(), 'Concluída']
    );
    if (tipo === 'parcelado') {
      const valorParcela = total / parcelas;
      for (let i = 1; i <= parcelas; i++) {
        const dataVencimentoDate = new Date(dataVencimento);
        dataVencimentoDate.setMonth(dataVencimentoDate.getMonth() + (i - 1));
        await runQuery(
          'INSERT INTO contas_receber (vendaId, clienteId, clienteNome, parcela, totalParcelas, valor, vencimento, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [result.lastID, clienteId, clienteNome, i, parcelas, valorParcela, dataVencimentoDate.toISOString(), 'Pendente']
        );
      }
    }
    res.status(201).json({ message: 'Venda registrada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contas_receber', authenticateJWT, async (req, res) => {
  try {
    const contas = await getQuery('SELECT * FROM contas_receber');
    res.json(contas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/contas_receber/:id/pago', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery(
      'UPDATE contas_receber SET status = ?, dataPagamento = ? WHERE id = ?',
      ['Pago', new Date().toISOString(), id]
    );
    res.json({ message: 'Conta marcada como paga' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});