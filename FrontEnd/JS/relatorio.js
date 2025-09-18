// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let allHistoricos = []; // Guarda a lista COMPLETA de históricos vinda da API
let filteredHistoricos = []; // Guarda a lista FILTRADA que será exibida na tela
let currentPage = 1;
const rowsPerPage = 10;
let totalPages = 1;
let historicoParaExcluirId = null; // --- NOVO: Variável para guardar o ID a ser excluído

// =================== FUNÇÕES GLOBAIS E DE EXPORTAÇÃO ===================
window.exportar = function (formato, scope) {
    const dadosParaExportar = scope === 'tudo'
        ? filteredHistoricos
        : filteredHistoricos.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    if (dadosParaExportar.length === 0) {
        alert("Nenhum registro para exportar.");
        return;
    }

    const colunas = ["ID Manut.", "ID Ordem", "Tipo Manutenção", "Duração", "Custo", "Observações", "ID Funcionário"];
    const linhas = dadosParaExportar.map(h => [
        h.id_Manutencao,
        h.id_Ordem,
        h.Tipo_Manutencao,
        h.Duracao,
        h.Custo,
        h.Observacoes,
        h.id_Funcionario_Consertou
    ]);

    const dataHora = new Date().toLocaleString('pt-BR').replace(/[/:]/g, '-');
    const nomeArquivo = `historico_manutencao_${scope}_${dataHora}`;

    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico");
        XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);
    } else if (formato === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "landscape" });
        doc.autoTable({
            head: [colunas],
            body: linhas,
            headStyles: { fillColor: [44, 62, 80] }
        });
        doc.save(`${nomeArquivo}.pdf`);
    }
}

// =================== INICIALIZAÇÃO ===================
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosIniciais();
    configurarEventListeners();
});

async function carregarDadosIniciais() {
    try {
        const [historicosResponse, ordensResponse, funcionariosResponse] = await Promise.all([
            fetch('http://localhost:5000/historico'),
            fetch('http://localhost:5000/ordens'),
            fetch('http://localhost:5000/usuario')
        ]);

        const historicos = await historicosResponse.json();
        const ordens = await ordensResponse.json();
        const funcionarios = await funcionariosResponse.json();

        allHistoricos = Array.isArray(historicos) ? historicos : [];

        // --- MODIFICADO: Popula os selects de ambos os modais (criação e edição)
        popularSelects(ordens, funcionarios, ''); // Para o modal de criação
        popularSelects(ordens, funcionarios, '_update'); // Para o modal de edição

        aplicarFiltros();

    } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        document.getElementById('historicoTableBody').innerHTML = `<tr><td colspan="9" class="text-center text-danger">Falha ao carregar dados. Verifique a conexão com a API.</td></tr>`;
    }
}

function configurarEventListeners() {
    // Filtros
    document.getElementById('search_input').addEventListener('input', aplicarFiltros);
    document.getElementById('filtro_tipo').addEventListener('change', aplicarFiltros);
    document.getElementById('limpar_filtros').addEventListener('click', () => {
        document.getElementById('search_input').value = '';
        document.getElementById('filtro_tipo').value = '';
        aplicarFiltros();
    });

    // Paginação
    document.getElementById("prevBtn").addEventListener("click", () => changePage(currentPage - 1));
    document.getElementById("nextBtn").addEventListener("click", () => changePage(currentPage + 1));

    // Formulários e Ações
    document.getElementById('formCreateHistorico').addEventListener('submit', salvarHistorico);

    // --- NOVO: Listeners para Edição e Exclusão ---
    document.getElementById('formEditHistorico').addEventListener('submit', salvarEdicaoHistorico);
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => deletarHistorico(historicoParaExcluirId));
}

// =================== LÓGICA DO FORMULÁRIO (MODAL) ===================

/**
 * Preenche os <select> de Ordens e Funcionários nos modais.
 * @param {Array} ordens - Lista de ordens.
 * @param {Array} funcionarios - Lista de funcionários.
 * @param {string} suffix - Sufixo para os IDs dos elementos ('_update' para edição, '' para criação).
 */
function popularSelects(ordens, funcionarios, suffix) {
    // Popula Ordens
    const selectOrdem = document.getElementById(`id_Ordem${suffix}`);
    selectOrdem.innerHTML = '<option value="" disabled selected>Selecione a Ordem</option>';
    if (Array.isArray(ordens)) {
        ordens.forEach(ordem => {
            const textoOpcao = `${ordem.id_Ordem} - ${ordem.Descricao_Problema || 'Descrição não disponível'}`;
            selectOrdem.innerHTML += `<option value="${ordem.id_Ordem}">${textoOpcao}</option>`;
        });
    }

    // Popula Funcionários
    const selectFunc = document.getElementById(`id_Funcionario_Consertou${suffix}`);
    selectFunc.innerHTML = '<option value="" disabled selected>Selecione o funcionário</option>';
    if (Array.isArray(funcionarios)) {
        funcionarios.forEach(func => {
            selectFunc.innerHTML += `<option value="${func.id_Cadastro}">${func.Nome}</option>`;
        });
    }
}


async function salvarHistorico(event) {
    event.preventDefault();
    const form = event.target;
    const mensagemErroDiv = document.getElementById('mensagemErroInserir');
    mensagemErroDiv.classList.add('d-none'); // Esconde antes de tentar

    const payload = {
        table: "historico",
        database: "sgmi",
        data: {
            id_Ordem: parseInt(form.id_Ordem.value),
            Tipo_Manutencao: form.Tipo_Manutencao.value,
            Duracao: form.Duracao.value,
            Custo: parseFloat(form.Custo.value),
            Observacoes: form.Observacoes.value,
            id_Funcionario_Consertou: parseInt(form.id_Funcionario_Consertou.value)
        }
    };

    try {
        const response = await fetch('http://localhost:5000/insert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (!response.ok || !result.inserted_id) {
            throw new Error(result.mensagem || 'Erro desconhecido ao salvar.');
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('modalCreateHistorico'));
        modal.hide();
        form.reset();
        await carregarDadosIniciais();

        const msgSucessoGlobal = document.getElementById('mensagemGeral');
        msgSucessoGlobal.textContent = "Registro de histórico criado com sucesso!";
        msgSucessoGlobal.className = 'alert alert-success';
        setTimeout(() => msgSucessoGlobal.className = 'alert d-none', 5000);

    } catch (error) {
        mensagemErroDiv.textContent = 'Erro: ' + error.message;
        mensagemErroDiv.classList.remove('d-none');
    }
}

// =================== LÓGICA DE EXCLUSÃO (BLOCO NOVO) ===================

/**
 * Abre o modal de confirmação de exclusão.
 * @param {number} id - O ID do histórico a ser excluído.
 */
window.confirmarExclusao = function (id) {
    historicoParaExcluirId = id;
    document.getElementById('deleteHistoricoId').textContent = id;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
};

/**
 * Executa a exclusão do histórico via API.
 * @param {number} id - O ID do histórico.
 */
async function deletarHistorico(id) {
    if (id === null) return;
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    const msgErroGlobal = document.getElementById('mensagemGeral');
    msgErroGlobal.className = 'alert d-none';

    try {
        const response = await fetch(`http://localhost:5000/delete_historico/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (!response.ok || !result.affected_rows) {
            throw new Error(result.mensagem || 'Erro ao excluir o registro.');
        }

        // Sucesso
        deleteModal.hide();
        await carregarDadosIniciais();
        msgErroGlobal.textContent = "Registro de histórico excluído com sucesso!";
        msgErroGlobal.className = 'alert alert-success';
        setTimeout(() => msgErroGlobal.className = 'alert d-none', 5000);

    } catch (error) {
        deleteModal.hide();
        msgErroGlobal.textContent = 'Erro: ' + error.message;
        msgErroGlobal.className = 'alert alert-danger';
        console.error("Erro ao excluir histórico:", error);
    } finally {
        historicoParaExcluirId = null;
    }
}


// =================== LÓGICA DE EDIÇÃO (BLOCO NOVO) ===================

/**
 * Abre e preenche o modal de edição com os dados da linha selecionada.
 * @param {HTMLElement} button - O botão de editar que foi clicado.
 */
window.abrirModalEdicao = function (button) {
    const row = button.closest('tr');
    const id = row.cells[1].textContent;
    const historico = allHistoricos.find(h => h.id_Manutencao == id);

    if (!historico) {
        alert("Erro: Registro não encontrado para edição.");
        return;
    }

    // Preenche o formulário de edição
    const form = document.getElementById('formEditHistorico');
    form.id_Manutencao_update.value = historico.id_Manutencao;
    form.id_Ordem_update.value = historico.id_Ordem;
    form.Tipo_Manutencao_update.value = historico.Tipo_Manutencao;
    form.Duracao_update.value = historico.Duracao;
    form.Custo_update.value = historico.Custo;
    form.Observacoes_update.value = historico.Observacoes;
    form.id_Funcionario_Consertou_update.value = historico.id_Funcionario_Consertou;

    const modal = new bootstrap.Modal(document.getElementById('modalEditHistorico'));
    modal.show();
};

/**
 * Lida com o submit do formulário de edição.
 * @param {Event} event 
 */
async function salvarEdicaoHistorico(event) {
    event.preventDefault();
    const form = event.target;
    const id = form.id_Manutencao_update.value;
    const mensagemErroDiv = document.getElementById('mensagemErroEditar');
    mensagemErroDiv.classList.add('d-none');

    const payload = {
        id_Ordem: parseInt(form.id_Ordem_update.value),
        Tipo_Manutencao: form.Tipo_Manutencao_update.value,
        Duracao: form.Duracao_update.value,
        Custo: parseFloat(form.Custo_update.value),
        Observacoes: form.Observacoes_update.value,
        id_Funcionario_Consertou: parseInt(form.id_Funcionario_Consertou_update.value)
    };

    try {
        const response = await fetch(`http://localhost:5000/update_historico/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (!response.ok || !result.affected_rows) {
            throw new Error(result.mensagem || 'Erro desconhecido ao atualizar.');
        }

        // Sucesso
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditHistorico'));
        modal.hide();
        await carregarDadosIniciais();

        const msgSucessoGlobal = document.getElementById('mensagemGeral');
        msgSucessoGlobal.textContent = "Registro de histórico atualizado com sucesso!";
        msgSucessoGlobal.className = 'alert alert-success';
        setTimeout(() => msgSucessoGlobal.className = 'alert d-none', 5000);

    } catch (error) {
        mensagemErroDiv.textContent = 'Erro: ' + error.message;
        mensagemErroDiv.classList.remove('d-none');
    }
}


// =================== LÓGICA DA TABELA, FILTRO E PAGINAÇÃO ===================

function aplicarFiltros() {
    let tempHistoricos = [...allHistoricos];
    const searchTerm = document.getElementById('search_input').value.toLowerCase();
    const tipoFiltro = document.getElementById('filtro_tipo').value;

    if (searchTerm) {
        tempHistoricos = tempHistoricos.filter(h => h.Observacoes && h.Observacoes.toLowerCase().includes(searchTerm));
    }
    if (tipoFiltro) {
        tempHistoricos = tempHistoricos.filter(h => h.Tipo_Manutencao === tipoFiltro);
    }

    filteredHistoricos = tempHistoricos;
    totalPages = Math.ceil(filteredHistoricos.length / rowsPerPage) || 1;
    createPagination();
    changePage(1);
}

function renderTableRows() {
    const tbody = document.getElementById('historicoTableBody');
    tbody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const dadosPagina = filteredHistoricos.slice(start, end);

    if (dadosPagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    dadosPagina.forEach(item => {
        // --- CORREÇÃO IMPORTANTE APLICADA AQUI ---
        // Troquei 'historico.id_Manutencao' por 'item.id_Manutencao' para usar a variável correta do loop.
        const row = `
            <tr>
                <td id="total"></td>
                <td>${item.id_Manutencao}</td>
                <td>${item.id_Ordem}</td>
                <td>${item.Tipo_Manutencao}</td>
                <td>${item.Duracao || 'N/A'}</td>
                <td>${item.Custo ? item.Custo.toFixed(2) : '0.00'}</td>
                <td>${item.Observacoes || 'N/A'}</td>
                <td>${item.id_Funcionario_Consertou}</td>
                <td id="center">
                    <button class="edit-btn" onclick="abrirModalEdicao(this)"><i class="fa-solid fa-square-pen"></i></button>
                    <button class="delete-btn" onclick="confirmarExclusao(${item.id_Manutencao})"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}


function createPagination() {
    const paginationContainer = document.getElementById("paginationLines");
    paginationContainer.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.innerHTML = `<hr class="page-line" id="line${i}">`;
        btn.onclick = () => changePage(i);
        paginationContainer.appendChild(btn);
    }
}

function changePage(page) {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;

    renderTableRows();

    document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
    const activeLine = document.getElementById("line" + currentPage);
    if (activeLine) activeLine.classList.add("active-line");

    document.getElementById("prevBtn").disabled = (currentPage === 1);
    document.getElementById("nextBtn").disabled = (currentPage === totalPages || totalPages === 0);
    document.getElementById("content").innerText = `Página ${currentPage}`;
}