const grid = document.getElementById("collectionsGrid");
const modal = document.getElementById("collectionModal");
const detailModal = document.getElementById("detailModal");
const form = document.getElementById("collectionForm");
const searchInput = document.getElementById("searchInput");
const subjectFilter = document.getElementById("subjectFilter");
const sortSelect = document.getElementById("sortSelect");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");

let collections = [];
let activeCollectionId = null;
let editingId = null;
let activeNotes = [];
let lastFocusedElement = null;
let toastTimer;

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function getCollection(id) {
    return collections.find(collection => collection.id === id);
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";
    return date.toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
    });
}

async function loadCollections() {
    const user = await requireAuth();
    if (!user) return;
    try {
        const result = await apiRequest("/collections");
        collections = result.collections.map(collection => ({
            ...collection,
            id: String(collection._id)
        }));
        updateProfile(user);
        renderCollections();
    } catch (error) {
        showToast(error.message);
    }
}

function updateProfile(user) {
    const initials = user.name.trim().split(/\s+/)
        .slice(0, 2).map(part => part[0]).join("").toUpperCase() || "S";
    ["sideUserName", "menuUserName"].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = user.name;
    });
    ["sideAvatar", "topAvatar"].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = initials;
    });
}

function getFilteredCollections() {
    const search = searchInput.value.trim().toLowerCase();
    const subject = subjectFilter.value;
    const items = collections.filter(collection =>
        (collection.name + " " + collection.subject + " " +
            (collection.description || "")).toLowerCase().includes(search) &&
        (subject === "all" || collection.subject === subject)
    );
    if (sortSelect.value === "name") {
        items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortSelect.value === "resources") {
        items.sort((a, b) => b.noteCount - a.noteCount);
    } else {
        items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    return items;
}

function updateStats() {
    document.getElementById("totalCount").textContent = collections.length;
    document.getElementById("resourceCount").textContent =
        collections.reduce((total, item) => total + (item.noteCount || 0), 0);
    document.getElementById("subjectCount").textContent =
        new Set(collections.map(item => item.subject).filter(Boolean)).size;
}

function updateSubjectOptions() {
    const selected = subjectFilter.value;
    const subjects = [...new Set(collections.map(item => item.subject).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
    subjectFilter.replaceChildren(new Option("All subjects", "all"));
    subjects.forEach(subject => subjectFilter.add(new Option(subject, subject)));
    subjectFilter.value = subjects.includes(selected) ? selected : "all";
}

function renderCollections() {
    updateStats();
    updateSubjectOptions();
    const items = getFilteredCollections();
    grid.className = "collections-grid";
    if (document.querySelector('.view-btn.active')?.dataset.view === "list") {
        grid.classList.add("list-view");
    }
    grid.replaceChildren();
    document.getElementById("visibleCount").textContent =
        `${items.length} ${items.length === 1 ? "collection" : "collections"}`;
    document.getElementById("clearSearch").hidden = !searchInput.value;

    if (!items.length) {
        emptyState.hidden = false;
        grid.hidden = true;
        const hasCollections = collections.length > 0;
        document.getElementById("emptyTitle").textContent =
            hasCollections ? "No collections found." : "Your space is waiting.";
        document.getElementById("emptyMessage").textContent = hasCollections
            ? "Try another search or change your filters."
            : "Create your first collection and start organizing your learning.";
        document.getElementById("emptyCreateBtn").hidden = hasCollections;
        return;
    }

    emptyState.hidden = true;
    grid.hidden = false;
    items.forEach((item, index) => {
        const card = document.createElement("article");
        card.className = "collection-card";
        const color = ["", "color-1", "color-2", "color-3", "color-4"][index % 5];
        card.innerHTML = `
            <div class="card-top">
                <div class="folder-icon ${color}">▣</div>
                <div class="card-menu-wrap">
                    <button class="card-menu-btn" data-action="menu"
                        data-id="${escapeHTML(item.id)}" aria-label="Collection options"
                        aria-expanded="false">⋯</button>
                    <div class="card-menu" hidden>
                        <button data-action="edit" data-id="${escapeHTML(item.id)}">Edit</button>
                        <button data-action="open" data-id="${escapeHTML(item.id)}">Open</button>
                        <button class="danger" data-action="delete"
                            data-id="${escapeHTML(item.id)}">Delete</button>
                    </div>
                </div>
            </div>
            <h3 class="card-title">${escapeHTML(item.name)}</h3>
            <p class="card-description">
                ${escapeHTML(item.description || "Your notes in one place.")}
            </p>
            <div class="card-bottom">
                <span class="subject-pill">${escapeHTML(item.subject || "General")}</span>
                <span class="resource-count">${item.noteCount || 0}
                    ${(item.noteCount || 0) === 1 ? "note" : "notes"}</span>
            </div>
            <div class="card-footer">
                <span>Updated ${formatDate(item.updatedAt)}</span>
                <button class="open-collection" data-action="open"
                    data-id="${escapeHTML(item.id)}">Open collection →</button>
            </div>`;
        grid.appendChild(card);
    });
}

function openModal(id = null) {
    editingId = id;
    lastFocusedElement = document.activeElement;
    form.reset();
    document.getElementById("formError").textContent = "";
    const item = id ? getCollection(id) : null;
    document.getElementById("modalTitle").textContent =
        item ? "Edit Collection" : "New Collection";
    document.getElementById("saveCollection").textContent =
        item ? "Save Changes" : "Create Collection";
    if (item) {
        document.getElementById("collectionName").value = item.name;
        document.getElementById("collectionSubject").value = item.subject;
        document.getElementById("collectionDescription").value = item.description || "";
    }
    modal.hidden = false;
    document.getElementById("collectionName").focus();
}

function closeModal() {
    modal.hidden = true;
    editingId = null;
    lastFocusedElement?.focus();
}

document.getElementById("createBtn").addEventListener("click", () => openModal());
document.getElementById("emptyCreateBtn").addEventListener("click", () => openModal());
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);
modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
});

form.addEventListener("submit", async event => {
    event.preventDefault();
    const body = {
        name: document.getElementById("collectionName").value.trim(),
        subject: document.getElementById("collectionSubject").value,
        description: document.getElementById("collectionDescription").value.trim()
    };
    const error = document.getElementById("formError");
    if (!body.name || !body.subject) {
        error.textContent = "Please enter a name and choose a subject.";
        return;
    }
    const button = document.getElementById("saveCollection");
    button.disabled = true;
    const wasEditing = Boolean(editingId);
    try {
        if (editingId) {
            const previous = getCollection(editingId);
            const result = await apiRequest(`/collections/${encodeURIComponent(editingId)}`, {
                method: "PATCH", body: JSON.stringify(body)
            });
            collections = collections.map(item =>
                item.id === editingId ? {
                    ...result.collection,
                    id: String(result.collection._id),
                    noteCount: previous.noteCount
                } : item
            );
        } else {
            const result = await apiRequest("/collections", {
                method: "POST", body: JSON.stringify(body)
            });
            collections.unshift({ ...result.collection, id: String(result.collection._id), noteCount: 0 });
        }
        closeModal();
        renderCollections();
        showToast(wasEditing ? "Collection updated." : "Collection created.");
    } catch (error) {
        document.getElementById("formError").textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

grid.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "menu") {
        const menu = button.parentElement.querySelector(".card-menu");
        const shouldOpen = menu.hidden;
        document.querySelectorAll(".card-menu").forEach(element => element.hidden = true);
        document.querySelectorAll(".card-menu-btn").forEach(element =>
            element.setAttribute("aria-expanded", "false")
        );
        menu.hidden = !shouldOpen;
        button.setAttribute("aria-expanded", String(shouldOpen));
    } else if (action === "open") {
        await openDetails(id);
    } else if (action === "edit") {
        openModal(id);
    } else if (action === "delete") {
        await deleteCollection(id);
    }
});

async function deleteCollection(id) {
    const item = getCollection(id);
    if (!item || !confirm(`Delete "${item.name}"? Its notes will be kept.`)) return;
    try {
        await apiRequest(`/collections/${encodeURIComponent(id)}`, { method: "DELETE" });
        collections = collections.filter(collection => collection.id !== id);
        if (activeCollectionId === id) closeDetails();
        renderCollections();
        showToast("Collection deleted. Notes were kept.");
    } catch (error) {
        showToast(error.message);
    }
}

async function openDetails(id) {
    const item = getCollection(id);
    if (!item) return;
    try {
        const result = await apiRequest(`/collections/${encodeURIComponent(id)}/notes`);
        activeNotes = result.notes;
        activeCollectionId = id;
        lastFocusedElement = document.activeElement;
        document.getElementById("detailTitle").textContent = item.name;
        document.getElementById("detailDescription").textContent =
            item.description || "No description added yet.";
        document.getElementById("detailSubject").textContent = item.subject;
        document.getElementById("detailResourceCount").textContent =
            `${activeNotes.length} ${activeNotes.length === 1 ? "note" : "notes"}`;
        const resourceForm = document.getElementById("resourceForm");
        resourceForm.hidden = true;
        resourceForm.reset();
        renderResources();
        detailModal.hidden = false;
        document.getElementById("closeDetail").focus();
    } catch (error) {
        showToast(error.message);
    }
}

function closeDetails() {
    detailModal.hidden = true;
    activeCollectionId = null;
    activeNotes = [];
    lastFocusedElement?.focus();
}

document.getElementById("closeDetail").addEventListener("click", closeDetails);
detailModal.addEventListener("click", event => {
    if (event.target === detailModal) closeDetails();
});
document.getElementById("addResourceBtn").addEventListener("click", () => {
    const resourceForm = document.getElementById("resourceForm");
    resourceForm.hidden = !resourceForm.hidden;
    if (!resourceForm.hidden) document.getElementById("resourceName").focus();
});
document.getElementById("cancelResource").addEventListener("click", () => {
    const resourceForm = document.getElementById("resourceForm");
    resourceForm.reset();
    resourceForm.hidden = true;
});

document.getElementById("resourceForm").addEventListener("submit", async event => {
    event.preventDefault();
    const collection = getCollection(activeCollectionId);
    if (!collection) return;
    const title = document.getElementById("resourceName").value.trim();
    const type = document.getElementById("resourceType").value;
    const rawLink = document.getElementById("resourceLink").value.trim();
    let url = "";
    if (rawLink) {
        try {
            const parsed = new URL(rawLink);
            if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
            url = parsed.href;
        } catch {
            showToast("Please enter a valid HTTP or HTTPS link.");
            return;
        }
    }
    const body = {
        title,
        subject: collection.subject || "General",
        collection: collection.id,
        tags: [type],
        content: url ? `${type} resource: ${url}` : `${type} resource in ${collection.name}`
    };
    const button = event.submitter;
    button.disabled = true;
    try {
        const result = await apiRequest("/notes", {
            method: "POST", body: JSON.stringify(body)
        });
        activeNotes.push(result.note);
        collection.noteCount = activeNotes.length;
        document.getElementById("resourceForm").reset();
        document.getElementById("resourceForm").hidden = true;
        renderResources();
        renderCollections();
        showToast("Note added to the collection.");
    } catch (error) {
        showToast(error.message);
    } finally {
        button.disabled = false;
    }
});

function renderResources() {
    const list = document.getElementById("resourceList");
    document.getElementById("detailResourceCount").textContent =
        `${activeNotes.length} ${activeNotes.length === 1 ? "note" : "notes"}`;
    if (!activeNotes.length) {
        list.innerHTML = '<div class="resource-empty">No notes yet. Add a note to this collection.</div>';
        return;
    }
    list.innerHTML = activeNotes.map(note => {
        const match = String(note.content || "").match(/https?:\/\/\S+/);
        let safeLink = "";
        if (match) {
            try {
                const url = new URL(match[0]);
                if (["http:", "https:"].includes(url.protocol)) safeLink = url.href;
            } catch {}
        }
        return `<div class="resource-item">
            <div class="resource-icon">✎</div>
            <div class="resource-info"><strong>${escapeHTML(note.title)}</strong>
                <small>${escapeHTML((note.tags || []).join(", ") || "Note")}</small></div>
            <div class="resource-action">
                ${safeLink ? `<a href="${escapeHTML(safeLink)}" target="_blank" rel="noopener noreferrer">Open ↗</a>` : ""}
                <button data-note-delete="${escapeHTML(note._id)}"
                    aria-label="Remove ${escapeHTML(note.title)}">×</button>
            </div>
        </div>`;
    }).join("");
}

document.getElementById("resourceList").addEventListener("click", async event => {
    const button = event.target.closest("[data-note-delete]");
    if (!button) return;
    const note = activeNotes.find(item => String(item._id) === button.dataset.noteDelete);
    if (!note || !confirm(`Delete "${note.title}"?`)) return;
    try {
        await apiRequest(`/notes/${encodeURIComponent(note._id)}`, { method: "DELETE" });
        activeNotes = activeNotes.filter(item => String(item._id) !== String(note._id));
        const collection = getCollection(activeCollectionId);
        if (collection) collection.noteCount = activeNotes.length;
        renderResources();
        renderCollections();
        showToast("Note removed from the collection.");
    } catch (error) {
        showToast(error.message);
    }
});

document.addEventListener("click", event => {
    if (!event.target.closest(".card-menu-wrap")) {
        document.querySelectorAll(".card-menu").forEach(menu => menu.hidden = true);
    }
});
searchInput.addEventListener("input", renderCollections);
subjectFilter.addEventListener("change", renderCollections);
sortSelect.addEventListener("change", renderCollections);
document.getElementById("clearSearch").addEventListener("click", () => {
    searchInput.value = "";
    renderCollections();
    searchInput.focus();
});
document.querySelectorAll(".view-btn").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".view-btn").forEach(item =>
        item.classList.toggle("active", item === button)
    );
    renderCollections();
}));

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
        if (!detailModal.hidden) closeDetails();
        else if (!modal.hidden) closeModal();
        else sidebar.classList.remove("open");
    }
});
loadCollections();
