# Sistema de Controle de Vendas

Um aplicativo web full-stack para gerenciar clientes, produtos, vendas e contas a receber. Construído com Node.js, Express, SQLite e frontend em HTML/CSS/JavaScript com Tailwind CSS. Otimizado para responsividade em dispositivos móveis e desktops.

## Funcionalidades

- Autenticação: Login com usuário e senha, protegido por JWT.
- Dashboard: Visão geral com total de clientes, produtos, vendas do mês e faturamento.
- Gerenciamento de Clientes: Cadastro, edição e exclusão de clientes (nome, e-mail, telefone, CPF, endereço).
- Gerenciamento de Produtos: Cadastro e exclusão de produtos (nome, preço, estoque, descrição).
- Gerenciamento de Vendas: Registro de vendas com suporte a pagamentos à vista ou parcelados (dinheiro, cartão, PIX, boleto).
- Controle Financeiro: Acompanhamento de contas a receber, com status de pendente, vencendo hoje ou atrasado.
- Responsividade: Interface adaptada para dispositivos móveis (tabelas responsivas, navegação por abas, formulários otimizados).
- Alertas: Notificações para contas vencidas ou próximas do vencimento.

# Tecnologias Utilizadas

- Backend: Node.js, Express, SQLite, JWT
- Frontend: HTML, CSS (Tailwind CSS), JavaScript
- Outros: Fetch API para comunicação com backend, Inter font via Google Fonts

# Estrutura do Projeto

```
project/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── script.js
│   │   └── login.js
│   ├── index.html
│   └── login.html
├── server.js
├── package.json
├── sistema_vendas.db
└── README.md
```

Pré-requisitos

- Node.js (v16 ou superior)
- npm
- Git

# Instalação Local

1. Clone o repositório:
git clone https://github.com/douglasinforj/sistema_controle_vendas.git
cd sistema_controle_vendas

2. Instale as dependências:

npm install


3. Configure a variável de ambiente para o JWT:

- Instalar:

  npm install dotenv

- Crie um arquivo .env na raiz do projeto:

  JWT_SECRET=sua-chave-secreta-aqui

- No server.js adicionar:

  require('dotenv').config();
  const JWT_SECRET = process.env.JWT_SECRET;


4. Inicie o servidor:

npm start

Para desenvolvimento com auto-reload:

npm run dev

Acesse no navegador: http://localhost:3000/login.html

Deploy

# Plataformas Recomendadas

## Render (fácil, suporta SQLite):

- Crie uma conta em render.com.
- Conecte seu repositório GitHub.
- Crie um "Web Service", configure:
- Build Command: npm install
- Start Command: npm start
- Disk: Monte sistema_vendas.db em /app/sistema_vendas.db
- Variáveis de ambiente: Adicione JWT_SECRET
- Deploy via Git push.


## Fly.io (suporte a SQLite com LiteFS):

- Instale o CLI: curl -L https://fly.io/install.sh | sh
- Rode fly auth login e fly launch no projeto.
- Adicione volume: fly volumes create data --size 1
- Configure fly.toml para montar o volume e deploy: fly deploy.


# Testando Responsividade

Use Chrome DevTools para simular dispositivos móveis (ex: iPhone SE, 375px).
Verifique tabelas (devem empilhar em mobile), botões (mín. 44px para toque) e navegação por abas (vertical em mobile).

# Contribuição

## Faça um fork do repositório.

- Crie uma branch: git checkout -b minha-feature.
- Commit suas mudanças: git commit -m "Adiciona minha feature".
- Push para a branch: git push origin minha-feature.
- Abra um Pull Request.

Licença
MIT License. Veja LICENSE para detalhes.

Contato:
Autor: [Douglas Silva]
Email: [douglasitpro@gmail.com]
GitHub: douglasinforj