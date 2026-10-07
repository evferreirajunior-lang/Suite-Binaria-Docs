(() => {
  const versionSelect = document.getElementById("changelog-version");
  const languageButtons = [...document.querySelectorAll("[data-changelog-lang]")];
  const viewer = document.getElementById("changelog-content");
  const status = document.getElementById("changelog-status");

  if (!versionSelect || !viewer || !languageButtons.length) return;

  const labels = {
    "pt-br": "Português (Brasil)",
    "en": "English",
    "es": "Español",
    "fr": "Français",
    "it": "Italiano"
  };

  const versionLabels = {
    "v0.02": "v0.02",
    "initial-release": "Release Inicial"
  };

  const availableLanguages = {
    "v0.02": ["pt-br", "en", "es", "fr", "it"],
    "initial-release": ["pt-br", "en", "es", "fr", "it"]
  };

  const topicUi = {
    "pt-br": {
      title: "Conteúdo desta versão",
      hint: "Escolha uma seção para ler. Clique no mesmo botão para ocultá-la.",
      overview: "Interface principal",
      close: "Ocultar seção e voltar ao índice",
      navLabel: "Navegação pelas seções do changelog"
    },
    "en": {
      title: "Contents of this release",
      hint: "Choose a section to read. Click the same button to close it.",
      overview: "Main interface",
      close: "Close section and return to contents",
      navLabel: "Changelog section navigation"
    },
    "es": {
      title: "Contenido de esta versión",
      hint: "Elige una sección para leer. Vuelve a pulsar el botón para ocultarla.",
      overview: "Interfaz principal",
      close: "Ocultar sección y volver al índice",
      navLabel: "Navegación por las secciones"
    },
    "fr": {
      title: "Sommaire de cette version",
      hint: "Choisissez une section à lire. Cliquez à nouveau pour la masquer.",
      overview: "Interface principale",
      close: "Masquer la section et revenir au sommaire",
      navLabel: "Navigation dans le changelog"
    },
    "it": {
      title: "Contenuti di questa versione",
      hint: "Scegli una sezione da leggere. Premi di nuovo per nasconderla.",
      overview: "Interfaccia principale",
      close: "Nascondi la sezione e torna all'indice",
      navLabel: "Navigazione delle sezioni"
    }
  };

  const initialEditorTitles = new Set([
    "Ability Editor",
    "Item Editor",
    "Trainer Editor",
    "Trade Editor",
    "Move Editor",
    "Pokémon Editor",
    "Wild Encounter"
  ]);

  let requestId = 0;

  function updateLanguageAvailability() {
    const version = versionSelect.value;
    const available = new Set(availableLanguages[version] || []);

    languageButtons.forEach(button => {
      const enabled = available.has(button.dataset.changelogLang);
      button.disabled = !enabled;
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
      button.title = enabled ? "" : "Este idioma será disponibilizado quando o changelog-base desta release estiver concluído.";
    });
  }

  function resetViewer() {
    requestId++;
    updateLanguageAvailability();
    viewer.setAttribute("aria-busy", "false");

    const version = versionSelect.value;
    const onlyPortuguese = (availableLanguages[version] || []).length === 1;

    viewer.innerHTML = onlyPortuguese
      ? '<div class="changelog-placeholder"><strong>Release em reconstrução.</strong><span>Por enquanto, o changelog desta release está disponível em Português. Os demais idiomas serão adicionados após a conclusão do texto-base.</span></div>'
      : '<div class="changelog-placeholder"><strong>Escolha um idioma.</strong><span>O changelog da versão selecionada será carregado aqui.</span></div>';

    if (status) status.textContent = "";
  }

  function scrollTo(element) {
    const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  // Divide o texto em tópicos sem alterar os arquivos HTML publicados.
  // Na Release Inicial, a apresentação reúne os menus gerais antes dos editores.
  function organizeTopics(version, language) {
    const article = viewer.querySelector(".changelog-article");
    if (!article) return;

    const originalNodes = [...article.children];
    const headings = originalNodes.filter(node => node.tagName === "H4");
    if (!headings.length) return;

    const initial = version === "initial-release";
    const boundaries = initial
      ? headings.filter((heading, index) => index === 0 || initialEditorTitles.has(heading.textContent.trim()))
      : headings;
    if (!boundaries.length) return;

    const messages = topicUi[language] || topicUi["pt-br"];
    const nav = document.createElement("nav");
    nav.className = "changelog-topic-index";
    nav.setAttribute("aria-label", messages.navLabel);

    const navHeading = document.createElement("strong");
    navHeading.className = "changelog-topic-index-title";
    navHeading.textContent = messages.title;
    nav.appendChild(navHeading);

    const hint = document.createElement("p");
    hint.className = "changelog-topic-index-hint";
    hint.textContent = messages.hint;
    nav.appendChild(hint);

    const buttonRow = document.createElement("div");
    buttonRow.className = "changelog-topic-buttons";
    nav.appendChild(buttonRow);
    article.insertBefore(nav, boundaries[0]);

    const boundarySet = new Set(boundaries);
    const topics = [];
    let currentTopic = null;

    function toggleTopic(selectedTopic) {
      const opening = selectedTopic.section.hidden;
      topics.forEach(topic => {
        const active = opening && topic === selectedTopic;
        topic.section.hidden = !active;
        topic.button.classList.toggle("is-active", active);
        topic.button.setAttribute("aria-expanded", String(active));
      });
      // Mantém os botões à vista para que o mesmo botão possa fechar a seção.
    }

    for (const node of originalNodes) {
      if (boundarySet.has(node)) {
        const index = topics.length;
        const title = initial && index === 0 ? messages.overview : node.textContent.trim();

        const button = document.createElement("button");
        button.type = "button";
        button.className = "changelog-topic-button";
        button.textContent = title;
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-controls", "changelog-topic-" + index);
        buttonRow.appendChild(button);

        const section = document.createElement("section");
        section.className = "changelog-topic";
        section.id = "changelog-topic-" + index;
        section.setAttribute("aria-label", title);
        section.hidden = true;
        article.appendChild(section);

        const topic = { button, section };
        currentTopic = topic;
        topics.push(topic);
        button.addEventListener("click", () => toggleTopic(topic));
      }
      if (currentTopic) currentTopic.section.appendChild(node);
    }

    // Um comando ao final evita ter de percorrer páginas longas para fechar a seção.
    for (const topic of topics) {
      const footer = document.createElement("div");
      footer.className = "changelog-topic-footer";
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "changelog-topic-close";
      closeButton.textContent = messages.close;
      closeButton.addEventListener("click", () => {
        if (!topic.section.hidden) {
          toggleTopic(topic);
          scrollTo(nav);
        }
      });
      footer.appendChild(closeButton);
      topic.section.appendChild(footer);
    }

    // Se o endereço inclui um link para uma aba, abre o tópico correspondente.
    const anchorId = decodeURIComponent(window.location.hash.slice(1));
    const anchor = anchorId ? document.getElementById(anchorId) : null;
    const parentTopic = anchor && anchor.closest(".changelog-topic");
    if (parentTopic) {
      const topic = topics.find(item => item.section === parentTopic);
      if (topic) {
        topics.forEach(item => {
          const active = item === topic;
          item.section.hidden = !active;
          item.button.classList.toggle("is-active", active);
          item.button.setAttribute("aria-expanded", String(active));
        });
      }
    }
  }

  async function loadChangelog(language, button) {
    const version = versionSelect.value;
    if (!version || !language || button.disabled) return;

    const currentRequest = ++requestId;
    languageButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", active ? "true" : "false");
    });

    viewer.setAttribute("aria-busy", "true");
    viewer.innerHTML = '<div class="changelog-placeholder"><strong>Carregando…</strong><span>Aguarde um instante.</span></div>';
    if (status) status.textContent = `Carregando changelog ${versionLabels[version] || version} — ${labels[language] || language}.`;

    try {
      const response = await fetch(`changelog/${encodeURIComponent(version)}/${encodeURIComponent(language)}.html`, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      if (currentRequest !== requestId) return;
      viewer.innerHTML = html;
      organizeTopics(version, language);
      if (status) status.textContent = `Changelog ${versionLabels[version] || version} — ${labels[language] || language} carregado.`;
    } catch (error) {
      if (currentRequest !== requestId) return;
      viewer.innerHTML = '<div class="changelog-placeholder changelog-error"><strong>Não foi possível carregar este changelog.</strong><span>Tente novamente em alguns instantes.</span></div>';
      if (status) status.textContent = "Falha ao carregar o changelog.";
      console.error("Suite Binária changelog:", error);
    } finally {
      if (currentRequest === requestId) viewer.setAttribute("aria-busy", "false");
    }
  }

  versionSelect.addEventListener("change", resetViewer);
  languageButtons.forEach(button => {
    button.addEventListener("click", () => loadChangelog(button.dataset.changelogLang, button));
  });

  resetViewer();
})();