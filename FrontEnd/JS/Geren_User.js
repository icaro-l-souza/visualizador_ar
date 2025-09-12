// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let allFuncionarios = []; // Guarda TODOS os funcionários carregados da API (cache)
let filteredFuncionarios = []; // Guarda os funcionários após aplicar os filtros
let funcionarioParaDeletar = { id: null, nome: null }; // Guarda dados para o modal de exclusão
let currentPage = 1;
const rowsPerPage = 10;

// =================== FUNÇÕES GLOBAIS (ACESSÍVEIS PELO HTML VIA ONCLICK) ===================

/**
 * Abre o modal de edição e preenche com os dados do funcionário.
 */
window.abrirModalEditarfuncionario = function (button) {
  const row = button.closest('tr');
  if (!row) return;

  const id = parseInt(row.cells[1].innerText, 10);
  const funcionario = allFuncionarios.find(f => f.id_Cadastro === id);

  if (!funcionario) {
    console.error("Funcionário não encontrado para edição.");
    alert("Erro: Funcionário não encontrado.");
    return;
  }

  document.getElementById('id_usuario').value = funcionario.id_Cadastro;
  document.getElementById('nome_usuario').value = funcionario.Nome;
  document.getElementById('email_usuario').value = funcionario.Email;
  // Preenche a senha, como no seu código original
  document.getElementById('senha_usuario').value = funcionario.Senha;
  document.getElementById('senha_usuario').placeholder = "Deixe em branco para não alterar";
  document.getElementById('login_usuario').value = funcionario.Login;
  document.getElementById('telefone_usuario').value = funcionario.Telefone;
  document.getElementById('cep_usuario').value = funcionario.CEP;
  document.getElementById('cidade_usuario').value = funcionario.Cidade || '';
  document.getElementById('bairro_usuario').value = funcionario.Bairro || '';
  document.getElementById('rua_usuario').value = funcionario.Rua || '';
  document.getElementById('numero_usuario').value = funcionario.Numero;
  document.getElementById('complemento_usuario').value = funcionario.Complemento || '';
  document.getElementById('sexo_usuario').value = funcionario.Sexo;
  document.getElementById('cpf_usuario').value = funcionario.CPF;
  document.getElementById('data_nascimento_usuario').value = converterDataParaInput(funcionario.Data_Nascimento);
  document.getElementById('data_admissao_usuario').value = converterDataParaInput(funcionario.Data_Admissao);
  document.getElementById('tipo_usuario').value = funcionario.Tipo_Usuario;
  document.getElementById('cargo_usuario').value = funcionario.Cargo;
  document.getElementById('departamento_usuario').value = funcionario.Departamento;

  const fotoPreview = document.getElementById('foto_usuario_preview');
  if (funcionario.Foto_Usuario) {
    fotoPreview.src = `data:image/jpeg;base64,${funcionario.Foto_Usuario}`;
    fotoPreview.style.display = 'block';
  } else {
    fotoPreview.style.display = 'none';
  }

  const modal = new bootstrap.Modal(document.getElementById('usuarioModal'));
  modal.show();
};


/**
 * Abre o modal de confirmação para deletar um funcionário.
 */
window.abrirModalDeletar = function (id, nome) {
  funcionarioParaDeletar = { id, nome };
  document.getElementById('deleteUserName').textContent = nome;
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

/**
 * Exporta os dados da tabela para Excel ou PDF.
 */
window.exportar = function (formato, escopo) {
  const dadosParaExportar = escopo === 'tudo' ? filteredFuncionarios : filteredFuncionarios.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (dadosParaExportar.length === 0) {
    alert("Nenhum dado para exportar.");
    return;
  }

  const colunas = ["ID", "Nome", "Email", "Login", "Telefone", "CEP", "CPF", "Tipo", "Cargo", "Departamento"];
  const linhas = dadosParaExportar.map(f => [
    f.id_Cadastro, f.Nome, f.Email, f.Login, f.Telefone, f.CEP, f.CPF, f.Tipo_Usuario, f.Cargo, f.Departamento
  ]);

  if (formato === 'excel') {
    const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Funcionários");
    XLSX.writeFile(workbook, `funcionarios_${escopo}.xlsx`);
  } else if (formato === 'pdf') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.autoTable({
      head: [colunas],
      body: linhas,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [52, 58, 64] }
    });
    doc.save(`funcionarios_${escopo}.pdf`);
  }
}

/**
 * Abre o modal para visualizar a imagem do funcionário.
 */
window.abrirModalImagem = function (idUsuario) {
  const usuario = allFuncionarios.find(f => f.id_Cadastro === idUsuario);
  if (!usuario || !usuario.Foto_Usuario) {
    alert("Este funcionário não possui imagem.");
    return;
  }
  document.getElementById('imagemUsuarioModal').src = `data:image/jpeg;base64,${usuario.Foto_Usuario}`;
  document.getElementById('imagemModal').style.display = 'block';
}

/**
 * Fecha o modal de imagem.
 */
window.fecharModalImagem = function () {
  document.getElementById('imagemModal').style.display = 'none';
}

/**
 * Alterna a visibilidade da senha no modal de edição.
 */
window.mostrarSenha = function () {
  const inputPass = document.getElementById('senha_usuario');
  const btnShowPass = document.getElementById('btn-senha');
  if (inputPass.type === 'password') {
    inputPass.setAttribute('type', 'text');
    btnShowPass.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    inputPass.setAttribute('type', 'password');
    btnShowPass.classList.replace('fa-eye-slash', 'fa-eye');
  }
}


// =================== FUNÇÕES DE LÓGICA INTERNA ===================

/**
 * Carrega todos os funcionários da API e inicia a renderização.
 */
async function carregarFuncionarios() {
  const mensagemDiv = document.getElementById('mensagemErroGeral');
  if (mensagemDiv) mensagemDiv.classList.add('d-none');
  try {
    const response = await fetch('http://localhost:5000/usuario');
    allFuncionarios = await response.json();
    aplicarFiltrosERenderizar();
  } catch (error) {
    console.error("Erro ao carregar funcionários:", error);
    if (mensagemDiv) {
      mensagemDiv.textContent = 'Erro ao carregar funcionários: ' + error.message;
      mensagemDiv.classList.remove('d-none');
    }
  }
}

/**
 * Deleta o funcionário selecionado após confirmação.
 */
async function deletarFuncionarioConfirmado() {
  const { id } = funcionarioParaDeletar;
  if (!id) return;

  const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
  const mensagemDiv = document.getElementById('mensagemErroGeral');
  if (mensagemDiv) mensagemDiv.classList.add('d-none');

  try {
    const response = await fetch(`http://localhost:5000/delete_usuario/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok || !data.affected_rows) {
      throw new Error(data.mensagem || 'Funcionário não encontrado ou já deletado.');
    }
    alert("Funcionário excluído com sucesso!");
    await carregarFuncionarios();
  } catch (error) {
    console.error("Erro ao excluir funcionário:", error);
    if (mensagemDiv) {
      mensagemDiv.textContent = error.message;
      mensagemDiv.classList.remove('d-none');
    }
  } finally {
    modal.hide();
    funcionarioParaDeletar = { id: null, nome: null };
  }
}


/**
 * Filtra a lista de funcionários e chama as funções de renderização.
 */
function aplicarFiltrosERenderizar() {
  const filtroNome = document.getElementById('filtroNomeInput').value.trim().toLowerCase();
  const filtroCargo = document.getElementById('filtroCargoInput').value.trim().toLowerCase();
  const filtroDepto = document.getElementById('filtroDepartamentoInput').value.trim().toLowerCase();
  const filtroTipo = document.querySelector('.list-group-item.active')?.textContent || null;

  filteredFuncionarios = allFuncionarios.filter(f => {
    const nomeOk = !filtroNome || f.Nome?.toLowerCase().includes(filtroNome);
    const cargoOk = !filtroCargo || f.Cargo?.toLowerCase().includes(filtroCargo);
    const deptoOk = !filtroDepto || f.Departamento?.toLowerCase().includes(filtroDepto);
    const tipoOk = !filtroTipo || (filtroTipo && f.Tipo_Usuario === filtroTipo.trim());
    return nomeOk && cargoOk && deptoOk && tipoOk;
  });

  currentPage = 1;
  renderTableRows();
  createPagination();
}

/**
 * Renderiza as linhas da tabela na página.
 */
function renderTableRows() {
  const tbody = document.getElementById('funcionarioTableBody');
  tbody.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const dadosPagina = filteredFuncionarios.slice(start, end);

  if (dadosPagina.length === 0) {
    tbody.innerHTML = `<tr><td colspan="19" class="text-center">Nenhum funcionário encontrado.</td></tr>`;
    return;
  }

  dadosPagina.forEach(f => {
    const row = document.createElement('tr');
    // Mantendo a coluna Senha e a estrutura original, como solicitado.
    row.innerHTML = `
            <td id="vanechline"></td>
            <td>${f.id_Cadastro}</td>
            <td>${f.Nome}</td>
            <td>${f.Email}</td>
            <td class="col-senha">${f.Senha}</td> 
            <td>${f.Login}</td>
            <td>${f.Telefone}</td>
            <td>${f.CEP}</td>
            <td>${f.Numero}</td>
            <td>${f.Complemento || ''}</td>
            <td>${f.Sexo}</td>
            <td>${f.CPF}</td>
            <td>${converterDataParaBR(f.Data_Nascimento)}</td>
            <td>${f.Tipo_Usuario}</td>
            <td>${f.Cargo}</td>
            <td>${f.Departamento}</td>
            <td>${converterDataParaBR(f.Data_Admissao)}</td>
            <td class="imagem-coluna">
                <button id="viewImagebtn" onclick="abrirModalImagem(${f.id_Cadastro})">
                    <i class="fa-solid fa-image" id="viewImagebtn"></i>
                </button>
            </td>
            <td class="center">
                <button id="deleteBtn" onclick="abrirModalDeletar(${f.id_Cadastro}, '${f.Nome}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
                <button id="editBtn" onclick="abrirModalEditarfuncionario(this)">
                    <i class="fa-solid fa-square-pen"></i>
                </button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

// =================== FUNÇÕES DE PAGINAÇÃO E UTILITÁRIOS ===================

function createPagination() {
  const paginationContainer = document.getElementById("paginationLines");
  const totalPages = Math.ceil(filteredFuncionarios.length / rowsPerPage);
  paginationContainer.innerHTML = "";
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.innerHTML = `<hr class="page-line" id="line${i}">`;
    btn.onclick = () => changePage(i);
    paginationContainer.appendChild(btn);
  }
  if (totalPages > 0) {
    changePage(1);
  } else {
    document.getElementById("prevBtn").disabled = true;
    document.getElementById("nextBtn").disabled = true;
  }
}

function changePage(pageNumber) {
  const totalPages = Math.ceil(filteredFuncionarios.length / rowsPerPage);
  if (pageNumber < 1 || pageNumber > totalPages) return;

  currentPage = pageNumber;
  renderTableRows();

  document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
  const activeLine = document.getElementById("line" + currentPage);
  if (activeLine) activeLine.classList.add("active-line");

  document.getElementById("prevBtn").disabled = (currentPage === 1);
  document.getElementById("nextBtn").disabled = (currentPage === totalPages);
}

function converterDataParaInput(valor) {
  if (!valor) return '';
  try {
    return new Date(valor).toISOString().slice(0, 10);
  } catch (e) {
    return '';
  }
}

function converterDataParaBR(valor) {
  if (!valor) return '';
  try {
    const data = new Date(valor);
    return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch (e) {
    return '';
  }
}

// =================== INICIALIZAÇÃO E EVENT LISTENERS ===================

document.addEventListener("DOMContentLoaded", () => {
  // Carregamento inicial dos dados
  carregarFuncionarios();

  // Listeners da Paginação
  document.getElementById("prevBtn").addEventListener("click", () => changePage(currentPage - 1));
  document.getElementById("nextBtn").addEventListener("click", () => changePage(currentPage + 1));

  // Listeners dos Filtros
  document.getElementById('aplicar_filtros').addEventListener('click', () => {
    aplicarFiltrosERenderizar();
    bootstrap.Dropdown.getInstance(document.getElementById('filterDropdown')).hide();
  });

  document.getElementById('limpar_filtros').addEventListener('click', () => {
    document.getElementById('filtroNomeInput').value = '';
    document.getElementById('filtroCargoInput').value = '';
    document.getElementById('filtroDepartamentoInput').value = '';
    document.querySelectorAll('.list-group-item.active').forEach(b => b.classList.remove('active'));
    aplicarFiltrosERenderizar();
    bootstrap.Dropdown.getInstance(document.getElementById('filterDropdown')).hide();
  });

  document.querySelectorAll('.filter-dropdown .list-group-item-action').forEach(btn => {
    btn.addEventListener('click', function () {
      // Se o botão clicado já está ativo, desativa (limpa o filtro de tipo)
      if (this.classList.contains('active')) {
        this.classList.remove('active');
      } else {
        // Remove a classe 'active' de todos e adiciona apenas no clicado
        document.querySelectorAll('.filter-dropdown .list-group-item-action').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      }
      // Aplica os filtros imediatamente ao clicar no tipo de conta
      aplicarFiltrosERenderizar();
    });
  });

  // Listener do Modal de Exclusão
  document.getElementById('confirmDeleteBtn').addEventListener('click', deletarFuncionarioConfirmado);

  // Listener do Modal de Edição (Submit do Formulário)
  document.getElementById('formularioUsuario').addEventListener('submit', async function (event) {
    event.preventDefault();

    // Usar FormData é ideal para lidar com arquivos (fotos)
    const formData = new FormData();
    formData.append("Id_Cadastro", document.getElementById('id_usuario').value);
    formData.append("Nome", document.getElementById('nome_usuario').value);
    formData.append("Email", document.getElementById('email_usuario').value);
    formData.append("Senha", document.getElementById('senha_usuario').value);
    formData.append("Login", document.getElementById('login_usuario').value);
    formData.append("Telefone", document.getElementById('telefone_usuario').value);
    formData.append("CEP", document.getElementById('cep_usuario').value);
    formData.append("Cidade", document.getElementById('cidade_usuario').value);
    formData.append("Bairro", document.getElementById('bairro_usuario').value);
    formData.append("Rua", document.getElementById('rua_usuario').value);
    formData.append("Numero", document.getElementById('numero_usuario').value);
    formData.append("Complemento", document.getElementById('complemento_usuario').value);
    formData.append("Sexo", document.getElementById('sexo_usuario').value);
    formData.append("CPF", document.getElementById('cpf_usuario').value);
    formData.append("Data_Nascimento", document.getElementById('data_nascimento_usuario').value);
    formData.append("Tipo_Usuario", document.getElementById('tipo_usuario').value);
    formData.append("Cargo", document.getElementById('cargo_usuario').value);
    formData.append("Departamento", document.getElementById('departamento_usuario').value);
    formData.append("Data_Admissao", document.getElementById('data_admissao_usuario').value);

    const fotoInput = document.getElementById('foto_usuario');
    if (fotoInput.files && fotoInput.files[0]) {
      formData.append("Foto_Usuario", fotoInput.files[0]);
    }

    const mensagemSucesso = document.getElementById('mensagemsucesso');
    const mensagemErro = document.getElementById('mensagemErroEditar');
    mensagemSucesso.classList.add('d-none');
    mensagemErro.classList.add('d-none');

    try {
      const response = await fetch(`http://localhost:5000/update_usuario/${formData.get('Id_Cadastro')}`, {
        method: 'PUT',
        body: formData
      });
      const data = await response.json();
      if (!response.ok || !data.affected_rows) throw new Error(data.mensagem || 'Erro desconhecido');

      mensagemSucesso.textContent = 'Usuário atualizado com sucesso';
      mensagemSucesso.classList.remove('d-none');
      await carregarFuncionarios();

      setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('usuarioModal'));
        if (modal) modal.hide();
        mensagemSucesso.classList.add('d-none');
      }, 2000);

    } catch (error) {
      mensagemErro.innerHTML = `Erro: ${error.message}`;
      mensagemErro.classList.remove('d-none');
    }
  });

  // Listener para busca de CEP no modal de edição
  document.getElementById('cep_usuario').addEventListener('blur', async function () {
    const cep = this.value.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) {
          alert('CEP não encontrado.');
        } else {
          document.getElementById('rua_usuario').value = data.logouro || '';
          document.getElementById('bairro_usuario').value = data.bairro || '';
          document.getElementById('cidade_usuario').value = data.localidade || '';
        }
      } catch (error) {
        alert('Erro ao buscar o CEP.');
      }
    }
  });

  // Listener para o preview da foto
  document.getElementById("foto_usuario").addEventListener("change", function () {
    const preview = document.getElementById("foto_usuario_preview");
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
      reader.readAsDataURL(file);
    }
  });
});