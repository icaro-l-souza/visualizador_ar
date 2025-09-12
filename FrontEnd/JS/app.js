import { loadMenu } from "../components/menu.js";
import { routes } from "./routes.js";
import { loadPage } from "./main.js";

function renderRoute() {
    const path = window.location.pathname;
    const route = routes[path];

    if (route) {
        loadPage(route);
    } else {
        document.getElementById("content").innerHTML = "<h1>404 - Página Não Encontrada</h1>";
    }
}

function navigateTo(url) {
    history.pushState(null, null, url);
    renderRoute();
}

document.addEventListener("DOMContentLoaded", () => {
    loadMenu();
    renderRoute();

    // Navegação SPA
    document.body.addEventListener("click", (event) => {
        if (event.target.matches(".nav-link[href]")) {
            event.preventDefault();
            const url = event.target.getAttribute("href");
            navigateTo(url);
        }
    });
});

window.addEventListener("popstate", renderRoute); // Suporte ao botão "voltar"