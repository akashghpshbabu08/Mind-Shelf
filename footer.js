
const footerContainer = document.getElementById("footer");

if (footerContainer) {
  fetch("footer.html")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Footer could not be loaded");
      }

      return response.text();
    })
    .then(function (html) {
      footerContainer.innerHTML = html;

      const year = footerContainer.querySelector("#ms-footer-year");

      if (year) {
        year.textContent = new Date().getFullYear();
      }
    })
    .catch(function (error) {
      console.error("Footer error:", error);
    });
}
