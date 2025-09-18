// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let allHistoricos = [];
let filteredHistoricos = [];
let currentPage = 1;
const rowsPerPage = 10;
let totalPages = 1;
let historicoParaExcluirId = null;
const API_BASE_URL = 'http://localhost:5000';

// =================== FUNÇÕES GLOBAIS E DE EXPORTAÇÃO ===================
window.exportar = function (formato, scope) {
    const dadosParaExportar = scope === 'tudo'
        ? filteredHistoricos
        : filteredHistoricos.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    if (dadosParaExportar.length === 0) {
        alert("Nenhum registro para exportar.");
        return;
    }

    const colunas = ["ID Histórico", "ID Sensor", "Data do Evento", "Valor Registrado", "Tipo do Evento", "Descrição"];
    const linhas = dadosParaExportar.map(h => [
        h.id_Historico_Sensor,
        h.id_Sensor,
        new Date(h.Data_Evento).toLocaleString('pt-BR'),
        h.Valor_Registrado,
        h.Tipo_Evento,
        h.Descricao
    ]);

    const dataHora = new Date().toLocaleString('pt-BR').replace(/[/:]/g, '-');
    const nomeArquivo = `historico_sensores_${scope}_${dataHora}`;

    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico Sensores");
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
};

// =================== INICIALIZAÇÃO E EVENT LISTENERS ===================
document.addEventListener("DOMContentLoaded", () => {
    configurarEventListeners();
    carregarDadosIniciais();
});

function configurarEventListeners() {
    document.getElementById('formCreateHistorico').addEventListener('submit', enviarNovoHistorico);
    document.getElementById('formEditHistorico').addEventListener('submit', salvarEdicao);
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => deletarHistorico(historicoParaExcluirId));
    document.getElementById('search_input').addEventListener('input', aplicarFiltros);
    document.getElementById('filtro_tipo_evento').addEventListener('change', aplicarFiltros);
    document.getElementById('limpar_filtros').addEventListener('click', () => {
        document.getElementById('search_input').value = '';
        document.getElementById('filtro_tipo_evento').value = '';
        aplicarFiltros();
    });
    document.getElementById("prevBtn").addEventListener("click", () => changePage(currentPage - 1));
    document.getElementById("nextBtn").addEventListener("click", () => changePage(currentPage + 1));
}

// =================== CARREGAMENTO DE DADOS E PREPARAÇÃO DA PÁGINA ===================

async function carregarDadosIniciais() {
    try {
        const [historicosResponse, sensoresResponse] = await Promise.all([
            // ATENÇÃO: Verifique se este é o endpoint correto para o histórico de sensores
            fetch(`${API_BASE_URL}/historicos_sensores`),
            // ATENÇÃO: Verifique se este é o endpoint correto para buscar todos os sensores
            fetch(`${API_BASE_URL}/sensores`)
        ]);

        if (!historicosResponse.ok || !sensoresResponse.ok) {
            throw new Error('Falha ao buscar dados da API.');
        }

        const historicos = await historicosResponse.json();
        const sensores = await sensoresResponse.json();

        allHistoricos = Array.isArray(historicos) ? historicos : [];

        popularSelectSensores(sensores);

        aplicarFiltros();

    } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        document.getElementById('historicoTableBody').innerHTML = `<tr><td colspan="8" class="text-center text-danger">Erro ao carregar dados. Verifique a API.</td></tr>`;
    }
}

function popularSelectSensores(sensores) {
    const selectCreate = document.getElementById('id_Sensor');
    const selectUpdate = document.getElementById('id_Sensor_update');

    selectCreate.innerHTML = '<option value="" disabled selected>Selecione um sensor...</option>';
    selectUpdate.innerHTML = '<option value="" disabled selected>Selecione um sensor...</option>';

    if (Array.isArray(sensores)) {
        sensores.forEach(sensor => {
            // ATENÇÃO: Verifique se 'id_Sensor' e 'Tipo_Sensor' são os nomes corretos das colunas da sua tabela de sensores
            const optionHTML = `<option value="${sensor.id_Sensor}">${sensor.id_Sensor} - ${sensor.Tipo}</option>`;
            selectCreate.innerHTML += optionHTML;
            selectUpdate.innerHTML += optionHTML;
        });
    }
}


// =================== FUNÇÕES CRUD (Create, Read, Update, Delete) ===================

async function enviarNovoHistorico(event) {
    event.preventDefault();
    const form = event.target;
    const mensagemErroDiv = document.getElementById('mensagemErroInserir');
    mensagemErroDiv.classList.add('d-none');

    const dados = {
        table: "historico_sensores",
        database: "sgmi",
        data: {
            id_Sensor: parseInt(form.id_Sensor.value),
            Data_Evento: form.Data_Evento.value,
            Valor_Registrado: form.Valor_Registrado.value,
            Tipo_Evento: form.Tipo_Evento.value,
            Descricao: form.Descricao.value
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}/insert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const result = await response.json();
        if (!response.ok || result.error) {
            throw new Error(result.error || `O servidor respondeu com um erro: ${response.status}`);
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('modalCreate'));
        modal.hide();
        form.reset();
        mostrarMensagem('sucesso', 'Registro de histórico criado com sucesso!');
        await carregarDadosIniciais();
    } catch (error) {
        console.error("Erro ao criar histórico de sensor:", error);
        mensagemErroDiv.textContent = error.message;
        mensagemErroDiv.classList.remove('d-none');
    }
}

async function salvarEdicao(event) {
    event.preventDefault();
    const form = event.target;
    const id = form.id_Historico_Sensor_update.value;
    const mensagemErroDiv = document.getElementById('mensagemErroEditar');
    mensagemErroDiv.classList.add('d-none');

    const payload = {
        id_Sensor: parseInt(form.id_Sensor_update.value),
        Data_Evento: form.Data_Evento_update.value,
        Valor_Registrado: form.Valor_Registrado_update.value,
        Tipo_Evento: form.Tipo_Evento_update.value,
        Descricao: form.Descricao_update.value
    };

    try {
        // ATENÇÃO: Verifique se este é o endpoint correto para ATUALIZAR um histórico de sensor
        const response = await fetch(`${API_BASE_URL}/historico_sensor/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok || !result.affected_rows) {
            throw new Error(result.error || `Erro do servidor: ${response.status}`);
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEdit'));
        modal.hide();
        mostrarMensagem('sucesso', 'Registro atualizado com sucesso!');
        await carregarDadosIniciais();
    } catch (error) {
        console.error("Erro ao salvar edição:", error);
        mensagemErroDiv.textContent = error.message;
        mensagemErroDiv.classList.remove('d-none');
    }
}

async function deletarHistorico(id) {
    if (id === null) return;
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    try {
        // ATENÇÃO: Verifique se este é o endpoint correto para DELETAR um histórico de sensor
        const response = await fetch(`${API_BASE_URL}/historico_sensor/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (!response.ok || result.affected_rows === undefined) {
            throw new Error(result.mensagem || "Resposta inesperada do servidor.");
        }

        deleteModal.hide();
        mostrarMensagem('sucesso', 'Registro deletado com sucesso!');
        await carregarDadosIniciais();
    } catch (error) {
        console.error("Erro ao deletar histórico:", error);
        deleteModal.hide();
        mostrarMensagem('erro', error.message);
    } finally {
        historicoParaExcluirId = null;
    }
}

// =================== LÓGICA DA TABELA, FILTRO E PAGINAÇÃO ===================

function aplicarFiltros() {
    let tempHistoricos = [...allHistoricos];
    const searchTerm = document.getElementById('search_input').value.toLowerCase();
    const tipoEventoFiltro = document.getElementById('filtro_tipo_evento').value;

    if (searchTerm) {
        tempHistoricos = tempHistoricos.filter(h => h.Descricao && h.Descricao.toLowerCase().includes(searchTerm));
    }
    if (tipoEventoFiltro) {
        tempHistoricos = tempHistoricos.filter(h => h.Tipo_Evento === tipoEventoFiltro);
    }

    filteredHistoricos = tempHistoricos;
    totalPages = Math.ceil(filteredHistoricos.length / rowsPerPage) || 1;
    createPagination();
    changePage(1);
}

function renderizarTabela() {
    const tbody = document.getElementById('historicoTableBody');
    tbody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const dadosPagina = filteredHistoricos.slice(start, end);

    if (dadosPagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    dadosPagina.forEach(item => {
        const dataFormatada = new Date(item.Data_Evento).toLocaleString('pt-BR');
        const row = `
            <tr>
                <td id="total"></td> 
                <td>${item.id_Historico_Sensor}</td>
                <td>${item.id_Sensor}</td>
                <td>${dataFormatada}</td>
                <td>${item.Valor_Registrado}</td>
                <td>${item.Tipo_Evento}</td>
                <td>${item.Descricao || 'N/A'}</td>
                <td id="center">
                    <button class="edit-btn" onclick="abrirModalEdicao(${item.id_Historico_Sensor})">
                        <i class="fa-solid fa-square-pen"></i>
                    </button>
                    <button class="delete-btn" onclick="confirmarExclusao(${item.id_Historico_Sensor})">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
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
    renderizarTabela();
    document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
    const activeLine = document.getElementById("line" + currentPage);
    if (activeLine) activeLine.classList.add("active-line");
    document.getElementById("prevBtn").disabled = (currentPage === 1);
    document.getElementById("nextBtn").disabled = (currentPage === totalPages || totalPages === 0);
    document.getElementById("content").innerText = `Página ${currentPage}`;
}

// =================== FUNÇÕES DE UI (MODAIS E MENSAGENS) ===================

function abrirModalEdicao(id) {
    const historico = allHistoricos.find(h => h.id_Historico_Sensor === id);
    if (!historico) {
        return console.error("Histórico não encontrado para o ID:", id);
    }
    const form = document.getElementById('formEditHistorico');

    form.id_Historico_Sensor_update.value = historico.id_Historico_Sensor;
    form.id_Sensor_update.value = historico.id_Sensor;
    form.Valor_Registrado_update.value = historico.Valor_Registrado;
    form.Tipo_Evento_update.value = historico.Tipo_Evento;
    form.Descricao_update.value = historico.Descricao;

    const data = new Date(historico.Data_Evento);
    data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
    form.Data_Evento_update.value = data.toISOString().slice(0, 16);

    const modal = new bootstrap.Modal(document.getElementById('modalEdit'));
    modal.show();
}

function confirmarExclusao(id) {
    historicoParaExcluirId = id;
    document.getElementById('deleteHistoricoId').textContent = id;
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
}

function mostrarMensagem(tipo, texto) {
    const divMensagem = document.getElementById('mensagemGeral');
    divMensagem.textContent = texto;

    if (tipo === 'sucesso') {
        divMensagem.className = 'alert alert-success';
    } else {
        divMensagem.className = 'alert alert-danger';
    }

    setTimeout(() => divMensagem.className = 'alert d-none', 4000);
}