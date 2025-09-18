// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let allSolicitacoes = [];
let filteredSolicitacoes = [];
let currentPage = 1;
const rowsPerPage = 10;
let solicitacaoParaExcluirId = null;

// =================== FUNÇÕES DE EXPORTAÇÃO E AUXILIARES ===================

window.exportar = function (formato, scope) {
    const dadosDaPagina = filteredSolicitacoes.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const dadosParaExportar = scope === 'tudo' ? filteredSolicitacoes : dadosDaPagina;

    if (dadosParaExportar.length === 0) {
        exibirMensagemGeral("Nenhum dado para exportar.", "warning");
        return;
    }

    const colunas = ["ID", "ID Ativo", "Título", "Solicitante", "Descrição", "Prioridade", "Status"];
    const linhas = dadosParaExportar.map(s => [
        s.id_Solicitacao, s.id_Ativo, s.Titulo, s.Solicitante, s.Problema, s.Prioridade, s.Status
    ]);

    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Solicitações");
        XLSX.writeFile(workbook, `solicitacoes_${scope}.xlsx`);
    } else // CÓDIGO CORRIGIDO (Com as cores)
        if (formato === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF("l", "pt", "a4");

            // Adicionando o objeto de estilos que faltava
            doc.autoTable({
                head: [colunas],
                body: linhas,
                headStyles: {
                    fillColor: [52, 58, 64],      // Cor de fundo do cabeçalho (cinza escuro)
                    textColor: [255, 255, 255]   // Cor do texto (branco)
                },
                alternateRowStyles: {
                    fillColor: [240, 240, 240]   // Cor das linhas alternadas (cinza claro)
                }
            });
            doc.save(`solicitacoes_${scope}.pdf`);
        }
}

// =================== LÓGICA PRINCIPAL ===================
document.addEventListener('DOMContentLoaded', function () {

    // --- FUNÇÕES DE CARREGAMENTO E FILTROS ---

    async function carregarSolicitacoes() {
        const tbody = document.getElementById('solicitacaoTableBody');
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">Carregando...</td></tr>`;
        try {
            const response = await fetch('http://localhost:5000/solicitacoes');
            if (!response.ok) throw new Error('Falha ao carregar solicitações.');
            allSolicitacoes = await response.json();
            aplicarFiltrosERenderizar();
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }

    function aplicarFiltrosERenderizar() {
        let tempSolicitacoes = [...allSolicitacoes];

        const titulo = document.getElementById('filtroTitulo').value.toLowerCase();
        if (titulo) {
            tempSolicitacoes = tempSolicitacoes.filter(s => s.Titulo.toLowerCase().includes(titulo));
        }

        const statusAtivo = document.querySelector('#filtroStatusContainer .list-group-item.active');
        if (statusAtivo) {
            const status = statusAtivo.getAttribute('data-status');
            tempSolicitacoes = tempSolicitacoes.filter(s => s.Status === status);
        }

        const prioridadeAtiva = document.querySelector('#filtroPrioridadeContainer .list-group-item.active');
        if (prioridadeAtiva) {
            const prioridade = prioridadeAtiva.getAttribute('data-prioridade');
            tempSolicitacoes = tempSolicitacoes.filter(s => s.Prioridade === prioridade);
        }

        filteredSolicitacoes = tempSolicitacoes;
        currentPage = 1;
        createPagination();
        changePage(1);
    }

    // --- RENDERIZAÇÃO E PAGINAÇÃO ---

    function renderTableRows() {
        const tbody = document.getElementById('solicitacaoTableBody');
        tbody.innerHTML = "";
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const dadosPagina = filteredSolicitacoes.slice(start, end);

        if (dadosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center">Nenhuma solicitação encontrada.</td></tr>`;
            return;
        }

        dadosPagina.forEach(s => {
            const row = document.createElement('tr');
            let botoesAcao = '';
            if (s.Status === 'Em Analise') {
                botoesAcao = `
                    <button class="aceitar-btn" onclick="aceitarSolicitacao(${s.id_Solicitacao})"><i class="fa-solid fa-check"></i></button>
                    <button class="recusar-btn" onclick="recusarSolicitacao(${s.id_Solicitacao})"><i class="fa-solid fa-xmark"></i></button>
                    <button class="delete-btn-soli" onclick="confirmarExclusaoSolicitacao(${s.id_Solicitacao})"><i class="fa-solid fa-trash-can"></i></button>
                `;
            } else {
                botoesAcao = `
                    <button class="delete-btn-soli" onclick="confirmarExclusaoSolicitacao(${s.id_Solicitacao})"><i class="fa-solid fa-trash-can"></i></button>
                `;
            }

            row.innerHTML = `
                <td id="total"></td>
                <td>${s.id_Solicitacao}</td>
                <td>${s.id_Ativo}</td>
                <td>${s.Titulo}</td>
                <td>${s.Solicitante}</td>
                <td>${s.Problema}</td>
                <td>${s.Prioridade}</td>
                <td>${s.Status}</td>
                <td id="center">${botoesAcao}</td>
            `;
            tbody.appendChild(row);
        });
    }

    function createPagination() {
        const paginationContainer = document.getElementById("paginationLines");
        const totalPages = Math.ceil(filteredSolicitacoes.length / rowsPerPage) || 1;
        paginationContainer.innerHTML = "";

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = "btn";
            btn.innerHTML = `<hr class="page-line" id="line${i}">`;
            btn.onclick = () => changePage(i);
            paginationContainer.appendChild(btn);
        }
    }

    function changePage(pageNumber) {
        const totalPages = Math.ceil(filteredSolicitacoes.length / rowsPerPage) || 1;
        if (pageNumber < 1) pageNumber = 1;
        if (pageNumber > totalPages) pageNumber = totalPages;

        currentPage = pageNumber;
        renderTableRows();

        document.getElementById("content").innerText = "Página " + currentPage;
        document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
        const currentLine = document.getElementById("line" + currentPage);
        if (currentLine) currentLine.classList.add("active-line");

        document.getElementById("prevBtn").disabled = (currentPage === 1);
        document.getElementById("nextBtn").disabled = (currentPage === totalPages);
    }

    // --- LÓGICA DE AÇÕES ---

    window.confirmarExclusaoSolicitacao = function (id) {
        solicitacaoParaExcluirId = id;
        document.getElementById('deleteSolicitacaoId').textContent = id;
        const modal = new bootstrap.Modal(document.getElementById('deleteSolicitacaoModal'));
        modal.show();
    }

    async function executarExclusao() {
        if (!solicitacaoParaExcluirId) return;
        try {
            const response = await fetch(`http://localhost:5000/delete_solicitacoes/${solicitacaoParaExcluirId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok || !data.affected_rows) throw new Error(data.mensagem || 'Erro ao excluir.');

            exibirMensagemGeral("Solicitação excluída com sucesso!", "success");
            await carregarSolicitacoes();
        } catch (error) {
            exibirMensagemGeral(error.message, "danger");
        } finally {
            bootstrap.Modal.getInstance(document.getElementById('deleteSolicitacaoModal')).hide();
            solicitacaoParaExcluirId = null;
        }
    }

    async function atualizarStatus(id, novoStatus) {
        try {
            const response = await fetch('http://localhost:5000/atualizar_status_solicitacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_Solicitacao: id, Status: novoStatus })
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Erro desconhecido.');

            exibirMensagemGeral(`Solicitação ${novoStatus.toLowerCase()}a com sucesso!`, "success");
            await carregarSolicitacoes();
        } catch (error) {
            exibirMensagemGeral(`Erro ao ${novoStatus.toLowerCase()}r a solicitação: ` + error.message, "danger");
        }
    }

    window.aceitarSolicitacao = (id) => atualizarStatus(id, "Aceita");
    window.recusarSolicitacao = (id) => atualizarStatus(id, "Recusada");

    // --- FUNÇÕES AUXILIARES ---
    function exibirMensagemGeral(mensagem, tipo = 'danger') {
        const mensagemDiv = document.getElementById('mensagemErro');
        mensagemDiv.textContent = mensagem;
        mensagemDiv.className = `alert alert-${tipo}`;
        mensagemDiv.classList.remove('d-none');
        setTimeout(() => mensagemDiv.classList.add('d-none'), 4000);
    }

    // --- INICIALIZAÇÃO E EVENT LISTENERS ---
    carregarSolicitacoes();

    document.getElementById('filtroTitulo').addEventListener('input', aplicarFiltrosERenderizar);

    document.querySelectorAll('#filtroStatusContainer .list-group-item, #filtroPrioridadeContainer .list-group-item').forEach(btn => {
        btn.addEventListener('click', function () {
            const container = this.closest('.list-group');
            if (this.classList.contains('active')) {
                this.classList.remove('active');
            } else {
                container.querySelectorAll('.list-group-item').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }
            aplicarFiltrosERenderizar();
        });
    });

    document.getElementById('limparFiltros').addEventListener('click', () => {
        document.getElementById('filtroTitulo').value = '';
        document.querySelectorAll('.list-group-item.active').forEach(b => b.classList.remove('active'));
        aplicarFiltrosERenderizar();
    });

    document.getElementById('prevBtn').addEventListener('click', () => changePage(currentPage - 1));
    document.getElementById('nextBtn').addEventListener('click', () => changePage(currentPage + 1));

    document.getElementById('confirmDeleteSolicitacaoBtn').addEventListener('click', executarExclusao);
});