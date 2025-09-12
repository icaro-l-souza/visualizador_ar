// login.js

// --- Seleção de Elementos ---
//  Seleciona os elementos do HTML uma única vez para melhor performance.
const form = document.getElementById('formCadastro');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const mensagemErroEl = document.getElementById('mensagem-erro'); // O nosso novo elemento de erro.

// --- Adição de Eventos (Event Listeners) ---

// adicionamos o evento aqui.
// Isso separa melhor a estrutura (HTML) do comportamento (JS).
form.addEventListener('submit', enviarFormulario);

// Limpa a mensagem de erro assim que o usuário começa a digitar novamente.
emailInput.addEventListener('input', () => mensagemErroEl.textContent = '');
passwordInput.addEventListener('input', () => mensagemErroEl.textContent = '');

/**
 * Função acionada quando o formulário de login é submetido.
 * @param {Event} event - O objeto do evento de submissão do formulário.
 */
function enviarFormulario(event) {
    // 1. Previne o recarregamento da página.
    event.preventDefault();

    // 2. Captura os valores dos campos.
    const email = emailInput.value;
    const senha = passwordInput.value;

    // Limpa mensagens de erro antigas antes de uma nova tentativa.
    mensagemErroEl.textContent = '';

    // 3. Envia os dados para o back-end.
    fetch(`${API_BASE_URL}/login`, { // Usa a constante da URL base.
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Email: email, Senha: senha })
    })
    .then(response => {
        // Trata a resposta HTTP de forma mais robusta.
        if (!response.ok) {
            // Se a resposta for um erro (ex: 401, 404), lê a mensagem de erro do back-end
            // e a "lança" para ser capturada pelo bloco .catch().
            return response.json().then(errData => {
                throw new Error(errData.error || 'Usuário ou senha inválidos.');
            });
        }
        return response.json();
    })
    .then(data => {
        // Se a resposta for bem-sucedida e contiver um ID, o login foi válido.
        if (data.Id) {
            // Lógica do localStorage (mantida como você pediu).
            localStorage.setItem("CPF", JSON.stringify(data.cpf));
            localStorage.setItem("tipo_usuario", data.Tipo_Usuario);
            localStorage.setItem("Login", JSON.stringify(data.Login));
            localStorage.setItem("Email", JSON.stringify(data.Email));
            localStorage.setItem("Senha", data.Senha);
            localStorage.setItem("Data_Nascimento", JSON.stringify(data.Data_Nascimento));
            localStorage.setItem("Complemento", JSON.stringify(data.Complemento));
            localStorage.setItem("CEP", data.cep);
            localStorage.setItem("Telefone", JSON.stringify(data.Telefone));
            localStorage.setItem("ID", data.Id);
            localStorage.setItem("Sexo", data.Sexo);
            localStorage.setItem("Nome", data.Nome);

            // Redireciona para a página principal.
            window.location.href = "../View/home.html";
        } else {
            // Caso a resposta seja bem-sucedida mas não contenha os dados esperados.
            throw new Error(data.error || 'Resposta inesperada do servidor.');
        }
    })
    .catch(error => {
        // O .catch agora captura tanto erros de rede quanto os erros de login.
        console.error("Erro no login:", error);
        // MUDANÇA: Em vez de alert(), exibe a mensagem de erro no elemento HTML.
        mensagemErroEl.textContent = error.message;
    });
}
