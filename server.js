import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração para resolver caminhos de ficheiros com Módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware para ler requisições com corpo JSON
app.use(express.json());

// Servir ficheiros estáticos (index.html, script.js, CSS) a partir da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- MODELOS DO MONGOOSE ---

// Modelo de Cliente
const clienteSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: String,
    fotoPerfil: String
});
const Cliente = mongoose.model('Cliente', clienteSchema);

// Modelo de Produto
const produtoSchema = new mongoose.Schema({
    nome_produto: { type: String, required: true },
    preco: { type: Number, required: true },
    estoque_atual: { type: Number, required: true, default: 0 },
    total_vendido: { type: Number, default: 0 }
});
const Produto = mongoose.model('Produto', produtoSchema);

// Modelo de Venda
const vendaSchema = new mongoose.Schema({
    cliente: { type: String, required: true },
    total: { type: Number, required: true },
    status: { type: String, default: 'Concluído' },
    data: { type: Date, default: Date.now }
});
const Venda = mongoose.model('Venda', vendaSchema);

// --- MIDDLEWARE DE AUTORIZAÇÃO (RBAC) ---
const verificarPermissaoAdmin = (req, res, next) => {
    const nivelUsuario = req.headers['user-level'];
    if (nivelUsuario === 'Admin') {
        next();
    } else {
        res.status(403).json({ erro: 'Acesso negado. Apenas Administradores podem realizar esta ação.' });
    }
};

// --- ROTAS DE PÁGINAS ---

// Rota principal para carregar o index.html de dentro da pasta 'public'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- ROTAS DA API: CLIENTES ---

app.get('/api/clientes', async (req, res) => {
    try {
        const clientes = await Cliente.find();
        res.json(clientes);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar clientes.' });
    }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const { nome, email, googleId, fotoPerfil } = req.body;
        
        let cliente = await Cliente.findOne({ email });
        if (!cliente) {
            cliente = new Cliente({ nome, email, googleId, fotoPerfil });
            await cliente.save();
        }
        
        res.status(201).json(cliente);
    } catch (err) {
        res.status(400).json({ erro: 'Erro ao cadastrar/autenticar cliente.' });
    }
});

app.delete('/api/clientes/:id', verificarPermissaoAdmin, async (req, res) => {
    try {
        await Cliente.findByIdAndDelete(req.params.id);
        res.json({ mensagem: 'Cliente removido com sucesso.' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao remover cliente.' });
    }
});

// --- ROTAS DA API: PRODUTOS ---

app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await Produto.find();
        res.json(produtos);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar produtos.' });
    }
});

app.post('/api/produtos', verificarPermissaoAdmin, async (req, res) => {
    try {
        const novoProduto = new Produto(req.body);
        await novoProduto.save();
        res.status(201).json(novoProduto);
    } catch (err) {
        res.status(400).json({ erro: 'Erro ao cadastrar produto.' });
    }
});

app.delete('/api/produtos/:id', verificarPermissaoAdmin, async (req, res) => {
    try {
        await Produto.findByIdAndDelete(req.params.id);
        res.json({ mensagem: 'Produto excluído com sucesso.' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao excluir produto.' });
    }
});

// --- ROTAS DA API: VENDAS ---

app.get('/api/vendas', async (req, res) => {
    try {
        const vendas = await Venda.find();
        res.json(vendas);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar vendas.' });
    }
});

// --- INICIALIZAÇÃO DO BANCO EM MEMÓRIA E SERVIDOR ---

async function iniciarServidor() {
    try {
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        await mongoose.connect(mongoUri);
        console.log('Conectado ao MongoDB em memória com sucesso!');

        const totalProdutos = await Produto.countDocuments();
        if (totalProdutos === 0) {
            await Produto.insertMany([
                { nome_produto: 'Notebook Gamer', preco: 4500.00, estoque_atual: 10, total_vendido: 3 },
                { nome_produto: 'Mouse Sem Fio', preco: 120.00, estoque_atual: 50, total_vendido: 15 },
                { nome_produto: 'Teclado Mecânico', preco: 350.00, estoque_atual: 25, total_vendido: 8 }
            ]);

            await Cliente.insertMany([
                { nome: 'Ana Júlia', email: 'ana@exemplo.com' },
                { nome: 'Carlos Silva', email: 'carlos@exemplo.com' }
            ]);

            await Venda.insertMany([
                { cliente: 'Ana Júlia', total: 4620.00, status: 'Concluído' },
                { cliente: 'Carlos Silva', total: 350.00, status: 'Pendente' }
            ]);
            console.log('Dados de teste inseridos com sucesso!');
        }

        app.listen(PORT, () => {
            console.log(`Servidor a rodar em http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Erro ao iniciar o servidor:', err);
    }
}

iniciarServidor();