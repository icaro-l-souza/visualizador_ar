// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let allOrdens = [];         // Guarda TODAS as ordens carregadas da API (cache)
let filteredOrdens = [];    // Guarda as ordens após aplicar os filtros
let ordemParaDeletarId = null; // Guarda o ID para o modal de exclusão
let ordemAtualID = null;    // Guarda o ID da ordem para os modais de vincular
let currentPage = 1;
const rowsPerPage = 10;

// =================== FUNÇÕES GLOBAIS (ACESSÍVEIS PELO HTML) ===================



function formatarDataParaBR(dataString) {
    if (!dataString) return '';
    return new Date(dataString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/**
 * Exporta os dados da tabela para Excel ou PDF.
 */
window.exportar = function (formato, escopo) {
    const dadosParaExportar = escopo === 'tudo'
        ? filteredOrdens
        : filteredOrdens.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    if (dadosParaExportar.length === 0) {
        alert("Nenhum dado para exportar.");
        return;
    }

    const colunas = ["ID Ordem", "ID Ativo", "Descrição", "Data Abertura", "Status", "Prioridade", "ID Solicitação"];
    const linhas = dadosParaExportar.map(ordem => [
        ordem.id_Ordem,
        ordem.id_Ativo,
        ordem.Descricao_Problema,
        formatarDataParaBR(ordem.Data_Abertura),
        ordem.Status,
        ordem.Prioridade,
        ordem.id_Solicitacao || 'N/A'
    ]);

    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ordens");
        XLSX.writeFile(workbook, `ordens_${escopo}.xlsx`);
    } else if (formato === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        doc.autoTable({
            head: [colunas],
            body: linhas,
            styles: { fontSize: 7 },
            headStyles: { fillColor: [52, 58, 64] }
        });
        doc.save(`ordens_${escopo}.pdf`);
    }
}

// =================== LÓGICA PRINCIPAL (EXECUTADA APÓS O DOM CARREGAR) ===================
document.addEventListener('DOMContentLoaded', function () {

    // --- FUNÇÕES DE CARREGAMENTO E API ---

    async function carregarOrdens() {
        const mensagemDiv = document.getElementById('mensagemErro');
        mensagemDiv.classList.add('d-none');
        try {
            const response = await fetch('http://localhost:5000/ordens');
            if (!response.ok) throw new Error('Erro ao buscar ordens de manutenção.');
            allOrdens = await response.json();
            aplicarFiltrosERenderizar();
        } catch (error) {
            console.error("Erro ao carregar ordens:", error);
            mensagemDiv.textContent = error.message;
            mensagemDiv.classList.remove('d-none');
        }
    }

    // --- LÓGICA DE FILTRO ---

    function aplicarFiltrosERenderizar() {
        const status = document.getElementById('filtroStatus').value;
        const prioridade = document.getElementById('filtroPrioridade').value;
        const dataInicio = document.getElementById('filtroDataInicio').value;
        const dataFim = document.getElementById('filtroDataFim').value;

        filteredOrdens = allOrdens.filter(ordem => {
            const statusOk = !status || ordem.Status === status;
            const prioridadeOk = !prioridade || ordem.Prioridade === prioridade;
            let dataOk = true;
            if (dataInicio) {
                dataOk = dataOk && (new Date(ordem.Data_Abertura) >= new Date(dataInicio));
            }
            if (dataFim) {
                // Adiciona T23:59:59 para incluir o dia inteiro na busca
                dataOk = dataOk && (new Date(ordem.Data_Abertura) <= new Date(dataFim + 'T23:59:59'));
            }
            return statusOk && prioridadeOk && dataOk;
        });
        currentPage = 1;
        renderTableRows();
        createPagination();
    }

    // --- RENDERIZAÇÃO E PAGINAÇÃO ---

    function renderTableRows() {
        const tbody = document.getElementById('ordem_manutencaoTableBody');
        tbody.innerHTML = "";
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const dadosPagina = filteredOrdens.slice(start, end);
        if (dadosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center">Nenhuma ordem encontrada.</td></tr>`;
            return;
        }
        dadosPagina.forEach(ordem => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td id="total"></td>
                <td>${ordem.id_Ordem}</td>
                <td>${ordem.id_Ativo}</td>
                <td>${ordem.Descricao_Problema}</td>
                <td>${formatarDataParaBR(ordem.Data_Abertura)}</td>
                <td>${ordem.Status}</td>
                <td>${ordem.Prioridade}</td>
                <td>${ordem.id_Solicitacao || 'N/A'}</td>
                <td id="center">
                    <button class="delete-btn" onclick="abrirModalDeletar(${ordem.id_Ordem})"><i class="fa-solid fa-trash-can"></i></button>
                    <button class="func-btn" onclick="mostrarFunc(${ordem.id_Ordem})"><i class="fa-solid fa-user-gear"></i></button>
                    <button class="edit-btn" onclick="abrirModalEditarOrdem(this)"><i class="fa-solid fa-square-pen"></i></button>
                    <button class="peca-btn" onclick="mostrarPeca(${ordem.id_Ordem})"><i class="fa-solid fa-gear"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function createPagination() {
        const paginationContainer = document.getElementById("paginationLines");
        const totalPages = Math.ceil(filteredOrdens.length / rowsPerPage);
        paginationContainer.innerHTML = "";
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = "btn";
            btn.innerHTML = `<hr class="page-line" id="line${i}">`;
            btn.onclick = () => changePage(i);
            paginationContainer.appendChild(btn);
        }
        if (totalPages > 0) {
            changePage(currentPage > totalPages ? 1 : currentPage);
        } else {
            document.getElementById("prevBtn").disabled = true;
            document.getElementById("nextBtn").disabled = true;
            document.getElementById("content").innerText = "Página 0";
        }
    }

    window.changePage = function (page) {
        const totalPages = Math.ceil(filteredOrdens.length / rowsPerPage);
        if (page < 1 || (page > totalPages && totalPages > 0)) return;
        currentPage = page;
        renderTableRows();
        document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
        const activeLine = document.getElementById("line" + currentPage);
        if (activeLine) activeLine.classList.add("active-line");
        document.getElementById("prevBtn").disabled = (currentPage === 1);
        document.getElementById("nextBtn").disabled = (currentPage === totalPages || totalPages === 0);
        document.getElementById("content").innerText = `Página ${currentPage}`;
    }

    // --- LÓGICA DE MODAIS E AÇÕES ---

    // ADICIONAR
    document.getElementById('ordem_servicoForm').addEventListener('submit', async function (event) {
        event.preventDefault();
        const Id_Ativo = document.getElementById('ativo_input').value;
        const Descricao = document.getElementById('Descricao').value;
        const Prioridade = document.getElementById('Prioridade').value;
        const solicitacao = document.getElementById('solicitacaoSelect').value || null;
        if (!Id_Ativo || !Descricao || !Prioridade) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }
        const dados = {
            table: "ordens_servico",
            data: { id_Ativo: Id_Ativo, id_Solicitacao: solicitacao, Descricao_Problema: Descricao, Data_Abertura: new Date().toISOString().split('T')[0], Status: 'Aberta', Prioridade: Prioridade },
            database: "sgmi"
        };
        try {
            const response = await fetch('http://localhost:5000/insert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            const data = await response.json();
            if (!response.ok || !data.inserted_id) throw new Error(data.mensagem);
            alert('Ordem de serviço cadastrada com sucesso!');
            await carregarOrdens();
            bootstrap.Modal.getInstance(document.getElementById('exampleModal')).hide();
            this.reset();
        } catch (error) {
            document.getElementById('mensagemErroInserir').textContent = 'Erro: ' + error.message;
            document.getElementById('mensagemErroInserir').classList.remove('d-none');
        }
    });

    // EDITAR
    window.abrirModalEditarOrdem = async function (button) {
        const row = button.closest('tr');
        const id_Ordem = row.cells[1].innerText;
        const ordem = allOrdens.find(o => o.id_Ordem == id_Ordem);
        if (!ordem) return;
        document.getElementById('id_Ordem_update').value = ordem.id_Ordem;
        document.getElementById('Descricao_update').value = ordem.Descricao_Problema;
        document.getElementById('Data_Abertura_update').value = formatarDataParaInput(ordem.Data_Abertura);
        document.getElementById('Status_update').value = ordem.Status;
        document.getElementById('Prioridade_update').value = ordem.Prioridade;
        carregarSolicitacoes(document.getElementById('solicitacaoSelectEditar'), ordem.id_Solicitacao);
        await buscarAtivoPorSolicitacao(document.getElementById('solicitacaoSelectEditar'), document.getElementById('ativo_input_update'));

        const dataFechamentoContainer = document.querySelector('[data-fechamento]');
        if (ordem.Status === 'Concluida' && ordem.Data_Fechamento) {
            document.getElementById('Data_Fechamento_update').value = formatarDataParaInput(ordem.Data_Fechamento);
            dataFechamentoContainer.style.display = 'block';
        } else {
            dataFechamentoContainer.style.display = 'none';
        }
        new bootstrap.Modal(document.getElementById('exampleModalUpdate')).show();
    };

    document.getElementById('ordem_servicoForm_Update').addEventListener('submit', async function (event) {
        event.preventDefault();
        const Id_Ordem = document.getElementById('id_Ordem_update').value;
        const json = {
            id_Ativo: document.getElementById('ativo_input_update').value,
            id_Solicitacao: document.getElementById('solicitacaoSelectEditar').value || null,
            Data_Abertura: document.getElementById('Data_Abertura_update').value || new Date().toISOString().split('T')[0],
            Descricao_Problema: document.getElementById('Descricao_update').value,
            Status: document.getElementById('Status_update').value,
            Prioridade: document.getElementById('Prioridade_update').value,
            Data_Fechamento: document.getElementById('Status_update').value === 'Concluida' ? (document.getElementById('Data_Fechamento_update').value || new Date().toISOString().split('T')[0]) : null
        };
        try {
            const response = await fetch(`http://localhost:5000/update_ordens/${Id_Ordem}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(json)
            });
            const data = await response.json();
            if (!response.ok || !data.affected_rows) throw new Error(data.mensagem);
            alert('Ordem atualizada com sucesso!');
            await carregarOrdens();
            bootstrap.Modal.getInstance(document.getElementById('exampleModalUpdate')).hide();
        } catch (error) {
            document.getElementById('mensagemErroEditar').textContent = 'Erro: ' + error.message;
            document.getElementById('mensagemErroEditar').classList.remove('d-none');
        }
    });

    // DELETAR
    window.abrirModalDeletar = function (id) {
        ordemParaDeletarId = id;
        document.getElementById('ordemIdParaDeletar').textContent = id;
        const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
        modal.show();
    }

    async function deletarOrdemConfirmado() {
        if (!ordemParaDeletarId) return;
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
        try {
            const response = await fetch(`http://localhost:5000/delete_ordens/${ordemParaDeletarId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok || !data.affected_rows) throw new Error(data.mensagem);
            alert("Ordem excluída com sucesso!");
            await carregarOrdens();
        } catch (error) {
            alert("Erro ao excluir ordem: " + error.message);
        } finally {
            modal.hide();
            ordemParaDeletarId = null;
        }
    }

    // VINCULAR FUNCIONÁRIOS E PEÇAS (Seu código original, mantido e organizado)
    window.mostrarFunc = async function (idOrdem) {
        ordemAtualID = idOrdem;
        try {
            const response = await fetch(`http://localhost:5000/ordens/${idOrdem}/funcionarios`);
            const funcionarios = await response.json();
            const tbody = document.getElementById('funcInfoTableBody');
            tbody.innerHTML = '';
            if (funcionarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">Nenhum funcionário vinculado.</td></tr>';
            } else {
                funcionarios.forEach(func => {
                    tbody.innerHTML += `<tr><td>${func.id_Cadastro || 'N/A'}</td><td>${func.Nome || 'N/A'}</td><td>${func.Cargo || 'N/A'}</td><td><button class="btn btn-danger btn-sm" onclick="desvincularFuncionario(${func.id_Cadastro}, ${idOrdem})">Desvincular</button></td></tr>`;
                });
            }
            await preencherFuncionariosParaVincular();
            let funcModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('funcModal'));
            funcModal.show();

        } catch (error) { alert('Erro ao carregar dados do funcionário.'); }
    };

    async function preencherFuncionariosParaVincular() {
        try {
            const [todosResponse, vinculadosResponse] = await Promise.all([fetch('http://localhost:5000/usuario'), fetch(`http://localhost:5000/ordens/${ordemAtualID}/funcionarios`)]);
            const todosFuncionarios = await todosResponse.json();
            const funcionariosVinculados = await vinculadosResponse.json();
            const idsVinculados = new Set(funcionariosVinculados.map(f => f.id_Cadastro));
            const tbody = document.getElementById('tabelaFuncionarios');
            tbody.innerHTML = '';
            todosFuncionarios.filter(f => !idsVinculados.has(f.id_Cadastro)).forEach(func => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${func.id_Cadastro}</td><td>${func.Nome}</td>`;
                tr.style.cursor = 'pointer';
                tr.onclick = () => {
                    document.getElementById('funcSelecionadoTexto').textContent = `${func.id_Cadastro} - ${func.Nome}`;
                    document.getElementById('funcSelecionadoID').value = func.id_Cadastro;
                };
                tbody.appendChild(tr);
            });
        } catch (error) { alert('Erro ao carregar funcionários para vincular.'); }
    }

    document.getElementById('vincularFunc').addEventListener('click', async () => {
        const idFuncionario = document.getElementById('funcSelecionadoID').value;
        if (!idFuncionario || !ordemAtualID) return alert('Selecione um funcionário.');
        try {
            const response = await fetch(`http://localhost:5000/ordens/${ordemAtualID}/funcionarios`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_Funcionario: parseInt(idFuncionario) }) });
            if (!response.ok) throw new Error('Erro na API');
            alert('Funcionário vinculado com sucesso!');
            await mostrarFunc(ordemAtualID);
        } catch (error) { alert('Erro ao vincular funcionário.'); }
    });

    window.desvincularFuncionario = async (idFuncionario, idOrdem) => {
        if (!confirm("Deseja realmente desvincular este funcionário?")) return;
        try {
            const response = await fetch(`http://localhost:5000/ordens/${idOrdem}/funcionarios/${idFuncionario}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Erro na API');
            alert('Funcionário desvinculado com sucesso!');
            await mostrarFunc(idOrdem);
        } catch (error) { alert('Erro ao desvincular funcionário.'); }
    };

    window.mostrarPeca = async function (idOrdem) {
        ordemAtualID = idOrdem;
        // ... (Sua lógica para mostrar peças continua aqui)
        new bootstrap.Modal(document.getElementById('PecaModal')).show();
    };

    // --- EVENT LISTENERS ---
    document.getElementById('aplicarFiltros').addEventListener('click', aplicarFiltrosERenderizar);
    document.getElementById('limparFiltros').addEventListener('click', () => {
        document.getElementById('filtroStatus').value = '';
        document.getElementById('filtroPrioridade').value = '';
        document.getElementById('filtroDataInicio').value = '';
        document.getElementById('filtroDataFim').value = '';
        aplicarFiltrosERenderizar();
    });
    document.getElementById('prevBtn').addEventListener('click', () => changePage(currentPage - 1));
    document.getElementById('nextBtn').addEventListener('click', () => changePage(currentPage + 1));
    document.getElementById('confirmDeleteBtn').addEventListener('click', deletarOrdemConfirmado);

    // --- FUNÇÕES UTILITÁRIAS ---
    async function carregarSolicitacoes(selectElement, idSelecionado = null) {
        try {
            const response = await fetch('http://localhost:5000/solicitacoes');
            const solicitacoes = await response.json();

            // LINHA ADICIONADA: Filtra a lista ANTES de criar as opções
            const solicitacoesValidas = solicitacoes.filter(s => s.Status !== 'Recusada');

            selectElement.innerHTML = '<option value="">Sem solicitação vinculada</option>';

            // Agora o loop usa a lista já filtrada
            solicitacoesValidas.forEach(s => {
                const option = document.createElement('option');
                option.value = s.id_Solicitacao;
                option.textContent = `${s.Titulo} (ID: ${s.id_Solicitacao})`;
                if (s.id_Solicitacao == idSelecionado) option.selected = true;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar solicitações:', error);
        }
    }

    async function buscarAtivoPorSolicitacao(selectElement, inputAtivo) {
        const idSolicitacao = selectElement.value;
        if (!idSolicitacao) {
            inputAtivo.value = '';
            return;
        }
        try {
            const response = await fetch(`http://localhost:5000/solicitacoes/${idSolicitacao}`);
            const dados = await response.json();
            inputAtivo.value = (dados && dados.id_Ativo) ? dados.id_Ativo : '';
        } catch (error) { inputAtivo.value = ''; }
    }

    document.getElementById('solicitacaoSelect').addEventListener('change', () => buscarAtivoPorSolicitacao(document.getElementById('solicitacaoSelect'), document.getElementById('ativo_input')));
    document.getElementById('solicitacaoSelectEditar').addEventListener('change', () => buscarAtivoPorSolicitacao(document.getElementById('solicitacaoSelectEditar'), document.getElementById('ativo_input_update')));
    document.getElementById('Status_update').addEventListener('change', function () { document.querySelector('[data-fechamento]').style.display = this.value === 'Concluida' ? 'block' : 'none'; });


    function formatarDataParaInput(dataString) {
        if (!dataString) return '';
        return new Date(dataString).toISOString().split('T')[0];
    }

    // --- INICIALIZAÇÃO ---
    carregarOrdens();
    carregarSolicitacoes(document.getElementById('solicitacaoSelect'));

});