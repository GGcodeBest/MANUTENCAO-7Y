/* ==========================================================================
   FleetCare - Sistema de Controle de Manutenção de Caminhões
   Módulo JavaScript Principal - Integração com Firebase Firestore (manutencaogy)
   ========================================================================== */

// Importação dos módulos do Firebase via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração do Firebase fornecida pelo projeto "manutencaogy"
const firebaseConfig = {
    apiKey: "AIzaSyDRY3Ka0m1RwphVG_5FUnonfukskw8TMkw",
    authDomain: "manutencaogy.firebaseapp.com",
    projectId: "manutencaogy",
    storageBucket: "manutencaogy.firebasestorage.app",
    messagingSenderId: "27741854734",
    appId: "1:27741854734:web:816dc4c9532d2c8624705f",
    measurementId: "G-VL95LRQ9BY"
};

// Inicializar Firebase e Firestore explicitamente com o banco padrão
const app = initializeApp(firebaseConfig);
const dbFirestore = getFirestore(app, "(default)");

// Estado da Aplicação Local (Cache)
let db = {
    veiculos: [],
    ocorrencias: [],
    ordens: [],
    mecanicos: []
};

let chartGastos, chartCategorias;

document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initChartJS();
    await carregarDadosFirebase();
});

/* --------------------------------------------------------------------------
   1. NAVEGAÇÃO E INTERFACE
   -------------------------------------------------------------------------- */
function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav li');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    const toggleBtn = document.getElementById('toggleSidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });
    }

    const quickSearch = document.getElementById('quickSearch');
    if (quickSearch) {
        quickSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const term = e.target.value.trim().toLowerCase();
                if (term) {
                    switchTab('pesquisa');
                    document.getElementById('fPlaca').value = term;
                    executarPesquisaAvancada();
                }
            }
        });
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));

    const navLi = document.querySelector(`.sidebar-nav li[data-tab="${tabId}"]`);
    if (navLi) navLi.classList.add('active');

    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active');

    if (tabId === 'dashboard') atualizarDashboard();
}

// Expondo funções globais para o HTML conseguir enxergar
window.switchTab = switchTab;

window.openModal = function(modalId) {
    preencherSelectsFormularios();
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
    if(modalId === 'modalOcorrencia') {
        const alerta = document.getElementById('alertaRecorrencia');
        if (alerta) alerta.classList.add('hidden');
    }
};

/* --------------------------------------------------------------------------
   2. CARREGAMENTO DO FIRESTORE
   -------------------------------------------------------------------------- */
async function carregarDadosFirebase() {
    try {
        const snapVeiculos = await getDocs(collection(dbFirestore, "veiculos"));
        db.veiculos = snapVeiculos.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const snapMecanicos = await getDocs(collection(dbFirestore, "mecanicos"));
        db.mecanicos = snapMecanicos.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const snapOcorrencias = await getDocs(collection(dbFirestore, "ocorrencias"));
        db.ocorrencias = snapOcorrencias.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const snapOrdens = await getDocs(collection(dbFirestore, "ordens_servico"));
        db.ordens = snapOrdens.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error("Erro ao carregar dados do Firebase Firestore:", error);
    }

    renderizarTabelas();
    atualizarDashboard();
}

/* --------------------------------------------------------------------------
   3. RENDERIZAÇÃO DAS TABELAS
   -------------------------------------------------------------------------- */
function renderizarTabelas() {
    renderTabelaVeiculos();
    renderTabelaOcorrencias();
    renderTabelaOrdens();
    renderTabelaMecanicos();
}

function renderTabelaVeiculos() {
    const tbody = document.getElementById('tblVeiculos');
    if (!tbody) return;
    tbody.innerHTML = db.veiculos.map(v => `
        <tr>
            <td><strong>${v.placa || ''}</strong></td>
            <td>${v.prefixo || ''}</td>
            <td>${v.marca || ''} / ${v.modelo || ''}</td>
            <td>${v.ano || ''}</td>
            <td>${(v.km_atual || 0).toLocaleString()} KM</td>
            <td>${v.unidade || ''}</td>
            <td>${v.motorista_habitual || '-'}</td>
            <td><span class="badge ${getBadgeSituacao(v.situacao)}">${(v.situacao || 'disponivel').replace('_', ' ')}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="verHistoricoVeiculo('${v.id}')"><i class="fa-solid fa-clock-rotate-left"></i> Histórico</button>
            </td>
        </tr>
    `).join('');
}

function renderTabelaOcorrencias() {
    const tbody = document.getElementById('tblOcorrencias');
    if (!tbody) return;
    tbody.innerHTML = db.ocorrencias.map((o, idx) => {
        const v = db.veiculos.find(x => x.id === o.veiculo_id);
        return `
            <tr>
                <td>#${idx + 101}</td>
                <td>${(o.data_hora || '').substring(0,10)}</td>
                <td>${v ? v.placa + ' (' + v.prefixo + ')' : '-'}</td>
                <td>${o.motorista || ''}</td>
                <td><span class="badge badge-info">${(o.categoria || '').toUpperCase()}</span></td>
                <td><span class="badge ${o.prioridade === 'critica' ? 'badge-danger' : 'badge-warning'}">${o.prioridade || 'media'}</span></td>
                <td><span class="badge badge-secondary">${o.status || 'aberta'}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="iniciarOSApartirOcorrencia('${o.id}')"><i class="fa-solid fa-wrench"></i> Gerar OS</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderTabelaOrdens() {
    const tbody = document.getElementById('tblOrdens');
    if (!tbody) return;
    tbody.innerHTML = db.ordens.map(os => {
        const v = db.veiculos.find(x => x.id === os.veiculo_id);
        const m = db.mecanicos.find(x => x.id === os.mecanico_id);
        return `
            <tr>
                <td><strong>OS</strong></td>
                <td>${os.ocorrencia_id ? 'Sim' : 'Direta'}</td>
                <td>${v ? v.placa : '-'}</td>
                <td>${os.data_entrada || ''}</td>
                <td>${m ? m.nome : os.oficina_terceira || '-'}</td>
                <td>R$ ${parseFloat(os.valor_total || 0).toFixed(2)}</td>
                <td>${os.garantia_dias ? os.garantia_dias + ' dias' : 'Sem garantia'}</td>
                <td><span class="badge badge-success">${os.status || 'concluido'}</span></td>
                <td>-</td>
            </tr>
        `;
    }).join('');
}

function renderTabelaMecanicos() {
    const tbody = document.getElementById('tblMecanicos');
    if (!tbody) return;
    tbody.innerHTML = db.mecanicos.map(m => `
        <tr>
            <td>${m.codigo || ''}</td>
            <td><strong>${m.nome || ''}</strong></td>
            <td>${m.telefone || '-'}</td>
            <td>${m.especialidade || ''}</td>
            <td>${m.empresa_oficina || ''}</td>
            <td><span class="badge badge-success">${m.status || 'ativo'}</span></td>
            <td>-</td>
        </tr>
    `).join('');
}

function getBadgeSituacao(situacao) {
    if (situacao === 'disponivel') return 'badge-success';
    if (situacao === 'em_manutencao') return 'badge-warning';
    return 'badge-danger';
}

/* --------------------------------------------------------------------------
   4. SALVAMENTO NO FIRESTORE (FUNÇÕES EXPOSTAS GLOBALMENTE)
   -------------------------------------------------------------------------- */
window.salvarVeiculo = async function(e) {
    e.preventDefault();
    const novoVeiculo = {
        placa: document.getElementById('vPlaca').value.toUpperCase(),
        prefixo: document.getElementById('vPrefixo').value,
        marca: document.getElementById('vMarca').value,
        modelo: document.getElementById('vModelo').value,
        ano: parseInt(document.getElementById('vAno').value),
        km_atual: parseInt(document.getElementById('vKm').value),
        tipo: document.getElementById('vTipo').value,
        unidade: document.getElementById('vUnidade').value,
        motorista_habitual: document.getElementById('vMotorista').value,
        situacao: document.getElementById('vSituacao').value,
        observacoes: document.getElementById('vObservacoes').value,
        created_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(dbFirestore, "veiculos"), novoVeiculo);
    db.veiculos.push({ id: docRef.id, ...novoVeiculo });

    closeModal('modalVeiculo');
    renderTabelaVeiculos();
    atualizarDashboard();
    alert('Veículo cadastrado no Firebase com sucesso!');
};

window.salvarOcorrencia = async function(e) {
    e.preventDefault();
    const novaOcorrencia = {
        veiculo_id: document.getElementById('oVeiculoId').value,
        motorista: document.getElementById('oMotorista').value,
        km_momento: parseInt(document.getElementById('oKm').value),
        categoria: document.getElementById('oCategoria').value,
        prioridade: document.getElementById('oPrioridade').value,
        localizacao: document.getElementById('oLocal').value,
        descricao: document.getElementById('oDescricao').value,
        sintomas: document.getElementById('oSintomas').value,
        status: 'aberta',
        data_hora: new Date().toISOString()
    };

    const docRef = await addDoc(collection(dbFirestore, "ocorrencias"), novaOcorrencia);
    db.ocorrencias.push({ id: docRef.id, ...novaOcorrencia });

    const veiculoRef = doc(dbFirestore, "veiculos", novaOcorrencia.veiculo_id);
    await updateDoc(veiculoRef, { situacao: 'em_manutencao' });

    const veiculoLocal = db.veiculos.find(v => v.id === novaOcorrencia.veiculo_id);
    if (veiculoLocal) veiculoLocal.situacao = 'em_manutencao';

    closeModal('modalOcorrencia');
    renderTabelaOcorrencias();
    renderTabelaVeiculos();
    atualizarDashboard();
    alert('Ocorrência registrada no Firebase!');
};

window.salvarMecanico = async function(e) {
    e.preventDefault();
    const novoMecanico = {
        codigo: document.getElementById('mCodigo').value,
        nome: document.getElementById('mNome').value,
        telefone: document.getElementById('mTelefone').value,
        especialidade: document.getElementById('mEspecialidade').value,
        empresa_oficina: document.getElementById('mEmpresa').value,
        status: 'ativo',
        created_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(dbFirestore, "mecanicos"), novoMecanico);
    db.mecanicos.push({ id: docRef.id, ...novoMecanico });

    closeModal('modalMecanico');
    renderTabelaMecanicos();
    alert('Mecânico cadastrado no Firebase com sucesso!');
};

window.calcularTotalOS = function() {
    const mo = parseFloat(document.getElementById('osValorMaoObra').value) || 0;
    const pe = parseFloat(document.getElementById('osValorPecas').value) || 0;
    const ou = parseFloat(document.getElementById('osOutrosCustos').value) || 0;
    document.getElementById('osValorTotal').value = (mo + pe + ou).toFixed(2);
};

window.salvarOS = async function(e) {
    e.preventDefault();
    const novaOS = {
        ocorrencia_id: document.getElementById('osOcorrenciaId').value || null,
        veiculo_id: document.getElementById('osVeiculoId').value,
        mecanico_id: document.getElementById('osMecanicoId').value,
        oficina_terceira: document.getElementById('osOficinaTerceira').value,
        data_entrada: document.getElementById('osDataEntrada').value,
        km_reparo: parseInt(document.getElementById('osKmReparo').value),
        responsavel_aprovacao: document.getElementById('osResponsavelAprovacao').value,
        diagnostico_tecnico: document.getElementById('osDiagnostico').value,
        descricao_reparo: document.getElementById('osDescricaoReparo').value,
        valor_maos_obra: parseFloat(document.getElementById('osValorMaoObra').value) || 0,
        valor_pecas: parseFloat(document.getElementById('osValorPecas').value) || 0,
        outros_custos: parseFloat(document.getElementById('osOutrosCustos').value) || 0,
        valor_total: parseFloat(document.getElementById('osValorTotal').value) || 0,
        garantia_dias: parseInt(document.getElementById('osGarantiaDias').value) || 0,
        garantia_km: parseInt(document.getElementById('osGarantiaKm').value) || 0,
        status: 'concluido',
        created_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(dbFirestore, "ordens_servico"), novaOS);
    db.ordens.push({ id: docRef.id, ...novaOS });

    const veiculoRef = doc(dbFirestore, "veiculos", novaOS.veiculo_id);
    await updateDoc(veiculoRef, { situacao: 'disponivel', km_atual: novaOS.km_reparo });

    const veiculoLocal = db.veiculos.find(v => v.id === novaOS.veiculo_id);
    if (veiculoLocal) {
        veiculoLocal.situacao = 'disponivel';
        veiculoLocal.km_atual = novaOS.km_reparo;
    }

    closeModal('modalOS');
    renderTabelaOrdens();
    renderTabelaVeiculos();
    atualizarDashboard();
    alert('Ordem de Serviço salva no Firebase com sucesso!');
};

/* --------------------------------------------------------------------------
   5. DASHBOARD E GRÁFICOS
   -------------------------------------------------------------------------- */
function atualizarDashboard() {
    const totalV = document.getElementById('kpiTotalVeiculos');
    if (totalV) totalV.innerText = db.veiculos.length;

    const emManut = document.getElementById('kpiEmManutencao');
    if (emManut) emManut.innerText = db.veiculos.filter(v => v.situacao === 'em_manutencao').length;

    const aguard = document.getElementById('kpiAguardando');
    if (aguard) aguard.innerText = db.ocorrencias.filter(o => o.status === 'aberta').length;

    const concl = document.getElementById('kpiConcluidasMes');
    if (concl) concl.innerText = db.ordens.length;

    const ocAbertas = document.getElementById('kpiOcorrenciasAbertas');
    if (ocAbertas) ocAbertas.innerText = db.ocorrencias.filter(o => o.status !== 'concluida').length;

    const liberados = document.getElementById('kpiLiberados');
    if (liberados) liberados.innerText = db.veiculos.filter(v => v.situacao === 'disponivel').length;

    const gastoTotal = db.ordens.reduce((acc, os) => acc + parseFloat(os.valor_total || 0), 0);
    const kpiGasto = document.getElementById('kpiGastoMes');
    if (kpiGasto) kpiGasto.innerText = `R$ ${gastoTotal.toFixed(2)}`;
}

function initChartJS() {
    const ctxGastos = document.getElementById('chartGastos');
    if (ctxGastos) {
        chartGastos = new Chart(ctxGastos.getContext('2d'), {
            type: 'bar',
            data: { labels: ['Jul', 'Ago', 'Set', 'Out'], datasets: [{ label: 'Gastos (R$)', data: [12000, 15000, 8000, 18500], backgroundColor: '#0f172a' }] }
        });
    }

    const ctxCat = document.getElementById('chartCategorias');
    if (ctxCat) {
        chartCategorias = new Chart(ctxCat.getContext('2d'), {
            type: 'pie',
            data: { labels: ['Motor', 'Freios', 'Elétrico', 'Câmbio'], datasets: [{ data: [40, 25, 20, 15], backgroundColor: ['#ef4444', '#f97316', '#3b82f6', '#10b981'] }] }
        });
    }
}

function preencherSelectsFormularios() {
    const selVeiculos = `<option value="">Selecione o Caminhão</option>` + db.veiculos.map(v => `<option value="${v.id}">${v.placa} - ${v.prefixo} (${v.modelo})</option>`).join('');
    if(document.getElementById('oVeiculoId')) document.getElementById('oVeiculoId').innerHTML = selVeiculos;
    if(document.getElementById('osVeiculoId')) document.getElementById('osVeiculoId').innerHTML = selVeiculos;

    const selMec = `<option value="">Selecione o Mecânico</option>` + db.mecanicos.map(m => `<option value="${m.id}">${m.nome} (${m.empresa_oficina})</option>`).join('');
    if(document.getElementById('osMecanicoId')) document.getElementById('osMecanicoId').innerHTML = selMec;

    const selOc = `<option value="">Selecione a Ocorrência</option>` + db.ocorrencias.map(o => `<option value="${o.id}">${(o.categoria || '').toUpperCase()}</option>`).join('');
    if(document.getElementById('osOcorrenciaId')) document.getElementById('osOcorrenciaId').innerHTML = selOc;
}