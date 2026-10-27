
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const toast = document.getElementById("toast");

const profileDropdown = document.getElementById("profileDropdown");
const profileToggle = document.getElementById("profileToggle");
const profileMenu = document.getElementById("profileMenu");

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
}

// Mobile sidebar
function closeSidebar() {
  if (sidebar) sidebar.classList.remove("open");
  if (sidebarOverlay) sidebarOverlay.classList.remove("show");

  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    menuToggle.textContent = "☰";
  }
}

if (menuToggle && sidebar && sidebarOverlay) {
  menuToggle.addEventListener("click", function () {
    const isOpen = sidebar.classList.toggle("open");

    sidebarOverlay.classList.toggle("show", isOpen);

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation"
    );

    menuToggle.textContent = isOpen ? "✕" : "☰";
  });

  sidebarOverlay.addEventListener("click", closeSidebar);

  sidebar.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeSidebar);
  });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

async function loadDashboard() {
  const user = await requireAuth();
  if (!user) return;

  try {
    const { stats } = await apiRequest("/dashboard/summary");
    const firstName = user.name.trim().split(/\s+/)[0] || "Student";
    const initial = firstName.charAt(0).toUpperCase();

    setText("welcomeName", firstName);
    setText("sideName", user.name);
    setText("profileName", user.name);
    setText("profileEmail", user.email);
    setText("sideAvatar", initial);
    setText("topAvatar", initial);
    setText("notesCount", stats.notes);
    setText("resourcesCount", stats.resources);
    setText("collectionsCount", stats.collections);
    setText("feedbackCount", 0);
    setText("pendingCount", 0);
  } catch (error) {
    showToast(error.message);
  }
}

loadDashboard();

setText("year", new Date().getFullYear());

// Search
const searchForm = document.getElementById("searchForm");
const globalSearch = document.getElementById("globalSearch");

if (searchForm && globalSearch) {
  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const query = globalSearch.value.trim();

    if (!query) {
      globalSearch.focus();
      return;
    }

    window.location.href =
      "shared-resources.html?q=" + encodeURIComponent(query);
  });

  globalSearch.addEventListener("focus", function () {
    if (window.innerWidth <= 600) {
      searchForm.classList.add("search-open");
    }
  });

  globalSearch.addEventListener("blur", function () {
    if (window.innerWidth <= 600) {
      searchForm.classList.remove("search-open");
    }
  });
}

// Notifications
const notificationBtn = document.getElementById("notificationBtn");

if (notificationBtn) {
  notificationBtn.addEventListener("click", function () {
    showToast(
      "Open Submissions to check your feedback and review status."
    );
  });
}

// Profile dropdown
if (profileDropdown && profileToggle && profileMenu) {
  // Start closed
  profileMenu.hidden = true;
  profileToggle.setAttribute("aria-expanded", "false");

  function openProfileMenu() {
    profileMenu.hidden = false;
    profileToggle.setAttribute("aria-expanded", "true");
  }

  document.getElementById("logoutButton")?.addEventListener("click", signOut);

  function closeProfileMenu() {
    profileMenu.hidden = true;
    profileToggle.setAttribute("aria-expanded", "false");
  }

  function toggleProfileMenu(event) {
    event.stopPropagation();

    if (profileMenu.hidden) {
      openProfileMenu();
    } else {
      closeProfileMenu();
    }
  }

  // Click to open or close
  profileToggle.addEventListener("click", toggleProfileMenu);

  // Hover for desktop mouse users
  const canHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  );

  profileDropdown.addEventListener("mouseenter", function () {
    if (canHover.matches) {
      openProfileMenu();
    }
  });

  profileDropdown.addEventListener("mouseleave", function () {
    if (canHover.matches) {
      closeProfileMenu();
    }
  });

  // Close when clicking outside
  document.addEventListener("click", function (event) {
    if (!profileDropdown.contains(event.target)) {
      closeProfileMenu();
    }
  });

  // Close using Escape
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeProfileMenu();
      profileToggle.focus();
    }
  });

  // Close after selecting a menu link
  profileMenu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeProfileMenu);
  });
}
