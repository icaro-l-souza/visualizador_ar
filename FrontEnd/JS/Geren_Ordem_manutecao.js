// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let allOrdens = [];
let filteredOrdens = [];
let ordemParaDeletarId = null;
let ordemAtualID = null;
let currentPage = 1;
const rowsPerPage = 10;

// =================== FUNÇÕES GLOBAIS (ACESSÍVEIS PELO HTML) ===================

function formatarDataParaBR(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatarDataParaInput(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toISOString().split('T')[0];
}

window.exportar = function (formato, escopo) {
    const dadosDaPagina = filteredOrdens.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const dadosParaExportar = escopo === 'tudo' ? allOrdens : dadosDaPagina;

    if (dadosParaExportar.length === 0) {
        exibirMensagemGeral("Nenhum dado para exportar.", "warning");
        return;
    }

    const colunas = ["ID Ordem", "ID Ativo", "Descrição", "Data Abertura", "Status", "Prioridade", "ID Solicitação"];
    const linhas = dadosParaExportar.map(ordem => [
        ordem.id_Ordem, ordem.id_Ativo, ordem.Descricao_Problema,
        formatarDataParaBR(ordem.Data_Abertura), ordem.Status, ordem.Prioridade,
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
            head: [colunas], body: linhas, styles: { fontSize: 7 },
            headStyles: { fillColor: [52, 58, 64] }
        });
        doc.save(`ordens_${escopo}.pdf`);
    }
}

// =================== LÓGICA PRINCIPAL (EXECUTADA APÓS O DOM CARREGAR) ===================
document.addEventListener('DOMContentLoaded', function () {

    // --- FUNÇÕES DE CARREGAMENTO E API ---

    async function carregarOrdens() {
        const tbody = document.getElementById('ordem_manutencaoTableBody');
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">Carregando...</td></tr>`;
        try {
            const response = await fetch('http://localhost:5000/ordens');
            if (!response.ok) throw new Error('Erro ao buscar ordens de manutenção.');
            allOrdens = await response.json();
            aplicarFiltrosERenderizar();
        } catch (error) {
            console.error("Erro ao carregar ordens:", error);
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${error.message}</td></tr>`;
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
                dataOk = dataOk && (ordem.Data_Abertura.split('T')[0] >= dataInicio);
            }
            if (dataFim) {
                dataOk = dataOk && (ordem.Data_Abertura.split('T')[0] <= dataFim);
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

    function exibirMensagemGeral(mensagem, tipo = 'danger', elementoId = 'mensagemErro') {
        const mensagemDiv = document.getElementById(elementoId);
        if (mensagemDiv) {
            mensagemDiv.textContent = mensagem;
            mensagemDiv.className = `alert alert-${tipo}`;
            mensagemDiv.classList.remove('d-none');
            setTimeout(() => {
                mensagemDiv.classList.add('d-none');
            }, 4000);
        } else {
            alert(mensagem);
        }
    }

    document.getElementById('ordem_servicoForm').addEventListener('submit', async function (event) {
        event.preventDefault();
        const Id_Ativo = document.getElementById('ativo_input').value;
        const Descricao = document.getElementById('Descricao').value;
        const Prioridade = document.getElementById('Prioridade').value;
        const solicitacao = document.getElementById('solicitacaoSelect').value || null;
        if (!Id_Ativo || !Descricao || !Prioridade) {
            exibirMensagemGeral("Preencha todos os campos obrigatórios.", "warning", "mensagemErroInserir");
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
            exibirMensagemGeral('Ordem de serviço cadastrada com sucesso!', 'success', 'mensagemSucesso');
            await carregarOrdens();
            bootstrap.Modal.getInstance(document.getElementById('exampleModal')).hide();
            this.reset();
        } catch (error) {
            exibirMensagemGeral('Erro: ' + error.message, 'danger', 'mensagemErroInserir');
        }
    });

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
        await carregarSolicitacoes(document.getElementById('solicitacaoSelectEditar'), ordem.id_Solicitacao);
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
            Data_Abertura: document.getElementById('Data_Abertura_update').value,
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
            exibirMensagemGeral('Ordem atualizada com sucesso!', 'success', 'mensagemSucessoEditar');
            await carregarOrdens();
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('exampleModalUpdate')).hide();
            }, 1500);
        } catch (error) {
            exibirMensagemGeral('Erro: ' + error.message, 'danger', 'mensagemErroEditar');
        }
    });

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
            exibirMensagemGeral("Ordem excluída com sucesso!", "success");
            await carregarOrdens();
        } catch (error) {
            exibirMensagemGeral("Erro ao excluir ordem: " + error.message, "danger");
        } finally {
            modal.hide();
            ordemParaDeletarId = null;
        }
    }

    // --- VINCULAR FUNCIONÁRIOS ---
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
        } catch (error) { exibirMensagemGeral('Erro ao carregar dados do funcionário.', 'danger'); }
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
        } catch (error) { exibirMensagemGeral('Erro ao carregar funcionários para vincular.', 'danger'); }
    }

    document.getElementById('vincularFunc').addEventListener('click', async () => {
        const idFuncionario = document.getElementById('funcSelecionadoID').value;
        if (!idFuncionario || !ordemAtualID) return exibirMensagemGeral('Selecione um funcionário.', 'warning');
        try {
            const response = await fetch(`http://localhost:5000/ordens/${ordemAtualID}/funcionarios`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_Funcionario: parseInt(idFuncionario) }) });
            if (!response.ok) throw new Error('Erro na API');
            exibirMensagemGeral('Funcionário vinculado com sucesso!', 'success');
            await mostrarFunc(ordemAtualID);
        } catch (error) { exibirMensagemGeral('Erro ao vincular funcionário.', 'danger'); }
    });

    window.desvincularFuncionario = async (idFuncionario, idOrdem) => {
        // Usando a nossa função de mensagem em vez do confirm
        if (!await exibirConfirmacao("Deseja realmente desvincular este funcionário?")) return;
        try {
            const response = await fetch(`http://localhost:5000/ordens/${idOrdem}/funcionarios/${idFuncionario}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Erro na API');
            exibirMensagemGeral('Funcionário desvinculado com sucesso!', 'success');
            await mostrarFunc(idOrdem);
        } catch (error) { exibirMensagemGeral('Erro ao desvincular funcionário.', 'danger'); }
    };

    // =========================================================================
    // CORREÇÃO E MELHORIA NA LÓGICA DE VINCULAR PEÇAS
    // =========================================================================

    // Vamos declarar a variável aqui para que ela seja acessível por outras funções
    let pecasVinculadasNaOrdem = [];

    window.mostrarPeca = async function (idOrdem) {
        ordemAtualID = idOrdem;
        try {
            const response = await fetch(`http://localhost:5000/ordens/${idOrdem}/pecas`);
            pecasVinculadasNaOrdem = await response.json(); // Armazena na variável global

            const tbody = document.getElementById('pecaInfoTableBody');
            tbody.innerHTML = '';

            if (pecasVinculadasNaOrdem.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">Nenhuma peça vinculada.</td></tr>';
            } else {
                pecasVinculadasNaOrdem.forEach(peca => {
                    tbody.innerHTML += `<tr>
                    <td>${peca.id_Peca || 'N/A'}</td>
                    <td>${peca.Nome_Peca || 'N/A'}</td>
                    <td>${peca.Quantidade || 'N/A'}</td>
                    <td>${peca.Estoque !== null ? peca.Estoque : 'N/A'}</td>
                    <td><button class="btn btn-danger btn-sm" onclick="desvincularPeca(${peca.id_Ordens_Peca}, ${idOrdem})">Desvincular</button></td>
                </tr>`;
                });
            }
            await preencherPecasParaVincular();

            let pecaModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('PecaModal'));
            pecaModal.show();
        } catch (error) {
            exibirMensagemGeral('Erro ao carregar dados da peça: ' + error.message, 'danger');
        }
    };

    async function preencherPecasParaVincular() {
        try {
            // Busca todas as peças e as já vinculadas para não mostrá-las na lista de seleção
            const [todasResponse, vinculadasResponse] = await Promise.all([
                fetch('http://localhost:5000/pecas'),
                fetch(`http://localhost:5000/ordens/${ordemAtualID}/pecas`)
            ]);
            const todasPecas = await todasResponse.json();
            const pecasVinculadas = await vinculadasResponse.json();
            const idsVinculadas = new Set(pecasVinculadas.map(p => p.id_Peca));
            const tbody = document.getElementById('tabelaPecas');
            tbody.innerHTML = '';

            const pecasDisponiveis = todasPecas.filter(p => p.Estoque > 0);

            pecasDisponiveis.forEach(peca => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${peca.id_Peca}</td><td>${peca.Nome_Peca}</td><td>${peca.Estoque}</td>`;
                tr.style.cursor = 'pointer';
                tr.onclick = () => {
                    // Remove a classe 'table-primary' de qualquer outra linha selecionada
                    tbody.querySelectorAll('tr').forEach(row => row.classList.remove('table-primary'));
                    // Adiciona a classe na linha clicada
                    tr.classList.add('table-primary');

                    document.getElementById('pecaSelecionadaTexto').textContent = `${peca.id_Peca} - ${peca.Nome_Peca}`;
                    document.getElementById('pecaSelecionadaID').value = peca.id_Peca;
                    document.getElementById('pecaSelecionadaEstoque').value = peca.Estoque;
                    // Ajusta o 'max' do input de quantidade para o estoque disponível
                    document.getElementById('quantidadePeca').max = peca.Estoque;
                };
                tbody.appendChild(tr);
            });
        } catch (error) {
            exibirMensagemGeral('Erro ao carregar peças para vincular.', 'danger');
        }
    }

    document.getElementById('vincularPeca').addEventListener('click', async () => {
        const idPeca = document.getElementById('pecaSelecionadaID').value;
        const quantidade = parseInt(document.getElementById('quantidadePeca').value, 10);
        const estoqueDisponivel = parseInt(document.getElementById('pecaSelecionadaEstoque').value, 10);

        if (!idPeca) return exibirMensagemGeral('Selecione uma peça.', 'warning');
        if (isNaN(quantidade) || quantidade <= 0) return exibirMensagemGeral('A quantidade deve ser maior que zero.', 'warning');
        if (quantidade > estoqueDisponivel) return exibirMensagemGeral(`Quantidade excede o estoque disponível (${estoqueDisponivel}).`, 'warning');

        // VERIFICA SE A PEÇA JÁ ESTÁ VINCULADA
        const vinculoExistente = pecasVinculadasNaOrdem.find(p => p.id_Peca == idPeca);

        if (vinculoExistente) {
            // --- SE JÁ EXISTE: ATUALIZA (PUT) ---
            try {
                const payload = { Quantidade: quantidade }; // Envia somente a quantidade a ser adicionada
                const idDoVinculo = vinculoExistente.id_Ordens_Peca;

                const response = await fetch(`http://localhost:5000/ordens/${ordemAtualID}/pecas/${idDoVinculo}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.mensagem || 'Erro na API ao atualizar quantidade.');
                }
                exibirMensagemGeral('Quantidade da peça atualizada com sucesso!', 'success');

            } catch (error) {
                exibirMensagemGeral('Erro ao atualizar quantidade: ' + error.message, 'danger');
            }

        } else {
            // --- SE NÃO EXISTE: CRIA (POST) ---
            try {
                const payload = {
                    id_Ordem: ordemAtualID,
                    id_Peca: parseInt(idPeca),
                    Quantidade: quantidade
                };
                const response = await fetch(`http://localhost:5000/ordens/${ordemAtualID}/pecas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.mensagem || 'Erro na API ao vincular peça.');
                }
                exibirMensagemGeral('Peça vinculada com sucesso!', 'success');

            } catch (error) {
                exibirMensagemGeral('Erro ao vincular peça: ' + error.message, 'danger');
            }
        }

        // Após qualquer uma das operações, atualiza o modal e limpa a seleção
        await mostrarPeca(ordemAtualID);
        document.getElementById('pecaSelecionadaTexto').textContent = "Nenhum";
        document.getElementById('pecaSelecionadaID').value = '';
        document.getElementById('pecaSelecionadaEstoque').value = '0';
        document.getElementById('quantidadePeca').value = '1';
    });


    window.desvincularPeca = async (idOrdemPeca, idOrdem) => {
        if (!await exibirConfirmacao("Deseja realmente desvincular esta peça?")) return;
        try {
            const response = await fetch(`http://localhost:5000/ordens/${idOrdem}/pecas/${idOrdemPeca}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.mensagem || 'Erro na API ao desvincular peça.');
            }
            exibirMensagemGeral('Peça desvinculada com sucesso!', 'success');
            await mostrarPeca(idOrdem);
        } catch (error) {
            exibirMensagemGeral('Erro ao desvincular peça: ' + error.message, 'danger');
        }
    };

    // --- EVENT LISTENERS ---

    document.getElementById('filtroStatus').addEventListener('change', aplicarFiltrosERenderizar);
    document.getElementById('filtroPrioridade').addEventListener('change', aplicarFiltrosERenderizar);
    document.getElementById('filtroDataInicio').addEventListener('change', aplicarFiltrosERenderizar);
    document.getElementById('filtroDataFim').addEventListener('change', aplicarFiltrosERenderizar);

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

    async function carregarSolicitacoes(selectElement, idSelecionado = null) {
        try {
            const response = await fetch('http://localhost:5000/solicitacoes');
            const solicitacoes = await response.json();
            const solicitacoesValidas = solicitacoes.filter(s => s.Status !== 'Recusada');
            selectElement.innerHTML = '<option value="">Sem solicitação vinculada</option>';
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

    // Função para substituir o 'confirm()' padrão por um modal do Bootstrap (opcional, mas recomendado)
    function exibirConfirmacao(mensagem) {
        return new Promise((resolve) => {
            // Se você tiver um modal de confirmação genérico, pode usá-lo aqui.
            // Por enquanto, vamos manter o confirm() para não adicionar HTML.
            const confirmado = confirm(mensagem);
            resolve(confirmado);
        });
    }

    document.getElementById('solicitacaoSelect').addEventListener('change', () => buscarAtivoPorSolicitacao(document.getElementById('solicitacaoSelect'), document.getElementById('ativo_input')));
    document.getElementById('solicitacaoSelectEditar').addEventListener('change', () => buscarAtivoPorSolicitacao(document.getElementById('solicitacaoSelectEditar'), document.getElementById('ativo_input_update')));
    document.getElementById('Status_update').addEventListener('change', function () { document.querySelector('[data-fechamento]').style.display = this.value === 'Concluida' ? 'block' : 'none'; });

    // --- INICIALIZAÇÃO ---
    carregarOrdens();
    carregarSolicitacoes(document.getElementById('solicitacaoSelect'));
});

// Bloco do Particles.js mantido separado
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            "particles": { "number": { "value": 50, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#0d6efd" }, "shape": { "type": "circle" }, "opacity": { "value": 0.7, "random": true }, "size": { "value": 3, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#0d6efd", "opacity": 0.2, "width": 1 }, "move": { "enable": true, "speed": 1, "direction": "none", "out_mode": "out" } }, "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "grab" } }, "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 0.5 } } } }, "retina_detect": true
        });
    }
});