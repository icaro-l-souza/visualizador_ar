// =========================================================================
// SCRIPT COMPLETO E REFINADO
// =========================================================================

document.addEventListener('DOMContentLoaded', function () {

    // --- FUNÇÃO AUXILIAR PARA EXIBIR MENSAGENS ---
    function exibirMensagem(texto, tipo = 'danger') {
        const mensagemDiv = document.getElementById('mensagem');
        if (mensagemDiv) {
            mensagemDiv.textContent = texto;
            mensagemDiv.className = `alert alert-${tipo} mx-3`; // Garante as classes corretas
            mensagemDiv.classList.remove('d-none');
            
            // Esconde a mensagem após 5 segundos
            setTimeout(() => {
                mensagemDiv.classList.add('d-none');
            }, 5000);
        }
    }

    // --- LÓGICA DE BUSCA DE CEP ---
    document.getElementById('inputCEP').addEventListener('blur', async function () {
        const cep = this.value.replace(/\D/g, '');

        if (cep.length === 8) {
            try {
                const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
                if (!response.ok) {
                    throw new Error('CEP não encontrado ou inválido.');
                }
                const data = await response.json();

                document.getElementById('inputRua').value = data.street || '';
                document.getElementById('inputBairro').value = data.neighborhood || '';
                document.getElementById('inputCidade').value = data.city || '';

            } catch (error) {
                exibirMensagem('Erro ao buscar o CEP: ' + error.message, 'danger');
                document.getElementById('inputRua').value = '';
                document.getElementById('inputBairro').value = '';
                document.getElementById('inputCidade').value = '';
            }
        } else if (this.value.length > 0) {
            exibirMensagem('CEP inválido. Deve conter 8 números.', 'warning');
        }
    });

    // --- LÓGICA DO FORMULÁRIO DE CADASTRO ---
    document.getElementById('userForm').addEventListener('submit', async function (event) {
        event.preventDefault();

        const formData = new FormData(this);
        let campoFaltando = false;
        // Verifica se algum campo essencial está vazio
        for (const [key, value] of formData.entries()) {
            if (key !== 'Complemento' && key !== 'Foto_Usuario' && !value) {
                campoFaltando = true;
                break;
            }
        }
        
        if (campoFaltando) {
            exibirMensagem('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }

        // Adiciona campos fixos ao FormData
        formData.append("table", "cadastro_funcionario");
        formData.append("database", "sgmi");
        
        // Se a foto não foi selecionada, remove do FormData
        if (formData.get('Foto_Usuario') && formData.get('Foto_Usuario').size === 0) {
            formData.delete('Foto_Usuario');
        }

        try {
            const response = await fetch('http://localhost:5000/insert', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.inserted_id) {
                const erroMsg = Array.isArray(data.mensagem) ? data.mensagem.join('<br>') : (data.mensagem || 'Erro desconhecido.');
                throw new Error(erroMsg);
            }
            
            exibirMensagem('Funcionário cadastrado com sucesso!', 'success');
            document.getElementById('userForm').reset();
            
            const preview = document.getElementById('foto_preview');
            if(preview) preview.style.display = 'none';

        } catch (error) {
            exibirMensagem('Erro: ' + error.message, 'danger');
        }
    });
    
    // --- LÓGICA DO PREVIEW DA IMAGEM ---
    const fotoInput = document.getElementById('foto_usuario');
    const fotoPreview = document.getElementById('foto_preview');

    if (fotoInput && fotoPreview) {
        fotoInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    fotoPreview.src = e.target.result;
                    fotoPreview.style.display = 'block';
                }
                reader.readAsDataURL(file);
            }
        });
    }
});

// --- LÓGICA DE MOSTRAR SENHA ---
function mostrarSenha() {
    const inputPass = document.getElementById('inputSenha');
    const btnShowPass = document.getElementById('btn-senha');

    if (inputPass.type === 'password') {
        inputPass.setAttribute('type', 'text');
        btnShowPass.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        inputPass.setAttribute('type', 'password');
        btnShowPass.classList.replace('fa-eye-slash', 'fa-eye');
    }
}