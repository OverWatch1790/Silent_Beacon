document.getElementById("commsForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = document.getElementById("message").value;
  const status = document.getElementById("status");

  if (!message) {
    status.textContent = "⚠️ Please enter a message.";
    return;
  }

  try {
    const res = await fetch("https://sb-relay.overwatch1790.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }), // ⚠️ confirm this matches Formspree config
    });

    const data = await res.json();

    if (res.ok && data.success) {
      status.textContent = "✅ Message sent.";
    } else {
      status.textContent = "❌ Send failed. Try again.";
    }
  } catch (error) {
    console.error(error);
    status.textContent = "❌ Send failed. Try again.";
  }
});
