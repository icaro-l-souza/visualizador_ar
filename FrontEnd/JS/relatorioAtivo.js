// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let allHistoricos = [];       // Guarda a lista COMPLETA de históricos vinda da API
let filteredHistoricos = [];  // Guarda a lista FILTRADA que será exibida na tela
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

  const colunas = ["ID Histórico", "ID Ativo", "Data Evento", "Status Anterior", "Status Novo", "Localização Anterior", "Localização Nova", "Observação"];
  const linhas = dadosParaExportar.map(h => [
    h.id_Historico_Ativo,
    h.id_Ativo,
    new Date(h.Data_Evento).toLocaleString('pt-BR'),
    h.Status_Anterior,
    h.Status_Novo,
    h.Localizacao_Anterior,
    h.Localizacao_Nova,
    h.Observacao
  ]);

  const dataHora = new Date().toLocaleString('pt-BR').replace(/[/:]/g, '-');
  const nomeArquivo = `relatorio_historico_ativo_${scope}_${dataHora}`;

  if (formato === 'excel') {
    const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico Ativos");
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

// =================== INICIALIZAÇÃO E EVENT LISTENERS ===================
document.addEventListener("DOMContentLoaded", () => {
  configurarEventListeners();
  carregarDadosIniciais();
});

function configurarEventListeners() {
  // Formulários CRUD
  document.getElementById('formCreateHistorico').addEventListener('submit', enviarNovoHistorico);
  document.getElementById('formEditHistorico').addEventListener('submit', salvarEdicao);
  document.getElementById('confirmDeleteBtn').addEventListener('click', () => deletarHistorico(historicoParaExcluirId));

  // Filtros
  document.getElementById('search_input').addEventListener('input', aplicarFiltros);
  document.getElementById('filtro_status').addEventListener('change', aplicarFiltros);
  document.getElementById('limpar_filtros').addEventListener('click', () => {
    document.getElementById('search_input').value = '';
    document.getElementById('filtro_status').value = '';
    aplicarFiltros();
  });

  // Paginação
  document.getElementById("prevBtn").addEventListener("click", () => changePage(currentPage - 1));
  document.getElementById("nextBtn").addEventListener("click", () => changePage(currentPage + 1));
}





/**
 * Preenche os menus de seleção (<select>) de Ativos nos modais.
 * @param {Array} ativos - Lista de ativos vinda da API.
 */
function popularSelectAtivos(ativos) {
  const selectCreate = document.getElementById('id_Ativo');
  const selectUpdate = document.getElementById('id_Ativo_update');

  selectCreate.innerHTML = '<option value="" disabled selected>Selecione um ativo...</option>';
  selectUpdate.innerHTML = '<option value="" disabled selected>Selecione um ativo...</option>';

  if (Array.isArray(ativos)) {
    ativos.forEach(ativo => {
      // ATENÇÃO: Verifique se 'id_Ativo' e 'Nome_Ativo' são os nomes corretos das suas colunas
      const optionHTML = `<option value="${ativo.id_Ativo}">${ativo.id_Ativo} - ${ativo.Nome_Ativo}</option>`;
      selectCreate.innerHTML += optionHTML;
      selectUpdate.innerHTML += optionHTML;
    });
  }
}

// =================== FUNÇÕES CRUD (Create, Read, Update, Delete) ===================

/**
 * READ: Busca todos os registros de histórico e inicia o processo de renderização.
 */
async function carregarDadosIniciais() {
  try {
    const [historicosResponse, ativosResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/historicos_ativos`),
      // ATENÇÃO: Verifique se este é o endpoint correto para buscar todos os ativos
      fetch(`${API_BASE_URL}/ativos`)
    ]);

    if (!historicosResponse.ok || !ativosResponse.ok) {
      throw new Error('Falha ao buscar dados da API.');
    }

    const historicos = await historicosResponse.json();
    const ativos = await ativosResponse.json();

    allHistoricos = Array.isArray(historicos) ? historicos : [];

    // Chama a nova função para popular os selects
    popularSelectAtivos(ativos);

    aplicarFiltros();

  } catch (error) {
    console.error("Erro ao carregar dados iniciais:", error);
    document.getElementById('historicoTableBody').innerHTML = `<tr><td colspan="10" class="text-center text-danger">Erro ao carregar dados. Verifique a API.</td></tr>`;
  }
}

/**
 * CREATE: Envia os dados do formulário para o endpoint de inserção.
 */
async function enviarNovoHistorico(event) {
  event.preventDefault();
  const form = event.target;
  const mensagemErroDiv = document.getElementById('mensagemErroInserir');
  mensagemErroDiv.classList.add('d-none');

  const dados = {
    table: "historico_ativos", // Verifique se o nome da tabela no DB está correto
    database: "sgmi",
    data: {
      id_Ativo: form.id_Ativo.value,
      Data_Evento: form.Data_Evento.value,
      Status_Anterior: form.Status_Anterior.value,
      Status_Novo: form.Status_Novo.value,
      Localizacao_Anterior: form.Localizacao_Anterior.value,
      Localizacao_Nova: form.Localizacao_Nova.value,
      Observacao: form.Observacao.value
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
    await carregarDadosIniciais(); // Recarrega e re-renderiza tudo
  } catch (error) {
    console.error("Erro de conexão ao criar histórico:", error);
    mensagemErroDiv.textContent = error.message;
    mensagemErroDiv.classList.remove('d-none');
  }
}

/**
 * UPDATE: Envia os dados do formulário de edição para o endpoint de atualização.
 */
async function salvarEdicao(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.id_Historico_update.value;
  const mensagemErroDiv = document.getElementById('mensagemErroEditar');
  mensagemErroDiv.classList.add('d-none');

  const payload = {
    id_Ativo: form.id_Ativo_update.value,
    Data_Evento: form.Data_Evento_update.value, // CORRIGIDO
    Status_Anterior: form.Status_Anterior_update.value,
    Status_Novo: form.Status_Novo_update.value,
    Localizacao_Anterior: form.Localizacao_Anterior_update.value,
    Localizacao_Nova: form.Localizacao_Nova_update.value,
    Observacao: form.Observacao_update.value
  };

  try {
    // ATENÇÃO: Verifique este endpoint
    const response = await fetch(`${API_BASE_URL}/historico_ativo/${id}`, {
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

/**
 * DELETE: Deleta um registro após confirmação.
 */
async function deletarHistorico(id) {
  if (id === null) return;
  const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
  try {
    // ATENÇÃO: Verifique este endpoint
    const response = await fetch(`${API_BASE_URL}/historico_ativo/${id}`, {
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
  const statusFiltro = document.getElementById('filtro_status').value;

  if (searchTerm) {
    tempHistoricos = tempHistoricos.filter(h => h.Observacao && h.Observacao.toLowerCase().includes(searchTerm));
  }
  if (statusFiltro) {
    tempHistoricos = tempHistoricos.filter(h => h.Status_Novo === statusFiltro);
  }

  filteredHistoricos = tempHistoricos;
  totalPages = Math.ceil(filteredHistoricos.length / rowsPerPage) || 1;
  createPagination();
  changePage(1); // Sempre volta para a primeira página após filtrar
}

function renderizarTabela() {
  const tbody = document.getElementById('historicoTableBody');
  tbody.innerHTML = "";
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const dadosPagina = filteredHistoricos.slice(start, end);

  if (dadosPagina.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center">Nenhum registro encontrado.</td></tr>`;
    return;
  }

  dadosPagina.forEach(item => {
    const dataFormatada = new Date(item.Data_Evento).toLocaleString('pt-BR');
    const row = `
            <tr>
                <td id="total"></td>
                <td>${item.id_Historico_Ativo}</td>
                <td>${item.id_Ativo}</td>
                <td>${dataFormatada}</td>
                <td>${item.Status_Anterior || 'N/A'}</td>
                <td>${item.Status_Novo}</td>
                <td>${item.Localizacao_Anterior || 'N/A'}</td>
                <td>${item.Localizacao_Nova || 'N/A'}</td>
                <td>${item.Observacao || ''}</td>
                <td id="center">
                    <button class="edit-btn" onclick="abrirModalEdicao(${item.id_Historico_Ativo})">
                        <i class="fa-solid fa-square-pen"></i>
                    </button>
                    <button class="delete-btn" onclick="confirmarExclusao(${item.id_Historico_Ativo})">
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
  const historico = allHistoricos.find(h => h.id_Historico_Ativo === id);
  if (!historico) {
    return console.error("Histórico não encontrado para o ID:", id);
  }
  const form = document.getElementById('formEditHistorico');

  // Garante que TODOS os campos sejam preenchidos
  form.id_Historico_update.value = historico.id_Historico_Ativo;
  form.id_Ativo_update.value = historico.id_Ativo;
  form.Status_Anterior_update.value = historico.Status_Anterior;
  form.Status_Novo_update.value = historico.Status_Novo;
  form.Localizacao_Anterior_update.value = historico.Localizacao_Anterior;
  form.Localizacao_Nova_update.value = historico.Localizacao_Nova;
  form.Observacao_update.value = historico.Observacao;

  // Formata a data corretamente para o input datetime-local
  const data = new Date(historico.Data_Evento);
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset()); // Ajusta fuso horário
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