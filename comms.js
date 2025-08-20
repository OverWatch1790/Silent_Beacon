const RELAY_URL = "https://sb-relay.overwatch1790.workers.dev";

document.getElementById("commsForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const status = document.getElementById("status");
  const sendBtn = document.getElementById("sendBtn");

  const callsign = (document.getElementById("callsign").value || "").trim();
  const reply = (document.getElementById("reply").value || "").trim();
  const message = (document.getElementById("message").value || "").trim();

  if (!message) {
    status.textContent = "⚠️ Please enter a message.";
    return;
  }

  const payload = { callsign, reply, message, plaintext: true };

  try {
    sendBtn.disabled = true;
    status.textContent = "⏳ Sending...";

    const res = await fetch(RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      status.textContent = "✅ Message sent successfully.";
      form.reset();
    } else {
      const errText = await res.text().catch(() => "");
      throw new Error(`Relay error ${res.status}${errText ? ": " + errText : ""}`);
    }
  } catch (error) {
    console.error("Submission error:", error);
    status.textContent = "❌ Send failed. Please try again.";
  } finally {
    sendBtn.disabled = false;
  }
});
