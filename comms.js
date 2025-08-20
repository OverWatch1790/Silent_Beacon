document.getElementById("commsForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const status = document.getElementById("status");

  // Grab fields (ensure your form has these names/ids in comms.html)
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();

  if (!message) {
    status.textContent = "⚠️ Please enter a message.";
    return;
  }

  if (!email) {
    status.textContent = "⚠️ Please enter your email.";
    return;
  }

  try {
    const res = await fetch("https://sb-relay.overwatch1790.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        message: message,
      }),
    });

    if (res.ok) {
      status.textContent = "✅ Message sent successfully.";
      form.reset();
    } else {
      const errText = await res.text();
      throw new Error(errText || "Unknown error");
    }
  } catch (error) {
    console.error("Submission error:", error);
    status.textContent = "❌ Send failed. Please try again.";
  }
});
