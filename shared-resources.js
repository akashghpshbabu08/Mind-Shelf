const grid = document.getElementById("resourceGrid");
const searchInput = document.getElementById("searchInput");
const subjectFilter = document.getElementById("subjectFilter");
const typeFilter = document.getElementById("typeFilter");
const sortSelect = document.getElementById("sortSelect");
const previewModal = document.getElementById("previewModal");
const shareModal = document.getElementById("shareModal");
const toast = document.getElementById("toast");

let resources = [];
let bookmarks = new Set();
let activeTab = "all";
let currentView = "grid";
let selectedResourceId = null;
let lastFocusedElement = null;
let currentUser = null;
let toastTimer;

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

function safeUrl(value) {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function mapResource(resource) {
    const typeMap = { pdf: "PDF", video: "Video", link: "Link", document: "Guide", other: "Note" };
    const owner = resource.owner && typeof resource.owner === "object"
        ? resource.owner : null;
    return {
        id: String(resource._id),
        title: resource.title,
        subject: resource.subject,
        type: typeMap[resource.type] || "Other",
        description: resource.description || "",
        author: owner?.name || "MindShelf member",
        date: resource.createdAt,
        views: 0,
        link: safeUrl(resource.url || ""),
        bookmarked: Array.isArray(resource.bookmarks) &&
            resource.bookmarks.some(id => String(id) === String(currentUser?._id || currentUser?.id))
    };
}

async function loadResources() {
    currentUser = await requireAuth();
    if (!currentUser) return;
    try {
        const { resources: result } = await apiRequest("/resources");
        resources = result.map(mapResource);
        bookmarks = new Set(resources.filter(item => item.bookmarked).map(item => item.id));
        const query = new URLSearchParams(window.location.search).get("q");
        if (query) searchInput.value = query;
        renderResources();
    } catch (error) {
        showToast(error.message);
    }
}

function getResource(id) {
    return resources.find(item => item.id === id);
}

function getIcon(type) {
    if (type === "PDF") return "▤";
    if (type === "Video") return "▷";
    if (type === "Guide") return "✎";
    if (type === "Link") return "↗";
    return "▧";
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
    });
}

function updateSubjects() {
    const selected = subjectFilter.value;
    const subjects = [...new Set(resources.map(item => item.subject).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
    subjectFilter.replaceChildren(new Option("All subjects", "all"));
    subjects.forEach(subject => subjectFilter.add(new Option(subject, subject)));
    subjectFilter.value = subjects.includes(selected) ? selected : "all";
}

function getFilteredResources() {
    const search = searchInput.value.trim().toLowerCase();
    let result = resources.filter(item =>
        [item.title, item.subject, item.description, item.author]
            .some(value => value.toLowerCase().includes(search)) &&
        (subjectFilter.value === "all" || item.subject === subjectFilter.value) &&
        (typeFilter.value === "all" || item.type === typeFilter.value) &&
        (activeTab !== "bookmarks" || bookmarks.has(item.id))
    );
    if (activeTab === "popular" || sortSelect.value === "popular") {
        result.sort((a, b) => b.views - a.views);
    } else if (sortSelect.value === "name") {
        result.sort((a, b) => a.title.localeCompare(b.title));
    } else {
        result.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return result;
}

function renderResources() {
    updateSubjects();
    const items = getFilteredResources();
    grid.replaceChildren();
    grid.className = "resource-grid";
    if (currentView === "list") grid.classList.add("list-view");
    document.getElementById("clearSearch").hidden = !searchInput.value;
    document.getElementById("resultsCount").textContent =
        `${items.length} ${items.length === 1 ? "resource" : "resources"} found`;
    document.getElementById("resourceCount").textContent = resources.length;
    document.getElementById("bookmarkCount").textContent = bookmarks.size;
    document.getElementById("contributorCount").textContent =
        new Set(resources.map(item => item.author)).size;

    const emptyState = document.getElementById("emptyState");
    if (!items.length) {
        grid.hidden = true;
        emptyState.hidden = false;
        document.getElementById("emptyTitle").textContent =
            activeTab === "bookmarks" ? "No bookmarks yet." : "No resources found.";
        document.getElementById("emptyMessage").textContent =
            activeTab === "bookmarks"
                ? "Bookmark useful resources and they will appear here."
                : "Try another search or change your filters.";
        document.getElementById("resetFilters").hidden =
            activeTab === "bookmarks" && bookmarks.size === 0;
        return;
    }
    grid.hidden = false;
    emptyState.hidden = true;
    items.forEach(item => {
        const card = document.createElement("article");
        card.className = "resource-card";
        const isSaved = bookmarks.has(item.id);
        card.innerHTML = `
            <div class="resource-top">
                <div class="type-icon ${item.type.toLowerCase()}">${getIcon(item.type)}</div>
                <button class="bookmark-btn ${isSaved ? "saved" : ""}"
                    data-bookmark="${escapeHTML(item.id)}"
                    aria-label="${isSaved ? "Remove bookmark" : "Bookmark resource"}"
                    aria-pressed="${isSaved}">${isSaved ? "♥" : "♡"}</button>
            </div>
            <span class="resource-type">${escapeHTML(item.type)}</span>
            <h3>${escapeHTML(item.title)}</h3>
            <p class="resource-description">${escapeHTML(item.description)}</p>
            <span class="resource-subject">◈ ${escapeHTML(item.subject)}</span>
            <div class="resource-footer">
                <span class="author">By ${escapeHTML(item.author)}</span>
                <div class="resource-stats"><span>${formatDate(item.date)}</span></div>
            </div>
            <div class="resource-actions">
                <button class="preview-btn" data-preview="${escapeHTML(item.id)}">Preview details</button>
                ${item.link ? `<button class="open-btn" data-open="${escapeHTML(item.id)}">Open ↗</button>` : ""}
            </div>`;
        grid.appendChild(card);
    });
}

grid.addEventListener("click", event => {
    const bookmarkButton = event.target.closest("[data-bookmark]");
    const previewButton = event.target.closest("[data-preview]");
    const openButton = event.target.closest("[data-open]");
    if (bookmarkButton) toggleBookmark(bookmarkButton.dataset.bookmark);
    else if (previewButton) openPreview(previewButton.dataset.preview);
    else if (openButton) openResourceLink(openButton.dataset.open);
});

async function toggleBookmark(id) {
    const item = getResource(id);
    if (!item) return;
    try {
        const result = await apiRequest(`/resources/${encodeURIComponent(id)}/bookmark`, {
            method: "POST"
        });
        item.bookmarked = result.bookmarked;
        if (result.bookmarked) bookmarks.add(id);
        else bookmarks.delete(id);
        renderResources();
        if (!previewModal.hidden && selectedResourceId === id) updatePreviewBookmark();
        showToast(result.message);
    } catch (error) {
        showToast(error.message);
    }
}

function openResourceLink(id) {
    const url = safeUrl(getResource(id)?.link || "");
    if (!url) return showToast("No external link is available for this resource.");
    window.open(url, "_blank", "noopener,noreferrer");
}

function openPreview(id) {
    const item = getResource(id);
    if (!item) return;
    selectedResourceId = id;
    lastFocusedElement = document.activeElement;
    document.getElementById("previewTitle").textContent = item.title;
    document.getElementById("previewMeta").innerHTML = `
        <span>${escapeHTML(item.type)}</span>
        <span>${escapeHTML(item.subject)}</span>
        <span>Shared ${formatDate(item.date)}</span>`;
    document.getElementById("previewDescription").textContent = item.description;
    document.getElementById("previewAuthor").textContent = item.author;
    document.getElementById("previewType").textContent = item.type;
    const openButton = document.getElementById("openResource");
    openButton.hidden = !item.link;
    if (item.link) openButton.href = item.link;
    else openButton.removeAttribute("href");
    updatePreviewBookmark();
    previewModal.hidden = false;
    document.getElementById("closePreview").focus();
}

function updatePreviewBookmark() {
    const button = document.getElementById("previewBookmark");
    const saved = bookmarks.has(selectedResourceId);
    button.textContent = saved ? "♥ Bookmarked" : "♡ Bookmark";
    button.setAttribute("aria-pressed", String(saved));
}

function closePreview() {
    previewModal.hidden = true;
    selectedResourceId = null;
    lastFocusedElement?.focus();
}
document.getElementById("closePreview").addEventListener("click", closePreview);
previewModal.addEventListener("click", event => {
    if (event.target === previewModal) closePreview();
});
document.getElementById("previewBookmark").addEventListener("click", () => {
    if (selectedResourceId) toggleBookmark(selectedResourceId);
});

document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
    activeTab = button.dataset.tab;
    document.querySelectorAll(".tab").forEach(tab =>
        tab.classList.toggle("active", tab === button)
    );
    renderResources();
}));
searchInput.addEventListener("input", renderResources);
subjectFilter.addEventListener("change", renderResources);
typeFilter.addEventListener("change", renderResources);
sortSelect.addEventListener("change", renderResources);
document.getElementById("clearSearch").addEventListener("click", () => {
    searchInput.value = "";
    renderResources();
    searchInput.focus();
});
document.getElementById("resetFilters").addEventListener("click", () => {
    searchInput.value = "";
    subjectFilter.value = typeFilter.value = "all";
    sortSelect.value = "newest";
    activeTab = "all";
    document.querySelectorAll(".tab").forEach(tab =>
        tab.classList.toggle("active", tab.dataset.tab === "all")
    );
    renderResources();
});
document.querySelectorAll(".view-btn").forEach(button => button.addEventListener("click", () => {
    currentView = button.dataset.view;
    document.querySelectorAll(".view-btn").forEach(item =>
        item.classList.toggle("active", item === button)
    );
    renderResources();
}));
document.getElementById("exploreBtn").addEventListener("click", () => {
    document.getElementById("resourceSection").scrollIntoView({ behavior: "smooth" });
    searchInput.focus({ preventScroll: true });
});

function openShareModal() {
    lastFocusedElement = document.activeElement;
    document.getElementById("shareForm").reset();
    document.getElementById("shareError").textContent = "";
    shareModal.hidden = false;
    document.getElementById("shareName").focus();
}
function closeShareModal() {
    shareModal.hidden = true;
    lastFocusedElement?.focus();
}
document.getElementById("shareBtn").addEventListener("click", openShareModal);
document.getElementById("closeShare").addEventListener("click", closeShareModal);
document.getElementById("cancelShare").addEventListener("click", closeShareModal);
shareModal.addEventListener("click", event => {
    if (event.target === shareModal) closeShareModal();
});
document.getElementById("shareForm").addEventListener("submit", async event => {
    event.preventDefault();
    const errorElement = document.getElementById("shareError");
    const body = {
        title: document.getElementById("shareName").value.trim(),
        subject: document.getElementById("shareSubject").value.trim(),
        type: document.getElementById("shareType").value,
        description: document.getElementById("shareDescription").value.trim(),
        url: document.getElementById("shareUrl").value.trim()
    };
    if (!body.title || !body.subject || !body.description || !body.url) {
        errorElement.textContent = "Please complete all fields.";
        return;
    }
    const typeMap = { PDF: "pdf", Video: "video", Link: "link", Guide: "document", Note: "other" };
    const button = event.submitter;
    button.disabled = true;
    try {
        const result = await apiRequest("/resources", {
            method: "POST",
            body: JSON.stringify({ ...body, type: typeMap[body.type] || "other" })
        });
        resources.unshift(mapResource({
            ...result.resource,
            owner: { _id: currentUser.id || currentUser._id, name: currentUser.name }
        }));
        closeShareModal();
        searchInput.value = "";
        subjectFilter.value = typeFilter.value = "all";
        activeTab = "all";
        renderResources();
        showToast("Resource shared with the community.");
    } catch (error) {
        errorElement.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
document.addEventListener("click", event => {
    if (window.innerWidth <= 850 && sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
        sidebar.classList.remove("open");
    }
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (!previewModal.hidden) closePreview();
        else if (!shareModal.hidden) closeShareModal();
        else sidebar.classList.remove("open");
    }
});

loadResources();
