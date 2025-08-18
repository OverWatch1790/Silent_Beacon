document.getElementById("commsForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = document.getElementById("message").value;
  const status = document.getElementById("status");

  if (!message) {
    status.textContent = "⚠️ Please enter a message.";
    return;
  }

  try {
    // Right now: just simulate sending
    console.log("Message submitted:", message);
    status.textContent = "✅ Message submitted (plaintext test).";
    
    // Later: replace this with encryption + Proton send
  } catch (error) {
    console.error(error);
    status.textContent = "❌ Error submitting message.";
  }
});
