const API_BASE = "/api";
const TOKEN_KEY = "mindshelfToken";
const USER_KEY = "mindshelfUser";

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function saveSession(data) {
  if (!data || typeof data.token !== "string" || !data.user) {
    throw new Error("The server returned an invalid sign-in response.");
  }
  sessionStorage.setItem(TOKEN_KEY, data.token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

async function apiRequest(endpoint, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
  } catch {
    throw new Error("Could not reach MindShelf. Check that the backend is running.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }
  return data;
}

async function requireAuth() {
  if (!getToken()) {
    window.location.replace("login.html");
    return null;
  }

  try {
    const { user } = await apiRequest("/auth/me");
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch (error) {
    clearSession();
    window.location.replace("login.html");
    return null;
  }
}

async function loadNotes() {
  try {
    const data = await apiRequest("/notes");
    console.log(data.notes);
    // Render data.notes inside your existing notes container.
  } catch (error) {
    alert(error.message);
  }
}
async function createNote(title, content, subject = "") {
  return apiRequest("/notes", {
    method: "POST",
    body: JSON.stringify({ title, content, subject })
  });
}
async function createNote(title, content, subject = "") {
  return apiRequest("/notes", {
    method: "POST",
    body: JSON.stringify({ title, content, subject })
  });
}
async function loadResources(searchText = "") {
  const query = new URLSearchParams();

  if (searchText.trim()) query.set("q", searchText.trim());

  const data = await apiRequest(`/resources?${query.toString()}`);
  console.log(data.resources);
  // Render the returned resources in your resource cards.
}
async function shareResource(title, description, subject, url) {
  return apiRequest("/resources", {
    method: "POST",
    body: JSON.stringify({
      title,
      description,
      subject,
      type: "link",
      url
    })
  });
}
async function shareResource(title, description, subject, url) {
  return apiRequest("/resources", {
    method: "POST",
    body: JSON.stringify({
      title,
      description,
      subject,
      type: "link",
      url
    })
  });
}
async function toggleResourceBookmark(resourceId) {
  return apiRequest(`/resources/${resourceId}/bookmark`, {
    method: "POST"
  });
}
async function publishKnowledge(title, content, tags = []) {
  return apiRequest("/knowledge", {
    method: "POST",
    body: JSON.stringify({ title, content, tags })
  });
}
async function toggleKnowledgeLike(postId) {
  return apiRequest(`/knowledge/${postId}/like`, {
    method: "POST"
  });
}
async function addKnowledgeComment(postId, content) {
  return apiRequest(`/knowledge/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content })
  });
}

function signOut() {
  clearSession();
  window.location.replace("login.html");
}
