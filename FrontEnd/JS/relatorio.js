let index = 0;
const carousel = document.querySelector(".carousel");
const tables = document.querySelectorAll(".carousel table");
const totalTables = tables.length;

function updateCarousel() {
    const offset = -index * 100;
    carousel.style.transform = `translateX(${offset}%)`;
}

function nextSlide() {
    index = (index + 1) % totalTables;
    updateCarousel();
}

function prevSlide() {
    index = (index - 1 + totalTables) % totalTables;
    updateCarousel();
}


