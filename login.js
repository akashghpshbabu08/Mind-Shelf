const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginButton");

togglePassword.addEventListener("click", function () {
    const isHidden = password.type === "password";
    password.type = isHidden ? "text" : "password";
    togglePassword.textContent = isHidden ? "Hide" : "Show";
    togglePassword.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    togglePassword.setAttribute("aria-pressed", String(isHidden));
});

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    message.textContent = "";
    message.className = "message";

    if (!loginForm.reportValidity()) return;

    loginButton.disabled = true;
    loginButton.setAttribute("aria-busy", "true");
    message.textContent = "Signing in...";

    try {
        const result = await apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: document.getElementById("email").value.trim(),
                password: password.value
            })
        });
        saveSession(result);
        window.location.assign("student-dashboard.html");
    } catch (error) {
        message.textContent = error.message;
        message.classList.add("error");
    } finally {
        loginButton.disabled = false;
        loginButton.removeAttribute("aria-busy");
    }
});
