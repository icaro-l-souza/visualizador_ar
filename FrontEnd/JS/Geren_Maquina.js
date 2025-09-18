// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let currentPage = 1;
const rowsPerPage = 10;
let allAtivos = [];
let ativos = [];
let totalPages = 1;
let ativoParaExcluirId = null;
let ativoAtualID = null; // Guarda o ID do ativo para os modais (vinda da versão nova)
let modeloParaExcluirId = null;

// =================== FUNÇÕES GLOBAIS E DE EXPORTAÇÃO (VERSÃO NOVA) ===================

function formatarDataParaBR(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatarDataParaInput(dataString) {
    if (!dataString) return '';
    try {
        const data = new Date(dataString);
        data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
        return data.toISOString().slice(0, 10);
    } catch (e) { return ''; }
}

function exibirMensagemGeral(mensagem, tipo = 'danger', elementoId = 'mensagemErro') {
    const mensagemDiv = document.getElementById(elementoId);
    if (mensagemDiv) {
        mensagemDiv.textContent = mensagem;
        mensagemDiv.className = `alert alert-${tipo}`;
        mensagemDiv.classList.remove('d-none');
        setTimeout(() => {
            mensagemDiv.classList.add('d-none');
        }, 5000);
    } else {
        alert(mensagem);
    }
}

window.exportar = function (formato, scope) {
    const dadosDaPagina = ativos.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const dadosParaExportar = scope === 'tudo' ? ativos : dadosDaPagina;
    if (dadosParaExportar.length === 0) {
        return exibirMensagemGeral("Nenhuma máquina para exportar.", "warning");
    }
    const colunas = ["ID", "Nome", "Descrição", "Fabricante", "Modelo", "Nº Série", "Data Aquisição", "Local", "Status"];
    const linhas = dadosParaExportar.map(a => [a.id_Ativo, a.Nome_Ativo, a.Descricao, a.Fabricante, a.Modelo, a.Numero_Serie, formatarDataParaBR(a.Data_Aquisicao), a.Localizacao, a.Status]);
    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ativos");
        XLSX.writeFile(workbook, `maquinas_${scope}.xlsx`);
    } else if (formato === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "pt", "a4");
        doc.autoTable({ head: [colunas], body: linhas, headStyles: { fillColor: [52, 58, 64] } });
        doc.save(`maquinas_${scope}.pdf`);
    }
}

// =================== LÓGICA PRINCIPAL (EXECUTADA APÓS O DOM CARREGAR) ===================
document.addEventListener('DOMContentLoaded', function () {

    // --- FUNÇÕES DE CARREGAMENTO E RENDERIZAÇÃO ---

    async function carregarAtivos() {
        const tbody = document.getElementById('ativoTableBody');
        tbody.innerHTML = `<tr><td colspan="13" class="text-center">Carregando...</td></tr>`;
        try {
            const response = await fetch('http://localhost:5000/ativos');
            if (!response.ok) throw new Error('Falha ao carregar ativos.');
            allAtivos = await response.json();
            aplicarFiltros();
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="13" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }

    function renderTableRows() {
        const tbody = document.getElementById('ativoTableBody');
        tbody.innerHTML = "";
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const dadosPagina = ativos.slice(start, end);

        if (dadosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="13" class="text-center">Nenhuma máquina encontrada.</td></tr>`;
            return;
        }

        dadosPagina.forEach(ativo => {
            const row = document.createElement('tr');
            // ESTRUTURA HTML MANTIDA EXATAMENTE COMO NO "JS_ANTES", CONFORME SOLICITADO
            row.innerHTML = `
                <td id="total"></td>
                <td>${ativo.id_Ativo}</td>
                <td>${ativo.Nome_Ativo}</td>
                <td>${ativo.Descricao}</td>
                <td>${ativo.Fabricante}</td>
                <td>${ativo.Modelo}</td>
                <td>${ativo.Numero_Serie}</td>
                <td>${formatarDataParaBR(ativo.Data_Aquisicao)}</td>
                <td>${ativo.Localizacao}</td>
                <td>${ativo.Status}</td>
                <td id="imagemColuna">
                    <button id="viewImageBtn" onclick="abrirModalImagem(${ativo.id_Ativo})"><i class="fa-solid fa-image"></i></button>
                </td>
                <td id="center">
                    <button id="deleteBtn" onclick="deletarAtivos(${ativo.id_Ativo})"><i class="fa-solid fa-trash-can"></i></button>
                    <button id="editBtn" onclick="abrirModalEdicao(this)"><i class="fa-solid fa-square-pen"></i></button>
                    <button id="sensorBtn" onclick="mostrarSensoresDoAtivo(${ativo.id_Ativo})"><i class="fa-solid fa-microchip"></i></button>
                    <button id="modeloBtn" onclick="abrirModalModelos3D(${ativo.id_Ativo})"><i class="fa-solid fa-cube"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // --- LÓGICA DE FILTROS (VERSÃO NOVA) ---
    function aplicarFiltros() {
        let tempAtivos = [...allAtivos];
        const searchTerm = document.getElementById('search_input').value.toLowerCase();
        const statusAtivo = document.querySelector('#filtroStatusContainer .list-group-item.active');

        if (searchTerm) {
            tempAtivos = tempAtivos.filter(ativo => ativo.Nome_Ativo.toLowerCase().includes(searchTerm));
        }
        if (statusAtivo) {
            const status = statusAtivo.getAttribute('data-status');
            tempAtivos = tempAtivos.filter(ativo => ativo.Status.toLowerCase() === status.toLowerCase());
        }

        ativos = tempAtivos;
        totalPages = Math.ceil(ativos.length / rowsPerPage) || 1;
        createPagination();
        changePage(1);
    }

    // --- PAGINAÇÃO (VERSÃO NOVA, MAIS LIMPA) ---
    function createPagination() {
        const paginationContainer = document.getElementById("paginationLines");
        totalPages = Math.ceil(ativos.length / rowsPerPage) || 1;
        paginationContainer.innerHTML = "";
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = "btn";
            btn.innerHTML = `<hr class="page-line" id="line${i}">`;
            btn.onclick = () => changePage(i);
            paginationContainer.appendChild(btn);
        }
    }

    window.changePage = function (page) {
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

    // --- AÇÕES E MODAIS (CRUD, SENSORES, IMAGENS) ---

    // Deletar Ativo (com lógica da versão nova)
    window.deletarAtivos = function (id) {
        const ativo = allAtivos.find(a => a.id_Ativo === id);
        if (!ativo) return;
        ativoParaExcluirId = id;
        document.getElementById('deleteMaquinaName').textContent = ativo.Nome_Ativo;
        new bootstrap.Modal(document.getElementById('deleteModal')).show();
    };

    async function executarExclusao() {
        if (!ativoParaExcluirId) return;
        try {
            const response = await fetch(`http://localhost:5000/delete_ativo/${ativoParaExcluirId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok || !data.affected_rows) throw new Error(data.mensagem || 'Ativo não encontrado ou vinculado.');

            exibirMensagemGeral("Máquina excluída com sucesso!", "success");
            await carregarAtivos();
        } catch (error) {
            exibirMensagemGeral("Erro ao excluir: " + error.message, "danger");
        } finally {
            bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
            ativoParaExcluirId = null;
        }
    }

    // Editar Ativo (com lógica da versão nova)
    window.abrirModalEdicao = function (button) {
        const row = button.closest('tr');
        const ativoId = parseInt(row.cells[1].innerText.trim(), 10);
        const ativo = allAtivos.find(a => a.id_Ativo === ativoId);
        if (!ativo) return;

        document.getElementById('id_ativo').value = ativo.id_Ativo;
        document.getElementById('nome_update').value = ativo.Nome_Ativo;
        document.getElementById('descricao_update').value = ativo.Descricao;
        document.getElementById('fabricante_update').value = ativo.Fabricante;
        document.getElementById('modelo_update').value = ativo.Modelo;
        document.getElementById('numero_update').value = ativo.Numero_Serie;
        document.getElementById('data_update').value = formatarDataParaInput(ativo.Data_Aquisicao);
        document.getElementById('local_update').value = ativo.Localizacao;
        document.getElementById('status_update').value = ativo.Status;
        const fotoPreview = document.getElementById('foto_ativo_preview_update');
        if (ativo.Imagem) {
            fotoPreview.src = `data:image/jpeg;base64,${ativo.Imagem}`;
            fotoPreview.style.display = 'block';
        } else {
            fotoPreview.style.display = 'none';
        }
        new bootstrap.Modal(document.getElementById('exampleModalAtualizar')).show();
    };

    // Ver Sensores (com lógica da versão nova)
    window.mostrarSensoresDoAtivo = async function (idAtivo) {
        try {
            const response = await fetch(`http://localhost:5000/sensores_por_ativo/${idAtivo}`);
            const sensores = await response.json();
            const tbody = document.getElementById('sensorInfoTableBody');
            tbody.innerHTML = '';
            if (sensores.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2">Nenhum sensor vinculado a este ativo.</td></tr>';
            } else {
                sensores.forEach(sensor => {
                    tbody.innerHTML += `<tr><th>ID Sensor</th><td>${sensor.id_Sensor || 'N/A'}</td></tr>
                                        <tr><th>Nome</th><td>${sensor.Nome_Sensor || 'N/A'}</td></tr>
                                        <tr><th>Tipo</th><td>${sensor.Tipo || 'N/A'}</td></tr>
                                        <tr><th>Status</th><td>${sensor.Status || 'N/A'}</td></tr>
                                        <tr><td colspan="2"><hr></td></tr>`;
                });
            }
            new bootstrap.Modal(document.getElementById('sensorModal')).show();
        } catch (error) {
            exibirMensagemGeral('Erro ao carregar dados dos sensores.', 'danger');
        }
    };

    // Ver Imagem (com lógica da versão nova)
    window.abrirModalImagem = function (idAtivo) {
        const ativo = allAtivos.find(a => a.id_Ativo === idAtivo);
        if (!ativo || !ativo.Imagem) {
            return exibirMensagemGeral("Este ativo não possui imagem.", "warning");
        }
        document.getElementById('imagemAtivoModal').src = `data:image/jpeg;base64,${ativo.Imagem}`;
        document.getElementById('imagemModal').style.display = 'block';
    }

    window.fecharModalImagem = function () {
        document.getElementById('imagemModal').style.display = 'none';
    }


    // --- LÓGICA PARA MODELOS 3D (NOVA FUNCIONALIDADE) ---
    let modelosVinculadosAtualmente = [];

    window.abrirModalModelos3D = async function (idAtivo) {
        ativoAtualID = idAtivo;
        document.getElementById('modelosVinculadosBody').innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
        document.getElementById('selectArquivoModelo').innerHTML = '<option>Carregando...</option>';
        new bootstrap.Modal(document.getElementById('modalModelos3D')).show();
        await Promise.all([
            carregarModelosVinculados(idAtivo),
            carregarArquivosParaSelect()
        ]);
    }

    async function carregarModelosVinculados(idAtivo) {
        try {
            const response = await fetch(`http://localhost:5000/ativos/${idAtivo}/modelos3d`);
            modelosVinculadosAtualmente = await response.json();
            const tbody = document.getElementById('modelosVinculadosBody');
            tbody.innerHTML = '';
            if (modelosVinculadosAtualmente.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum modelo vinculado.</td></tr>';
            } else {
                modelosVinculadosAtualmente.forEach(modelo => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${modelo.id_Modelo}</td>
                        <td>${modelo.Nome_Modelo}</td>
                        <td>${modelo.Arquivo_URL}</td>
                        <td class="text-center align-middle"><button id="deleteBtn" onclick="deletarModelo3D(${modelo.id_Modelo}, '${modelo.Nome_Modelo}')"><i class="fa-solid fa-trash-can"></i></button></td>
                    `;
                    tbody.appendChild(row);
                });
            }
        } catch (error) {
            document.getElementById('modelosVinculadosBody').innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar modelos.</td></tr>';
        }
    }

    async function carregarArquivosParaSelect() {
        try {
            const response = await fetch('http://localhost:5000/arquivos-upload');
            const arquivos = await response.json();
            const select = document.getElementById('selectArquivoModelo');
            select.innerHTML = '<option value="" selected disabled>Selecione um arquivo</option>';
            if (Array.isArray(arquivos) && arquivos.length > 0) {
                arquivos.forEach(arquivo => {
                    select.innerHTML += `<option value="${arquivo}">${arquivo}</option>`;
                });
            } else {
                select.innerHTML = '<option value="" disabled>Nenhum arquivo na pasta uploads</option>';
            }
        } catch (error) {
            document.getElementById('selectArquivoModelo').innerHTML = '<option value="" disabled>Erro ao carregar</option>';
        }
    }

    window.deletarModelo3D = function (idModelo, nomeModelo) {
        // Guarda o ID na variável global
        modeloParaExcluirId = idModelo;

        // Coloca a pergunta de confirmação dentro do corpo do modal genérico
        document.getElementById('confirmModalBody').textContent = `Tem certeza que deseja desvincular o modelo "${nomeModelo}"?`;

        // Abre o modal de confirmação que você adicionou no HTML
        new bootstrap.Modal(document.getElementById('confirmModal')).show();
    }


    async function executarExclusaoModelo3D() {
        if (!modeloParaExcluirId) return; // Se não houver ID, não faz nada
        try {
            const response = await fetch(`http://localhost:5000/modelos3d/${modeloParaExcluirId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.erro || "Erro desconhecido");
            }
            exibirMensagemGeral("Modelo 3D desvinculado com sucesso.", "success");
            await carregarModelosVinculados(ativoAtualID); // Recarrega a lista de modelos
        } catch (error) {
            exibirMensagemGeral("Erro ao desvincular modelo: " + error.message, "danger");
        } finally {
            // Esconde o modal e limpa a variável de ID
            bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
            modeloParaExcluirId = null;
        }
    }

    // --- EVENT LISTENERS (ESTRUTURA DA VERSÃO NOVA) ---

    // Formulários
    document.getElementById('formulario').addEventListener('submit', async function (event) {
        event.preventDefault();
        const formData = new FormData(this);
        // Validação da versão nova
        if (!formData.get('Nome_Ativo') || !formData.get('Descricao') || !formData.get('Data_Aquisicao')) {
            return exibirMensagemGeral("Nome, Descrição e Data de Aquisição são obrigatórios.", "warning", "mensagemErroInserir");
        }
        formData.append("table", "ativos");
        formData.append("database", "sgmi");
        try {
            const response = await fetch('http://localhost:5000/insert', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok || !data.inserted_id) throw new Error(data.mensagem);
            exibirMensagemGeral("Máquina registrada com sucesso!", "success", "mensagemSucesso");
            await carregarAtivos();
            this.reset();
            bootstrap.Modal.getInstance(document.getElementById('modalCreate')).hide();
        } catch (error) {
            exibirMensagemGeral("Erro: " + error.message, "danger", "mensagemErroInserir");
        }
    });

    document.getElementById('formularioAtualizar').addEventListener('submit', async function (event) {
        event.preventDefault();
        const id = document.getElementById('id_ativo').value;
        const formData = new FormData(this);
        formData.append("id_Ativo", id);
        try {
            const response = await fetch(`http://localhost:5000/update_ativo/${id}`, { method: 'PUT', body: formData });
            const data = await response.json();
            if (!response.ok || !data.affected_rows) throw new Error(data.mensagem);
            exibirMensagemGeral("Máquina atualizada com sucesso", "success", "mensagemsucesso");
            await carregarAtivos();
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('exampleModalAtualizar')).hide();
            }, 1500);
        } catch (error) {
            exibirMensagemGeral("Erro: " + error.message, "danger", "mensagemErroEditar");
        }
    });

    document.getElementById('formNovoModelo').addEventListener('submit', async function (event) {
        event.preventDefault();
        const nomeModelo = document.getElementById('nomeModeloInput').value;
        const arquivoURL = document.getElementById('selectArquivoModelo').value;
        if (!nomeModelo || !arquivoURL) {
            return exibirMensagemGeral("Por favor, preencha o nome e selecione um arquivo.", "warning");
        }
        const payload = { Nome_Modelo: nomeModelo, Arquivo_URL: arquivoURL };
        try {
            const response = await fetch(`http://localhost:5000/ativos/${ativoAtualID}/modelos3d`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.erro || "Erro desconhecido");
            }
            exibirMensagemGeral("Modelo vinculado com sucesso!", "success");
            this.reset();
            await carregarModelosVinculados(ativoAtualID);
        } catch (error) {
            exibirMensagemGeral("Erro ao vincular modelo: " + error.message, "danger");
        }
    });

    // Filtros
    document.getElementById('search_input').addEventListener('input', aplicarFiltros);
    document.querySelectorAll('#filtroStatusContainer .list-group-item').forEach(button => {
        button.addEventListener('click', function () {
            if (this.classList.contains('active')) {
                this.classList.remove('active');
            } else {
                document.querySelectorAll('#filtroStatusContainer .list-group-item').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            }
            aplicarFiltros();
        });
    });
    document.getElementById('limpar_filtros').addEventListener('click', () => {
        document.getElementById('search_input').value = '';
        document.querySelectorAll('#filtroStatusContainer .list-group-item.active').forEach(b => b.classList.remove('active'));
        aplicarFiltros();
    });

    // Outros
    document.getElementById('confirmDeleteBtn').addEventListener('click', executarExclusao);
    document.getElementById('confirmModalBtn').addEventListener('click', executarExclusaoModelo3D);
    document.getElementById("prevBtn").addEventListener("click", () => changePage(currentPage - 1));
    document.getElementById("nextBtn").addEventListener("click", () => changePage(currentPage + 1));
    document.getElementById('closeModalBtn').addEventListener('click', fecharModalImagem);

    // --- INICIALIZAÇÃO ---
    carregarAtivos();
    if (document.getElementById('particles-js')) {
        particlesJS('particles-js', { "particles": { "number": { "value": 50, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#0d6efd" }, "shape": { "type": "circle" }, "opacity": { "value": 0.7, "random": true }, "size": { "value": 3, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#0d6efd", "opacity": 0.2, "width": 1 }, "move": { "enable": true, "speed": 1, "direction": "none", "out_mode": "out" } }, "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "grab" } }, "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 0.5 } } } }, "retina_detect": true });
    }
});