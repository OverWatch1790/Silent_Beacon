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
    body: JSON.stringify({
      message: message   // 👈 plain text message
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  status.textContent = "✅ Message sent to Proton (plaintext).";
} catch (error) {
  console.error(error);
  status.textContent = "❌ Error submitting message.";
}
});
