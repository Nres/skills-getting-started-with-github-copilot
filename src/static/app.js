document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // simple HTML-escape helper
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) => {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[s];
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and select options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const participants = Array.isArray(details.participants) ? details.participants : [];
        const spotsLeft = (details.max_participants || 0) - participants.length;

        // Build participants block (ul with delete buttons)
        let participantsBlock = document.createElement("div");
        participantsBlock.className = "participants";
        const title = document.createElement("h5");
        title.textContent = "Participants";
        participantsBlock.appendChild(title);

        if (participants.length > 0) {
          const ul = document.createElement("ul");
          ul.setAttribute("data-activity", name);
          participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";

            const span = document.createElement("span");
            span.className = "participant-email";
            span.textContent = p;

            const btn = document.createElement("button");
            btn.className = "delete-btn";
            btn.setAttribute("data-email", p);
            btn.setAttribute("data-activity", name);
            btn.setAttribute("title", "Unregister participant");
            btn.textContent = "×";

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });
          participantsBlock.appendChild(ul);
        } else {
          const empty = document.createElement("p");
          empty.className = "empty";
          empty.textContent = "No participants yet";
          participantsBlock.appendChild(empty);
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description || "")}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule || "")}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        activityCard.appendChild(participantsBlock);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Event delegation for delete/unregister buttons
  document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest && ev.target.closest(".delete-btn");
    if (!btn) return;

    const email = btn.getAttribute("data-email");
    const activity = btn.getAttribute("data-activity");
    if (!email || !activity) return;

    if (!confirm(`Unregister ${email} from ${activity}?`)) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });

      if (resp.ok) {
        // remove the list item from DOM
        const li = btn.closest(".participant-item");
        if (li) li.remove();
      } else {
        const body = await resp.json().catch(() => ({}));
        alert(body.detail || body.message || "Failed to unregister participant");
      }
    } catch (err) {
      console.error("Error unregistering:", err);
      alert("Failed to unregister participant. See console for details.");
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh the activities list so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
