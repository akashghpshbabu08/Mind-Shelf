const signupForm = document.getElementById("signupForm");
const message = document.getElementById("message");
const signupButton = document.getElementById("signupButton");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");

document.querySelectorAll(".show-password").forEach(function (button) {
    button.addEventListener("click", function () {
        const input = document.getElementById(button.dataset.target);
        const showPassword = input.type === "password";
        input.type = showPassword ? "text" : "password";
        button.textContent = showPassword ? "Hide" : "Show";
        button.setAttribute("aria-pressed", String(showPassword));
        button.setAttribute(
            "aria-label",
            showPassword ? "Hide password" : "Show password"
        );
    });
});

function validatePasswordConfirmation() {
    confirmPassword.setCustomValidity(
        confirmPassword.value !== password.value ? "Passwords do not match." : ""
    );
}

confirmPassword.addEventListener("input", validatePasswordConfirmation);
password.addEventListener("input", validatePasswordConfirmation);

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    message.textContent = "";
    message.className = "message";

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const terms = document.getElementById("terms").checked;

    if (!signupForm.reportValidity()) return;
    if (name.length < 2) {
        message.textContent = "Please enter your full name.";
        message.classList.add("error");
        return;
    }
    if (password.value !== confirmPassword.value) {
        message.textContent = "Passwords do not match.";
        message.classList.add("error");
        return;
    }
    if (!terms) {
        message.textContent = "Please accept the terms to continue.";
        message.classList.add("error");
        return;
    }

    signupButton.disabled = true;
    signupButton.setAttribute("aria-busy", "true");
    message.textContent = "Creating your account...";

    try {
        const result = await apiRequest("/auth/signup", {
            method: "POST",
            body: JSON.stringify({ name, email, password: password.value })
        });
        saveSession(result);
        window.location.assign("student-dashboard.html");
    } catch (error) {
        message.textContent = error.message;
        message.classList.add("error");
    } finally {
        signupButton.disabled = false;
        signupButton.removeAttribute("aria-busy");
    }
});
