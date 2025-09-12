document.addEventListener('DOMContentLoaded', () => {
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

    // Evento de clique na tabela de ativos
    document.getElementById('id_Ativo').addEventListener('click', async () => {
        try {
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
                        document.getElementById('id_Ativo').value = ativo.id_Ativo;
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

    // Evento de envio do formulário
    document.getElementById('formulario').addEventListener('submit', function (event) {
        event.preventDefault();

        // Coleta valores
        const titulo = document.getElementById('titulo').value;
        const solicitante = solicitanteInput.value; // ID
        const prioridade = document.getElementById('prioridade').value;
        const status = document.getElementById('status').value;
        const problema = document.getElementById('problema').value;
        const id_ativo = document.getElementById('id_Ativo').value;

        // Validação simples
        if (!titulo || !solicitante || !prioridade || !status || !problema || !id_ativo) {
            alert('Todos os campos são obrigatórios. Por favor, preencha todos.');
            return;
        }

        // Debug: mostra os dados coletados
        console.log("Dados Enviados", { titulo, solicitante, prioridade, status, problema, id_ativo });

        // Envia para a API
        enviarFormulario(titulo, solicitante, prioridade, status, problema, id_ativo);
    });

    function enviarFormulario(titulo, solicitante, prioridade, status, problema, id_ativo) {
        const dados = {
            table: "solicitacoes",
            database: "sgmi",
            data: {
                Titulo: titulo,
                solicitante: parseInt(solicitante),
                Prioridade: prioridade,
                Status: status,
                Problema: problema,
                id_Ativo: parseInt(id_ativo)
            }
        };

        fetch('http://localhost:5000/criar_solicitacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        })
        .then(response => {
            if (!response.ok) throw new Error('Erro na requisição. Status: ' + response.status);
            return response.json();
        })
        .then(data => {
            console.log("Resposta da API:", data);
            if (data.inserted_id || data.success) {
                const mensagemSucesso = document.getElementById('mensagemSucesso');
                mensagemSucesso.textContent = 'Solicitação enviada com sucesso!';
                mensagemSucesso.classList.remove('d-none');

                // Reseta o formulário
                document.getElementById('formulario').reset();

                // Reaplica os valores do solicitante
                solicitanteInput.value = userId;
                if (solicitanteNomeInput) solicitanteNomeInput.value = userName;
            } else {
                alert('Erro ao enviar solicitação: ' + (data.message || 'Erro desconhecido.'));
            }
        })
        .catch(error => {
            alert('Erro de conexão com o servidor: ' + error.message);
            console.error("Erro na requisição:", error);
        });
    }
});
