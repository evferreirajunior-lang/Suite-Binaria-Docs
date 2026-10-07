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
    "initial-release": ["pt-br"]
  };

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

    const version = versionSelect.value;
    const onlyPortuguese = (availableLanguages[version] || []).length === 1;

    viewer.innerHTML = onlyPortuguese
      ? '<div class="changelog-placeholder"><strong>Release em reconstrução.</strong><span>Por enquanto, o changelog desta release está disponível em Português. Os demais idiomas serão adicionados após a conclusão do texto-base.</span></div>'
      : '<div class="changelog-placeholder"><strong>Escolha um idioma.</strong><span>O changelog da versão selecionada será carregado aqui.</span></div>';

    if (status) status.textContent = "";
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