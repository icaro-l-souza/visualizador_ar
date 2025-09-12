document.addEventListener('DOMContentLoaded', function () {

    document.getElementById('inputCEP').addEventListener('blur', async function () {
        const cep = this.value.replace(/\D/g, '');

        const ruaInput = document.getElementById('inputRua');
        const bairroInput = document.getElementById('inputBairro');
        const cidadeInput = document.getElementById('inputCidade');

        if (cep.length === 8) {
            try {
                const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);

                if (!response.ok) {
                    throw new Error('CEP não encontrado');
                }

                const data = await response.json();

                if (ruaInput) ruaInput.value = data.street || '';
                if (bairroInput) bairroInput.value = data.neighborhood || '';
                if (cidadeInput) cidadeInput.value = data.city || '';

            } catch (error) {
                alert('Erro ao buscar o CEP: ' + error.message);

                if (ruaInput) ruaInput.value = '';
                if (bairroInput) bairroInput.value = '';
                if (cidadeInput) cidadeInput.value = '';
            }
        }
    });


    // Lógica do formulário
    document.getElementById('userForm').addEventListener('submit', async function (event) {
        event.preventDefault();

        // Captura os valores dos campos
        const nome = document.getElementById('inputName').value;
        const cep = document.getElementById('inputCEP').value;
        const numero = document.getElementById('inputNumero').value;
        const complemento = document.getElementById('inputComplemento').value;
        const data_nascimento = document.getElementById('inputDate').value;
        const tipo = document.getElementById('inputtipo').value;
        const email = document.getElementById('inputEmail').value;
        const username = document.getElementById('inputUsername').value;
        const sexo = document.getElementById('inputSexo').value;
        const cpf = document.getElementById('inputCPF').value;
        const telefone = document.getElementById('inputPhone').value;
        const senha = document.getElementById('inputSenha').value;
        const cidade = document.getElementById('inputCidade').value;
        const bairro = document.getElementById('inputBairro').value;
        const rua = document.getElementById('inputRua').value;
        const cargo = document.getElementById('inputCargo').value;
        const departamento = document.getElementById('inputDepartamento').value;
        const admissao = document.getElementById('inputAdmissao').value;
        const fotoInput = document.getElementById('foto_usuario');
        const arquivo = fotoInput.files[0]; // O arquivo real selecionado

        // Validação básica
        if (!nome || !cep || !numero || !complemento || !data_nascimento || !tipo || !email || !username || !sexo || !cpf || !telefone || !senha || !cidade || !bairro || !rua || !cargo || !departamento || !admissao) {
            alert('Todos os campos são obrigatórios. Por favor, preencha todos.');
            return;
        }

        try {
            await enviarFormulario(nome, cep, numero, complemento, data_nascimento, tipo, email, username, sexo, cpf, telefone, senha, cidade, bairro, rua, cargo, departamento, admissao, arquivo);
        } catch (error) {
            const mensagemDiv = document.getElementById('mensagemErroInserir');
            mensagemDiv.textContent = 'Erro de conexão com a API: ' + error.message;
            mensagemDiv.classList.remove('d-none');
        }
    });

    async function enviarFormulario(
        nome, cep, numero, complemento, data_nascimento, tipo,
        email, username, sexo, cpf, telefone, senha,
        cidade, bairro, rua, cargo, departamento, admissao, arquivo
    ) {
        const formData = new FormData();

        // Campos de texto
        formData.append("table", "cadastro_funcionario");
        formData.append("database", "sgmi");
        formData.append("Nome", nome);
        formData.append("Email", email);
        formData.append("Senha", senha);
        formData.append("Login", username);
        formData.append("Telefone", telefone);
        formData.append("CEP", cep);
        formData.append("Cidade", cidade);
        formData.append("Bairro", bairro);
        formData.append("Rua", rua);
        formData.append("Numero", numero);
        formData.append("Complemento", complemento);
        formData.append("Sexo", sexo);
        formData.append("CPF", cpf);
        formData.append("Data_Nascimento", data_nascimento);
        formData.append("Tipo_Usuario", tipo);
        formData.append("Cargo", cargo);
        formData.append("Departamento", departamento);
        formData.append("Data_Admissao", admissao);

        // Imagem
        formData.append("Foto_Usuario", arquivo);

        // Envio
        const response = await fetch('http://localhost:5000/insert', {
            method: 'POST',
            body: formData
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
        alert('Funcionário cadastrado com sucesso!');
        document.getElementById('userForm').reset();
    }


    // Espera o DOM carregar
    document.addEventListener('DOMContentLoaded', function () {

        const inputCEP = document.getElementById('inputCEP');

        inputCEP.addEventListener('blur', async function () {
            const cep = inputCEP.value.replace(/\D/g, '');

            if (cep.length !== 8) {
                alert('CEP inválido. Deve conter 8 números.');
                return;
            }

            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                if (data.erro) {
                    alert('CEP não encontrado.');
                    return;
                }

                // Preenche os campos automaticamente
                document.getElementById('inputCidade').value = data.localidade;
                document.getElementById('inputBairro').value = data.bairro;
                document.getElementById('inputRua').value = data.logradouro;

            } catch (error) {
                alert('Erro ao buscar o CEP: ' + error.message);
            }
        });

    });

});

// ------------------Senha--------------------------

function mostrarSenha() {
    var inputPass = document.getElementById('inputSenha')
    var btnShowPass = document.getElementById('btn-senha')

    if (inputPass.type === 'password') {
        inputPass.setAttribute('type', 'text')
        btnShowPass.classList.replace('fa-eye', 'fa-eye-slash')
    } else {
        inputPass.setAttribute('type', 'password')
        btnShowPass.classList.replace('fa-eye-slash', 'fa-eye')
    }

}


