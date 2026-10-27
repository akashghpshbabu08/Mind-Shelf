const feed = document.getElementById("postFeed");
const postModal = document.getElementById("postModal");
const commentsModal = document.getElementById("commentsModal");
const postForm = document.getElementById("postForm");
const toast = document.getElementById("toast");

let posts = [];
let savedPosts = new Set();
let activeTab = "all";
let selectedPostId = null;
let editingPostId = null;
let currentFocus = null;
let toastTimer;
let currentUser = null;

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

function getPost(id) {
    return posts.find(post => post.id === id);
}

function mapPost(post) {
    const author = post.author && typeof post.author === "object" ? post.author : {};
    const userId = currentUser?.id || currentUser?._id;
    return {
        id: String(post._id),
        authorId: String(author._id || post.author),
        title: post.title,
        type: post.type || "Explanation",
        subject: post.subject || post.category || "General",
        content: post.content,
        author: author.name || "MindShelf member",
        date: post.createdAt,
        likes: Array.isArray(post.likes) ? post.likes.length : 0,
        liked: Array.isArray(post.likes) &&
            post.likes.some(id => String(id) === String(userId))
    };
}

async function loadPosts() {
    currentUser = await requireAuth();
    if (!currentUser) return;
    try {
        const userId = currentUser.id || currentUser._id;
        try {
            savedPosts = new Set(JSON.parse(
                localStorage.getItem(`mindshelf_saved_${userId}`) || "[]"
            ));
        } catch {
            savedPosts = new Set();
        }
        const result = await apiRequest("/knowledge");
        posts = result.posts.map(mapPost);
        renderPosts();
    } catch (error) {
        showToast(error.message);
    }
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";
    const difference = Date.now() - date.getTime();
    if (difference < 60000) return "Just now";
    if (difference < 3600000) return `${Math.floor(difference / 60000)}m ago`;
    if (difference < 86400000) return `${Math.floor(difference / 3600000)}h ago`;
    if (difference < 604800000) return `${Math.floor(difference / 86400000)}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function updateSubjects() {
    const select = document.getElementById("subjectFilter");
    const selected = select.value;
    const subjects = [...new Set(posts.map(post => post.subject).filter(Boolean))].sort();
    select.replaceChildren(new Option("All subjects", "all"));
    subjects.forEach(subject => select.add(new Option(subject, subject)));
    select.value = subjects.includes(selected) ? selected : "all";
}

function getFilteredPosts() {
    const search = document.getElementById("topSearch").value.trim().toLowerCase();
    const subject = document.getElementById("subjectFilter").value;
    let result = posts.filter(post =>
        [post.title, post.content, post.subject, post.author, post.type]
            .some(value => String(value).toLowerCase().includes(search)) &&
        (subject === "all" || post.subject === subject) &&
        (activeTab === "questions" ? post.type === "Question" :
            activeTab === "explanations" ? post.type === "Explanation" :
                activeTab === "saved" ? savedPosts.has(post.id) : true)
    );
    if (document.getElementById("sortSelect").value === "popular") {
        result.sort((a, b) => b.likes - a.likes);
    } else {
        result.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return result;
}

function renderTopics() {
    const topicList = document.getElementById("topicList");
    const counts = {};
    posts.forEach(post => counts[post.subject] = (counts[post.subject] || 0) + 1);
    const topics = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    topicList.replaceChildren();
    if (!topics.length) {
        topicList.textContent = "No topics yet.";
        return;
    }
    topics.forEach(([subject, count]) => {
        const button = document.createElement("button");
        button.className = "topic-btn";
        button.innerHTML = `<span>${escapeHTML(subject)}</span><span>${count}</span>`;
        button.addEventListener("click", () => {
            document.getElementById("subjectFilter").value = subject;
            renderPosts();
            document.getElementById("discussionSection").scrollIntoView({ behavior: "smooth" });
        });
        topicList.appendChild(button);
    });
}

function renderPosts() {
    updateSubjects();
    renderTopics();
    const items = getFilteredPosts();
    feed.replaceChildren();
    document.getElementById("postCount").textContent = posts.length;
    document.getElementById("likeCount").textContent =
        posts.reduce((sum, post) => sum + post.likes, 0);
    document.getElementById("contributorCount").textContent =
        new Set(posts.map(post => post.authorId)).size;
    document.getElementById("resultsCount").textContent =
        `${items.length} ${items.length === 1 ? "post" : "posts"}`;
    document.getElementById("feedCount").textContent = `${items.length} results`;
    document.getElementById("feedTitle").textContent =
        activeTab === "saved" ? "Saved knowledge" :
            activeTab === "questions" ? "Community questions" :
                activeTab === "explanations" ? "Concept explanations" :
                    "Latest discussions";
    document.getElementById("emptyState").hidden = items.length !== 0;
    feed.hidden = items.length === 0;

    items.forEach(post => {
        const card = document.createElement("article");
        card.className = "post-card";
        const liked = post.liked;
        const saved = savedPosts.has(post.id);
        const tagClass = post.type === "Question" ? "question" :
            post.type === "Study Tip" ? "tip" : "";
        card.innerHTML = `
            <div class="post-meta">
                <div class="post-avatar">${escapeHTML(post.author.charAt(0).toUpperCase())}</div>
                <div><div class="post-author">${escapeHTML(post.author)}</div>
                    <span class="post-date">${formatDate(post.date)}</span></div>
                <span class="post-tag ${tagClass}">${escapeHTML(post.type)}</span>
            </div>
            <h3>${escapeHTML(post.title)}</h3>
            <p class="post-content">${escapeHTML(post.content)}</p>
            <span class="post-subject">◈ ${escapeHTML(post.subject)}</span>
            <div class="post-actions">
                <button class="action-btn ${liked ? "liked" : ""}"
                    data-like="${escapeHTML(post.id)}" aria-pressed="${liked}">
                    ${liked ? "♥ Liked" : "♡ Like"} · ${post.likes}
                </button>
                <button class="action-btn" data-comment="${escapeHTML(post.id)}">
                    ◯ Discuss
                </button>
                <button class="action-btn ${saved ? "saved" : ""}"
                    data-save="${escapeHTML(post.id)}" aria-pressed="${saved}">
                    ${saved ? "✓ Saved" : "⚑ Save"}
                </button>
                ${post.authorId === String(currentUser.id || currentUser._id)
                    ? `<button class="action-btn" data-edit="${escapeHTML(post.id)}">Edit</button>
                       <button class="action-btn" data-delete="${escapeHTML(post.id)}">Delete</button>`
                    : ""}
            </div>`;
        feed.appendChild(card);
    });
}

feed.addEventListener("click", async event => {
    const likeButton = event.target.closest("[data-like]");
    const saveButton = event.target.closest("[data-save]");
    const commentButton = event.target.closest("[data-comment]");
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");
    if (likeButton) await toggleLike(likeButton.dataset.like);
    else if (saveButton) toggleSave(saveButton.dataset.save);
    else if (commentButton) await openComments(commentButton.dataset.comment);
    else if (editButton) openPostModal(getPost(editButton.dataset.edit));
    else if (deleteButton) await deletePost(deleteButton.dataset.delete);
});

async function toggleLike(id) {
    const post = getPost(id);
    if (!post) return;
    try {
        const result = await apiRequest(`/knowledge/${encodeURIComponent(id)}/like`, {
            method: "POST"
        });
        post.liked = result.liked;
        post.likes = result.likeCount;
        renderPosts();
    } catch (error) {
        showToast(error.message);
    }
}

function toggleSave(id) {
    if (!getPost(id)) return;
    if (savedPosts.has(id)) savedPosts.delete(id);
    else savedPosts.add(id);
    try {
        localStorage.setItem(
            `mindshelf_saved_${currentUser.id || currentUser._id}`,
            JSON.stringify([...savedPosts])
        );
    } catch {
        showToast("Could not save this post on this device.");
        return;
    }
    renderPosts();
    showToast(savedPosts.has(id) ? "Post saved." : "Post removed from saved.");
}

function openPostModal(post = null) {
    editingPostId = post?.id || null;
    currentFocus = document.activeElement;
    postForm.reset();
    document.getElementById("charCount").textContent = "0 / 3000";
    document.getElementById("formError").textContent = "";
    if (post) {
        document.getElementById("postType").value = post.type;
        document.getElementById("postTitle").value = post.title;
        document.getElementById("postSubject").value = post.subject;
        document.getElementById("postContent").value = post.content;
    }
    document.getElementById("postModalTitle").textContent =
        post ? "Edit your post" : "Share your knowledge";
    document.getElementById("publishPost").textContent =
        post ? "Save changes" : "Publish post ↗";
    postModal.hidden = false;
    document.getElementById("postTitle").focus();
}

function closePostModal() {
    postModal.hidden = true;
    editingPostId = null;
    currentFocus?.focus();
}

document.getElementById("openPost").addEventListener("click", () => openPostModal());
document.getElementById("emptyPost").addEventListener("click", () => openPostModal());
document.getElementById("tipPost").addEventListener("click", () => openPostModal());
document.getElementById("closePost").addEventListener("click", closePostModal);
document.getElementById("cancelPost").addEventListener("click", closePostModal);
postModal.addEventListener("click", event => {
    if (event.target === postModal) closePostModal();
});
document.getElementById("postContent").addEventListener("input", event => {
    document.getElementById("charCount").textContent =
        `${event.target.value.length} / 3000`;
});

postForm.addEventListener("submit", async event => {
    event.preventDefault();
    const body = {
        title: document.getElementById("postTitle").value.trim(),
        subject: document.getElementById("postSubject").value.trim(),
        type: document.getElementById("postType").value,
        content: document.getElementById("postContent").value.trim()
    };
    const error = document.getElementById("formError");
    if (!body.title || !body.subject || !body.content) {
        error.textContent = "Please fill in all fields.";
        return;
    }
    const button = document.getElementById("publishPost");
    button.disabled = true;
    const wasEditing = Boolean(editingPostId);
    try {
        if (editingPostId) {
            const result = await apiRequest(`/knowledge/${encodeURIComponent(editingPostId)}`, {
                method: "PATCH", body: JSON.stringify(body)
            });
            posts = posts.map(post => post.id === editingPostId ? mapPost(result.post) : post);
        } else {
            const result = await apiRequest("/knowledge", {
                method: "POST", body: JSON.stringify(body)
            });
            posts.unshift(mapPost(result.post));
        }
        closePostModal();
        renderPosts();
        showToast(wasEditing ? "Post updated." : "Your knowledge post was published.");
    } catch (requestError) {
        error.textContent = requestError.message;
    } finally {
        button.disabled = false;
    }
});

async function deletePost(id) {
    const post = getPost(id);
    if (!post || !confirm(`Delete "${post.title}" and its comments?`)) return;
    try {
        await apiRequest(`/knowledge/${encodeURIComponent(id)}`, { method: "DELETE" });
        posts = posts.filter(item => item.id !== id);
        renderPosts();
        showToast("Post and its comments deleted.");
    } catch (error) {
        showToast(error.message);
    }
}

async function openComments(id) {
    const post = getPost(id);
    if (!post) return;
    selectedPostId = id;
    currentFocus = document.activeElement;
    document.getElementById("commentPostTitle").textContent = post.title;
    document.getElementById("commentInput").value = "";
    document.getElementById("commentError").textContent = "";
    try {
        const result = await apiRequest(`/knowledge/${encodeURIComponent(id)}/comments`);
        renderComments(result.comments);
        commentsModal.hidden = false;
        document.getElementById("commentInput").focus();
    } catch (error) {
        showToast(error.message);
        selectedPostId = null;
    }
}

function renderComments(comments) {
    const list = document.getElementById("commentList");
    if (!comments.length) {
        list.innerHTML = '<p class="comment-empty">No replies yet. Start the discussion!</p>';
        return;
    }
    list.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <strong>${escapeHTML(comment.author?.name || "MindShelf member")}</strong>
            <p>${escapeHTML(comment.content)}</p>
            <span class="post-date">${formatDate(comment.createdAt)}</span>
        </div>`).join("");
}

function closeComments() {
    commentsModal.hidden = true;
    selectedPostId = null;
    currentFocus?.focus();
}
document.getElementById("closeComments").addEventListener("click", closeComments);
commentsModal.addEventListener("click", event => {
    if (event.target === commentsModal) closeComments();
});
document.getElementById("commentForm").addEventListener("submit", async event => {
    event.preventDefault();
    const content = document.getElementById("commentInput").value.trim();
    const error = document.getElementById("commentError");
    if (!content || !selectedPostId) {
        error.textContent = "Write a reply first.";
        return;
    }
    const button = event.submitter;
    button.disabled = true;
    try {
        const result = await apiRequest(
            `/knowledge/${encodeURIComponent(selectedPostId)}/comments`,
            { method: "POST", body: JSON.stringify({ content }) }
        );
        const comments = await apiRequest(
            `/knowledge/${encodeURIComponent(selectedPostId)}/comments`
        );
        document.getElementById("commentInput").value = "";
        renderComments(comments.comments);
        showToast(result.message);
    } catch (requestError) {
        error.textContent = requestError.message;
    } finally {
        button.disabled = false;
    }
});

document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
    activeTab = button.dataset.tab;
    document.querySelectorAll(".tab").forEach(tab =>
        tab.classList.toggle("active", tab === button)
    );
    renderPosts();
}));
document.getElementById("topSearch").addEventListener("input", renderPosts);
document.getElementById("subjectFilter").addEventListener("change", renderPosts);
document.getElementById("sortSelect").addEventListener("change", renderPosts);
document.getElementById("exploreBtn").addEventListener("click", () => {
    document.getElementById("discussionSection").scrollIntoView({ behavior: "smooth" });
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
        if (!postModal.hidden) closePostModal();
        else if (!commentsModal.hidden) closeComments();
        else sidebar.classList.remove("open");
    }
});

loadPosts();
