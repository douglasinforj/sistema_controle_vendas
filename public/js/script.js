// Dados do sistema
let clientes = [];
let produtos = [];
let vendas = [];
let contasReceber = [];
let clienteEditando = null;

// Verificar autenticação
document.addEventListener('DOMContentLoaded', async function() {
    if (!localStorage.getItem('token')) {
        window.location.href = '/login.html';
        return;
    }
    await carregarDados();
    atualizarDashboard();
    atualizarAlertas();
    renderizarClientes();
    renderizarProdutos();
    renderizarVendas();
    renderizarFinanceiro();
    atualizarSelectClientes();
    atualizarSelectProdutos();

    // Event listeners
    document.getElementById('venda-tipo').addEventListener('change', function() {
        const parcelas = document.getElementById('venda-parcelas');
        parcelas.disabled = this.value === 'vista';
        if (this.value === 'vista') parcelas.value = '';
    });
    ['venda-produto', 'venda-quantidade', 'venda-desconto'].forEach(id => {
        document.getElementById(id).addEventListener('input', calcularTotalVenda);
    });
    document.getElementById('busca-financeiro').addEventListener('input', function() {
        renderizarFinanceiro(this.value);
    });
});

// Função de logout
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Carregar dados do backend com autenticação
async function carregarDados() {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
        const [clientesRes, produtosRes, vendasRes, contasRes] = await Promise.all([
            fetch('/api/clientes', { headers }),
            fetch('/api/produtos', { headers }),
            fetch('/api/vendas', { headers }),
            fetch('/api/contas_receber', { headers })
        ]);
        if (clientesRes.status === 401 || clientesRes.status === 403) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return;
        }
        clientes = await clientesRes.json();
        produtos = await produtosRes.json();
        vendas = await vendasRes.json();
        contasReceber = await contasRes.json();
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
        alert('Erro de conexão com o servidor');
        logout();
    }
}

// Navegação por abas
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('tab-active', 'text-white');
        btn.classList.add('text-gray-600');
    });
    document.getElementById(tabName).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).classList.add('tab-active', 'text-white');
    document.getElementById(`tab-${tabName}`).classList.remove('text-gray-600');
}

// Funções de Cliente
function showClienteForm() {
    clienteEditando = null;
    document.getElementById('cliente-form').classList.remove('hidden');
    document.querySelector('#cliente-form h3').textContent = 'Cadastrar Cliente';
}

function editarCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    clienteEditando = cliente;
    document.getElementById('cliente-nome').value = cliente.nome;
    document.getElementById('cliente-email').value = cliente.email;
    document.getElementById('cliente-telefone').value = cliente.telefone;
    document.getElementById('cliente-cpf').value = cliente.cpf || '';
    document.getElementById('cliente-endereco').value = cliente.endereco || '';
    document.getElementById('cliente-form').classList.remove('hidden');
    document.querySelector('#cliente-form h3').textContent = 'Editar Cliente';
}

function cancelarCliente() {
    document.getElementById('cliente-form').classList.add('hidden');
    limparFormCliente();
}

function limparFormCliente() {
    ['cliente-nome', 'cliente-email', 'cliente-telefone', 'cliente-cpf', 'cliente-endereco'].forEach(id => {
        document.getElementById(id).value = '';
    });
}

async function salvarCliente() {
    const nome = document.getElementById('cliente-nome').value;
    const email = document.getElementById('cliente-email').value;
    const telefone = document.getElementById('cliente-telefone').value;
    const cpf = document.getElementById('cliente-cpf').value;
    const endereco = document.getElementById('cliente-endereco').value;
    if (!nome || !email || !telefone) {
        alert('Preencha os campos obrigatórios!');
        return;
    }
    const clienteData = { nome, email, telefone, cpf, endereco };
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(clienteEditando ? `/api/clientes/${clienteEditando.id}` : '/api/clientes', {
            method: clienteEditando ? 'PUT' : 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(clienteData)
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        if (!response.ok) throw new Error((await response.json()).error);
        await carregarDados();
        renderizarClientes();
        atualizarSelectClientes();
        atualizarDashboard();
        cancelarCliente();
    } catch (err) {
        alert('Erro ao salvar cliente: ' + err.message);
    }
}

function renderizarClientes() {
    const tbody = document.getElementById('lista-clientes');
    tbody.innerHTML = '';
    clientes.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-900" data-label="Nome">${cliente.nome}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="E-mail">${cliente.email}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="Telefone">${cliente.telefone}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="CPF">${cliente.cpf || '-'}</td>
            <td class="px-6 py-4 text-sm" data-label="Ações">
                <button onclick="editarCliente(${cliente.id})" class="text-blue-600 hover:text-blue-800 mr-3">Editar</button>
                <button onclick="excluirCliente(${cliente.id})" class="text-red-600 hover:text-red-800">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function excluirCliente(id) {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`/api/clientes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }
            if (!response.ok) throw new Error((await response.json()).error);
            await carregarDados();
            renderizarClientes();
            atualizarSelectClientes();
            atualizarDashboard();
        } catch (err) {
            alert('Erro ao excluir cliente: ' + err.message);
        }
    }
}

// Funções de Produto
function showProdutoForm() {
    document.getElementById('produto-form').classList.remove('hidden');
}

function cancelarProduto() {
    document.getElementById('produto-form').classList.add('hidden');
    limparFormProduto();
}

function limparFormProduto() {
    ['produto-nome', 'produto-preco', 'produto-estoque', 'produto-descricao'].forEach(id => {
        document.getElementById(id).value = '';
    });
}

async function salvarProduto() {
    const nome = document.getElementById('produto-nome').value;
    const preco = parseFloat(document.getElementById('produto-preco').value);
    const estoque = parseInt(document.getElementById('produto-estoque').value);
    const descricao = document.getElementById('produto-descricao').value;
    if (!nome || !preco || estoque < 0) {
        alert('Preencha os campos obrigatórios!');
        return;
    }
    const produtoData = { nome, preco, estoque, descricao };
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/produtos', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(produtoData)
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        if (!response.ok) throw new Error((await response.json()).error);
        await carregarDados();
        renderizarProdutos();
        atualizarSelectProdutos();
        atualizarDashboard();
        cancelarProduto();
    } catch (err) {
        alert('Erro ao salvar produto: ' + err.message);
    }
}

function renderizarProdutos() {
    const tbody = document.getElementById('lista-produtos');
    tbody.innerHTML = '';
    produtos.forEach(produto => {
        const tr = document.createElement('tr');
        const statusEstoque = produto.estoque <= 5 ? 'Baixo' : 'Normal';
        const corStatus = produto.estoque <= 5 ? 'text-red-600' : 'text-green-600';
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-900" data-label="Produto">${produto.nome}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="Preço">R$ ${produto.preco.toFixed(2)}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="Estoque">${produto.estoque}</td>
            <td class="px-6 py-4 text-sm ${corStatus} font-medium" data-label="Status">${statusEstoque}</td>
            <td class="px-6 py-4 text-sm" data-label="Ações">
                <button onclick="excluirProduto(${produto.id})" class="text-red-600 hover:text-red-800">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function excluirProduto(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`/api/produtos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }
            if (!response.ok) throw new Error((await response.json()).error);
            await carregarDados();
            renderizarProdutos();
            atualizarSelectProdutos();
            atualizarDashboard();
        } catch (err) {
            alert('Erro ao excluir produto: ' + err.message);
        }
    }
}

// Funções de Venda
function showVendaForm() {
    document.getElementById('venda-form').classList.remove('hidden');
}

function cancelarVenda() {
    document.getElementById('venda-form').classList.add('hidden');
    limparFormVenda();
}

function limparFormVenda() {
    ['venda-cliente', 'venda-produto', 'venda-quantidade', 'venda-desconto', 'venda-parcelas', 'venda-vencimento'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('venda-tipo').value = 'vista';
    document.getElementById('venda-pagamento').value = 'dinheiro';
    document.getElementById('venda-total').textContent = 'R$ 0,00';
    document.getElementById('venda-parcelas').disabled = true;
}

function calcularTotalVenda() {
    const produtoId = document.getElementById('venda-produto').value;
    const quantidade = parseInt(document.getElementById('venda-quantidade').value) || 0;
    const desconto = parseFloat(document.getElementById('venda-desconto').value) || 0;
    if (!produtoId || quantidade <= 0) {
        document.getElementById('venda-total').textContent = 'R$ 0,00';
        return;
    }
    const produto = produtos.find(p => p.id == produtoId);
    if (!produto) return;
    let total = produto.preco * quantidade;
    total = total - (total * desconto / 100);
    document.getElementById('venda-total').textContent = `R$ ${total.toFixed(2)}`;
}

async function salvarVenda() {
    const clienteId = document.getElementById('venda-cliente').value;
    const produtoId = document.getElementById('venda-produto').value;
    const quantidade = parseInt(document.getElementById('venda-quantidade').value);
    const desconto = parseFloat(document.getElementById('venda-desconto').value) || 0;
    const tipo = document.getElementById('venda-tipo').value;
    const pagamento = document.getElementById('venda-pagamento').value;
    const parcelas = parseInt(document.getElementById('venda-parcelas').value) || 1;
    const dataVencimento = document.getElementById('venda-vencimento').value;
    if (!clienteId || !produtoId || !quantidade) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }
    if (tipo === 'parcelado' && !dataVencimento) {
        alert('Para vendas parceladas, informe a data do primeiro vencimento!');
        return;
    }
    const produto = produtos.find(p => p.id == produtoId);
    if (produto.estoque < quantidade) {
        alert('Estoque insuficiente!');
        return;
    }
    const cliente = clientes.find(c => c.id == clienteId);
    let total = produto.preco * quantidade;
    total = total - (total * desconto / 100);
    const venda = {
        clienteId,
        clienteNome: cliente.nome,
        produtoId,
        produtoNome: produto.nome,
        quantidade,
        desconto,
        total,
        tipo,
        pagamento,
        parcelas: tipo === 'parcelado' ? parcelas : 1,
        dataVencimento
    };
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/vendas', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(venda)
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        if (!response.ok) throw new Error((await response.json()).error);
        await carregarDados();
        renderizarVendas();
        renderizarProdutos();
        renderizarFinanceiro();
        atualizarDashboard();
        cancelarVenda();
    } catch (err) {
        alert('Erro ao registrar venda: ' + err.message);
    }
}

function renderizarVendas() {
    const tbody = document.getElementById('lista-vendas');
    tbody.innerHTML = '';
    vendas.slice(-10).reverse().forEach(venda => {
        const tr = document.createElement('tr');
        const data = new Date(venda.data).toLocaleDateString('pt-BR');
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-900" data-label="Data">${data}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="Cliente">${venda.clienteNome}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="Produto">${venda.produtoNome}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="Qtd">${venda.quantidade}</td>
            <td class="px-6 py-4 text-sm text-gray-900 font-medium" data-label="Total">R$ ${venda.total.toFixed(2)}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="Pagamento">${venda.pagamento.toUpperCase()}</td>
            <td class="px-6 py-4 text-sm" data-label="Status">
                <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">${venda.status}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Funções Financeiras
function renderizarFinanceiro(filtro = '') {
    const tbody = document.getElementById('lista-financeiro');
    tbody.innerHTML = '';
    let totalReceber = 0;
    let vencendoHoje = 0;
    let emAtraso = 0;
    const hoje = new Date().toDateString();
    let contasFiltradas = contasReceber;
    if (filtro) {
        contasFiltradas = contasReceber.filter(conta => {
            const cliente = clientes.find(c => c.id === conta.clienteId);
            const nomeMatch = conta.clienteNome.toLowerCase().includes(filtro.toLowerCase());
            const cpfMatch = cliente && cliente.cpf && cliente.cpf.includes(filtro);
            return nomeMatch || cpfMatch;
        });
    }
    contasFiltradas.forEach(conta => {
        if (conta.status === 'Pendente') {
            totalReceber += conta.valor;
            const vencimento = new Date(conta.vencimento);
            if (vencimento.toDateString() === hoje) {
                vencendoHoje += conta.valor;
            } else if (vencimento < new Date()) {
                emAtraso += conta.valor;
            }
        }
        const tr = document.createElement('tr');
        const vencimento = new Date(conta.vencimento);
        const dataVencimento = vencimento.toLocaleDateString('pt-BR');
        let statusClass = 'bg-yellow-100 text-yellow-800';
        let statusText = 'Pendente';
        if (conta.status === 'Pago') {
            statusClass = 'bg-green-100 text-green-800';
            statusText = 'Pago';
        } else if (vencimento < new Date()) {
            statusClass = 'bg-red-100 text-red-800 alert-vencido';
            statusText = 'Vencido';
        } else if (vencimento.toDateString() === hoje) {
            statusClass = 'bg-orange-100 text-orange-800';
            statusText = 'Vence Hoje';
        }
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm text-gray-900" data-label="Cliente">${conta.clienteNome}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="Venda">#${conta.vendaId}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="Parcela">${conta.parcela}/${conta.totalParcelas}</td>
            <td class="px-6 py-4 text-sm text-gray-600" data-label="Vencimento">${dataVencimento}</td>
            <td class="px-6 py-4 text-sm text-gray-900 font-medium" data-label="Valor">R$ ${conta.valor.toFixed(2)}</td>
            <td class="px-6 py-4 text-sm" data-label="Status">
                <span class="${statusClass} px-2 py-1 rounded-full text-xs">${statusText}</span>
            </td>
            <td class="px-6 py-4 text-sm" data-label="Ações">
                ${conta.status === 'Pendente' ? `<button onclick="marcarComoPago(${conta.id})" class="text-green-600 hover:text-green-800">Receber</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
    document.getElementById('total-receber').textContent = `R$ ${totalReceber.toFixed(2)}`;
    document.getElementById('vencendo-hoje').textContent = `R$ ${vencendoHoje.toFixed(2)}`;
    document.getElementById('em-atraso').textContent = `R$ ${emAtraso.toFixed(2)}`;
}

async function marcarComoPago(contaId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/contas_receber/${contaId}/pago`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        if (!response.ok) throw new Error((await response.json()).error);
        await carregarDados();
        renderizarFinanceiro();
        atualizarDashboard();
    } catch (err) {
        alert('Erro ao marcar como pago: ' + err.message);
    }
}

function limparBusca() {
    document.getElementById('busca-financeiro').value = '';
    renderizarFinanceiro();
}

// Funções de Atualização
function atualizarSelectClientes() {
    const select = document.getElementById('venda-cliente');
    select.innerHTML = '<option value="">Selecione o cliente</option>';
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nome;
        select.appendChild(option);
    });
}

function atualizarSelectProdutos() {
    const select = document.getElementById('venda-produto');
    select.innerHTML = '<option value="">Selecione o produto</option>';
    produtos.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.id;
        option.textContent = `${produto.nome} - R$ ${produto.preco.toFixed(2)} (Estoque: ${produto.estoque})`;
        select.appendChild(option);
    });
}

function atualizarDashboard() {
    document.getElementById('total-clientes').textContent = clientes.length;
    document.getElementById('total-produtos').textContent = produtos.length;
    const vendasMes = vendas.filter(v => {
        const dataVenda = new Date(v.data);
        const agora = new Date();
        return dataVenda.getMonth() === agora.getMonth() && dataVenda.getFullYear() === agora.getFullYear();
    });
    document.getElementById('vendas-mes').textContent = vendasMes.length;
    const faturamento = vendasMes.reduce((total, venda) => total + venda.total, 0);
    document.getElementById('faturamento').textContent = `R$ ${faturamento.toFixed(2)}`;
    const estoqueBaixo = document.getElementById('estoque-baixo');
    estoqueBaixo.innerHTML = '';
    const produtosEstoqueBaixo = produtos.filter(p => p.estoque <= 5);
    if (produtosEstoqueBaixo.length === 0) {
        estoqueBaixo.innerHTML = '<p class="text-gray-500">Nenhum produto com estoque baixo</p>';
    } else {
        produtosEstoqueBaixo.forEach(produto => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-3 bg-red-50 rounded-lg';
            div.innerHTML = `
                <span class="text-sm font-medium">${produto.nome}</span>
                <span class="text-sm text-red-600 font-bold">${produto.estoque} unidades</span>
            `;
            estoqueBaixo.appendChild(div);
        });
    }
    const ultimasVendas = document.getElementById('ultimas-vendas');
    ultimasVendas.innerHTML = '';
    const ultimasVendasLista = vendas.slice(-5).reverse();
    if (ultimasVendasLista.length === 0) {
        ultimasVendas.innerHTML = '<p class="text-gray-500">Nenhuma venda registrada</p>';
    } else {
        ultimasVendasLista.forEach(venda => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-lg';
            div.innerHTML = `
                <div>
                    <p class="text-sm font-medium">${venda.clienteNome}</p>
                    <p class="text-xs text-gray-500">${venda.produtoNome}</p>
                </div>
                <span class="text-sm font-bold text-green-600">R$ ${venda.total.toFixed(2)}</span>
            `;
            ultimasVendas.appendChild(div);
        });
    }
}

function atualizarAlertas() {
    const alertas = document.getElementById('alertas');
    alertas.innerHTML = '';
    const hoje = new Date();
    const proximosDias = new Date();
    proximosDias.setDate(hoje.getDate() + 3);
    const contasVencidas = contasReceber.filter(c =>
        c.status === 'Pendente' && new Date(c.vencimento) < hoje
    );
    const contasVencendoProximo = contasReceber.filter(c =>
        c.status === 'Pendente' &&
        new Date(c.vencimento) >= hoje &&
        new Date(c.vencimento) <= proximosDias
    );
    if (contasVencidas.length > 0) {
        const alerta = document.createElement('div');
        alerta.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 alert-vencido';
        alerta.innerHTML = `
            <strong>⚠️ Atenção!</strong> Você tem ${contasVencidas.length} conta(s) vencida(s).
            <a href="#" onclick="showTab('financeiro')" class="underline ml-2">Ver detalhes</a>
        `;
        alertas.appendChild(alerta);
    }
    if (contasVencendoProximo.length > 0) {
        const alerta = document.createElement('div');
        alerta.className = 'bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg mb-4';
        alerta.innerHTML = `
            <strong>📅 Lembrete:</strong> ${contasVencendoProximo.length} conta(s) vencem nos próximos 3 dias.
            <a href="#" onclick="showTab('financeiro')" class="underline ml-2">Ver detalhes</a>
        `;
        alertas.appendChild(alerta);
    }
}

setInterval(atualizarAlertas, 60000);