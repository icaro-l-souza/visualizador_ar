let statusSelecionado = null;
let prioridadeSelecionada = null;

// ------------------------- FILTRAR POR STATUS -------------------------
function filtrarPorStatus(status, event) {
    if (event) event.stopPropagation();
    const statusValidos = ['Aceita', 'Recusada', 'Analise'];

    if (status !== null && !statusValidos.includes(status)) {
        console.error("[Checkpoint] Erro: Status inválido");
        return;
    }

    statusSelecionado = status;

    // Atualiza os botões "active" (apenas os de status)
    document.querySelectorAll('.filter-dropdown .filter-btn:not(.prioridade-btn)').forEach(btn => {
        btn.classList.remove('active');
        const texto = btn.textContent.trim().toLowerCase();
        if ((status === null && texto.includes('mostrar todas')) ||
            (status !== null && texto.includes(status.toLowerCase()))) {
            btn.classList.add('active');
        }
    });

    // LÓGICA CORRIGIDA: Carrega os dados imediatamente e fecha o dropdown
    carregarSolicitacoes(statusSelecionado, prioridadeSelecionada);
    fecharDropdown();
}

// ------------------------- FILTRAR POR PRIORIDADE -------------------------
function filtrarPorPrioridade(prioridade, event) {
    if (event) event.stopPropagation();
    const prioridadesValidas = ['Alta', 'Media', 'Baixa'];

    if (prioridade !== null && !prioridadesValidas.includes(prioridade)) {
        console.error("[Checkpoint] Erro: Prioridade inválida");
        return;
    }

    prioridadeSelecionada = prioridade;

    // Atualiza os botões "active" (apenas os de prioridade)
    document.querySelectorAll('.filter-dropdown .prioridade-btn').forEach(btn => {
        btn.classList.remove('active');
        const texto = btn.textContent.trim().toLowerCase();
        if ((prioridade === null && texto.includes('todas as prioridades')) ||
            (prioridade !== null && texto.includes(prioridade.toLowerCase()))) {
            btn.classList.add('active');
        }
    });

    // LÓGICA CORRIGIDA: Carrega os dados imediatamente e fecha o dropdown
    carregarSolicitacoes(statusSelecionado, prioridadeSelecionada);
    fecharDropdown();
}


// ------------------------- Carregar Solicitacoes com Filtro -------------------------
async function carregarSolicitacoes(filtroStatus = null, filtroPrioridade = null) {
    const mensagemDiv = document.getElementById('mensagemErro');
    mensagemDiv.classList.add('d-none');

    try {
        const response = await fetch('http://localhost:5000/solicitacoes');
        const solicitacoes = await response.json();

        const tbody = document.querySelector('tbody');
        tbody.innerHTML = '';

        // Função para normalizar status
        const normalizarStatus = (status) => {
            if (!status) return null;
            if (status.toLowerCase() === "analise") return "em analise";
            return status.toLowerCase();
        };

        const solicitacoesFiltradas = solicitacoes.filter(s => {
            const statusOK = !filtroStatus || s.Status.toLowerCase() === normalizarStatus(filtroStatus);
            const prioridadeOK = !filtroPrioridade || s.Prioridade.toLowerCase() === filtroPrioridade.toLowerCase();
            return statusOK && prioridadeOK;
        });

        solicitacoesFiltradas.forEach(solicitacao => {
            const row = document.createElement('tr');

            let botoesAcao = '';

            if (solicitacao.Status === 'Em Analise') {
                botoesAcao = `
                <button class="delete-btn btn btn-success btn-sm" onclick="aceitarSolicitacao(${solicitacao.id_Solicitacao})">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="edit-btn btn btn-danger btn-sm" onclick="recusarSolicitacao(${solicitacao.id_Solicitacao})">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <button class="delete-btn-soli" onclick="confirmDeleteSolicitacaoBtn(${solicitacao.id_Solicitacao})">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            } else if (solicitacao.Status === 'Aceita' || solicitacao.Status === 'Recusada') {
                botoesAcao = `
                <button class="delete-btn-soli" onclick="confirmarExclusaoSolicitacao(${solicitacao.id_Solicitacao})">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            }

            row.innerHTML = `
                <td id="total"></td>
                <td>${solicitacao.id_Solicitacao}</td>
                <td>${solicitacao.id_Ativo}</td>
                <td>${solicitacao.Titulo}</td>
                <td>${solicitacao.Solicitante}</td>
                <td>${solicitacao.Problema}</td>
                <td>${solicitacao.Prioridade}</td>
                <td>${solicitacao.Status}</td>
                <td id="center">
                    ${botoesAcao}
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        mensagemDiv.textContent = 'Erro ao carregar solicitações: ' + error.message;
        mensagemDiv.classList.remove('d-none');
    }
}

// ------------------------- Executar ao iniciar -------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Apenas carrega todos os dados inicialmente
    carregarSolicitacoes(null, null);
});
// ------------------------- Fechar o dropdown -------------------------
function fecharDropdown() {
    const dropdownToggle = document.getElementById('filterDropdown');
    // Verifica se o dropdown existe antes de tentar manipulá-lo
    if (dropdownToggle) {
        const dropdownInstance = bootstrap.Dropdown.getOrCreateInstance(dropdownToggle);
        dropdownInstance.hide();
    }
}

// ------------------------- Deletar Solicitação ----------------------------------------
let solicitacaoParaExcluirId = null;

// Abre o modal e exibe o ID da solicitação
function confirmarExclusaoSolicitacao(id) {
    solicitacaoParaExcluirId = id;
    document.getElementById('deleteSolicitacaoId').textContent = id;
    const modal = new bootstrap.Modal(document.getElementById('deleteSolicitacaoModal'));
    modal.show();
}

// Botão "Excluir" dentro do modal
document.getElementById('confirmDeleteSolicitacaoBtn').addEventListener('click', () => {
    if (solicitacaoParaExcluirId !== null) {
        deletarSolicitacao(solicitacaoParaExcluirId);
    }
});

// Função para exclusão
async function deletarSolicitacao(id) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteSolicitacaoModal'));

    try {
        const response = await fetch(`http://localhost:5000/delete_solicitacoes/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok || !data.affected_rows) {
            alert(`Erro: ${data.mensagem || 'Solicitação não encontrada ou vinculada a uma ordem.'}`);
            return;
        }

        modal.hide();
        alert("Solicitação excluída com sucesso!");

        // Recarregar lista
        carregarSolicitacoes(statusSelecionado, prioridadeSelecionada);

    } catch (error) {
        modal.hide();
        alert("Erro ao excluir solicitação: " + error.message);
    }
};


// ------------------------- Aceitar Solicitação -------------------------
async function aceitarSolicitacao(idSolicitacao) {
    const confirmacao = confirm("Deseja aceitar esta solicitação?");
    if (!confirmacao) return;

    try {
        const response = await fetch('http://localhost:5000/atualizar_status_solicitacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_Solicitacao: idSolicitacao,
                Status: "Aceita"
            })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            alert("Solicitação aceita com sucesso!");
            carregarSolicitacoes(statusSelecionado, prioridadeSelecionada); // Recarrega com os filtros atuais
        } else {
            alert("Erro ao aceitar solicitação: " + (data.message || 'Erro desconhecido.'));
        }
    } catch (error) {
        console.error("Erro ao aceitar solicitação:", error);
        alert("Erro na conexão com o servidor.");
    }
}

// ------------------------- Recusar Solicitação -------------------------
async function recusarSolicitacao(idSolicitacao) {
    const confirmacao = confirm("Deseja recusar esta solicitação?");
    if (!confirmacao) return;

    try {
        const response = await fetch('http://localhost:5000/atualizar_status_solicitacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_Solicitacao: idSolicitacao,
                Status: "Recusada"
            })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            alert("Solicitação recusada com sucesso!");
            carregarSolicitacoes(statusSelecionado, prioridadeSelecionada); // Recarrega com os filtros atuais
        } else {
            alert("Erro ao recusar solicitação: " + (data.message || 'Erro desconhecido.'));
        }
    } catch (error) {
        console.error("Erro ao recusar solicitação:", error);
        alert("Erro na conexão com o servidor.");
    }
}

// ------------------------- Executar ao iniciar -------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Define o estado inicial e carrega os dados
    filtrarPorStatus(null);
    filtrarPorPrioridade(null);
    carregarSolicitacoes(null, null); // Carrega todos os dados na primeira vez
});