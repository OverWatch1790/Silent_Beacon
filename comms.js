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
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Relay error [${res.status}]: ${errorText}`);
    }

    const data = await res.json().catch(() => ({}));
    if (data.success) {
      status.textContent = "✅ Message sent successfully via Worker → Formspree.";
    } else {
      status.textContent = "⚠️ Worker returned but no success flag.";
    }
  } catch (error) {
    console.error("Detailed error:", error);
    if (error.message.includes("Relay error")) {
      status.textContent = `❌ Relay/Worker failed: ${error.message}`;
    } else if (error.message.includes("Failed to fetch")) {
      status.textContent = "❌ Network/Cloudflare fetch failed (Worker not reachable).";
    } else {
      status.textContent = `❌ Unknown client error: ${error.message}`;
    }
  }
});
