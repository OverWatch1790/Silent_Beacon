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
      const errText = await res.text();
      status.textContent = "❌ CLOUD → Worker error: " + errText;
      return;
    }

    const data = await res.json();
    if (!data.success) {
      status.textContent = "❌ FORM → Formspree rejected request.";
      return;
    }

    status.textContent = "✅ Message sent (passed FORM). Check ProtonMail.";
  } catch (error) {
    console.error(error);
    status.textContent = "❌ NEO → Frontend/Fetch error. See console.";
  }
});
