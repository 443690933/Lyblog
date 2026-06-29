(function () {
  "use strict";

  const ABOUT_STORAGE_KEY = "learning_blog_about";
  const LOCAL_ARTICLES_KEY = "learning_blog_local_articles";
  const ALL_CATEGORIES = "__all__";
  const DEFAULT_ABOUT = {
    label: "ABOUT",
    title: "关于我",
    description: "这里可以写你的个人介绍。",
    sections: [
      {
        id: "about-record",
        title: "这个博客记录什么",
        content: "这里可以写你的学习方向、项目记录和技术总结。"
      },
      {
        id: "about-direction",
        title: "当前学习方向",
        content: "这里可以列出你正在学习或长期关注的主题。"
      },
      {
        id: "about-contact",
        title: "联系方式",
        content: "这里可以放你的邮箱、主页或其他联系方式。"
      }
    ]
  };

  const homeState = {
    articles: [],
    keyword: "",
    category: ALL_CATEGORIES
  };

  const aboutState = {
    current: null,
    defaultData: null
  };

  const adminState = {
    editingId: ""
  };

  function initPage() {
    const page = document.body.dataset.page || getPageNameFromPath();
    setActiveNavigation(page);

    if (page === "index") {
      renderHomePage();
    }

    if (page === "article") {
      renderArticlePage();
    }

    if (page === "admin") {
      renderAdminPage();
    }

    if (page === "about") {
      renderAboutPage();
    }
  }

  function getPageNameFromPath() {
    const fileName = window.location.pathname.split("/").pop() || "index.html";

    if (fileName.includes("article")) {
      return "article";
    }

    if (fileName.includes("admin")) {
      return "admin";
    }

    if (fileName.includes("about")) {
      return "about";
    }

    return "index";
  }

  function setActiveNavigation(page) {
    const navPage = page === "article" ? "index" : page;
    document.querySelectorAll("[data-nav]").forEach((link) => {
      const isActive = link.dataset.nav === navPage;
      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function toText(value) {
    return String(value || "").trim();
  }

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createFetchUrl(path) {
    return `${path}?t=${Date.now()}`;
  }

  function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const date = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  }

  async function fetchJSON(path, fallbackValue) {
    try {
      const response = await fetch(createFetchUrl(path), { cache: "no-store" });
      if (!response.ok) {
        return fallbackValue;
      }

      return await response.json();
    } catch (error) {
      return fallbackValue;
    }
  }

  async function loadStaticArticles() {
    const data = await fetchJSON("data/articles.json", []);
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map(normalizeStaticArticle)
      .filter((article) => article.id && article.title);
  }

  async function loadArticles() {
    return loadStaticArticles();
  }

  async function loadAllArticles() {
    const staticArticles = await loadStaticArticles();
    const localArticles = getLocalArticles();
    return [...staticArticles, ...localArticles];
  }

  async function loadDefaultAbout() {
    const data = await fetchJSON("data/about.json", DEFAULT_ABOUT);
    return normalizeAbout(data);
  }

  function getLocalArticles() {
    try {
      const rawValue = localStorage.getItem(LOCAL_ARTICLES_KEY);
      if (!rawValue) {
        return [];
      }

      const data = JSON.parse(rawValue);
      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .map(normalizeLocalArticle)
        .filter((article) => article.id && article.title);
    } catch (error) {
      return [];
    }
  }

  function saveLocalArticles(articles) {
    const normalizedArticles = (Array.isArray(articles) ? articles : [])
      .map(normalizeLocalArticle)
      .filter((article) => article.id && article.title);

    localStorage.setItem(LOCAL_ARTICLES_KEY, JSON.stringify(normalizedArticles));
    return normalizedArticles;
  }

  function addLocalArticle(article) {
    const articles = getLocalArticles();
    const now = new Date().toISOString();
    const localArticle = normalizeLocalArticle({
      ...article,
      id: createLocalArticleId(articles),
      source: "local",
      createdAt: now,
      updatedAt: now
    });

    articles.unshift(localArticle);
    saveLocalArticles(articles);
    return localArticle;
  }

  function updateLocalArticle(id, article) {
    const articleId = toText(id);
    const articles = getLocalArticles();
    const index = articles.findIndex((item) => item.id === articleId);

    if (index === -1) {
      return null;
    }

    const now = new Date().toISOString();
    const previous = articles[index];
    const updatedArticle = normalizeLocalArticle({
      ...previous,
      ...article,
      id: previous.id,
      source: "local",
      createdAt: previous.createdAt || now,
      updatedAt: now
    });

    articles[index] = updatedArticle;
    saveLocalArticles(articles);
    return updatedArticle;
  }

  function deleteLocalArticle(id) {
    const articleId = toText(id);
    const articles = getLocalArticles();
    const nextArticles = articles.filter((article) => article.id !== articleId);

    if (nextArticles.length === articles.length) {
      return false;
    }

    saveLocalArticles(nextArticles);
    return true;
  }

  function getLocalArticleById(id) {
    const articleId = toText(id);
    return getLocalArticles().find((article) => article.id === articleId) || null;
  }

  function createLocalArticleId(existingArticles) {
    const existingIds = new Set(existingArticles.map((article) => article.id));
    const baseId = `local-${Date.now()}`;
    let nextId = baseId;
    let suffix = 1;

    while (existingIds.has(nextId)) {
      nextId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    return nextId;
  }

  function getLocalAbout() {
    try {
      const rawValue = localStorage.getItem(ABOUT_STORAGE_KEY);
      if (!rawValue) {
        return null;
      }

      return normalizeAbout(JSON.parse(rawValue));
    } catch (error) {
      return null;
    }
  }

  function saveLocalAbout(aboutData) {
    const about = normalizeAbout({
      ...aboutData,
      updatedAt: new Date().toISOString()
    });
    localStorage.setItem(ABOUT_STORAGE_KEY, JSON.stringify(about));
    return about;
  }

  function clearLocalAbout() {
    localStorage.removeItem(ABOUT_STORAGE_KEY);
  }

  function normalizeArticleBase(article) {
    return {
      id: toText(article && article.id),
      title: toText(article && article.title),
      date: toText(article && article.date),
      category: toText(article && article.category),
      summary: toText(article && article.summary),
      link: toText(article && article.link)
    };
  }

  function normalizeArticle(article) {
    if ((article && article.source === "local") || (article && Object.prototype.hasOwnProperty.call(article, "content"))) {
      return normalizeLocalArticle(article);
    }

    return normalizeStaticArticle(article);
  }

  function normalizeStaticArticle(article) {
    return {
      ...normalizeArticleBase(article),
      file: toText(article && article.file),
      source: "static"
    };
  }

  function normalizeLocalArticle(article) {
    return {
      ...normalizeArticleBase(article),
      content: toText(article && article.content),
      source: "local",
      createdAt: toText(article && article.createdAt),
      updatedAt: toText(article && article.updatedAt)
    };
  }

  function normalizeAbout(aboutData) {
    const source = aboutData && typeof aboutData === "object" ? aboutData : {};
    const sections = Array.isArray(source.sections) ? source.sections : [];

    return {
      label: toText(source.label) || DEFAULT_ABOUT.label,
      title: toText(source.title) || DEFAULT_ABOUT.title,
      description: toText(source.description) || DEFAULT_ABOUT.description,
      sections: DEFAULT_ABOUT.sections.map((defaultSection, index) => {
        const section = sections[index] || {};

        return {
          id: toText(section.id) || defaultSection.id,
          title: toText(section.title) || defaultSection.title,
          content: toText(section.content) || defaultSection.content
        };
      }),
      updatedAt: toText(source.updatedAt)
    };
  }

  function sortArticlesByDateDesc(articles) {
    return [...articles].sort((first, second) => {
      const secondTime = getSortableTime(second);
      const firstTime = getSortableTime(first);
      return secondTime - firstTime;
    });
  }

  function getSortableTime(article) {
    const dateTime = new Date(article.date || 0).getTime() || 0;
    const updatedTime = new Date(article.updatedAt || article.createdAt || 0).getTime() || 0;
    return dateTime || updatedTime;
  }

  function getDisplayCategory(article) {
    return article.category || "未分类";
  }

  function getSourceLabel(article) {
    return article.source === "local" ? "本地" : "静态";
  }

  function renderSourceTag(article) {
    const source = article.source === "local" ? "local" : "static";
    return `<span class="source-tag source-${source}">${getSourceLabel(article)}</span>`;
  }

  function getSafeExternalLink(link) {
    const value = toText(link);
    if (!value) {
      return "";
    }

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? value : "";
    } catch (error) {
      return "";
    }
  }

  function getSafeContentLink(link) {
    const value = toText(link);
    if (!value) {
      return "";
    }

    if (value.startsWith("#") || value.startsWith("./") || value.startsWith("../") || value.startsWith("/")) {
      return value;
    }

    try {
      const url = new URL(value, window.location.href);
      const allowedProtocols = ["http:", "https:", "mailto:"];
      return allowedProtocols.includes(url.protocol) ? value : "";
    } catch (error) {
      return "";
    }
  }

  function getArticleHref(id) {
    return `article.html?id=${encodeURIComponent(id)}`;
  }

  async function renderHomePage() {
    const searchInput = document.querySelector("#homeSearchInput");
    const categoryFilters = document.querySelector("#homeCategoryFilters");

    homeState.articles = sortArticlesByDateDesc(await loadAllArticles());
    renderCategoryFilters();
    renderArticleList();

    if (searchInput) {
      searchInput.addEventListener("input", handleSearch);
    }

    if (categoryFilters) {
      categoryFilters.addEventListener("click", handleCategoryFilter);
    }

    const articleList = document.querySelector("#homeArticleList");
    if (articleList) {
      articleList.addEventListener("click", (event) => {
        if (event.target.closest("a, button")) {
          return;
        }

        const card = event.target.closest("[data-article-id]");
        if (card) {
          window.location.href = getArticleHref(card.dataset.articleId);
        }
      });

      articleList.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        const card = event.target.closest("[data-article-id]");
        if (card) {
          event.preventDefault();
          window.location.href = getArticleHref(card.dataset.articleId);
        }
      });
    }
  }

  function renderCategoryFilters() {
    const categoryFilters = document.querySelector("#homeCategoryFilters");
    if (!categoryFilters) {
      return;
    }

    const categories = [...new Set(homeState.articles.map(getDisplayCategory))].sort((a, b) => {
      return a.localeCompare(b, "zh-CN");
    });
    const buttons = [
      `<button class="chip${homeState.category === ALL_CATEGORIES ? " is-active" : ""}" type="button" data-category="${ALL_CATEGORIES}">全部</button>`,
      ...categories.map((category) => {
        const activeClass = homeState.category === category ? " is-active" : "";
        return `<button class="chip${activeClass}" type="button" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`;
      })
    ];

    categoryFilters.innerHTML = buttons.join("");
  }

  function getFilteredArticles() {
    return homeState.articles.filter((article) => {
      const keyword = homeState.keyword;
      const searchableText = `${article.title} ${article.summary} ${getDisplayCategory(article)} ${getSourceLabel(article)}`.toLowerCase();
      const matchesKeyword = !keyword || searchableText.includes(keyword);
      const matchesCategory = homeState.category === ALL_CATEGORIES || getDisplayCategory(article) === homeState.category;
      return matchesKeyword && matchesCategory;
    });
  }

  function renderArticleList() {
    const articleList = document.querySelector("#homeArticleList");
    const articleEmpty = document.querySelector("#homeArticleEmpty");
    const articleCount = document.querySelector("#homeArticleCount");

    if (!articleList || !articleEmpty || !articleCount) {
      return;
    }

    const articles = getFilteredArticles();
    articleCount.textContent = `共 ${articles.length} 篇文章`;
    articleEmpty.hidden = articles.length > 0;
    articleEmpty.textContent = homeState.articles.length === 0
      ? "暂无文章，请到管理页面添加本地文章，或在 data/articles.json 中添加静态文章。"
      : "没有找到匹配的文章。";

    articleList.innerHTML = articles.map((article) => {
      const externalLink = getSafeExternalLink(article.link);

      return `
        <article class="article-card" role="link" tabindex="0" data-article-id="${escapeHTML(article.id)}" aria-label="阅读 ${escapeHTML(article.title)}">
          <div class="article-card-body">
            <p class="article-meta">${escapeHTML(article.date || "未填写日期")} · <span class="tag">${escapeHTML(getDisplayCategory(article))}</span> ${renderSourceTag(article)}</p>
            <h2>${escapeHTML(article.title)}</h2>
            <p>${escapeHTML(article.summary || "暂无摘要")}</p>
          </div>
          <div class="article-actions">
            <a class="button button-secondary" href="${getArticleHref(article.id)}">阅读</a>
            ${externalLink ? `<a class="button button-link" href="${escapeHTML(externalLink)}" target="_blank" rel="noopener noreferrer">访问链接</a>` : ""}
          </div>
        </article>
      `;
    }).join("");
  }

  function handleSearch(event) {
    homeState.keyword = event.target.value.trim().toLowerCase();
    renderArticleList();
  }

  function handleCategoryFilter(event) {
    const button = event.target.closest("[data-category]");
    if (!button) {
      return;
    }

    homeState.category = button.dataset.category;
    renderCategoryFilters();
    renderArticleList();
  }

  async function renderArticlePage() {
    const page = document.querySelector("#articlePage");
    if (!page) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const articleId = params.get("id");
    const localArticle = getLocalArticleById(articleId);
    let article = localArticle;
    let markdown = localArticle ? localArticle.content : "";
    let missingStaticContent = false;

    if (!article) {
      const staticArticles = await loadStaticArticles();
      article = staticArticles.find((item) => item.id === articleId);

      if (article) {
        markdown = await loadMarkdown(article.file);
        missingStaticContent = !markdown;
      }
    }

    if (!article) {
      page.innerHTML = `
        <div class="empty-state">
          <p class="page-label">ARTICLE</p>
          <h1>文章不存在</h1>
          <p>没有找到对应的文章，请检查 URL 中的 id。</p>
          <a class="button" href="index.html">返回首页</a>
        </div>
      `;
      return;
    }

    document.title = `${article.title} - 我的学习记录`;

    const contentHTML = markdown
      ? parseMarkdown(markdown)
      : missingStaticContent
        ? "<p>正文文件加载失败，请检查 data/articles.json 中的 file 路径。</p>"
        : "<p>暂无正文内容。</p>";
    const externalLink = getSafeExternalLink(article.link);
    const isLocalArticle = article.source === "local";

    page.innerHTML = `
      <article class="article-document">
        <header class="article-header">
          <p class="page-label">ARTICLE</p>
          <h1>${escapeHTML(article.title)}</h1>
          <p class="article-meta">${escapeHTML(article.date || "未填写日期")} · <span class="tag">${escapeHTML(getDisplayCategory(article))}</span> ${renderSourceTag(article)}</p>
          ${externalLink ? `<a class="button button-link related-link" href="${escapeHTML(externalLink)}" target="_blank" rel="noopener noreferrer">访问外部链接</a>` : ""}
        </header>

        <div class="article-content">
          ${contentHTML}
        </div>

        <div class="form-actions article-actions-bar">
          <a class="button button-secondary" href="index.html">返回首页</a>
          <button class="button button-copy" type="button" id="copyArticleLinkButton">复制本文链接</button>
          ${isLocalArticle ? `<a class="button" href="admin.html?edit=${encodeURIComponent(article.id)}">编辑本文</a>` : ""}
        </div>
      </article>
    `;

    const copyButton = document.querySelector("#copyArticleLinkButton");
    if (copyButton) {
      copyButton.addEventListener("click", copyArticleLink);
    }
  }

  async function loadMarkdown(filePath) {
    const safePath = toText(filePath);
    if (!safePath) {
      return "";
    }

    try {
      const response = await fetch(createFetchUrl(safePath), { cache: "no-store" });
      if (!response.ok) {
        return "";
      }

      return await response.text();
    } catch (error) {
      return "";
    }
  }

  function parseMarkdown(markdownText) {
    const lines = String(markdownText || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraphLines = [];
    let listType = "";
    let inCodeBlock = false;
    let codeLines = [];

    function flushParagraph() {
      if (paragraphLines.length === 0) {
        return;
      }

      html.push(`<p>${renderInlineMarkdown(paragraphLines.join(" "))}</p>`);
      paragraphLines = [];
    }

    function closeList() {
      if (!listType) {
        return;
      }

      html.push(`</${listType}>`);
      listType = "";
    }

    function openList(type) {
      if (listType === type) {
        return;
      }

      closeList();
      listType = type;
      html.push(`<${type}>`);
    }

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        if (inCodeBlock) {
          html.push(`<pre><code>${escapeHTML(codeLines.join("\n"))}</code></pre>`);
          codeLines = [];
          inCodeBlock = false;
          return;
        }

        flushParagraph();
        closeList();
        inCodeBlock = true;
        codeLines = [];
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      if (!trimmed) {
        flushParagraph();
        closeList();
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        closeList();
        const level = headingMatch[1].length;
        html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
        return;
      }

      const unorderedMatch = trimmed.match(/^-\s+(.+)$/);
      if (unorderedMatch) {
        flushParagraph();
        openList("ul");
        html.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`);
        return;
      }

      const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (orderedMatch) {
        flushParagraph();
        openList("ol");
        html.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
        return;
      }

      if (listType) {
        closeList();
      }

      paragraphLines.push(trimmed);
    });

    if (inCodeBlock) {
      html.push(`<pre><code>${escapeHTML(codeLines.join("\n"))}</code></pre>`);
    }

    flushParagraph();
    closeList();
    return html.join("\n");
  }

  function renderInlineMarkdown(text) {
    const source = String(text || "");
    let result = "";
    let lastIndex = 0;
    const codePattern = /`([^`]+)`/g;
    let match;

    while ((match = codePattern.exec(source)) !== null) {
      result += renderLinks(source.slice(lastIndex, match.index));
      result += `<code>${escapeHTML(match[1])}</code>`;
      lastIndex = match.index + match[0].length;
    }

    result += renderLinks(source.slice(lastIndex));
    return result;
  }

  function renderLinks(text) {
    const source = String(text || "");
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = linkPattern.exec(source)) !== null) {
      const label = match[1];
      const link = getSafeContentLink(match[2]);
      result += escapeHTML(source.slice(lastIndex, match.index));

      if (link) {
        result += `<a href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`;
      } else {
        result += escapeHTML(label);
      }

      lastIndex = match.index + match[0].length;
    }

    result += escapeHTML(source.slice(lastIndex));
    return result;
  }

  async function copyArticleLink() {
    const currentUrl = window.location.href;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(currentUrl);
        alert("本文链接已复制");
        return;
      } catch (error) {
        prompt("请手动复制地址栏链接：", currentUrl);
        return;
      }
    }

    prompt("请手动复制地址栏链接：", currentUrl);
  }

  function renderAdminPage() {
    initAdminPage();
  }

  function initAdminPage() {
    const page = document.querySelector("#adminPage");
    if (!page) {
      return;
    }

    page.innerHTML = `
      <header class="page-header">
        <p class="page-label">MANAGE</p>
        <h1>内容管理</h1>
        <p class="page-desc">本地文章管理。这里新增、编辑、删除的文章会保存到当前浏览器 localStorage。</p>
      </header>

      <p id="adminNotice" class="notice admin-notice" hidden></p>

      <section class="admin-section" aria-labelledby="localArticleFormTitle">
        <div class="section-heading">
          <div>
            <h2 id="localArticleFormTitle">新增本地文章</h2>
            <p id="adminFormHint" class="muted-text">填写后保存到当前浏览器，刷新页面后仍然存在。</p>
          </div>
        </div>

        <form class="article-edit-form" id="localArticleForm">
          <input id="localArticleIdInput" name="id" type="hidden">

          <div class="form-grid">
            <label class="field" for="localArticleTitleInput">
              <span>标题</span>
              <input id="localArticleTitleInput" name="title" type="text" required>
            </label>

            <label class="field" for="localArticleDateInput">
              <span>日期</span>
              <input id="localArticleDateInput" name="date" type="date" required>
            </label>
          </div>

          <div class="form-grid">
            <label class="field" for="localArticleCategoryInput">
              <span>分类</span>
              <input id="localArticleCategoryInput" name="category" type="text" placeholder="例如：AI / 前端 / 读书">
            </label>

            <label class="field" for="localArticleLinkInput">
              <span>外部链接</span>
              <input id="localArticleLinkInput" name="link" type="url" placeholder="https://example.com">
            </label>
          </div>

          <label class="field" for="localArticleSummaryInput">
            <span>摘要</span>
            <textarea id="localArticleSummaryInput" name="summary" rows="3" placeholder="可选，首页会显示这里的内容。"></textarea>
          </label>

          <label class="field" for="localArticleContentInput">
            <span>Markdown 正文内容</span>
            <textarea id="localArticleContentInput" class="markdown-textarea" name="content" placeholder="# 正文标题&#10;&#10;这里写文章正文。"></textarea>
          </label>

          <div class="form-actions">
            <button class="button" type="submit" id="saveLocalArticleButton">保存文章</button>
            <button class="button button-secondary hidden" type="button" id="cancelArticleEditButton">取消编辑</button>
          </div>
        </form>
      </section>

      <hr class="paper-divider">

      <section class="admin-section" aria-labelledby="localArticleListTitle">
        <div class="section-heading admin-list-heading">
          <div>
            <h2 id="localArticleListTitle">本地文章管理</h2>
            <p id="localArticleListCount" class="muted-text">正在加载本地文章...</p>
          </div>
        </div>

        <div id="localArticleList" class="article-list local-article-list"></div>
      </section>

      <section id="publish-export-panel" class="export-panel hidden" aria-labelledby="publishExportTitle"></section>
    `;

    const form = document.querySelector("#localArticleForm");
    const cancelButton = document.querySelector("#cancelArticleEditButton");
    const localArticleList = document.querySelector("#localArticleList");
    const dateInput = document.querySelector("#localArticleDateInput");

    if (dateInput) {
      dateInput.value = getTodayDateString();
    }

    if (form) {
      form.addEventListener("submit", handleSaveLocalArticle);
    }

    if (cancelButton) {
      cancelButton.addEventListener("click", resetArticleForm);
    }

    if (localArticleList) {
      localArticleList.addEventListener("click", (event) => {
        const actionButton = event.target.closest("[data-admin-action]");
        if (!actionButton) {
          return;
        }

        const articleId = actionButton.dataset.id;
        if (actionButton.dataset.adminAction === "edit") {
          handleEditLocalArticle(articleId);
        }

        if (actionButton.dataset.adminAction === "delete") {
          handleDeleteLocalArticle(articleId);
        }

        if (actionButton.dataset.adminAction === "export") {
          exportLocalArticleForPublish(articleId);
        }
      });
    }

    page.addEventListener("click", handlePublishExportPanelClick);

    renderLocalArticleList();

    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (editId) {
      handleEditLocalArticle(editId);
    }
  }

  function renderLocalArticleList() {
    const localArticleList = document.querySelector("#localArticleList");
    const count = document.querySelector("#localArticleListCount");
    if (!localArticleList || !count) {
      return;
    }

    const articles = sortArticlesByDateDesc(getLocalArticles());
    count.textContent = `共 ${articles.length} 篇本地文章`;

    if (articles.length === 0) {
      localArticleList.innerHTML = `<p class="empty-state">暂无本地文章，请在上方添加。</p>`;
      return;
    }

    localArticleList.innerHTML = articles.map((article) => {
      return `
        <article class="article-card admin-article-card" data-local-id="${escapeHTML(article.id)}">
          <div class="article-card-body">
            <p class="article-meta">${escapeHTML(article.date || "未填写日期")} · <span class="tag">${escapeHTML(getDisplayCategory(article))}</span> ${renderSourceTag(article)}</p>
            <h2>${escapeHTML(article.title)}</h2>
            <p>${escapeHTML(article.summary || "暂无摘要")}</p>
          </div>
          <div class="article-actions admin-actions">
            <a class="button button-secondary" href="${getArticleHref(article.id)}">查看</a>
            <button class="button button-link" type="button" data-admin-action="edit" data-id="${escapeHTML(article.id)}">编辑</button>
            <button class="button button-danger" type="button" data-admin-action="delete" data-id="${escapeHTML(article.id)}">删除</button>
            <button class="button button-link" type="button" data-admin-action="export" data-id="${escapeHTML(article.id)}">导出公开</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function handleSaveLocalArticle(event) {
    event.preventDefault();

    const form = event.currentTarget;
    if (form.reportValidity && !form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    const article = {
      title: toText(formData.get("title")),
      date: toText(formData.get("date")),
      category: toText(formData.get("category")),
      summary: toText(formData.get("summary")),
      content: toText(formData.get("content")),
      link: toText(formData.get("link"))
    };

    if (!article.title || !article.date) {
      showAdminMessage("标题和日期为必填项。", "error");
      return;
    }

    try {
      if (adminState.editingId) {
        const updatedArticle = updateLocalArticle(adminState.editingId, article);
        if (!updatedArticle) {
          showAdminMessage("没有找到要更新的本地文章。", "error");
          return;
        }

        resetArticleForm();
        renderLocalArticleList();
        showAdminMessage("文章已更新。");
        return;
      }

      addLocalArticle(article);
      resetArticleForm();
      renderLocalArticleList();
      showAdminMessage("文章已保存。");
    } catch (error) {
      showAdminMessage("保存失败，可能是浏览器 localStorage 空间不足或被禁用。", "error");
    }
  }

  function handleEditLocalArticle(id) {
    const article = getLocalArticleById(id);
    if (!article) {
      showAdminMessage("没有找到这篇本地文章，无法编辑。静态文章不能在管理页编辑。", "error");
      resetArticleForm();
      return;
    }

    const form = document.querySelector("#localArticleForm");
    const formTitle = document.querySelector("#localArticleFormTitle");
    const formHint = document.querySelector("#adminFormHint");
    const cancelButton = document.querySelector("#cancelArticleEditButton");
    const saveButton = document.querySelector("#saveLocalArticleButton");

    if (!form) {
      return;
    }

    adminState.editingId = article.id;
    setFieldValue("#localArticleIdInput", article.id);
    setFieldValue("#localArticleTitleInput", article.title);
    setFieldValue("#localArticleDateInput", article.date || getTodayDateString());
    setFieldValue("#localArticleCategoryInput", article.category);
    setFieldValue("#localArticleSummaryInput", article.summary);
    setFieldValue("#localArticleLinkInput", article.link);
    setFieldValue("#localArticleContentInput", article.content);

    if (formTitle) {
      formTitle.textContent = "编辑本地文章";
    }

    if (formHint) {
      formHint.textContent = `正在编辑：${article.title}`;
    }

    if (cancelButton) {
      cancelButton.classList.remove("hidden");
    }

    if (saveButton) {
      saveButton.textContent = "保存修改";
    }

    updateAdminEditQuery(article.id);
    form.scrollIntoView({ behavior: "smooth", block: "start" });

    const titleInput = document.querySelector("#localArticleTitleInput");
    if (titleInput) {
      titleInput.focus();
    }
  }

  function handleDeleteLocalArticle(id) {
    const article = getLocalArticleById(id);
    if (!article) {
      showAdminMessage("没有找到要删除的本地文章。", "error");
      return;
    }

    if (!confirm(`确定删除《${article.title}》吗？此操作只会删除当前浏览器中的本地文章。`)) {
      return;
    }

    const deleted = deleteLocalArticle(id);
    if (!deleted) {
      showAdminMessage("删除失败，没有找到对应文章。", "error");
      return;
    }

    if (adminState.editingId === id) {
      resetArticleForm();
    }

    renderLocalArticleList();
    showAdminMessage("文章已删除。");
  }

  function exportLocalArticleForPublish(id) {
    const article = getLocalArticleById(id);
    const panel = document.querySelector("#publish-export-panel");
    if (!panel) {
      return;
    }

    if (!article) {
      showAdminMessage("没有找到要导出的本地文章。静态文章不需要从这里导出。", "error");
      closePublishExportPanel();
      return;
    }

    const filePath = generatePublishFileName(article);
    const markdownContent = article.content || createDefaultPublishMarkdown(article);
    const jsonSnippet = generatePublishJsonSnippet(article, filePath);

    panel.innerHTML = `
      <div class="section-heading export-heading">
        <div>
          <p class="page-label">PUBLISH</p>
          <h2 id="publishExportTitle">导出为公开文章</h2>
          <p class="muted-text">将这篇本地文章转换为可提交到 GitHub 的 Markdown 文件和 articles.json 片段。</p>
        </div>
        <button class="button button-secondary" type="button" data-export-close>关闭导出面板</button>
      </div>

      <p id="publishExportStatus" class="notice export-copy-status hidden" aria-live="polite"></p>

      <div class="export-steps">
        <p>使用方法：</p>
        <ol>
          <li>在 posts/ 目录中新建上方文件名对应的 Markdown 文件</li>
          <li>将 Markdown 内容复制进去</li>
          <li>打开 data/articles.json</li>
          <li>将 JSON 片段添加到数组中</li>
          <li>提交并推送到 GitHub</li>
          <li>GitHub Pages 更新后，所有人都能看到这篇文章</li>
        </ol>
      </div>

      <label class="field export-field" for="publishFileNameOutput">
        <span>Markdown 文件名</span>
        <textarea id="publishFileNameOutput" class="export-textarea export-file-output" readonly rows="2">${escapeHTML(filePath)}</textarea>
      </label>
      <div class="form-actions export-actions">
        <button class="button button-copy" type="button" data-export-copy="file">复制 Markdown 文件名</button>
      </div>

      <label class="field export-field" for="publishMarkdownOutput">
        <span>Markdown 文件内容</span>
        <textarea id="publishMarkdownOutput" class="export-textarea export-markdown-output" readonly>${escapeHTML(markdownContent)}</textarea>
      </label>
      <div class="form-actions export-actions">
        <button class="button button-copy" type="button" data-export-copy="markdown">复制 Markdown 内容</button>
      </div>

      <label class="field export-field" for="publishJsonOutput">
        <span>articles.json 片段</span>
        <textarea id="publishJsonOutput" class="export-textarea export-json-output" readonly>${escapeHTML(jsonSnippet)}</textarea>
      </label>
      <div class="form-actions export-actions">
        <button class="button button-copy" type="button" data-export-copy="json">复制 JSON 片段</button>
        <button class="button button-secondary" type="button" data-export-close>关闭导出面板</button>
      </div>
    `;

    panel.classList.remove("hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function generatePublishFileName(article) {
    const id = toText(article && article.id);
    const title = toText(article && article.title);
    const source = id || title || `local-${Date.now()}`;
    const safeName = source
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `local-${Date.now()}`;

    return `posts/${safeName}.md`;
  }

  function generatePublishJsonSnippet(article, filePath) {
    const snippet = {
      id: toText(article && article.id),
      title: toText(article && article.title),
      date: toText(article && article.date),
      category: toText(article && article.category),
      summary: toText(article && article.summary),
      file: toText(filePath),
      link: toText(article && article.link)
    };

    return JSON.stringify(snippet, null, 2);
  }

  function createDefaultPublishMarkdown(article) {
    const title = toText(article && article.title) || "文章标题";
    return `# ${title}

## 学习内容

这里写学习内容。

## 今日收获

这里写今日收获。

## 下一步计划

这里写下一步计划。`;
  }

  async function copyText(text) {
    const value = String(text || "");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (error) {
        return copyTextWithFallback(value);
      }
    }

    return copyTextWithFallback(value);
  }

  function copyTextWithFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      return document.execCommand("copy");
    } catch (error) {
      return false;
    } finally {
      textarea.remove();
    }
  }

  async function handlePublishExportPanelClick(event) {
    const closeButton = event.target.closest("[data-export-close]");
    if (closeButton) {
      closePublishExportPanel();
      return;
    }

    const copyButton = event.target.closest("[data-export-copy]");
    if (!copyButton) {
      return;
    }

    const targetMap = {
      file: "#publishFileNameOutput",
      markdown: "#publishMarkdownOutput",
      json: "#publishJsonOutput"
    };
    const targetSelector = targetMap[copyButton.dataset.exportCopy];
    const target = targetSelector ? document.querySelector(targetSelector) : null;
    if (!target) {
      showPublishExportStatus("复制失败，请手动复制", "error");
      return;
    }

    const copied = await copyText(target.value);
    showPublishExportStatus(copied ? "已复制" : "复制失败，请手动复制", copied ? "" : "error");
  }

  function showPublishExportStatus(message, type) {
    const status = document.querySelector("#publishExportStatus");
    if (!status) {
      return;
    }

    status.textContent = message;
    status.classList.remove("hidden");
    status.classList.toggle("notice-error", type === "error");
  }

  function closePublishExportPanel() {
    const panel = document.querySelector("#publish-export-panel");
    if (!panel) {
      return;
    }

    panel.innerHTML = "";
    panel.classList.add("hidden");
  }

  function resetArticleForm() {
    const form = document.querySelector("#localArticleForm");
    const formTitle = document.querySelector("#localArticleFormTitle");
    const formHint = document.querySelector("#adminFormHint");
    const cancelButton = document.querySelector("#cancelArticleEditButton");
    const saveButton = document.querySelector("#saveLocalArticleButton");
    const dateInput = document.querySelector("#localArticleDateInput");

    adminState.editingId = "";

    if (form) {
      form.reset();
    }

    if (dateInput) {
      dateInput.value = getTodayDateString();
    }

    if (formTitle) {
      formTitle.textContent = "新增本地文章";
    }

    if (formHint) {
      formHint.textContent = "填写后保存到当前浏览器，刷新页面后仍然存在。";
    }

    if (cancelButton) {
      cancelButton.classList.add("hidden");
    }

    if (saveButton) {
      saveButton.textContent = "保存文章";
    }

    updateAdminEditQuery("");
  }

  function setFieldValue(selector, value) {
    const field = document.querySelector(selector);
    if (field) {
      field.value = value || "";
    }
  }

  function showAdminMessage(message, type) {
    const notice = document.querySelector("#adminNotice");
    if (!notice) {
      return;
    }

    notice.textContent = message;
    notice.hidden = false;
    notice.classList.toggle("notice-error", type === "error");
  }

  function updateAdminEditQuery(articleId) {
    if (!window.history || !window.history.replaceState) {
      return;
    }

    const url = new URL(window.location.href);
    if (articleId) {
      url.searchParams.set("edit", articleId);
    } else {
      url.searchParams.delete("edit");
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function renderAboutPage() {
    aboutState.defaultData = await loadDefaultAbout();
    aboutState.current = getLocalAbout() || aboutState.defaultData;
    renderAboutView();
  }

  function renderAboutView(message) {
    const page = document.querySelector("#aboutPage");
    if (!page || !aboutState.current) {
      return;
    }

    const about = normalizeAbout(aboutState.current);
    page.innerHTML = `
      <div class="about-toolbar">
        <button class="button button-secondary" type="button" id="editAboutButton">编辑本页</button>
      </div>
      ${message ? `<p class="notice">${escapeHTML(message)}</p>` : ""}
      <div class="page-header-row">
        <header class="page-header">
          <p class="page-label">${escapeHTML(about.label)}</p>
          <h1>${escapeHTML(about.title)}</h1>
          <div class="page-desc rich-text">${renderRichText(about.description)}</div>
        </header>
      </div>

      <hr class="paper-divider">

      ${about.sections.map((section) => `
        <section class="about-section" id="${escapeHTML(section.id)}">
          <h2>${escapeHTML(section.title)}</h2>
          <div class="rich-text">${renderRichText(section.content)}</div>
        </section>
      `).join("")}
    `;

    const editButton = document.querySelector("#editAboutButton");
    if (editButton) {
      editButton.addEventListener("click", enterAboutEditMode);
    }
  }

  function renderRichText(value) {
    const text = toText(value);
    if (!text) {
      return "";
    }

    if (/<\/?[a-z][\s\S]*>/i.test(text)) {
      return sanitizeRichHTML(text);
    }

    return text.split(/\n{2,}/).map((paragraph) => {
      return `<p>${escapeHTML(paragraph).replace(/\n/g, "<br>")}</p>`;
    }).join("");
  }

  function sanitizeRichHTML(htmlText) {
    const template = document.createElement("template");
    const allowedTags = new Set(["A", "P", "BR", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "CODE", "PRE", "H2", "H3", "H4", "SPAN"]);
    template.innerHTML = htmlText;

    cleanElement(template.content);
    return template.innerHTML;

    function cleanElement(parent) {
      Array.from(parent.children).forEach((child) => {
        if (!allowedTags.has(child.tagName)) {
          while (child.firstChild) {
            parent.insertBefore(child.firstChild, child);
          }
          child.remove();
          cleanElement(parent);
          return;
        }

        Array.from(child.attributes).forEach((attribute) => {
          const name = attribute.name.toLowerCase();

          if (name.startsWith("on") || name === "style") {
            child.removeAttribute(attribute.name);
            return;
          }

          if (child.tagName !== "A") {
            child.removeAttribute(attribute.name);
            return;
          }

          if (name === "href") {
            const safeHref = getSafeContentLink(attribute.value);
            if (safeHref) {
              child.setAttribute("href", safeHref);
              child.setAttribute("target", "_blank");
              child.setAttribute("rel", "noopener noreferrer");
            } else {
              child.removeAttribute("href");
            }
            return;
          }

          if (name !== "target" && name !== "rel") {
            child.removeAttribute(attribute.name);
          }
        });

        if (child.tagName === "A" && child.getAttribute("href")) {
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        }

        cleanElement(child);
      });
    }
  }

  function renderAboutEditForm() {
    const page = document.querySelector("#aboutPage");
    if (!page || !aboutState.current) {
      return;
    }

    const about = normalizeAbout(aboutState.current);
    page.innerHTML = `
      <header class="page-header">
        <p class="page-label">EDIT</p>
        <h1>编辑关于页</h1>
        <p class="page-desc">保存后内容会写入当前浏览器的 localStorage。</p>
      </header>

      <form class="about-edit-form" id="aboutEditForm">
        <label class="field" for="aboutLabelInput">
          <span>页面标签</span>
          <input id="aboutLabelInput" name="label" type="text" value="${escapeHTML(about.label)}">
        </label>

        <label class="field" for="aboutTitleInput">
          <span>页面标题</span>
          <input id="aboutTitleInput" name="title" type="text" value="${escapeHTML(about.title)}">
        </label>

        <label class="field" for="aboutDescriptionInput">
          <span>页面简介</span>
          <textarea id="aboutDescriptionInput" name="description">${escapeHTML(about.description)}</textarea>
        </label>

        ${about.sections.map((section, index) => `
          <section class="edit-section">
            <h2>模块 ${index + 1}</h2>
            <label class="field" for="aboutSectionTitle${index}">
              <span>模块标题</span>
              <input id="aboutSectionTitle${index}" name="sectionTitle${index}" type="text" value="${escapeHTML(section.title)}">
            </label>
            <label class="field" for="aboutSectionContent${index}">
              <span>模块内容</span>
              <textarea id="aboutSectionContent${index}" name="sectionContent${index}">${escapeHTML(section.content)}</textarea>
            </label>
          </section>
        `).join("")}

        <div class="form-actions">
          <button class="button" type="submit">保存</button>
          <button class="button button-secondary" type="button" id="cancelAboutEditButton">取消</button>
          <button class="button button-danger" type="button" id="resetAboutButton">恢复默认</button>
        </div>
      </form>
    `;

    const form = document.querySelector("#aboutEditForm");
    const cancelButton = document.querySelector("#cancelAboutEditButton");
    const resetButton = document.querySelector("#resetAboutButton");

    if (form) {
      form.addEventListener("submit", saveAboutFromPage);
    }

    if (cancelButton) {
      cancelButton.addEventListener("click", cancelAboutEditMode);
    }

    if (resetButton) {
      resetButton.addEventListener("click", resetAboutToDefault);
    }
  }

  function enterAboutEditMode() {
    renderAboutEditForm();
  }

  function cancelAboutEditMode() {
    aboutState.current = getLocalAbout() || aboutState.defaultData || DEFAULT_ABOUT;
    renderAboutView();
  }

  function saveAboutFromPage(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const previous = normalizeAbout(aboutState.current);
    const formData = new FormData(form);
    const sections = previous.sections.map((section, index) => {
      return {
        id: section.id,
        title: toText(formData.get(`sectionTitle${index}`)),
        content: toText(formData.get(`sectionContent${index}`))
      };
    });

    aboutState.current = saveLocalAbout({
      label: toText(formData.get("label")),
      title: toText(formData.get("title")),
      description: toText(formData.get("description")),
      sections
    });
    renderAboutView("保存成功。");
  }

  async function resetAboutToDefault() {
    if (!confirm("确定恢复默认关于页内容吗？这会删除当前浏览器中的本地修改。")) {
      return;
    }

    clearLocalAbout();
    aboutState.defaultData = await loadDefaultAbout();
    aboutState.current = aboutState.defaultData;
    renderAboutView("已恢复默认内容。");
  }

  document.addEventListener("DOMContentLoaded", initPage);
}());
