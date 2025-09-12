// ------------------- Variáveis Globais -------------------
let currentPage = 1;
const rowsPerPage = 10;
let allAtivos = []; // Array que guarda a lista COMPLETA de máquinas vinda da API
let ativos = []; // Array que guarda a lista FILTRADA que será exibida na tela
let totalPages = 1;
let ativoParaExcluirId = null; // Guarda o ID do ativo para o modal de exclusão
let statusSelecionado = null; // Guarda o status selecionado no filtro

// ------------------- Funções de Exportação (CORRIGIDO) -------------------
function getAtivosParaExportar(scope) {
  if (scope === 'tudo') {
    // Para exportar tudo, usamos a lista principal ANTES de ser paginada
    return ativos;
  } else { // 'pagina'
    // Para exportar a página, usamos a função que você já tinha
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return ativos.slice(start, end);
  }
}

function exportar(formato, scope) {
  if (!ativos || ativos.length === 0) {
    alert("Nenhuma máquina na tabela para exportar!");
    return;
  }

  const ativosParaExportar = getAtivosParaExportar(scope);
  if (ativosParaExportar.length === 0) {
    alert("Nenhuma máquina para exportar no escopo selecionado.");
    return;
  }

  const colunas = ["ID", "Nome", "Descrição", "Fabricante", "Modelo", "Número de Série", "Data de Aquisição", "Localização", "Status"];
  const linhas = ativosParaExportar.map(a => [
    a.id_Ativo,
    a.Nome_Ativo,
    a.Descricao,
    a.Fabricante,
    a.Modelo,
    a.Numero_Serie,
    new Date(a.Data_Aquisicao).toLocaleDateString('pt-BR'),
    a.Localizacao,
    a.Status
  ]);

  if (formato === 'excel') {
    const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ativos");
    XLSX.writeFile(workbook, `maquinas_${scope}.xlsx`);

  } else if (formato === 'pdf') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("l", "pt", "a4");

    doc.autoTable({
      head: [colunas],
      body: linhas,
      styles: {
        fontSize: 8,
        cellPadding: 4
      },
      headStyles: {
        fillColor: [52, 58, 64],
        textColor: 255,
        halign: "center"
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      }
    });
    doc.save(`maquinas_${scope}.pdf`);
  }
}

// ------------------- Funções de Formulário e CRUD -------------------

// Cadastrar no Console e Banco
document.getElementById('formulario').addEventListener('submit', async function (event) {
  event.preventDefault();
  const nome_ativo = document.getElementById('nome').value;
  const descricao = document.getElementById('descricao').value;
  const fabricante = document.getElementById('fabricante').value;
  const modelo = document.getElementById('modelo').value;
  const numero_serie = document.getElementById('numero').value;
  const data_aquisicao = document.getElementById('data').value;
  const localizacao = document.getElementById('local').value;
  const status = document.getElementById('status').value;
  const fotoInput = document.getElementById('foto_ativo');
  const imagem = fotoInput.files[0];

  if (!nome_ativo || !descricao || !fabricante || !status || !modelo || !localizacao || !data_aquisicao) {
    alert('Todos os campos são obrigatórios. Por favor, preencha todos.');
    return;
  }
  if (!imagem) {
    alert('Por favor, selecione uma imagem para o ativo.');
    return;
  }
  try {
    await enviarFormulario(nome_ativo, descricao, fabricante, modelo, numero_serie, data_aquisicao, localizacao, status, imagem);
  } catch (error) {
    const mensagemDiv = document.getElementById('mensagemErroInserir');
    mensagemDiv.textContent = 'Erro de conexão com a API: ' + error.message;
    mensagemDiv.classList.remove('d-none');
  }
});

async function enviarFormulario(nome_ativo, descricao, fabricante, modelo, numero_serie, data_aquisicao, localizacao, status, imagem) {
  const formData = new FormData();
  formData.append("table", "ativos");
  formData.append("database", "sgmi");
  formData.append("Nome_Ativo", nome_ativo);
  formData.append("Descricao", descricao);
  formData.append("Fabricante", fabricante);
  formData.append("Modelo", modelo);
  formData.append("Numero_Serie", numero_serie);
  formData.append("Data_Aquisicao", data_aquisicao);
  formData.append("Localizacao", localizacao);
  formData.append("Status", status);
  formData.append("Imagem", imagem);

  const response = await fetch('http://localhost:5000/insert', { method: 'POST', body: formData });
  const data = await response.json();
  const mensagemDiv = document.getElementById('mensagemErroInserir');

  if (!response.ok || !data.inserted_id) {
    mensagemDiv.innerHTML = Array.isArray(data.mensagem) ? `Erro:<br>${data.mensagem.join('<br>')}` : `Erro: ${data.mensagem || 'Erro desconhecido.'}`;
    mensagemDiv.classList.remove('d-none');
    return;
  }
  mensagemDiv.classList.add('d-none');
  const mensagemSucesso = document.getElementById('mensagemSucesso');
  mensagemSucesso.textContent = 'Máquina registrada com sucesso';
  mensagemSucesso.classList.remove('d-none');
  await carregarAtivos(); // Recarrega a lista principal e atualiza a tela
  document.getElementById('formulario').reset();
  setTimeout(() => { mensagemSucesso.classList.add('d-none'); }, 3000);
}

// Deletar Ativo: Função chamada pelo botão na tabela. Agora ela abre o modal.
window.deletarAtivos = function (id) {
  const ativo = allAtivos.find(a => a.id_Ativo === id);
  if (!ativo) {
    console.error("Ativo não encontrado para exclusão.");
    return;
  }
  ativoParaExcluirId = id; // Guarda o ID na variável global
  document.getElementById('deleteMaquinaName').textContent = ativo.Nome_Ativo; // Põe o nome da máquina no modal
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
  deleteModal.show();
};

// Nova função para ser chamada pelo botão de confirmação do modal
async function executarExclusao() {
  if (!ativoParaExcluirId) return;

  const mensagemDiv = document.getElementById('mensagemErro');
  mensagemDiv.classList.add('d-none');

  try {
    const response = await fetch(`http://localhost:5000/delete_ativo/${ativoParaExcluirId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok || !data.affected_rows) {
      mensagemDiv.textContent = `Erro: ${data.mensagem || 'Ativo Não Encontrado ou Vinculado a Outra Tabela.'}`;
      mensagemDiv.classList.remove('d-none');
      return;
    }
    await carregarAtivos(); // Recarrega a lista e atualiza a tela
  } catch (error) {
    console.error("Erro ao excluir Ativo:", error);
    mensagemDiv.textContent = 'Erro ao excluir o Ativo: ' + error.message;
    mensagemDiv.classList.remove('d-none');
  } finally {
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    if (deleteModal) deleteModal.hide();
    ativoParaExcluirId = null;
  }
}

// Editar Ativo
window.abrirModalEdicao = function (button) {
  const row = button.closest('tr');
  const ativoId = parseInt(row.cells[1].innerText.trim(), 10);
  const ativo = allAtivos.find(a => a.id_Ativo === ativoId); // Busca na lista principal

  if (!ativo) {
    console.error("Ativo não encontrado para edição.");
    return;
  }
  function converterDataParaInput(dataBR) {
    if (!dataBR) return "";
    const partes = dataBR.split('/');
    if (partes.length !== 3) return "";
    return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
  }
  const dataFormatada = converterDataParaInput(new Date(ativo.Data_Aquisicao).toLocaleDateString('pt-BR'));
  document.getElementById('id_ativo').value = ativo.id_Ativo;
  document.getElementById('nome_update').value = ativo.Nome_Ativo;
  document.getElementById('descricao_update').value = ativo.Descricao;
  document.getElementById('fabricante_update').value = ativo.Fabricante;
  document.getElementById('modelo_update').value = ativo.Modelo;
  document.getElementById('numero_update').value = ativo.Numero_Serie;
  document.getElementById('data_update').value = dataFormatada;
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

document.getElementById('formularioAtualizar').addEventListener('submit', async function (event) {
  event.preventDefault();
  const id_Ativo = document.getElementById('id_ativo').value;
  const Nome_Ativo = document.getElementById('nome_update').value;
  const Descricao = document.getElementById('descricao_update').value;
  const Fabricante = document.getElementById('fabricante_update').value;
  const Modelo = document.getElementById('modelo_update').value;
  const Numero = document.getElementById('numero_update').value;
  const date = document.getElementById('data_update').value;
  const Local = document.getElementById('local_update').value;
  const Status = document.getElementById('status_update').value;
  const fotoInputUpdate = document.getElementById('foto_ativo_update');
  const imagem = fotoInputUpdate.files[0];
  try {
    await editarAtivo(id_Ativo, Nome_Ativo, Descricao, Fabricante, Modelo, Numero, date, Local, Status, imagem);
  } catch (error) {
    const mensagemDiv = document.getElementById('mensagemErroEditar');
    mensagemDiv.textContent = 'Erro ao conectar a API: ' + error.message;
    mensagemDiv.classList.remove('d-none');
  }
});

async function editarAtivo(id, nome, desc, fabri, modelo, numero, date, local, status, imagem) {
  const formData = new FormData();
  formData.append("id_Ativo", id);
  formData.append("Nome_Ativo", nome);
  formData.append("Descricao", desc);
  formData.append("Fabricante", fabri);
  formData.append("Modelo", modelo);
  formData.append("Numero_Serie", numero);
  formData.append("Data_Aquisicao", date);
  formData.append("Localizacao", local);
  formData.append("Status", status);
  if (imagem) { formData.append("Imagem", imagem); }

  const response = await fetch(`http://localhost:5000/update_ativo/${id}`, { method: 'PUT', body: formData });
  const data = await response.json();
  const mensagemDiv = document.getElementById('mensagemErroEditar');

  if (!response.ok || !data.affected_rows) {
    mensagemDiv.innerHTML = Array.isArray(data.mensagem) ? `Erro:<br>${data.mensagem.join('<br>')}` : `Erro: ${data.mensagem || 'Erro desconhecido.'}`;
    mensagemDiv.classList.remove('d-none');
    return;
  }
  mensagemDiv.classList.add('d-none');
  const mensagemSucesso = document.getElementById('mensagemsucesso');
  mensagemSucesso.textContent = 'Máquina atualizada com sucesso';
  mensagemSucesso.classList.remove('d-none');
  await carregarAtivos();
  document.getElementById('formularioAtualizar').reset();
  setTimeout(() => {
    const modal = bootstrap.Modal.getInstance(document.getElementById('exampleModalAtualizar'));
    if (modal) modal.hide();
    mensagemSucesso.textContent = '';
    mensagemSucesso.classList.add('d-none');
  }, 3000);
}

// ------------------ Funções de Imagem, Paginação e Tabela --------------------------
function abrirModalImagem(idAtivo) {
  const ativoEncontrado = allAtivos.find(ativo => ativo.id_Ativo === idAtivo);
  if (!ativoEncontrado || !ativoEncontrado.Imagem) {
    alert("Este ativo não possui imagem.");
    return;
  }
  document.getElementById('imagemAtivoModal').src = `data:image/jpeg;base64,${ativoEncontrado.Imagem}`;
  document.getElementById('imagemModal').style.display = 'block';
}

function fecharModalImagem() {
  document.getElementById('imagemModal').style.display = 'none';
  document.getElementById('imagemAtivoModal').src = '';
}

async function carregarAtivos() {
  const mensagemDiv = document.getElementById('mensagemErro');
  if (mensagemDiv) mensagemDiv.classList.add('d-none');
  try {
    const response = await fetch('http://localhost:5000/ativos');
    allAtivos = await response.json();
    aplicarFiltros(); // Chama a função central para filtrar e renderizar a tabela
  } catch (error) {
    if (mensagemDiv) {
      mensagemDiv.textContent = 'Erro ao carregar Ativos: ' + error.message;
      mensagemDiv.classList.remove('d-none');
    }
  }
}

function renderTableRows() {
  const tbody = document.getElementById('ativoTableBody');
  tbody.innerHTML = "";
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const dadosPagina = ativos.slice(start, end);

  dadosPagina.forEach(ativo => {
    const row = document.createElement('tr');
    const safeNomeAtivo = ativo.Nome_Ativo.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    row.innerHTML = `
            <td id="total"></td>
            <td>${ativo.id_Ativo}</td>
            <td>${ativo.Nome_Ativo}</td>
            <td>${ativo.Descricao}</td>
            <td>${ativo.Fabricante}</td>
            <td>${ativo.Modelo}</td>
            <td>${ativo.Numero_Serie}</td>
            <td>${new Date(ativo.Data_Aquisicao).toLocaleDateString('pt-BR')}</td>
            <td>${ativo.Localizacao}</td>
            <td>${ativo.Status}</td>
            <td id="imagemColuna">
                <button id="viewImageBtn" onclick="abrirModalImagem(${ativo.id_Ativo})"><i class="fa-solid fa-image"></i></button>
            </td>
            <td id="center">
                <button id="deleteBtn" onclick="deletarAtivos(${ativo.id_Ativo})"><i class="fa-solid fa-trash-can"></i></button>
                <button id="editBtn" onclick="abrirModalEdicao(this)"><i class="fa-solid fa-square-pen"></i></button>
                <button id="sensorBtn" onclick="mostrarSensoresDoAtivo(${ativo.id_Ativo})"><i class="fa-solid fa-microchip"></i></button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function changePage(pageNumber) {
  if (pageNumber < 1 || pageNumber > totalPages) return;
  currentPage = pageNumber;
  renderTableRows();
  document.getElementById("content").innerText = "Page " + currentPage;
  document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
  const currentLine = document.getElementById("line" + currentPage);
  if (currentLine) currentLine.classList.add("active-line");
  document.getElementById("prevBtn").disabled = (currentPage === 1);
  document.getElementById("nextBtn").disabled = (currentPage === totalPages);
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

// ------------------------- Lógica de Filtros -------------------------
// Função central que aplica TODOS os filtros e atualiza a tabela
function aplicarFiltros() {
  let tempAtivos = [...allAtivos];

  // 1. Filtro por NOME
  const searchTerm = document.getElementById('search_input').value.toLowerCase();
  if (searchTerm) {
    tempAtivos = tempAtivos.filter(ativo => ativo.Nome_Ativo.toLowerCase().includes(searchTerm));
  }

  // 2. Filtro por STATUS
  if (statusSelecionado) {
    tempAtivos = tempAtivos.filter(ativo => ativo.Status.toLowerCase() === statusSelecionado.toLowerCase());
  }

  ativos = tempAtivos; // Atualiza a lista de exibição
  totalPages = Math.ceil(ativos.length / rowsPerPage) || 1;
  changePage(1); // Volta para a primeira página dos resultados
}

// Função chamada pelo onclick dos botões de status
function filtrarPorStatus(status) {
  statusSelecionado = status; // Apenas atualiza a variável global
  aplicarFiltros(); // E chama a função central
}

function fecharDropdown() {
  const dropdownToggle = document.getElementById('filterDropdown');
  const dropdownInstance = bootstrap.Dropdown.getOrCreateInstance(dropdownToggle);
  if (dropdownInstance) dropdownInstance.hide();
}

// ------------------------- Funções Auxiliares e Inicialização -------------------------
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
        tbody.innerHTML += `<tr><th>ID Sensor</th><td>${sensor.id_Sensor || 'N/A'}</td></tr>`;
        tbody.innerHTML += `<tr><th>Nome</th><td>${sensor.Nome_Sensor || 'N/A'}</td></tr>`;
        tbody.innerHTML += `<tr><th>Tipo</th><td>${sensor.Tipo || 'N/A'}</td></tr>`;
        tbody.innerHTML += `<tr><th>Status</th><td>${sensor.Status || 'N/A'}</td></tr>`;
        tbody.innerHTML += `<tr><td colspan="2"><hr></td></tr>`;
      });
    }
    new bootstrap.Modal(document.getElementById('sensorModal')).show();
  } catch (error) {
    console.error("Erro ao carregar sensores:", error);
    alert('Erro ao carregar dados dos sensores.');
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // Carga inicial dos dados
  carregarAtivos();

  // Conecta o botão de confirmação do modal de exclusão à sua função
  document.getElementById('confirmDeleteBtn').addEventListener('click', executarExclusao);

  // Conecta os botões do dropdown de filtro
  document.getElementById('aplicar_filtros').addEventListener('click', () => {
    aplicarFiltros();
    fecharDropdown();
  });

  document.getElementById('limpar_filtros').addEventListener('click', () => {
    document.getElementById('search_input').value = ''; // Limpa o campo de nome
    statusSelecionado = null; // Limpa o filtro de status
    aplicarFiltros();
    fecharDropdown();
  });

  // Funções de preview de imagem
  const inputFotoCadastro = document.getElementById("foto_ativo");
  const previewFotoCadastro = document.getElementById("foto_ativo_preview");
  if (inputFotoCadastro && previewFotoCadastro) {
    inputFotoCadastro.addEventListener("change", function () {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          previewFotoCadastro.src = e.target.result;
          previewFotoCadastro.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        previewFotoCadastro.style.display = 'none';
      }
    });
  }
  const inputFotoUpdate = document.getElementById("foto_ativo_update");
  const previewFotoUpdate = document.getElementById("foto_ativo_preview_update");
  if (inputFotoUpdate && previewFotoUpdate) {
    inputFotoUpdate.addEventListener("change", function () {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          previewFotoUpdate.src = e.target.result;
          previewFotoUpdate.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        previewFotoUpdate.style.display = 'none';
      }
    });
  }

  // Fechar modal de imagem clicando fora
  window.onclick = function (event) {
    const imagemModal = document.getElementById('imagemModal');
    if (event.target === imagemModal) {
      fecharModalImagem();
    }
  };
});