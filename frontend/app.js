const productGrid = document.querySelector("#product-grid");
const catalogStatus = document.querySelector("#catalog-status");
const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-navigation");

function renderProducts(products) {
  productGrid.replaceChildren(
    ...products.map((product) => {
      const card = document.createElement("article");
      card.className = "product-card";

      const artwork = document.createElement("div");
      artwork.className = `product-art product-art-${product.color}`;
      artwork.setAttribute("aria-hidden", "true");
      const bag = document.createElement("div");
      bag.className = "coffee-bag";
      const bagLogo = document.createElement("span");
      bagLogo.textContent = "O";
      const bagName = document.createElement("strong");
      bagName.textContent = product.name;
      const bagOrigin = document.createElement("small");
      bagOrigin.textContent = product.region;
      bag.append(bagLogo, bagName, bagOrigin);
      artwork.append(bag);

      const details = document.createElement("div");
      details.className = "product-details";
      const title = document.createElement("h3");
      title.textContent = product.name;
      const region = document.createElement("span");
      region.className = "product-region";
      region.textContent = product.region;
      const profile = document.createElement("p");
      profile.textContent = product.profile;
      const variety = document.createElement("span");
      variety.className = "product-variety";
      variety.textContent = product.variety;
      details.append(title, region, profile, variety);
      card.append(artwork, details);
      return card;
    }),
  );
  catalogStatus.textContent = products.length
    ? "Catálogo demostrativo · Información comercial por confirmar"
    : "Pronto compartiremos nuestra selección de cafés.";
}

async function loadProducts() {
  try {
    const response = await fetch("/api/products");
    if (!response.ok) {
      throw new Error(`El catálogo respondió con estado ${response.status}.`);
    }
    const result = await response.json();
    if (!Array.isArray(result.products)) {
      throw new Error("La respuesta del catálogo no tiene el formato esperado.");
    }
    renderProducts(result.products);
  } catch (error) {
    catalogStatus.textContent = "No fue posible cargar el catálogo. Intenta de nuevo más tarde.";
    console.error("Error al cargar el catálogo:", error);
  }
}

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "Enviando...";

  const formData = new FormData(contactForm);
  const submission = {
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  };

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `El servidor respondió con estado ${response.status}.`);
    }
    formStatus.textContent = result.message;
    contactForm.reset();
  } catch (error) {
    formStatus.textContent = error.message || "No fue posible enviar el mensaje. Intenta de nuevo.";
    console.error("Error al enviar el formulario:", error);
  }
});

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  navigation.classList.toggle("navigation-open", !isExpanded);
  menuToggle.setAttribute("aria-label", isExpanded ? "Abrir menú" : "Cerrar menú");
});

navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú");
    navigation.classList.remove("navigation-open");
  }
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
loadProducts();
