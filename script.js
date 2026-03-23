import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBgqPTJH-1w0mWvjzxrLtWkpyZVBuZc58M",
    authDomain: "alltech-32bc5.firebaseapp.com",
    projectId: "alltech-32bc5",
    storageBucket: "alltech-32bc5.firebasestorage.app",
    messagingSenderId: "554601939193",
    appId: "1:554601939193:web:dfbc729b69110f0c3fe228"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SENHA_MESTRE_FINANCEIRO = "1234"; 
let areaFinanceiraDesbloqueada = false;
let produtos = [], clientes = [], ordens = [], vendas = [], fiados = [];
let carrinhoVenda = [], carrinhoOS = [];
let clienteFiadoAtual = null;

// ================= EXPORTAR FUNÇÕES PARA O HTML =================
window.mudarAba = mudarAba;
window.sairApp = () => { if(confirm("Deseja sair do painel AllTech OS?")) signOut(auth); };
window.abrirModalOS = abrirModalOS;
window.fecharModalOS = () => document.getElementById('modal-os').classList.add('hidden');
window.adicionarProdutoNaOS = adicionarProdutoNaOS;
window.salvarModalOS = salvarModalOS;
window.verificarSenha = verificarSenha;
window.fecharModalSenha = () => document.getElementById('modal-senha').classList.add('hidden');
window.filtrarProdutosOrcamento = filtrarProdutosOrcamento;
window.adicionarProdutoAoOrcamentoOS = adicionarProdutoAoOrcamentoOS;
window.removerItemOrcamentoOS = removerItemOrcamentoOS;
window.filtrarProdutosVenda = filtrarProdutosVenda;
window.adicionarItemCarrinhoVendaManual = adicionarItemCarrinhoVendaManual;
window.removerItemVenda = removerItemVenda;
window.finalizarVendaCarrinho = finalizarVendaCarrinho;
window.atualizarDashboard = atualizarDashboard;
window.atualizarTelaOS = atualizarTelaOS;
window.atualizarTelaProdutos = atualizarTelaProdutos;
window.atualizarTelaClientes = atualizarTelaClientes;
window.atualizarTelaVendas = atualizarTelaVendas;
window.renderizarListaClientesFiado = renderizarListaClientesFiado;
window.selecionarClienteFiado = selecionarClienteFiado;
window.voltarListaFiados = voltarListaFiados;
window.darBaixaFiado = darBaixaFiado;
window.fecharModalBaixa = fecharModalBaixa;
window.confirmarBaixaFiado = confirmarBaixaFiado;
window.deletarOS = deletarOS;
window.deletarVenda = deletarVenda;
window.deletarFiado = deletarFiado;
window.deletarProduto = deletarProduto;
window.deletarCliente = deletarCliente;
window.filtrarProdutosEditOS = filtrarProdutosEditOS;
window.abrirDetalhesCaixa = abrirDetalhesCaixa;
window.fecharDetalhesCaixa = () => document.getElementById('modal-detalhes-caixa').classList.add('hidden');

// ================= LOGIN =================
onAuthStateChanged(auth, (user) => {
    if (user) { 
        document.getElementById('tela-login').classList.add('hidden'); 
        document.getElementById('tela-loading').classList.remove('hidden'); 
        carregarDadosDaNuvem(); 
    } else { 
        document.getElementById('tela-login').classList.remove('hidden'); 
        document.getElementById('app-completo').classList.add('hidden'); 
        document.getElementById('tela-loading').classList.add('hidden'); 
    }
});

document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, document.getElementById('login-user').value, document.getElementById('login-pass').value)
    .catch((error) => alert("E-mail ou senha inválidos! Tente novamente."));
});

// ================= NUVEM (COM PROTEÇÃO DE FALHA) =================
async function carregarDadosDaNuvem() {
    try {
        const docRef = doc(db, "banco", "alltech");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const d = docSnap.data();
            produtos = d.produtos || []; 
            clientes = d.clientes || []; 
            ordens = d.ordens || []; 
            vendas = d.vendas || []; 
            fiados = d.fiados || [];
        } else {
            console.log("Banco de dados vazio. Criando estrutura inicial...");
            await salvarDadosNaNuvem();
        }
    } catch(e) { 
        console.error("Erro ao puxar dados do Firebase:", e);
        alert("Aviso: Falha ao carregar alguns dados. Verifique a conexão com a internet.");
    } finally {
        document.getElementById('tela-loading').classList.add('hidden');
        document.getElementById('app-completo').classList.remove('hidden');
        iniciarApp();
    }
}

function salvarDadosNaNuvem() { 
    setDoc(doc(db, "banco", "alltech"), { produtos, clientes, ordens, vendas, fiados })
    .catch(e => {
        console.error("Erro ao salvar:", e);
        alert("Erro ao salvar dados! Verifique sua conexão.");
    }); 
}

// ================= PESQUISA E ORÇAMENTO OS =================
function filtrarProdutosOrcamento(termo) {
    const box = document.getElementById('os-sugestoes-produtos');
    if(!termo) { box.classList.add('hidden'); return; }
    const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(termo.toLowerCase()));
    if(filtrados.length === 0) { box.classList.add('hidden'); return; }
    box.innerHTML = '';
    filtrados.forEach(p => {
        const div = document.createElement('div');
        div.className = "p-4 border-b border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-pointer font-bold text-sm text-slate-200 transition-colors flex justify-between";
        div.innerHTML = `<span>${p.nome}</span> <span class="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">R$ ${p.precoVenda.toFixed(2)}</span>`;
        div.onclick = () => {
            document.getElementById('os-busca-prod-input').value = p.nome;
            document.getElementById('os-add-qtd').value = '1';
            document.getElementById('os-add-valor').value = ''; // Fica manual
            box.classList.add('hidden');
            window.prodOrcamentoTemp = p;
        };
        box.appendChild(div);
    });
    box.classList.remove('hidden');
}

function adicionarProdutoAoOrcamentoOS() {
    const nome = document.getElementById('os-busca-prod-input').value;
    const precoUnitario = parseFloat(document.getElementById('os-add-valor').value);
    const qtd = parseFloat(document.getElementById('os-add-qtd').value) || 1;
    
    if(!nome || isNaN(precoUnitario) || qtd <= 0) return;
    
    const subtotal = precoUnitario * qtd;
    const custoTotalItem = (window.prodOrcamentoTemp?.custo || 0) * qtd;
    
    carrinhoOS.push({ nome, precoUnitario, preco: subtotal, custo: custoTotalItem, qtd });
    
    let total = parseFloat(document.getElementById('os-valor').value) || 0;
    document.getElementById('os-valor').value = (total + subtotal).toFixed(2);
    
    renderizarItensOrcamentoOS();
    document.getElementById('os-busca-prod-input').value = '';
    document.getElementById('os-add-valor').value = '';
    document.getElementById('os-add-qtd').value = '1';
    window.prodOrcamentoTemp = null;
}

function renderizarItensOrcamentoOS() {
    const lista = document.getElementById('lista-orcamento-os'); 
    lista.innerHTML = '';
    carrinhoOS.forEach((item, i) => {
        lista.innerHTML += `<li class="flex justify-between items-center bg-slate-800 p-4 border border-slate-700 rounded-xl font-bold text-sm shadow-md hover:border-red-500/50 transition-colors group">
            <span class="text-slate-200 flex items-center gap-3"><span class="text-blue-500 text-lg">▪</span> <span class="bg-slate-700 px-2 py-0.5 rounded-md text-slate-300 text-xs">${item.qtd}x</span> ${item.nome}</span>
            <div class="flex items-center gap-4">
                <span class="text-blue-400 font-black tracking-wider">R$ ${item.preco.toFixed(2)}</span>
                <button type="button" onclick="removerItemOrcamentoOS(${i})" class="text-slate-500 group-hover:text-red-400 bg-slate-900 hover:bg-red-500/20 border border-slate-700 hover:border-red-500 w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-inner">✕</button>
            </div>
        </li>`;
    });
}

function removerItemOrcamentoOS(i) {
    let total = parseFloat(document.getElementById('os-valor').value) || 0;
    document.getElementById('os-valor').value = (total - carrinhoOS[i].preco).toFixed(2);
    carrinhoOS.splice(i, 1); 
    renderizarItensOrcamentoOS();
}

// ================= MODAL DETALHES OS =================
function abrirModalOS(id) {
    const os = ordens.find(o => String(o.id) === String(id)); 
    if (!os) { alert("Erro: Ordem de Serviço não encontrada!"); return; }
    
    window.idOsAtualNoModal = os.id; 
    window.materiaisEditOS = [...(os.materiais || [])];
    
    document.getElementById('modal-titulo').textContent = os.cliente || "Sem Cliente";
    document.getElementById('modal-subtitulo').textContent = `Agendado para: ${os.dataAgendada || ""}`;
    document.getElementById('modal-executado').value = os.descricaoExecutada || "";
    document.getElementById('modal-obs').value = os.observacoes || "";
    document.getElementById('modal-valor-total').value = (os.valorTotal || 0).toFixed(2);
    document.getElementById('modal-pago-hora').value = "";
    
    atualizarListaProdutosModal();
    document.getElementById('modal-os').classList.remove('hidden');
}

function filtrarProdutosEditOS(termo) {
    const box = document.getElementById('os-edit-sugestoes');
    if(!termo) { box.classList.add('hidden'); return; }
    const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(termo.toLowerCase()));
    box.innerHTML = '';
    filtrados.forEach(p => {
        const div = document.createElement('div'); div.className = "p-4 border-b border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-pointer text-sm font-bold text-slate-200 transition-colors flex justify-between";
        div.innerHTML = `<span>${p.nome}</span> <span class="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">R$ ${p.precoVenda.toFixed(2)}</span>`;
        div.onclick = () => {
            document.getElementById('os-edit-busca-input').value = p.nome;
            document.getElementById('modal-qtd-produto').value = '1';
            document.getElementById('modal-valor-produto').value = ''; // Manual
            box.classList.add('hidden');
            window.prodEditTemp = p;
        };
        box.appendChild(div);
    });
    box.classList.remove('hidden');
}

function adicionarProdutoNaOS() {
    const nome = document.getElementById('os-edit-busca-input').value;
    const precoUnitario = parseFloat(document.getElementById('modal-valor-produto').value);
    const qtd = parseFloat(document.getElementById('modal-qtd-produto').value) || 1;
    
    if(!nome || isNaN(precoUnitario) || qtd <= 0) return;
    
    const subtotal = precoUnitario * qtd;
    const custoTotalItem = (window.prodEditTemp?.custo || 0) * qtd;
    
    window.materiaisEditOS.push({ nome, precoUnitario, precoCobrado: subtotal, custo: custoTotalItem, qtd });
    
    let total = parseFloat(document.getElementById('modal-valor-total').value) || 0;
    document.getElementById('modal-valor-total').value = (total + subtotal).toFixed(2);
    
    atualizarListaProdutosModal();
    document.getElementById('os-edit-busca-input').value = ""; 
    document.getElementById('modal-valor-produto').value = "";
    document.getElementById('modal-qtd-produto').value = "1";
    window.prodEditTemp = null;
}

function atualizarListaProdutosModal() {
    const lista = document.getElementById('modal-lista-produtos'); 
    lista.innerHTML = '';
    window.materiaisEditOS.forEach((item) => {
        const valorDoItem = item.precoCobrado || item.preco || 0;
        const qtd = item.qtd || 1;
        lista.innerHTML += `<li class="flex justify-between items-center bg-slate-900/50 p-4 border border-slate-700 rounded-xl font-bold text-xs shadow-inner">
            <span class="text-slate-300 flex items-center gap-3"><span class="bg-slate-800 border border-slate-600 px-2 py-1 rounded text-slate-400">${qtd}x</span> ${item.nome}</span>
            <span class="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg text-sm tracking-wider">R$ ${valorDoItem.toFixed(2)}</span>
        </li>`;
    });
}

function salvarModalOS(novoStatus) {
    const os = ordens.find(o => String(o.id) === String(window.idOsAtualNoModal));
    if(!os) return;

    const total = parseFloat(document.getElementById('modal-valor-total').value) || 0;
    const pago = parseFloat(document.getElementById('modal-pago-hora').value) || 0;

    os.valorTotal = total;
    os.descricaoExecutada = document.getElementById('modal-executado').value;
    os.observacoes = document.getElementById('modal-obs').value;
    os.materiais = [...window.materiaisEditOS];
    os.status = novoStatus;

    if(novoStatus === 'Concluído') {
        if(pago > 0 && pago < total) {
            fiados.unshift({ id: Date.now()+2, cliente: os.cliente, data: new Date().toISOString().split('T')[0], valor: total - pago, descricao: `Restante OS: ${os.descricao}`, pago: false });
        } else if (pago === 0 && total > 0) {
            fiados.unshift({ id: Date.now()+2, cliente: os.cliente, data: new Date().toISOString().split('T')[0], valor: total, descricao: `OS Pendente de Pagto: ${os.descricao}`, pago: false });
        }
        let custos = 0; 
        os.materiais.forEach(m => custos += (m.custo || 0));
        vendas.unshift({ id: Date.now(), cliente: os.cliente, nome: `OS: ${os.descricao}`, vendaTotal: total, lucroFinal: total - custos, data: new Date().toLocaleDateString('pt-BR') });
    }
    
    salvarDadosNaNuvem(); 
    document.getElementById('modal-os').classList.add('hidden'); 
    atualizarTelaOS(); 
    atualizarDashboard(); 
    atualizarTelaVendas(); 
    atualizarResumoFinanceiro(); 
    if(clienteFiadoAtual === null) renderizarListaClientesFiado();
}

// ================= VENDA PDV =================
function filtrarProdutosVenda(termo) {
    const box = document.getElementById('venda-sugestoes-produtos');
    if(!termo) { box.classList.add('hidden'); return; }
    const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(termo.toLowerCase()));
    box.innerHTML = '';
    filtrados.forEach(p => {
        const div = document.createElement('div'); 
        div.className = "p-4 border-b border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-pointer font-bold text-slate-200 flex justify-between transition-colors";
        div.innerHTML = `<span>${p.nome}</span> <span class="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">R$ ${p.precoVenda.toFixed(2)}</span>`;
        div.onclick = () => { 
            document.getElementById('venda-busca-prod-input').value = p.nome; 
            document.getElementById('venda-qtd').value = '1';
            document.getElementById('venda-valor').value = ''; // Manual
            box.classList.add('hidden'); 
            window.prodVendaTemp = p; 
        };
        box.appendChild(div);
    });
    box.classList.remove('hidden');
}

function adicionarItemCarrinhoVendaManual() {
    const nome = document.getElementById('venda-busca-prod-input').value;
    const precoUnitario = parseFloat(document.getElementById('venda-valor').value);
    const qtd = parseFloat(document.getElementById('venda-qtd').value) || 1;
    
    if(!nome || isNaN(precoUnitario) || qtd <= 0) return;
    
    const subtotal = precoUnitario * qtd;
    const custoTotal = (window.prodVendaTemp?.custo || 0) * qtd;
    
    carrinhoVenda.push({ nome, qtd, precoUnitario, custoTotal, subtotal });
    
    document.getElementById('venda-busca-prod-input').value = ''; 
    document.getElementById('venda-valor').value = ''; 
    document.getElementById('venda-qtd').value = '1'; 
    window.prodVendaTemp = null;
    
    renderizarCarrinhoVenda();
}

function renderizarCarrinhoVenda() {
    const tbody = document.getElementById('lista-itens-carrinho'); 
    document.getElementById('carrinho-venda').classList.toggle('hidden', carrinhoVenda.length === 0);
    tbody.innerHTML = ''; 
    let total = 0;
    carrinhoVenda.forEach((item, i) => { 
        total += item.subtotal; 
        tbody.innerHTML += `<tr class="hover:bg-slate-700/50 transition-colors group">
            <td class="p-5 text-sm font-bold text-slate-200">${item.nome}</td>
            <td class="p-5 text-center"><span class="bg-slate-900 border border-slate-600 text-slate-300 px-3 py-1 rounded-lg text-xs font-black">${item.qtd}x</span></td>
            <td class="p-5 text-right font-black text-emerald-400 text-base tracking-widest">R$ ${item.subtotal.toFixed(2)}</td>
            <td class="p-5 text-center"><button onclick="removerItemVenda(${i})" class="text-slate-500 group-hover:text-red-400 bg-slate-900 border border-slate-700 w-10 h-10 rounded-xl flex items-center justify-center mx-auto hover:bg-red-500/20 hover:border-red-500 transition-all shadow-inner">✕</button></td>
        </tr>`; 
    });
    document.getElementById('total-carrinho').textContent = `R$ ${total.toFixed(2)}`;
}

function removerItemVenda(i) { 
    carrinhoVenda.splice(i, 1); 
    renderizarCarrinhoVenda(); 
}

function finalizarVendaCarrinho() {
    const cliente = document.getElementById('venda-cliente-selecionado').value;
    const pago = parseFloat(document.getElementById('venda-pago-hora').value) || 0;
    let total = 0, custos = 0; 
    
    carrinhoVenda.forEach(i => { total += i.subtotal; custos += i.custoTotal; });
    
    if(pago < total) {
        fiados.unshift({ id: Date.now()+1, cliente, data: new Date().toISOString().split('T')[0], valor: total - pago, descricao: `Saldo Venda: ${carrinhoVenda[0].nome}`, pago: false });
    }
    
    vendas.unshift({ id: Date.now(), cliente, nome: carrinhoVenda.map(i => `${i.qtd}x ${i.nome}`).join(" | "), vendaTotal: total, lucroFinal: total - custos, data: new Date().toLocaleDateString('pt-BR') });
    
    carrinhoVenda = []; 
    renderizarCarrinhoVenda(); 
    salvarDadosNaNuvem(); 
    atualizarTelaVendas(); 
    atualizarResumoFinanceiro(); 
    if(clienteFiadoAtual === null) renderizarListaClientesFiado();
    alert("✅ Venda Finalizada com Sucesso no Sistema!");
}


// ================= NAVEGAÇÃO E AUTENTICAÇÃO =================
function mudarAba(aba) {
    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.remove('ativa'));
    const abaAlvo = document.getElementById(`aba-${aba}`);
    if(abaAlvo) abaAlvo.classList.add('ativa');
    
    if(aba === 'inicio') atualizarDashboard();
    if(aba === 'fiados') renderizarListaClientesFiado();
    if(aba === 'caixa') atualizarResumoFinanceiro();
}

function verificarSenha() {
    if (document.getElementById('input-senha').value === SENHA_MESTRE_FINANCEIRO) {
        areaFinanceiraDesbloqueada = true; 
        document.getElementById('modal-senha').classList.add('hidden'); 
        mudarAba('caixa');
        document.getElementById('input-senha').value = '';
    } else {
        alert("Senha incorreta!");
    }
}

// ================= RENDERIZAÇÕES PRINCIPAIS =================
function atualizarTelaOS() {
    const container = document.getElementById('lista-os'); 
    const inputBusca = document.getElementById('busca-os');
    const busca = inputBusca ? inputBusca.value.toLowerCase() : '';
    
    if(!container) return;
    container.innerHTML = '';
    
    ordens.forEach(os => {
        const clienteNome = os.cliente ? os.cliente.toLowerCase() : '';
        const descOS = os.descricao ? os.descricao.toLowerCase() : '';

        if(clienteNome.includes(busca) || descOS.includes(busca)) {
            const isFeito = os.status === 'Concluído';
            container.innerHTML += `<div class="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative border-l-[5px] ${isFeito ? 'border-l-emerald-500' : 'border-l-blue-500'} hover:shadow-2xl hover:border-slate-600 hover:-translate-y-1 transition-all duration-300 cursor-pointer group" onclick="abrirModalOS('${os.id}')">
                <button onclick="window.event.stopPropagation(); deletarOS('${os.id}')" class="absolute top-4 right-4 text-slate-500 hover:text-red-400 bg-slate-900 hover:bg-red-500/20 hover:border-red-500 border border-slate-700 w-10 h-10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 shadow-inner">🗑️</button>
                <div class="pr-8">
                    <div class="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-3">
                        <span class="font-black text-white text-xl group-hover:text-blue-400 transition-colors line-clamp-1 tracking-tight">${os.cliente}</span>
                        <span class="${isFeito ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'text-blue-400 bg-blue-500/10 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]'} font-black border px-4 py-1.5 rounded-xl whitespace-nowrap tracking-widest text-sm">R$ ${(os.valorTotal||0).toFixed(2)}</span>
                    </div>
                    <div class="flex items-center gap-3 mt-2">
                        <span class="text-[10px] font-black uppercase tracking-widest ${isFeito ? 'text-emerald-400 bg-emerald-500/10' : 'text-blue-400 bg-blue-500/10'} px-3 py-1.5 rounded-lg border ${isFeito ? 'border-emerald-500/20' : 'border-blue-500/20'}">${os.status}</span>
                        <span class="text-xs font-bold text-slate-400 flex items-center gap-1.5"><span class="text-slate-500">🗓️</span> ${os.dataAgendada}</span>
                    </div>
                    <p class="text-sm mt-5 text-slate-400 font-medium line-clamp-2 border-t border-slate-700 pt-4">${os.descricao}</p>
                </div>
            </div>`;
        }
    });
}

function atualizarTelaProdutos() {
    const c = document.getElementById('lista-produtos'); 
    const inputBusca = document.getElementById('busca-produtos');
    const busca = inputBusca ? inputBusca.value.toLowerCase() : '';

    if(!c) return;
    c.innerHTML = '';
    produtos.forEach(p => {
        if(p.nome.toLowerCase().includes(busca)) {
            const lucroReal = p.precoVenda - p.custo;
            const perc = p.custo > 0 ? ((lucroReal/p.custo)*100).toFixed(0) : 100;

            c.innerHTML += `<div class="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative hover:shadow-2xl hover:border-orange-500/50 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between overflow-hidden">
                <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-colors pointer-events-none"></div>
                <button onclick="deletarProduto('${p.id}')" class="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 border border-slate-700 hover:border-red-500 hover:bg-red-500/20 w-10 h-10 flex items-center justify-center rounded-xl shadow-inner z-10">🗑️</button>
                <h3 class="font-black text-white text-[16px] border-b border-slate-700 pb-4 mb-5 pr-10 line-clamp-2 leading-snug relative z-10" title="${p.nome}">${p.nome}</h3>
                <div class="relative z-10">
                    <div class="space-y-2.5 mb-5">
                        <p class="text-xs text-slate-500 font-bold uppercase tracking-widest flex justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">Custo <span class="text-slate-300">R$ ${p.custo.toFixed(2)}</span></p>
                        <p class="text-sm text-orange-400 font-black uppercase tracking-widest flex justify-between items-center bg-orange-500/10 p-2 rounded-lg border border-orange-500/20 shadow-[inset_0_0_10px_rgba(249,115,22,0.1)]">Venda <span class="text-lg">R$ ${p.precoVenda.toFixed(2)}</span></p>
                    </div>
                    <div class="inline-block bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-black tracking-widest px-4 py-2 rounded-lg shadow-inner uppercase">Margem: <span class="text-emerald-400">+${perc}%</span></div>
                </div>
            </div>`;
        }
    });
}

function atualizarTelaVendas() {
    const tb = document.getElementById('lista-vendas'); 
    const inputBusca = document.getElementById('busca-vendas');
    const busca = inputBusca ? inputBusca.value.toLowerCase() : '';

    if(!tb) return;
    tb.innerHTML = '';
    vendas.forEach(v => {
        const clienteNome = v.cliente ? v.cliente.toLowerCase() : 'consumidor';
        const vendaNome = v.nome ? v.nome.toLowerCase() : '';

        if(clienteNome.includes(busca) || vendaNome.includes(busca)) {
            tb.innerHTML += `<tr class="hover:bg-slate-700/50 transition-colors group">
                <td class="p-5 text-sm font-bold text-slate-400 whitespace-nowrap border-l-[3px] border-l-transparent group-hover:border-l-emerald-500">${v.data}</td>
                <td class="p-5 text-sm font-black text-white">${v.cliente || 'Consumidor Balcão'}</td>
                <td class="p-5 text-sm font-medium text-slate-400 truncate max-w-[250px]" title="${v.nome}">${v.nome}</td>
                <td class="p-5 text-right font-black text-emerald-400 text-lg whitespace-nowrap tracking-wider">R$ ${v.vendaTotal.toFixed(2)}</td>
                <td class="p-5 text-center"><button onclick="deletarVenda('${v.id}')" class="text-slate-500 font-bold hover:text-red-400 bg-slate-900 border border-slate-700 w-10 h-10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:border-red-500 transition-all shadow-inner mx-auto">✕</button></td>
            </tr>`;
        }
    });
}

function atualizarTelaClientes() {
    const c = document.getElementById('lista-clientes'); 
    const inputBusca = document.getElementById('busca-clientes');
    const busca = inputBusca ? inputBusca.value.toLowerCase() : '';

    if(!c) return;
    c.innerHTML = '';
    clientes.forEach(cl => {
        if(cl.nome.toLowerCase().includes(busca) || cl.telefone.includes(busca)) {
            c.innerHTML += `<div class="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-lg relative hover:shadow-2xl hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 group flex gap-5 items-start overflow-hidden">
                <div class="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors pointer-events-none"></div>
                <button onclick="deletarCliente('${cl.id}')" class="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all bg-slate-900 border border-slate-700 hover:border-red-500 hover:bg-red-500/20 w-10 h-10 flex items-center justify-center rounded-xl shadow-inner z-10">🗑️</button>
                <div class="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.2)] relative z-10">${cl.nome.charAt(0).toUpperCase()}</div>
                <div class="relative z-10 pt-1">
                    <h3 class="font-black text-white text-lg mb-1 pr-8 tracking-tight">${cl.nome}</h3>
                    <p class="text-slate-400 text-sm font-bold flex items-center gap-2 mb-3"><span class="text-indigo-400 text-xs bg-indigo-500/10 p-1.5 rounded-md border border-indigo-500/20">📞</span> ${cl.telefone}</p>
                    <p class="text-slate-500 text-[10px] mt-2 uppercase font-black tracking-widest line-clamp-1 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50" title="${cl.endereco || ''}">${cl.endereco || 'Sem endereço'}</p>
                </div>
            </div>`;
        }
    });
}

function renderizarListaClientesFiado() {
    const container = document.getElementById('lista-clientes-fiado');
    const inputBusca = document.getElementById('busca-cliente-fiado');
    const busca = inputBusca ? inputBusca.value.toLowerCase() : '';

    if(!container) return;
    container.innerHTML = '';
    
    let listaF = clientes.map(c => {
        let d = 0; fiados.forEach(f => { if(f.cliente === c.nome && !f.pago) d += f.valor; });
        return { nome: c.nome, divida: d };
    }).sort((a,b) => b.divida - a.divida);

    listaF.forEach(c => {
        if(c.nome.toLowerCase().includes(busca)) {
            container.innerHTML += `<div onclick="selecionarClienteFiado('${c.nome}')" class="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-lg relative border-l-[6px] ${c.divida > 0 ? 'border-l-red-500' : 'border-l-slate-700 opacity-50 grayscale hover:grayscale-0'} hover:shadow-2xl hover:border-slate-500 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[180px] group overflow-hidden">
                <div class="absolute -right-10 -bottom-10 w-32 h-32 ${c.divida > 0 ? 'bg-red-500/10' : 'bg-slate-500/10'} rounded-full blur-3xl pointer-events-none transition-colors"></div>
                <div class="relative z-10">
                    <h3 class="font-black text-white text-xl line-clamp-1 group-hover:text-red-400 transition-colors tracking-tight" title="${c.nome}">${c.nome}</h3>
                    <p class="text-[10px] font-black text-slate-500 mt-2 uppercase tracking-widest">Situação do Cliente</p>
                </div>
                <div class="mt-6 flex items-end justify-between relative z-10">
                    ${c.divida > 0 
                        ? `<span class="text-red-400 font-black text-3xl tracking-tighter leading-none shadow-[inset_0_0_15px_rgba(239,68,68,0.1)] bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">R$ ${c.divida.toFixed(2)}</span>` 
                        : `<span class="text-slate-500 font-black text-2xl leading-none">R$ 0,00</span>`}
                    <div class="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-black text-slate-400 group-hover:bg-red-500/20 group-hover:border-red-500 group-hover:text-red-400 transition-colors shadow-inner group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]">➔</div>
                </div>
            </div>`;
        }
    });
}

function selecionarClienteFiado(nome) { 
    clienteFiadoAtual = nome; 
    
    const painelGrid = document.getElementById('painel-grid-fiados');
    const painelDetalhe = document.getElementById('painel-detalhe-fiado');
    if(painelGrid) painelGrid.classList.add('hidden'); 
    if(painelDetalhe) painelDetalhe.classList.remove('hidden'); 
    
    renderizarDetalheFiadoCliente(); 
}

function voltarListaFiados() {
    clienteFiadoAtual = null;
    
    const painelGrid = document.getElementById('painel-grid-fiados');
    const painelDetalhe = document.getElementById('painel-detalhe-fiado');
    if(painelGrid) painelGrid.classList.remove('hidden'); 
    if(painelDetalhe) painelDetalhe.classList.add('hidden'); 
    
    renderizarListaClientesFiado();
}

function renderizarDetalheFiadoCliente() {
    const tb = document.getElementById('lista-fiados-cliente'); 
    if(!tb) return;
    tb.innerHTML = ''; 
    let total = 0;
    
    const pendentes = fiados.filter(f => f.cliente === clienteFiadoAtual && !f.pago);
    
    if(pendentes.length === 0) {
        tb.innerHTML = `<tr><td colspan="4" class="p-12 text-center text-slate-400 font-bold bg-slate-900/50 border-t border-slate-700"><span class="text-4xl mb-3 block opacity-50">🎉</span> Cliente sem débitos em aberto.</td></tr>`;
    } else {
        pendentes.forEach(f => {
            total += f.valor;
            tb.innerHTML += `<tr class="hover:bg-slate-700/50 transition-colors group">
                <td class="p-5 text-sm font-bold text-slate-400 border-l-[3px] border-l-transparent group-hover:border-l-red-500">${f.data}</td>
                <td class="p-5 text-sm font-bold text-white truncate max-w-[200px]">${f.descricao}</td>
                <td class="p-5 font-black text-red-400 text-right text-lg tracking-wider">R$ ${f.valor.toFixed(2)}</td>
                <td class="p-5 text-center">
                    <div class="flex items-center justify-center gap-3">
                        <button onclick="darBaixaFiado('${f.id}')" class="bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all">Abater</button>
                        <button onclick="deletarFiado('${f.id}')" class="text-slate-500 hover:text-red-400 bg-slate-900 border border-slate-700 w-10 h-10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:border-red-500 transition-all shadow-inner">🗑️</button>
                    </div>
                </td>
            </tr>`;
        });
    }
    
    const nomeEl = document.getElementById('fiado-nome-cliente');
    const totEl = document.getElementById('fiado-total-cliente');
    const letraEl = document.getElementById('fiado-avatar-letra');
    
    if(nomeEl) nomeEl.textContent = clienteFiadoAtual; 
    if(totEl) totEl.textContent = `R$ ${total.toFixed(2)}`;
    if(letraEl && clienteFiadoAtual) letraEl.textContent = clienteFiadoAtual.charAt(0).toUpperCase();
}

// ================= LÓGICA DE BAIXA DE FIADO =================
function darBaixaFiado(id) {
    const f = fiados.find(fi => String(fi.id) === String(id));
    if (!f || f.pago) return;
    
    window.idFiadoBaixaAtual = f.id;
    document.getElementById('baixa-total-divida').value = (f.valor || 0).toFixed(2);
    document.getElementById('baixa-valor-pago').value = (f.valor || 0).toFixed(2);
    document.getElementById('baixa-descricao').value = `Pagamento: ${f.descricao}`;
    document.getElementById('baixa-lancar-venda').checked = true;
    
    document.getElementById('modal-baixa').classList.remove('hidden');
}

function fecharModalBaixa() {
    document.getElementById('modal-baixa').classList.add('hidden');
    window.idFiadoBaixaAtual = null;
}

function confirmarBaixaFiado() {
    const f = fiados.find(fi => String(fi.id) === String(window.idFiadoBaixaAtual));
    if(!f) return;

    const valorPago = parseFloat(document.getElementById('baixa-valor-pago').value);
    const descricao = document.getElementById('baixa-descricao').value || 'Pagamento Fiado';
    const lancarVenda = document.getElementById('baixa-lancar-venda').checked;

    if(isNaN(valorPago) || valorPago <= 0) {
        return alert("Insira um valor maior que zero!");
    }

    if(valorPago > f.valor) {
        return alert("O valor pago não pode ser maior que a dívida atual (R$ " + f.valor.toFixed(2) + ")!");
    }

    if(lancarVenda) {
        vendas.unshift({
            id: Date.now(),
            cliente: f.cliente,
            nome: descricao,
            vendaTotal: valorPago,
            lucroFinal: valorPago,
            data: new Date().toLocaleDateString('pt-BR')
        });
    }

    if(valorPago === f.valor) {
        f.pago = true;
    } else {
        f.valor -= valorPago;
        f.descricao += ` | (Abateu R$ ${valorPago.toFixed(2)})`;
    }

    salvarDadosNaNuvem();
    fecharModalBaixa();
    renderizarDetalheFiadoCliente(); 
    atualizarResumoFinanceiro();
    atualizarTelaVendas();
}


// ================= NOVO: DETALHES RÁPIDOS DO CAIXA =================
function abrirDetalhesCaixa(tipo) {
    const tbody = document.getElementById('lista-detalhes-caixa');
    const titulo = document.getElementById('titulo-detalhe-caixa');
    const icone = document.getElementById('icone-detalhe-caixa');
    const totalEl = document.getElementById('total-detalhe-caixa');
    
    tbody.innerHTML = '';
    let total = 0;

    if (tipo === 'bruto') {
        titulo.textContent = 'Vendas Brutas (Histórico)';
        icone.innerHTML = '<span class="text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">📈</span>';
        vendas.forEach(v => {
            total += v.vendaTotal;
            tbody.innerHTML += `<tr class="hover:bg-slate-800 transition-colors group">
                <td class="p-5 pl-8 text-sm font-bold text-slate-400 border-l-[3px] border-l-transparent group-hover:border-l-blue-500">${v.data}</td>
                <td class="p-5 text-sm font-bold text-white"><span class="text-[10px] font-black tracking-widest text-blue-500 uppercase block mb-1 bg-blue-500/10 px-2 py-0.5 rounded inline-block border border-blue-500/20">${v.cliente || 'Balcão'}</span><br>${v.nome}</td>
                <td class="p-5 pr-8 font-black text-blue-400 text-right text-lg tracking-wider">R$ ${v.vendaTotal.toFixed(2)}</td>
            </tr>`;
        });
        totalEl.className = 'text-4xl font-black text-blue-400 drop-shadow-md';
    } else if (tipo === 'lucro') {
        titulo.textContent = 'Lucro Líquido (Histórico)';
        icone.innerHTML = '<span class="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">💎</span>';
        vendas.forEach(v => {
            total += v.lucroFinal;
            tbody.innerHTML += `<tr class="hover:bg-slate-800 transition-colors group">
                <td class="p-5 pl-8 text-sm font-bold text-slate-400 border-l-[3px] border-l-transparent group-hover:border-l-emerald-500">${v.data}</td>
                <td class="p-5 text-sm font-bold text-white"><span class="text-[10px] font-black tracking-widest text-emerald-500 uppercase block mb-1 bg-emerald-500/10 px-2 py-0.5 rounded inline-block border border-emerald-500/20">${v.cliente || 'Balcão'}</span><br>${v.nome}</td>
                <td class="p-5 pr-8 font-black text-emerald-400 text-right text-lg tracking-wider">R$ ${v.lucroFinal.toFixed(2)}</td>
            </tr>`;
        });
        totalEl.className = 'text-4xl font-black text-emerald-400 drop-shadow-md';
    } else if (tipo === 'fundo') {
        titulo.textContent = 'Fundo para Estoque (Custos)';
        icone.innerHTML = '<span class="text-slate-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">⚙️</span>';
        vendas.forEach(v => {
            const custo = v.vendaTotal - v.lucroFinal;
            if (custo > 0) {
                total += custo;
                tbody.innerHTML += `<tr class="hover:bg-slate-800 transition-colors group">
                    <td class="p-5 pl-8 text-sm font-bold text-slate-400 border-l-[3px] border-l-transparent group-hover:border-l-slate-400">${v.data}</td>
                    <td class="p-5 text-sm font-bold text-white"><span class="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-1 bg-slate-700 px-2 py-0.5 rounded inline-block border border-slate-600">${v.cliente || 'Balcão'}</span><br>${v.nome}</td>
                    <td class="p-5 pr-8 font-black text-slate-300 text-right text-lg tracking-wider">R$ ${custo.toFixed(2)}</td>
                </tr>`;
            }
        });
        totalEl.className = 'text-4xl font-black text-white drop-shadow-md';
    } else if (tipo === 'fiados') {
        titulo.textContent = 'Valores a Receber (Fiados Ativos)';
        icone.innerHTML = '<span class="text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">⏳</span>';
        fiados.filter(f => !f.pago).forEach(f => {
            total += f.valor;
            tbody.innerHTML += `<tr class="hover:bg-slate-800 transition-colors group">
                <td class="p-5 pl-8 text-sm font-bold text-slate-400 border-l-[3px] border-l-transparent group-hover:border-l-orange-500">${f.data}</td>
                <td class="p-5 text-sm font-bold text-white"><span class="text-[10px] font-black tracking-widest text-orange-500 uppercase block mb-1 bg-orange-500/10 px-2 py-0.5 rounded inline-block border border-orange-500/20">${f.cliente}</span><br>${f.descricao}</td>
                <td class="p-5 pr-8 font-black text-orange-400 text-right text-lg tracking-wider">R$ ${f.valor.toFixed(2)}</td>
            </tr>`;
        });
        totalEl.className = 'text-4xl font-black text-orange-400 drop-shadow-md';
    }

    if(tbody.innerHTML === '') {
        tbody.innerHTML = `<tr><td colspan="3" class="p-12 text-center text-slate-500 font-bold bg-slate-900/50 border-t border-slate-800">Nenhum registro encontrado para esta categoria.</td></tr>`;
    }

    totalEl.textContent = `R$ ${total.toFixed(2)}`;
    document.getElementById('modal-detalhes-caixa').classList.remove('hidden');
}


// ================= FORMULÁRIOS E CADASTROS =================
document.getElementById('form-os')?.addEventListener('submit', (e) => {
    e.preventDefault();
    ordens.unshift({ 
        id: Date.now(), 
        cliente: document.getElementById('os-cliente').value, 
        tipo: 'Orçamento',
        dataAgendada: document.getElementById('os-data').value, 
        valorTotal: parseFloat(document.getElementById('os-valor').value), 
        descricao: document.getElementById('os-descricao').value, 
        status: 'Pendente', 
        materiais: [...carrinhoOS] 
    });
    carrinhoOS = []; 
    renderizarItensOrcamentoOS(); 
    e.target.reset(); 
    document.getElementById('os-data').value = new Date().toISOString().split('T')[0];
    salvarDadosNaNuvem(); 
    atualizarTelaOS(); 
    atualizarDashboard();
});

document.getElementById('form-produtos')?.addEventListener('submit', (e) => {
    e.preventDefault();
    produtos.unshift({ 
        id: Date.now(), 
        nome: document.getElementById('prod-nome').value, 
        custo: parseFloat(document.getElementById('prod-custo').value), 
        precoVenda: parseFloat(document.getElementById('prod-venda').value) 
    });
    e.target.reset(); 
    salvarDadosNaNuvem(); 
    atualizarTelaProdutos(); 
    atualizarSelectsGlobais();
});

document.getElementById('form-clientes')?.addEventListener('submit', (e) => {
    e.preventDefault();
    clientes.unshift({ 
        id: Date.now(), 
        nome: document.getElementById('cliente-nome').value, 
        telefone: document.getElementById('cliente-telefone').value, 
        endereco: document.getElementById('cliente-endereco').value 
    });
    e.target.reset(); 
    salvarDadosNaNuvem(); 
    atualizarTelaClientes(); 
    atualizarSelectsGlobais();
});

document.getElementById('form-fiados-novo')?.addEventListener('submit', (e) => {
    e.preventDefault();
    fiados.unshift({ 
        id: Date.now(), 
        cliente: clienteFiadoAtual, 
        data: document.getElementById('fiado-data').value, 
        valor: parseFloat(document.getElementById('fiado-valor').value), 
        descricao: document.getElementById('fiado-descricao').value, 
        pago: false 
    });
    e.target.reset(); 
    document.getElementById('fiado-data').value = new Date().toISOString().split('T')[0];
    salvarDadosNaNuvem(); 
    renderizarDetalheFiadoCliente(); 
    renderizarListaClientesFiado(); 
    atualizarResumoFinanceiro();
});

// ================= EXCLUSÕES (CORRIGIDAS PARA STRING) =================
function deletarOS(id) { if(confirm("Excluir definitivamente esta OS?")) { ordens = ordens.filter(o => String(o.id) !== String(id)); salvarDadosNaNuvem(); atualizarTelaOS(); atualizarDashboard(); }}
function deletarVenda(id) { if(confirm("Excluir esta Venda? Isso afetará seu lucro total.")) { vendas = vendas.filter(v => String(v.id) !== String(id)); salvarDadosNaNuvem(); atualizarTelaVendas(); atualizarResumoFinanceiro(); }}
function deletarProduto(id) { if(confirm("Excluir Produto do Estoque?")) { produtos = produtos.filter(p => String(p.id) !== String(id)); salvarDadosNaNuvem(); atualizarTelaProdutos(); atualizarSelectsGlobais(); }}
function deletarCliente(id) { if(confirm("Excluir Cliente?")) { clientes = clientes.filter(c => String(c.id) !== String(id)); salvarDadosNaNuvem(); atualizarTelaClientes(); atualizarSelectsGlobais(); renderizarListaClientesFiado(); }}
function deletarFiado(id) { if(confirm("Apagar Dívida Permanentemente?")) { fiados = fiados.filter(f => String(f.id) !== String(id)); salvarDadosNaNuvem(); renderizarDetalheFiadoCliente(); atualizarResumoFinanceiro(); }}

// ================= DASHBOARD & INICIALIZAÇÃO =================
function atualizarResumoFinanceiro() {
    let b = 0, l = 0, f = 0; 
    vendas.forEach(v => { b += v.vendaTotal; l += v.lucroFinal; });
    fiados.forEach(fi => { if(!fi.pago) f += fi.valor; });
    
    if(document.getElementById('fin-bruto')) document.getElementById('fin-bruto').textContent = `R$ ${b.toFixed(2)}`;
    if(document.getElementById('fin-lucro')) document.getElementById('fin-lucro').textContent = `R$ ${l.toFixed(2)}`;
    if(document.getElementById('fin-reinvest')) document.getElementById('fin-reinvest').textContent = `R$ ${(b-l).toFixed(2)}`;
    if(document.getElementById('fin-fiados')) document.getElementById('fin-fiados').textContent = `R$ ${f.toFixed(2)}`;
}

function atualizarDashboard() {
    const filtroEl = document.getElementById('filtro-data');
    if(!filtroEl) return;
    
    const dataFiltro = filtroEl.value;
    const painelFazer = document.getElementById('painel-fazer');
    const painelFeitos = document.getElementById('painel-feitos');
    
    painelFazer.innerHTML = '';
    painelFeitos.innerHTML = '';
    
    let encontrou = false;

    ordens.forEach(os => {
        const isFeito = os.status === 'Concluído';
        
        if ((isFeito && os.dataAgendada === dataFiltro) || (!isFeito && os.dataAgendada <= dataFiltro)) {
            encontrou = true;
            
            const card = `<div class="bg-slate-900/50 p-6 rounded-3xl border border-slate-700 shadow-lg relative border-l-[5px] ${isFeito ? 'border-l-emerald-500' : 'border-l-blue-500'} hover:shadow-2xl hover:border-slate-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer group" onclick="abrirModalOS('${os.id}')">
                <button onclick="window.event.stopPropagation(); deletarOS('${os.id}')" class="absolute top-4 right-4 text-slate-500 hover:text-red-400 bg-slate-800 border border-slate-600 hover:border-red-500 hover:bg-red-500/20 w-10 h-10 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 shadow-inner">🗑️</button>
                <div class="pr-6 relative z-10">
                    <div class="flex justify-between font-black text-white mb-3 gap-3">
                        <span class="truncate tracking-tight text-xl group-hover:text-blue-400 transition-colors" title="${os.cliente}">${os.cliente}</span>
                        <span class="${isFeito ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-blue-400 bg-blue-500/10 border-blue-500/30'} whitespace-nowrap px-3 py-1 border rounded-lg shadow-inner text-base">R$ ${(os.valorTotal||0).toFixed(2)}</span>
                    </div>
                    <span class="text-[10px] font-black uppercase tracking-widest ${isFeito ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'} px-3 py-1.5 rounded-lg border">${os.status}</span>
                    <p class="text-sm text-slate-400 mt-4 font-medium line-clamp-2 border-t border-slate-700 pt-3">${os.descricao}</p>
                </div>
            </div>`;
            
            if(isFeito) {
                painelFeitos.innerHTML += card;
            } else {
                painelFazer.innerHTML += card;
            }
        }
    });

    if(!encontrou) {
        painelFazer.innerHTML = '<div class="text-center py-12 bg-slate-900/30 rounded-3xl border border-dashed border-slate-700"><span class="text-5xl mb-4 block opacity-50">😎</span><p class="text-slate-400 font-black uppercase tracking-widest text-sm">Sua rota está livre.</p></div>';
    }
}

function atualizarSelectsGlobais() {
    const sC = document.getElementById('venda-cliente-selecionado'); 
    const sO = document.getElementById('os-cliente');
    
    if(sC) {
        sC.innerHTML = '<option value="Consumidor Final">Consumidor Final</option>';
        clientes.forEach(c => { sC.innerHTML += `<option value="${c.nome}">${c.nome}</option>`; });
    }
    
    if(sO) {
        sO.innerHTML = '<option value="">Selecione o Cliente...</option>';
        clientes.forEach(c => { sO.innerHTML += `<option value="${c.nome}">${c.nome}</option>`; });
    }
}

function iniciarApp() {
    const d = new Date(); 
    const dataLocal = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    
    const filtro = document.getElementById('filtro-data');
    const osData = document.getElementById('os-data');
    const fiaData = document.getElementById('fiado-data');
    
    if(filtro) filtro.value = dataLocal;
    if(osData) osData.value = dataLocal;
    if(fiaData) fiaData.value = dataLocal;
    
    atualizarSelectsGlobais();
    atualizarTelaProdutos(); 
    atualizarTelaClientes(); 
    atualizarTelaVendas(); 
    atualizarTelaOS(); 
    if(document.getElementById('lista-clientes-fiado')) renderizarListaClientesFiado(); 
    atualizarResumoFinanceiro(); 
    atualizarDashboard();
}