// Função para carregar páginas dinamicamente dentro de main-content
function loadPage(page) {
    const contentDiv = document.getElementById('main-content');
    
    // Fazendo uma requisição para pegar o conteúdo das páginas de forma assíncrona
    fetch(page)
        .then(response => response.text())
        .then(data => {
            contentDiv.innerHTML = data; // Injetando o conteúdo na div
        })
        .catch(error => {
            console.error("Erro ao carregar a página: ", error);
        });
}