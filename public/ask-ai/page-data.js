(() => {
  let provided = false;
  let value = null;
  const excluded = "script, style, template, noscript, button, input, textarea, select, .j-statusbar-fixed, .j-nav-fixed, .j-bottom-actions-fixed, .ai-sheet, .sheet-mask, [hidden], [aria-hidden='true'], [data-ai-exclude]";

  function serialize(data) {
    if (data === null || data === undefined) return "";
    if (typeof data === "string") return data.trim();
    if (Array.isArray(data) && data.length === 0) return "";
    if (typeof data === "object" && Object.keys(data).length === 0) return "";
    const text = JSON.stringify(data, null, 2);
    if (text === undefined) throw new TypeError("Page data must be text or JSON-serializable data");
    return text;
  }

  function readPageText() {
    const container = document.querySelector("[data-ai-content]") || document.querySelector(".j-mini-fixed-shell");
    if (!container) return "";
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const lines = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent.replace(/\s+/g, " ").trim();
      if (!text || node.parentElement.closest(excluded)) continue;
      let visible = true;
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
          visible = false;
          break;
        }
        if (parent === container) break;
      }
      if (visible) lines.push(text);
    }
    return lines.join("\n");
  }

  window.askAIPageContext = Object.freeze({
    setData(data) {
      serialize(data);
      value = data;
      provided = true;
      window.dispatchEvent(new Event("ask-ai-page-data-change"));
    },
    clearData() {
      value = null;
      provided = false;
      window.dispatchEvent(new Event("ask-ai-page-data-change"));
    },
    read() {
      const latest = window.getFedAIPageData?.();
      const text = latest ? serialize(latest) : provided ? serialize(value) : readPageText();
      return { text, available: Boolean(text), source: provided ? "data" : "text" };
    },
  });
})();
