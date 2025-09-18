document.addEventListener('DOMContentLoaded', () => {

    // --- FUNÇÃO AUXILIAR PARA EXIBIR MENSAGENS ---
    /**
     * Exibe uma mensagem de sucesso, aviso ou erro na tela.
     * @param {string} mensagem - O texto a ser exibido.
     * @param {string} tipo - 'sucesso', 'erro', ou 'aviso'.
     */
    function exibirMensagem(mensagem, tipo = 'erro') {
        const elementoSucesso = document.getElementById('mensagemSucesso');
        const elementoErro = document.getElementById('mensagemErro');
        
        // Esconde ambas as mensagens primeiro para garantir que só uma apareça
        elementoSucesso.classList.add('d-none');
        elementoErro.classList.add('d-none');

        const elemento = (tipo === 'sucesso') ? elementoSucesso : elementoErro;
        
        if (elemento) {
            // Define a cor do alerta com base no tipo
            if (tipo === 'aviso') {
                elemento.className = 'alert alert-warning';
            } else if (tipo === 'sucesso') {
                elemento.className = 'alert alert-success';
            } else {
                elemento.className = 'alert alert-danger';
            }
            
            elemento.textContent = mensagem;
            elemento.classList.remove('d-none');
            
            // Esconde a mensagem após 5 segundos
            setTimeout(() => {
                elemento.classList.add('d-none');
            }, 5000);
        }
    }

    // --- CARREGAMENTO DE DADOS INICIAIS ---

    const tabela = document.querySelector('#tabelaAtivos tbody');
    // Recupera ID e nome do usuário logado
    const userId = localStorage.getItem("ID");
    const userName = localStorage.getItem("Nome");
    
    // Campo visível (nome)
    const solicitanteNomeInput = document.getElementById("solicitanteNome");
    if (solicitanteNomeInput) solicitanteNomeInput.value = userName;
    
    // Campo oculto (ID) que será enviado
    const solicitanteInput = document.getElementById("solicitante");
    if (solicitanteInput) solicitanteInput.value = userId;

    // --- LÓGICA DO MODAL DE ATIVOS ---
    
    // O evento correto é 'show.bs.modal' para carregar os dados quando o modal abre
    const modalAtivos = document.getElementById('modalAtivos');
    if (modalAtivos) {
        modalAtivos.addEventListener('show.bs.modal', async () => {
             try {
                tabela.innerHTML = '<tr><td colspan="2">Carregando...</td></tr>';
                const response = await fetch('http://localhost:5000/ativos');
                const ativos = await response.json();

                tabela.innerHTML = '';

                if (ativos.length === 0) {
                    tabela.innerHTML = '<tr><td colspan="2">Nenhum ativo encontrado.</td></tr>';
                } else {
                    ativos.forEach(ativo => {
                        const linha = document.createElement('tr');
                        linha.innerHTML = `
                            <td>${ativo.id_Ativo}</td>
                            <td>${ativo.Nome_Ativo}</td>
                        `;
                        linha.style.cursor = 'pointer';
                        linha.addEventListener('click', () => {
                            document.getElementById('id_Ativo').value = `${ativo.id_Ativo} - ${ativo.Nome_Ativo}`; // Preenche com ID e Nome
                            const modal = bootstrap.Modal.getInstance(document.getElementById('modalAtivos'));
                            if (modal) modal.hide();
                        });
                        tabela.appendChild(linha);
                    });
                }
            } catch (error) {
                console.error('Erro ao carregar ativos:', error);
                tabela.innerHTML = '<tr><td colspan="2">Erro ao carregar ativos.</td></tr>';
            }
        });
    }

    // --- ENVIO DO FORMULÁRIO ---

    document.getElementById('formulario').addEventListener('submit', async function (event) {
        event.preventDefault();

        // Coleta valores
        const titulo = document.getElementById('titulo').value;
        const solicitante = solicitanteInput.value; // ID
        const prioridade = document.getElementById('prioridade').value;
        const status = document.getElementById('status').value;
        const problema = document.getElementById('problema').value;
        const id_ativo_raw = document.getElementById('id_Ativo').value;
        const id_ativo = id_ativo_raw ? id_ativo_raw.split(' - ')[0] : null; // Extrai apenas o ID

        // Validação simples
        if (!titulo || !solicitante || !prioridade || !status || !problema || !id_ativo) {
            exibirMensagem('Todos os campos são obrigatórios. Por favor, preencha todos.', 'aviso');
            return;
        }
        
        const dados = {
            table: "solicitacoes",
            database: "sgmi",
            data: {
                Titulo: titulo,
                solicitante: parseInt(solicitante),
                Prioridade: prioridade,
                Status: status,
                Problema: problema, // Renomeado para corresponder ao seu JS original
                id_Ativo: parseInt(id_ativo)
            }
        };

        try {
            const response = await fetch('http://localhost:5000/criar_solicitacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (!response.ok) {
                // Tenta ler a mensagem de erro da API, se houver
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `Erro na requisição. Status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.inserted_id || data.success) {
                exibirMensagem('Solicitação enviada com sucesso!', 'sucesso');
                
                // Reseta o formulário
                document.getElementById('formulario').reset();
                
                // Reaplica os valores do solicitante que foram limpos
                solicitanteInput.value = userId;
                if (solicitanteNomeInput) solicitanteNomeInput.value = userName;
            } else {
                throw new Error(data.message || 'Erro desconhecido ao enviar solicitação.');
            }
        } catch(error) {
            exibirMensagem('Erro: ' + error.message, 'erro');
            console.error("Erro na requisição:", error);
        }
    });
});