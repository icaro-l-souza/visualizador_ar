function openCustomModal(event) {
    event.preventDefault(); // Impede o link de seguir um destino
    document.getElementById('customModal').style.display = 'flex';
}
function closeCustomModal() {
    document.getElementById('customModal').style.display = 'none';
}

function buscarCEP() {
    let cep = document.getElementById('cep').value.replace(/\D/g, '');
    if (cep.length !== 8) {
        alert('CEP inválido!');
        return;
    }
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                alert('CEP não encontrado!');
            } else {
                document.getElementById('bairro').value = data.bairro;
                document.getElementById('rua').value = data.logradouro;
            }
        })
        .catch(error => alert('Erro ao buscar CEP!'));
}
function enviarFormulario(event) {
    event.preventDefault();

    const form = document.getElementById('formCadastro');
    const dados = new FormData(form);

    // Aqui você pode fazer algo com os dados, se quiser

    // Redireciona para Tela_login/index.html
    window.location.href = "../Tela_login/index.html";
  }
