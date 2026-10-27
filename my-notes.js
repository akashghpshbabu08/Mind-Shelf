const notesGrid = document.getElementById("notesGrid");
const emptyState = document.getElementById("emptyState");
const noteModal = document.getElementById("noteModal");
const noteForm = document.getElementById("noteForm");
const noteTitle = document.getElementById("noteTitle");
const noteSubject = document.getElementById("noteSubject");
const noteTags = document.getElementById("noteTags");
const noteContent = document.getElementById("noteContent");
const searchInput = document.getElementById("searchInput");
const subjectFilter = document.getElementById("subjectFilter");
const sortNotes = document.getElementById("sortNotes");
const toast = document.getElementById("toast");

let notes = [];
let activeFilter = "all";
let editingId = null;
let listMode = false;
let toastTimer;

function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function mapNote(note) {
    return {
        ...note,
        id: String(note._id),
        archived: Boolean(note.isArchived || note.archived),
        favorite: Boolean(note.favorite),
        createdAt: new Date(note.createdAt).getTime(),
        updatedAt: new Date(note.updatedAt).getTime()
    };
}

async function loadNotes() {
    const user = await requireAuth();
    if (!user) return;

    try {
        const { notes: records } = await apiRequest("/notes");
        notes = records.map(mapNote);
        const initials = user.name.trim().split(/\s+/)
            .slice(0, 2).map(part => part[0]).join("").toUpperCase() || "S";
        setText("sideUserName", user.name);
        setText("menuUserName", user.name);
        setText("sideAvatar", initials);
        setText("topAvatar", initials);

        const urlFilter = new URLSearchParams(window.location.search).get("filter") || window.location.hash.replace("#", "");
        if (["favorite", "archived", "all"].includes(urlFilter)) {
            activeFilter = urlFilter;
        }

        renderNotes();
    } catch (error) {
        showToast(error.message);
    }
}

function updateStats() {
    const active = notes.filter(note => !note.archived);
    const weekAgo = Date.now() - 7 * 86400000;
    setText("totalNotes", active.length);
    setText("favoriteNotes", active.filter(note => note.favorite).length);
    setText("recentNotes", active.filter(note => note.updatedAt >= weekAgo).length);
    setText("sideNoteCount", active.length);
    setText("allTabCount", active.length);

    const bar = document.getElementById("storageBar");
    if (bar) {
        const used = new Blob([JSON.stringify(notes)]).size;
        bar.style.width = Math.min(100, Math.max(5, used / 50000 * 100)) + "%";
    }
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
    if (diff < 604800000) return Math.floor(diff / 86400000) + "d ago";
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function populateSubjects() {
    const selected = subjectFilter.value || "all";
    const subjects = [...new Set(
        notes.filter(note => !note.archived).map(note => note.subject).filter(Boolean)
    )].sort();
    subjectFilter.replaceChildren(new Option("All subjects", "all"));
    subjects.forEach(subject => subjectFilter.add(new Option(subject, subject)));
    subjectFilter.value = subjects.includes(selected) ? selected : "all";
}

function getVisibleNotes() {
    let visible = notes.filter(note => {
        if (activeFilter === "archived") return note.archived;
        if (note.archived) return false;
        return activeFilter !== "favorite" || note.favorite;
    });
    if (subjectFilter.value !== "all") {
        visible = visible.filter(note => note.subject === subjectFilter.value);
    }
    const query = searchInput.value.trim().toLowerCase();
    if (query) {
        visible = visible.filter(note =>
            [note.title, note.subject, note.content, ...(note.tags || [])]
                .join(" ").toLowerCase().includes(query)
        );
    }
    if (sortNotes.value === "title") {
        visible.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortNotes.value === "created") {
        visible.sort((a, b) => b.createdAt - a.createdAt);
    } else {
        visible.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return visible;
}

function renderNotes() {
    populateSubjects();
    updateStats();
    const visible = getVisibleNotes();
    notesGrid.classList.toggle("list-view", listMode);
    notesGrid.innerHTML = visible.map(note => {
        const tags = (note.tags || []).slice(0, 4)
            .map(tag => `<span class="note-tag">#${safeText(tag)}</span>`).join("");
        const preview = note.content.length > 240
            ? note.content.slice(0, 240) + "..."
            : note.content;
        return `
        <article class="note-card" data-note-id="${safeText(note.id)}">
            <div class="note-card-top">
                <span class="note-subject">${safeText(note.subject || "Uncategorized")}</span>
                <div class="note-actions">
                    <button class="note-action ${note.favorite ? "is-favorite" : ""}"
                        type="button" data-action="favorite" aria-label="Toggle favorite">
                        ${note.favorite ? "★" : "☆"}
                    </button>
                    <div class="note-menu-wrap">
                        <button class="note-action" type="button"
                            data-action="menu" aria-label="More options">···</button>
                        <div class="note-menu" hidden>
                            <button type="button" data-action="edit">Edit note</button>
                            <button type="button" data-action="archive">
                                ${note.archived ? "Restore note" : "Move to archive"}
                            </button>
                            <button type="button" class="danger" data-action="delete">Delete note</button>
                        </div>
                    </div>
                </div>
            </div>
            <h3 class="note-title">${safeText(note.title)}</h3>
            <p class="note-preview">${safeText(preview)}</p>
            ${tags ? `<div class="note-tags">${tags}</div>` : ""}
            <div class="note-card-footer">
                <span>${note.archived ? "Archived" : "Edited"} ${safeText(formatDate(note.updatedAt))}</span>
                <button class="note-action" type="button" data-action="edit" aria-label="Open note">↗</button>
            </div>
        </article>`;
    }).join("");

    notesGrid.hidden = visible.length === 0;
    emptyState.hidden = visible.length > 0;
    setText("visibleCount", `${visible.length} ${visible.length === 1 ? "note" : "notes"}`);

    if (!visible.length) {
        const query = searchInput.value.trim();
        setText("emptyTitle", query ? "No matching notes" :
            activeFilter === "favorite" ? "No favorites just yet" :
                activeFilter === "archived" ? "Your archive is clear" :
                    "Your notebook starts here");
        setText("emptyText", query ? "Try another search or clear your filters." :
            activeFilter === "favorite" ? "Tap the star on a note to keep it close." :
                activeFilter === "archived" ? "Notes you archive will appear here." :
                    "Capture a concept, a class summary, or a useful idea.");
        document.getElementById("emptyCreateButton").hidden =
            Boolean(query) || activeFilter !== "all";
    }

    document.querySelectorAll(".filter-tab").forEach(tab =>
        tab.classList.toggle("active", tab.dataset.filter === activeFilter)
    );
    const labels = [];
    if (subjectFilter.value !== "all") labels.push(subjectFilter.value);
    if (searchInput.value.trim()) labels.push("Search: " + searchInput.value.trim());
    const info = document.getElementById("filterInfo");
    info.hidden = !labels.length;
    info.textContent = labels.length ? "Showing: " + labels.join(" · ") : "";
}

function openModal(note = null) {
    editingId = note ? note.id : null;
    noteForm.reset();
    noteTitle.value = note ? note.title : "";
    noteSubject.value = note ? note.subject || "" : "";
    noteTags.value = note ? (note.tags || []).join(", ") : "";
    noteContent.value = note ? note.content : "";
    setText("characterCount", noteContent.value.length + " characters");
    setText("modalTitle", note ? "Edit note" : "Create a note");
    setText("saveNoteButton", note ? "Save changes ↗" : "Save note ↗");
    noteModal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => noteTitle.focus(), 50);
}

function closeModal() {
    noteModal.hidden = true;
    document.body.style.overflow = "";
    editingId = null;
}

document.getElementById("createNoteButton").addEventListener("click", () => openModal());
document.getElementById("emptyCreateButton").addEventListener("click", () => openModal());
document.getElementById("closeModalButton").addEventListener("click", closeModal);
document.getElementById("cancelModalButton").addEventListener("click", closeModal);
noteModal.addEventListener("click", event => {
    if (event.target === noteModal) closeModal();
});
noteContent.addEventListener("input", () =>
    setText("characterCount", noteContent.value.length + " characters")
);

noteForm.addEventListener("submit", async event => {
    event.preventDefault();
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();
    if (!title || !content) {
        showToast("Please enter a title and note content.");
        return;
    }
    const data = {
        title,
        content,
        subject: noteSubject.value.trim() || "General",
        tags: [...new Set(noteTags.value.split(",").map(tag => tag.trim()).filter(Boolean))]
    };
    const saveButton = document.getElementById("saveNoteButton");
    saveButton.disabled = true;
    try {
        const result = editingId
            ? await apiRequest(`/notes/${encodeURIComponent(editingId)}`, {
                method: "PATCH", body: JSON.stringify(data)
            })
            : await apiRequest("/notes", { method: "POST", body: JSON.stringify(data) });
        if (editingId) {
            notes = notes.map(note => note.id === editingId ? mapNote(result.note) : note);
        } else {
            notes.unshift(mapNote(result.note));
            activeFilter = "all";
            subjectFilter.value = "all";
            searchInput.value = "";
        }
        closeModal();
        renderNotes();
        showToast(result.message);
    } catch (error) {
        showToast(error.message);
    } finally {
        saveButton.disabled = false;
    }
});

notesGrid.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest(".note-card");
    const note = notes.find(item => item.id === card.dataset.noteId);
    if (!note) return;
    const action = button.dataset.action;
    if (action === "menu") {
        const menu = button.nextElementSibling;
        const opening = menu.hidden;
        document.querySelectorAll(".note-menu").forEach(item => item.hidden = true);
        menu.hidden = !opening;
        return;
    }
    document.querySelectorAll(".note-menu").forEach(item => item.hidden = true);
    if (action === "edit") return openModal(note);
    if (action === "delete" &&
        !confirm(`Delete "${note.title}"? This cannot be undone.`)) return;

    try {
        if (action === "favorite") {
            const result = await apiRequest(`/notes/${encodeURIComponent(note.id)}`, {
                method: "PATCH",
                body: JSON.stringify({ favorite: !note.favorite })
            });
            notes = notes.map(item => item.id === note.id ? mapNote(result.note) : item);
            showToast(result.message);
        } else if (action === "archive") {
            const result = await apiRequest(`/notes/${encodeURIComponent(note.id)}`, {
                method: "PATCH",
                body: JSON.stringify({ archived: !note.archived })
            });
            notes = notes.map(item => item.id === note.id ? mapNote(result.note) : item);
            showToast(result.message);
        } else if (action === "delete") {
            const result = await apiRequest(`/notes/${encodeURIComponent(note.id)}`, {
                method: "DELETE"
            });
            notes = notes.filter(item => item.id !== note.id);
            showToast(result.message);
        }
        renderNotes();
    } catch (error) {
        showToast(error.message);
    }
});

document.querySelectorAll(".filter-tab").forEach(tab => tab.addEventListener("click", () => {
    activeFilter = tab.dataset.filter;
    renderNotes();
}));
document.getElementById("sideFavoritesLink")?.addEventListener("click", event => {
    event.preventDefault();
    activeFilter = "favorite";
    renderNotes();
});
document.getElementById("sideArchiveLink")?.addEventListener("click", event => {
    event.preventDefault();
    activeFilter = "archived";
    renderNotes();
});
subjectFilter.addEventListener("change", renderNotes);
sortNotes.addEventListener("change", renderNotes);
searchInput.addEventListener("input", renderNotes);
document.getElementById("gridView").addEventListener("click", () => {
    listMode = false;
    document.getElementById("gridView").classList.add("active");
    document.getElementById("listView").classList.remove("active");
    renderNotes();
});
document.getElementById("listView").addEventListener("click", () => {
    listMode = true;
    document.getElementById("listView").classList.add("active");
    document.getElementById("gridView").classList.remove("active");
    renderNotes();
});

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
document.getElementById("menuToggle").addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
});
function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
}
overlay.addEventListener("click", closeSidebar);
document.querySelectorAll(".sidebar .nav-link").forEach(link =>
    link.addEventListener("click", closeSidebar)
);
const profileToggle = document.getElementById("profileToggle");
const profileMenu = document.getElementById("profileMenu");
profileToggle.addEventListener("click", event => {
    event.stopPropagation();
    profileMenu.hidden = !profileMenu.hidden;
    profileToggle.setAttribute("aria-expanded", String(!profileMenu.hidden));
});
document.addEventListener("click", event => {
    if (!event.target.closest("#profileDropdown")) {
        profileMenu.hidden = true;
        profileToggle.setAttribute("aria-expanded", "false");
    }
    if (!event.target.closest(".note-menu-wrap")) {
        document.querySelectorAll(".note-menu").forEach(menu => menu.hidden = true);
    }
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (!noteModal.hidden) closeModal();
        profileMenu.hidden = true;
        profileToggle.setAttribute("aria-expanded", "false");
    }
});
document.getElementById("notificationButton").addEventListener("click", () =>
    showToast("You're all caught up!")
);
document.getElementById("sideMore").addEventListener("click", () => {
    profileMenu.hidden = false;
    profileToggle.setAttribute("aria-expanded", "true");
});
document.getElementById("signOutButton").addEventListener("click", signOut);

loadNotes();
