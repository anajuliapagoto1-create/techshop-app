// Função chamada ao submeter o formulário de login tradicional (HTML)
async function realizarLogin(event) {
    if (event) event.preventDefault();

    const nome = document.getElementById('nome-usuario').value;
    const email = document.getElementById('email-usuario').value;

    const dadosCliente = { nome, email };

    try {
        // Envia os dados do usuário para o servidor
        const resposta = await fetch('/api/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosCliente)
        });

        const resultado = await resposta.json();

        if (resposta.ok) {
            // Guarda as informações da sessão no localStorage
            localStorage.setItem('usuarioLogado', JSON.stringify({ nome, email }));
            
            // Exibe a tela do painel e oculta a tela de login
            atualizarInterfaceSessao();
        } else {
            alert(`Erro ao acessar: ${resultado.error || resultado.erro}`);
        }
    } catch (err) {
        console.error('Erro ao conectar com o servidor:', err);
        alert('Erro ao conectar com o servidor para autenticação.');
    }
}

// Função para encerrar a sessão (Sair)
function sairDoSistema() {
    localStorage.removeItem('usuarioLogado');
    atualizarInterfaceSessao();
}

// Alterna a exibição entre a tela de Login e o Painel Principal
function atualizarInterfaceSessao() {
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    const telaCadastro = document.getElementById('tela-cadastro');
    const telaPainel = document.getElementById('tela-painel');
    const usuarioLogadoSpan = document.getElementById('usuario-logado');

    if (usuarioSalvo) {
        const usuario = JSON.parse(usuarioSalvo);
        if (telaCadastro) telaCadastro.style.display = 'none';
        if (telaPainel) telaPainel.style.display = 'block';
        if (usuarioLogadoSpan) usuarioLogadoSpan.innerText = `Usuário: ${usuario.nome} (${usuario.email})`;
        
        // Carrega os dados do painel de controle
        carregarDadosPainel();
    } else {
        if (telaCadastro) telaCadastro.style.display = 'block';
        if (telaPainel) telaPainel.style.display = 'none';
    }
}

// Obtém o perfil selecionado no <select> do painel ('Admin' ou 'Cliente')
function obterPerfilAtual() {
    const seletorPerfil = document.getElementById('user-level') || document.getElementById('selectPerfil');
    return seletorPerfil ? seletorPerfil.value : 'Cliente';
}

// Função para carregar as tabelas do painel ao acessar
async function carregarDadosPainel() {
    carregarVendas();
    carregarEstoque();
    carregarClientes();
}

// Carrega o Relatório de Vendas
async function carregarVendas() {
    try {
        const resposta = await fetch('/api/vendas');
        const vendas = await resposta.json();
        const tabela = document.getElementById('tabela-vendas');
        if (!tabela) return;

        tabela.innerHTML = '';
        vendas.forEach(v => {
            tabela.innerHTML += `
                <tr>
                    <td>${v.id_pedido || v._id}</td>
                    <td>${v.cliente || v.nome_cliente}</td>
                    <td>R$ ${parseFloat(v.total || 0).toFixed(2)}</td>
                    <td>${v.status || 'Concluído'}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error('Erro ao carregar vendas:', err);
    }
}

// Carrega Análise de Estoque
async function carregarEstoque() {
    try {
        const resposta = await fetch('/api/produtos');
        const produtos = await resposta.json();
        const tabela = document.getElementById('tabela-estoque');
        if (!tabela) return;

        const eAdmin = obterPerfilAtual() === 'Admin';

        tabela.innerHTML = '';
        produtos.forEach(p => {
            const id = p._id || p.id;
            tabela.innerHTML += `
                <tr>
                    <td>${id}</td>
                    <td>${p.nome_produto}</td>
                    <td>${p.estoque_atual}</td>
                    <td>${p.total_vendido || 0}</td>
                    <td>
                        ${eAdmin ? `<button class="btn-acao btn-excluir" onclick="excluirProduto('${id}')">Excluir</button>` : '<em>Sem permissão</em>'}
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error('Erro ao carregar estoque:', err);
    }
}

// Carrega a Lista de Clientes
async function carregarClientes() {
    try {
        const resposta = await fetch('/api/clientes');
        const clientes = await resposta.json();
        const tabela = document.getElementById('tabela-clientes');
        if (!tabela) return;

        const eAdmin = obterPerfilAtual() === 'Admin';

        tabela.innerHTML = '';
        clientes.forEach(c => {
            const id = c._id || c.id;
            tabela.innerHTML += `
                <tr>
                    <td>${id}</td>
                    <td>${c.nome}</td>
                    <td>${c.email}</td>
                    <td>
                        ${eAdmin ? `<button class="btn-acao btn-excluir" onclick="excluirCliente('${id}')">Excluir</button>` : '<em>Sem permissão</em>'}
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error('Erro ao carregar clientes:', err);
    }
}

// Cadastra um novo produto (Função para Formulário de Produto)
async function cadastrarProduto(event) {
    if (event) event.preventDefault();

    const nome_produto = document.getElementById('nomeProduto').value;
    const preco = parseFloat(document.getElementById('precoProduto').value);
    const estoque_atual = parseInt(document.getElementById('estoqueProduto').value);

    try {
        const resposta = await fetch('/api/produtos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-level': obterPerfilAtual()
            },
            body: JSON.stringify({ nome_produto, preco, estoque_atual })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            alert('Produto cadastrado com sucesso!');
            carregarEstoque();
        } else {
            alert(`Erro: ${dados.erro || dados.error}`);
        }
    } catch (err) {
        alert('Erro ao conectar com o servidor.');
    }
}

// Elimina um Produto do banco de dados
async function excluirProduto(idProduto) {
    if (!confirm('Deseja realmente excluir este produto?')) return;

    try {
        const resposta = await fetch(`/api/produtos/${idProduto}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'user-level': obterPerfilAtual()
            }
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            alert('Produto excluído com sucesso!');
            carregarEstoque();
        } else {
            alert(`Erro: ${dados.erro || dados.error}`);
        }
    } catch (err) {
        alert('Erro ao conectar com o servidor.');
    }
}

// Elimina um Cliente do banco de dados
async function excluirCliente(idCliente) {
    if (!confirm('Deseja realmente excluir este cliente?')) return;

    try {
        const resposta = await fetch(`/api/clientes/${idCliente}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'user-level': obterPerfilAtual()
            }
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            alert('Cliente removido com sucesso!');
            carregarClientes();
        } else {
            alert(`Erro: ${dados.erro || dados.error}`);
        }
    } catch (err) {
        alert('Erro ao conectar com o servidor.');
    }
}

// Event Listeners e Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    // Verifica o estado inicial da sessão ao abrir
    atualizarInterfaceSessao();

    // Event listener para recarregar tabelas quando mudar o Nível de Acesso (RBAC)
    const seletorPerfil = document.getElementById('user-level');
    if (seletorPerfil) {
        seletorPerfil.addEventListener('change', carregarDadosPainel);
    }
});