// ------------------- Variáveis Globais -------------------
let currentPage = 1;
const rowsPerPage = 10;
let allPecas = []; // Armazena todas as peças carregadas do servidor
let filteredPecas = []; // Armazena as peças atualmente filtradas e exibidas
let totalPages = 1;

// ------------------- Funções de Exportação -------------------
function getPecasParaExportar(scope) {
  if (scope === 'tudo') {
    return allPecas;
  } else { // 'pagina'
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredPecas.slice(start, end);
  }
}

function exportar(formato, scope) {
  if (!allPecas || allPecas.length === 0) {
    alert("Nenhuma peça carregada para exportar!");
    return;
  }

  const pecasParaExportar = getPecasParaExportar(scope);
  if (pecasParaExportar.length === 0) {
    alert("Nenhuma peça para exportar no escopo selecionado.");
    return;
  }

  const colunas = ["ID", "Nome", "Descrição", "Valor Uni.", "Fabricante", "Fornecedor", "Estoque", "Número de Série"];
  const linhas = pecasParaExportar.map(p => [
    p.id_Peca,
    p.Nome_Peca,
    p.Descricao,
    p.Valor_Unitario,
    p.Fabricante,
    p.Fornecedor,
    p.Estoque,
    p.Numero_Serie
  ]);

  if (formato === 'excel') {
    const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Peças");
    XLSX.writeFile(workbook, `pecas_${scope}.xlsx`);
  } else if (formato === 'pdf') {
    const {
      jsPDF
    } = window.jspdf;
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

    doc.save(`pecas_${scope}.pdf`);
  }
}

// Inicia o PErfil------------------------------------

// Função para alternar a exibição do menu dropdown
function menuToggle() {
  const toggleMenu = document.querySelector(".menu");
  toggleMenu.classList.toggle("active");
}

// Cadastrar no Console e Banco ----------------------------

document.getElementById('userForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  const name_peca = document.getElementById('name_peca').value;
  const desc_peca = document.getElementById('desc_peca').value;
  const valor_peca = document.getElementById('valor_peca').value;
  const fab_peca = document.getElementById('fab_peca').value;
  const fornecedor_peca = document.getElementById('fornecedor_peca').value;
  const estoque_peca = document.getElementById('estoque_peca').value;
  const numero_serie = document.getElementById('numero').value;

  try {
    await enviarFormulario(name_peca, desc_peca, valor_peca, fab_peca, fornecedor_peca, estoque_peca, numero_serie);
  } catch (error) {
    const mensagemDiv = document.getElementById('mensagemErroInserir');
    mensagemDiv.textContent = 'Erro de conexão com a API: ' + error.message;
    mensagemDiv.classList.remove('d-none');
  }
});


async function enviarFormulario(name_peca, desc_peca, valor_peca, fab_peca, fornecedor_peca, estoque_peca, numero_serie) {
  const dados = {
    table: "pecas",
    data: {
      Nome_Peca: name_peca,
      Descricao: desc_peca,
      Valor_Unitario: valor_peca,
      Fabricante: fab_peca,
      Fornecedor: fornecedor_peca,
      Estoque: estoque_peca,
      Numero_Serie: numero_serie
    },
    database: "sgmi"
  };

  const response = await fetch('http://localhost:5000/insert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dados)
  });

  const data = await response.json();
  const mensagemDiv = document.getElementById('mensagemErroInserir');

  if (!response.ok || !data.inserted_id) {
    if (Array.isArray(data.mensagem)) {
      mensagemDiv.innerHTML = `Erro:<br>${data.mensagem.join('<br>')}`;
    } else {
      mensagemDiv.innerHTML = `Erro: ${data.mensagem || 'Erro desconhecido.'}`;
    }
    mensagemDiv.classList.remove('d-none');
    return;
  }

  mensagemDiv.classList.add('d-none');
  const mensagemSucesso = document.getElementById('mensagemSucesso');
  mensagemSucesso.textContent = 'Peça registrada com sucesso';
  mensagemSucesso.classList.remove('d-none');
  carregarPecas();
  document.getElementById('userForm').reset();
}

document.getElementById('exampleModal').addEventListener('show.bs.modal', function () {
  const mensagemDiv = document.getElementById('mensagemErroInserir');
  mensagemDiv.classList.add('d-none');
  mensagemDiv.textContent = '';
});


// -------------------- Lógica de Exclusão com Modal --------------------
let pecaParaExcluirId = null;

window.confirmarExclusao = function (id) {
  pecaParaExcluirId = id;
  document.getElementById('deletePecaId').textContent = id;
  const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
  deleteModal.show();
};

document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
  if (pecaParaExcluirId !== null) {
    deletarPecas(pecaParaExcluirId);
  }
});

async function deletarPecas(id) {
  const mensagemDiv = document.getElementById('mensagemErro');
  mensagemDiv.classList.add('d-none');
  const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));

  try {
    const response = await fetch(`http://localhost:5000/delete_pecas/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok || !data.affected_rows) {
      mensagemDiv.textContent = `Erro: ${data.mensagem || 'Peça não encontrada ou vinculada a outra tabela.'}`;
      mensagemDiv.classList.remove('d-none');
      return;
    }

    deleteModal.hide();
    const mensagemSucesso = document.getElementById('mensagemSucesso');
    mensagemSucesso.textContent = 'Peça excluída com sucesso!';
    mensagemSucesso.classList.remove('d-none');

    setTimeout(() => {
      mensagemSucesso.classList.add('d-none');
      mensagemSucesso.textContent = '';
    }, 3000);

    carregarPecas();

  } catch (error) {
    console.error("Erro ao excluir peça:", error);
    mensagemDiv.textContent = 'Erro ao excluir o peça: ' + error.message;
    mensagemDiv.classList.remove('d-none');
    deleteModal.hide();
  }
}


// ------------------------- Editar Peças -------------------------
window.abrirModalEdicao = function (button) {
  if (!button) {
    console.error("Botão inválido");
    return;
  }

  const row = button.closest('tr');
  if (!row) {
    console.error("Não encontrou <tr> pai do botão");
    return;
  }

  const idPeca = row.cells[1]?.textContent.trim() || "";
  const nomePeca = row.cells[2]?.textContent.trim() || "";
  const descricao = row.cells[3]?.textContent.trim() || "";
  const valorUnitario = row.cells[4]?.textContent.trim() || "";
  const fabricante = row.cells[5]?.textContent.trim() || "";
  const fornecedor = row.cells[6]?.textContent.trim() || "";
  const estoque = row.cells[7]?.textContent.trim() || "";
  const numero_serie = row.cells[8]?.textContent.trim() || "";

  document.getElementById('id_peca').value = idPeca;
  document.getElementById('name_peca_update').value = nomePeca;
  document.getElementById('desc_peca_update').value = descricao;
  document.getElementById('valor_peca_update').value = valorUnitario;
  document.getElementById('fab_peca_update').value = fabricante;
  document.getElementById('fornecedor_peca_update').value = fornecedor;
  document.getElementById('estoque_peca_update').value = estoque;
  document.getElementById('numero_update').value = numero_serie;

  const modalEl = document.getElementById('exampleModalUpdate');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  } else {
    console.error("Modal não encontrado no DOM");
  }
};

document.getElementById('formularioUpdate').addEventListener('submit', async function (event) {
  event.preventDefault();

  const id_Peca = document.getElementById('id_peca').value;
  const Nome_Peca = document.getElementById('name_peca_update').value;
  const Descricao = document.getElementById('desc_peca_update').value;
  const Valor_Unitario = document.getElementById('valor_peca_update').value;
  const Fabricante = document.getElementById('fab_peca_update').value;
  const Fornecedor = document.getElementById('fornecedor_peca_update').value;
  const Estoque = document.getElementById('estoque_peca_update').value;
  const Numero_Serie = document.getElementById('numero_update').value;

  try {
    await editarPeca(id_Peca, Nome_Peca, Descricao, Valor_Unitario, Fabricante, Fornecedor, Estoque, Numero_Serie);
  } catch (error) {
    const mensagemDiv = document.getElementById('mensagemErroEditar');
    mensagemDiv.textContent = 'Erro ao conectar a API: ' + error.message;
    mensagemDiv.classList.remove('d-none');
  }
});

async function editarPeca(id, nome, descricao, valor, fabricante, fornecedor, estoque, numero_serie) {
  const json = {
    id_Peca: id,
    Nome_Peca: nome,
    Descricao: descricao,
    Valor_Unitario: valor,
    Fabricante: fabricante,
    Fornecedor: fornecedor,
    Estoque: estoque,
    Numero_Serie: numero_serie
  };

  const response = await fetch(`http://localhost:5000/update_peca/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(json)
  });

  const data = await response.json();
  const mensagemDiv = document.getElementById('mensagemErroEditar');


  if (!response.ok || !data.affected_rows) {
    if (Array.isArray(data.mensagem)) {
      mensagemDiv.innerHTML = `Erro:<br>${data.mensagem.join('<br>')}`;
    } else {
      mensagemDiv.innerHTML = `Erro: ${data.mensagem || 'Erro desconhecido.'}`;
    }
    mensagemDiv.classList.remove('d-none');
    return;
  }

  mensagemDiv.classList.add('d-none');

  const mensagemSucesso = document.getElementById('mensagemsucesso');
  mensagemSucesso.textContent = 'Peça atualizada com sucesso';
  mensagemSucesso.classList.remove('d-none');
  carregarPecas();
  document.getElementById('formularioUpdate').reset();

  setTimeout(() => {
    const modal = bootstrap.Modal.getInstance(document.getElementById('exampleModalUpdate'));
    if (modal) modal.hide();
    mensagemSucesso.classList.add('d-none');
    mensagemSucesso.textContent = '';
  }, 3000);
}


// ------------------- Tabela, Paginação e Filtros -------------------

async function carregarPecas() {
  const mensagemDiv = document.getElementById('mensagemErro');
  if (mensagemDiv) mensagemDiv.classList.add('d-none');

  try {
    const response = await fetch('http://localhost:5000/pecas');
    allPecas = await response.json();
    filtrarPecas(); // Aplica todos os filtros de uma vez
  } catch (error) {
    if (mensagemDiv) {
      mensagemDiv.textContent = 'Erro ao carregar peças: ' + error.message;
      mensagemDiv.classList.remove('d-none');
    }
  }
}

function filtrarPecas() {
  let tempPecas = [...allPecas];

  // Filtro por nome
  const searchTerm = document.getElementById('search_input').value.toLowerCase();
  if (searchTerm) {
    tempPecas = tempPecas.filter(peca => peca.Nome_Peca.toLowerCase().includes(searchTerm));
  }

  // Filtro por Estoque (faixa de valores)
  const estoqueMin = parseFloat(document.getElementById('estoque_min').value);
  const estoqueMax = parseFloat(document.getElementById('estoque_max').value);
  if (!isNaN(estoqueMin) || !isNaN(estoqueMax)) {
    tempPecas = tempPecas.filter(peca => {
      const estoque = parseFloat(peca.Estoque);
      const minCondition = isNaN(estoqueMin) || estoque >= estoqueMin;
      const maxCondition = isNaN(estoqueMax) || estoque <= estoqueMax;
      return minCondition && maxCondition;
    });
  }

  // Atualiza a lista filtrada e renderiza a tabela
  filteredPecas = tempPecas;
  totalPages = Math.ceil(filteredPecas.length / rowsPerPage);
  createPagination();
  changePage(1);
}

function renderTableRows() {
  const tbody = document.getElementById('pecaTableBody');
  tbody.innerHTML = "";
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const dadosPagina = filteredPecas.slice(start, end);

  dadosPagina.forEach(peca => {
    const row = document.createElement('tr');
    row.innerHTML = `
            <td id="total"></td>
            <td>${peca.id_Peca}</td>
            <td>${peca.Nome_Peca}</td>
            <td>${peca.Descricao}</td>
            <td>${peca.Valor_Unitario}</td>
            <td>${peca.Fabricante}</td>
            <td>${peca.Fornecedor}</td>
            <td>${peca.Estoque}</td>
            <td>${peca.Numero_Serie}</td>
            <td id="center">
                <button class="delete-btn" onclick="confirmarExclusao(${peca.id_Peca})">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
                <button class="edit-btn" onclick="abrirModalEdicao(this)">
                    <i class="fa-solid fa-square-pen"></i>
                </button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

let changing = false;
function changePage(pageNumber) {
  if (changing) return;
  changing = true;

  if (pageNumber < 1 || pageNumber > totalPages) {
    changing = false;
    return;
  }

  currentPage = pageNumber;
  renderTableRows();

  document.getElementById("content").innerText = "Página " + currentPage;
  document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
  const currentLine = document.getElementById("line" + currentPage);
  if (currentLine) {
    currentLine.classList.add("active-line");
  }

  document.getElementById("prevBtn").disabled = (currentPage === 1);
  document.getElementById("nextBtn").disabled = (currentPage === totalPages);

  setTimeout(() => changing = false, 200);
}

function createPagination() {
  const paginationContainer = document.getElementById("paginationLines");
  paginationContainer.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.innerHTML = `<hr class="page-line" id="line${i}">`;
    btn.addEventListener("click", () => {
      changePage(i);
    });
    paginationContainer.appendChild(btn);
  }
}

function fecharDropdown(dropdownId) {
  const dropdownToggle = document.getElementById(dropdownId);
  const dropdownInstance = bootstrap.Dropdown.getOrCreateInstance(dropdownToggle);
  dropdownInstance.hide();
}

// ------------------------- EXECUTAR AO INICIAR -------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Event Listeners para a paginação
  document.getElementById("prevBtn").addEventListener("click", () => changePage(currentPage - 1));
  document.getElementById("nextBtn").addEventListener("click", () => changePage(currentPage + 1));

  // Event Listeners para os filtros e pesquisa
  document.getElementById('aplicar_filtros').addEventListener('click', (event) => {
    filtrarPecas();
    fecharDropdown('filterDropdown');
  });

  document.getElementById('limpar_filtros').addEventListener('click', () => {
    document.getElementById('search_input').value = '';
    document.getElementById('estoque_min').value = '';
    document.getElementById('estoque_max').value = '';
    filtrarPecas();
    fecharDropdown('filterDropdown');
  });

  // Carrega as peças ao iniciar
  carregarPecas();
});