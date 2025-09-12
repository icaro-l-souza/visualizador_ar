// ------------------- Variáveis Globais -------------------
let allSensores = []; // Guarda a lista COMPLETA de sensores vinda da API
let sensores = []; // Guarda a lista FILTRADA que será exibida na tela
let currentPage = 1;
const rowsPerPage = 10;
let totalPages = 1;
let sensorParaExcluirId = null; // Guarda o ID para o modal de exclusão
let statusSelecionado = null; // Guarda o status selecionado no filtro

// ------------------- Funções de Exportação (Unificadas) -------------------
function getSensoresParaExportar(scope) {
    if (scope === 'tudo') {
        // Exporta a lista atualmente filtrada, completa (sem paginação)
        return sensores;
    } else { // 'pagina'
        // Exporta apenas a página visível da lista filtrada
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return sensores.slice(start, end);
    }
}

function exportar(formato, scope) {
    if (!sensores || sensores.length === 0) {
        alert("Nenhum sensor na tabela para exportar!");
        return;
    }
    const sensoresParaExportar = getSensoresParaExportar(scope);
    if (sensoresParaExportar.length === 0) {
        alert("Nenhum sensor para exportar no escopo selecionado.");
        return;
    }

    const colunas = ["ID", "Nome", "Tipo", "Unidade", "Status", "Modelo", "Nº de Série", "ID da Máquina"];
    const linhas = sensoresParaExportar.map(s => [
        s.id_Sensor, s.Nome_Sensor, s.Tipo, s.Unidade_Medida, s.Status,
        s.Modelo, s.Numero_Serie, s.id_Ativo
    ]);

    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sensores");
        XLSX.writeFile(workbook, `sensores_${scope}.xlsx`);
    } else if (formato === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "pt", "a4");
        doc.autoTable({
            head: [colunas], body: linhas, styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [52, 58, 64], textColor: 255, halign: "center" },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });
        doc.save(`sensores_${scope}.pdf`);
    }
}

// ------------------- Funções de Carregamento e Filtros -------------------
async function carregarSensores() {
    const mensagemDiv = document.getElementById("mensagemErro");
    if (mensagemDiv) mensagemDiv.classList.add("d-none");

    try {
        const response = await fetch("http://localhost:5000/sensores");
        allSensores = await response.json();
        aplicarFiltros(); // Chama a função central para filtrar e renderizar a tabela
    } catch (error) {
        if (mensagemDiv) {
            mensagemDiv.textContent = "Erro ao carregar sensores: " + error.message;
            mensagemDiv.classList.remove("d-none");
        }
    }
}

function aplicarFiltros() {
    let tempSensores = [...allSensores];

    // 1. Filtro por Nome
    const searchTerm = document.getElementById('search_input').value.toLowerCase();
    if (searchTerm) {
        tempSensores = tempSensores.filter(sensor => sensor.Nome_Sensor.toLowerCase().includes(searchTerm));
    }

    // 2. Filtro por Status
    if (statusSelecionado) {
        tempSensores = tempSensores.filter(sensor => sensor.Status.toLowerCase() === statusSelecionado.toLowerCase());
    }

    sensores = tempSensores; // Atualiza a lista de exibição
    totalPages = Math.ceil(sensores.length / rowsPerPage) || 1;
    changePage(1); // Exibe a primeira página dos resultados
}

// Função chamada pelo onclick dos botões de status
function filtrarPorStatus(status) {
    statusSelecionado = status;

    // Lógica para destacar visualmente o botão clicado
    document.querySelectorAll('.list-group-item').forEach(btn => {
        if (btn.textContent.trim().toLowerCase() === (status ? status.toLowerCase() : '')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function fecharDropdown() {
    const dropdownToggle = document.getElementById('filterDropdown');
    const dropdownInstance = bootstrap.Dropdown.getOrCreateInstance(dropdownToggle);
    if (dropdownInstance) dropdownInstance.hide();
}


// ------------------- Funções de Tabela e Paginação -------------------
function renderTableRows() {
    const tbody = document.getElementById("sensorTableBody");
    tbody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const dadosPagina = sensores.slice(start, end);

    dadosPagina.forEach((sensor) => {
        const row = document.createElement("tr");
        const safeNomeSensor = sensor.Nome_Sensor.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        row.innerHTML = `
            <td id="total"></td>
            <td>${sensor.id_Sensor}</td>
            <td>${sensor.Nome_Sensor}</td>
            <td>${sensor.Tipo}</td>
            <td>${sensor.Unidade_Medida}</td>
            <td>${sensor.Status}</td>
            <td>${sensor.Modelo}</td>
            <td>${sensor.Numero_Serie}</td>
            <td>${sensor.id_Ativo != null ? sensor.id_Ativo : "Sem máquina"}</td>
            <td id="center">
                <button class="delete-btn" onclick="deletarSensores(${sensor.id_Sensor}, '${safeNomeSensor}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
                <button class="edit-btn" onclick="abrirModalEditarSensor(this)">
                    <i class="fa-solid fa-square-pen"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function changePage(pageNumber) {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    currentPage = pageNumber;
    renderTableRows();

    document.getElementById("content").innerText = "Página " + currentPage;
    document.querySelectorAll(".page-line").forEach((line) => line.classList.remove("active-line"));
    const currentLine = document.getElementById("line" + currentPage);
    if (currentLine) currentLine.classList.add("active-line");

    document.getElementById("prevBtn").disabled = currentPage === 1;
    document.getElementById("nextBtn").disabled = currentPage === totalPages;
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

// ------------------------- CRUD (Create, Update, Delete) -------------------------
// Deletar Sensor: Função chamada pelo botão na tabela. Agora ela abre o modal.
window.deletarSensores = function (id, nome) {
    sensorParaExcluirId = id;
    document.getElementById('deleteSensorName').textContent = nome;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
};

// Nova função para ser chamada pelo botão de confirmação do modal
async function executarExclusao() {
    if (!sensorParaExcluirId) return;

    const mensagemDiv = document.getElementById('mensagemErro');
    mensagemDiv.classList.add('d-none');

    try {
        const response = await fetch(`http://localhost:5000/delete_sensor/${sensorParaExcluirId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (!response.ok || !data.affected_rows) {
            mensagemDiv.textContent = `Erro: ${data.mensagem || 'Sensor não encontrado.'}`;
            mensagemDiv.className = 'alert alert-danger';
            return;
        }

        await carregarSensores();

    } catch (error) {
        console.error("Erro ao excluir sensor:", error);
        mensagemDiv.textContent = 'Erro ao excluir o sensor: ' + error.message;
        mensagemDiv.className = 'alert alert-danger';
    } finally {
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        if (deleteModal) deleteModal.hide();
        sensorParaExcluirId = null;
    }
}

// Editar Sensor
window.abrirModalEditarSensor = function (button) {
    const row = button.closest('tr');
    const idSensor = parseInt(row.cells[1].innerText);
    const sensor = allSensores.find(s => s.id_Sensor === idSensor);

    if (!sensor) {
        console.error("Sensor não encontrado para edição.");
        return;
    }

    document.getElementById('id_sensor').value = sensor.id_Sensor;
    document.getElementById('nome_update').value = sensor.Nome_Sensor;
    document.getElementById('tipo_update').value = sensor.Tipo;
    document.getElementById('unidade_update').value = sensor.Unidade_Medida;
    document.getElementById('status_update').value = sensor.Status;
    document.getElementById('modelo_update').value = sensor.Modelo;
    document.getElementById('numero_update').value = sensor.Numero_Serie;
    carregarAtivosParaSelects('ativo_update', sensor.id_Ativo);

    new bootstrap.Modal(document.getElementById('exampleModalUpdate')).show();
}

// ------------------------- Funções Auxiliares -------------------------
async function carregarAtivosParaSelects(selectId, selectedValue = null) {
    try {
        const response = await fetch('http://localhost:5000/ativos');
        const ativos = await response.json();
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">Sem máquina vinculada</option>';
        ativos.forEach(ativo => {
            const option = document.createElement('option');
            option.value = ativo.id_Ativo;
            option.textContent = `${ativo.id_Ativo} - ${ativo.Nome_Ativo}`;
            if (selectedValue && ativo.id_Ativo == selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar máquinas:', error);
    }
}

// ------------------------- Inicialização -------------------------
document.addEventListener('DOMContentLoaded', function () {
    // Carrega a lista de sensores e as opções de máquinas nos formulários
    carregarAtivosParaSelects('ativoSelect');
    carregarSensores();

    // Listener para o botão de confirmação de exclusão
    document.getElementById('confirmDeleteBtn').addEventListener('click', executarExclusao);

    // Listeners para os botões de filtro
    document.getElementById('aplicar_filtros').addEventListener('click', () => {
        aplicarFiltros();
        fecharDropdown();
    });

    document.getElementById('limpar_filtros').addEventListener('click', () => {
        document.getElementById('search_input').value = '';
        statusSelecionado = null;
        document.querySelectorAll('.list-group-item').forEach(btn => btn.classList.remove('active'));
        aplicarFiltros();
        fecharDropdown();
    });

    // Listeners para os botões de paginação
    document.getElementById("prevBtn").addEventListener("click", () => changePage(currentPage - 1));
    document.getElementById("nextBtn").addEventListener("click", () => changePage(currentPage + 1));


    // Listener para o formulário de CADASTRO
    document.getElementById('formulario').addEventListener('submit', async function (event) {
        event.preventDefault();

        // --- 1. Coleta dos dados do formulário ---
        const nome = document.getElementById('nome').value;
        const tipo = document.getElementById('tipo').value;
        const unidade = document.getElementById('unidade').value;
        const status = document.getElementById('status').value;
        const modelo = document.getElementById('modelo').value;
        const numero = document.getElementById('numero').value;
        const ativoSelect = document.getElementById('ativoSelect');
        const ativo = ativoSelect && ativoSelect.value !== "" ? parseInt(ativoSelect.value) : null;

        // --- 2. Montagem do payload para a API genérica ---
        // AQUI ESTÁ A MUDANÇA: Criamos o objeto completo
        const payload = {
            table: "sensores",      // Especifica a tabela
            database: "sgmi",       // Especifica o banco de dados
            data: {                 // "data" contém os dados do sensor
                Nome_Sensor: nome,
                Tipo: tipo,
                Unidade_Medida: unidade,
                Status: status,
                Modelo: modelo,
                Numero_Serie: numero,
                id_Ativo: ativo
            }
        };

        try {
            // --- 3. Chamada à API genérica ---
            // A rota agora é a mesma das peças: '/insert'
            const response = await fetch('http://localhost:5000/insert', { // ROTA ALTERADA
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload) // Envia o payload completo
            });

            const data = await response.json();

            // O tratamento de erro continua o mesmo que você já tinha.
            if (!response.ok || !data.inserted_id) {
                throw new Error(data.mensagem || 'Erro desconhecido');
            }

            await carregarSensores();
            // Limpa o formulário e fecha o modal
            this.reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('exampleModal'));
            if (modal) {
                modal.hide();
            }

        } catch (error) {
            const mensagemDiv = document.getElementById('mensagemErroInserir');
            mensagemDiv.textContent = 'Erro: ' + error.message;
            mensagemDiv.classList.remove('d-none');
        }
    });

    // Listener para o formulário de ATUALIZAÇÃO
    document.getElementById('formularioUpdate').addEventListener('submit', async function (event) {
        event.preventDefault();
        const id_Sensor = document.getElementById('id_sensor').value;
        const id_ativo_raw = document.getElementById('ativo_update').value.trim();

        const dados = {
            id_Sensor: id_Sensor,
            Nome_Sensor: document.getElementById('nome_update').value,
            Tipo: document.getElementById('tipo_update').value,
            Unidade_Medida: document.getElementById('unidade_update').value,
            Status: document.getElementById('status_update').value,
            Modelo: document.getElementById('modelo_update').value,
            Numero_Serie: document.getElementById('numero_update').value,
            id_Ativo: id_ativo_raw === '' ? null : parseInt(id_ativo_raw)
        };

        try {
            const response = await fetch(`http://localhost:5000/update_sensor/${id_Sensor}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            const data = await response.json();
            if (!response.ok || !data.affected_rows) throw new Error(data.mensagem || 'Erro desconhecido');

            await carregarSensores();
            bootstrap.Modal.getInstance(document.getElementById('exampleModalUpdate')).hide();

        } catch (error) {
            const mensagemDiv = document.getElementById('mensagemErroEditar');
            mensagemDiv.textContent = 'Erro: ' + error.message;
            mensagemDiv.classList.remove('d-none');
        }
    });
});
