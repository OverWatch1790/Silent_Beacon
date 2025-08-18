/* =======================
   Silent Beacon – Comms JS
   ======================= */

/** Worker endpoint */
const WORKER_URL = 'https://sb-relay.overwatch1790.workers.dev/';

/** Proton public key */
const PUBLIC_KEY_ASC = `
-----BEGIN PGP PUBLIC KEY BLOCK-----

xjMEZKBTyBYJKwYBBAHaRw8BAQdAVnqbCVaw5PyjOnOkJolNcZIG8U/LaQRC
t2PQBBH3P/fNMU92ZXJXYXRjaDE3OTBAcHJvdG9uLm1lIDxPdmVyV2F0Y2gx
NzkwQHByb3Rvbi5tZT7CjAQQFgoAPgWCZKBTyAQLCQcICZBm/yLWGD5NWwMV
CAoEFgACAQIZAQKbAwIeARYhBDoIkVCKSMHFEf3rHmb/ItYYPk1bAABpggEA
9CWvaM0t2Jf5OZr+eTm5QEgBCRj+SdP43rSA8ZoI4bgBANPcCr+8TFU86dtt
lF8Lag4Ivxw6SG8+lADyIkw1XsMPzjgEZKBTyBIKKwYBBAGXVQEFAQEHQI9N
25+McxGwawd57BEcA/H8vdtHEQtOJA4WWc6kd9NUAwEIB8J4BBgWCAAqBYJk
oFPICZBm/yLWGD5NWwKbDBYhBDoIkVCKSMH
=xxxx
-----END PGP PUBLIC KEY BLOCK-----
`.trim();

/* ========== Matrix background ========== */
(function(){
  const canvas = document.getElementById('matrix');
  const ctx = canvas.getContext('2d');
  function size(){ canvas.width = innerWidth; canvas.height = innerHeight; }
  addEventListener('resize', size); size();
  const letters = "01", fs = 16;
  let cols = Math.floor(canvas.width / fs);
  let drops = Array(cols).fill(1);
  function draw(){
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#0f0"; ctx.font = fs + "px monospace";
    for(let i=0;i<drops.length;i++){
      const ch = letters[Math.floor(Math.random()*letters.length)];
      ctx.fillText(ch, i*fs, drops[i]*fs);
      if(drops[i]*fs > canvas.height && Math.random() > 0.975) drops[i]=0;
      drops[i]++;
    }
  }
  setInterval(draw, 33);
})();

/* ========== UI wiring ========== */
const openBtn   = document.getElementById('openSecure');
const panel     = document.getElementById('panel');
const form      = document.getElementById('sb-form');
const statusEl  = document.getElementById('sb-status');
const sendBtn   = document.getElementById('sendBtn');
const cancelBtn = document.getElementById('cancelBtn');
const toast     = document.getElementById('toast');
document.getElementById('sb-ts').value = Date.now();

openBtn.addEventListener('click', ()=>{
  panel.classList.add('show');
  panel.setAttribute('aria-hidden','false');
  setTimeout(()=> document.getElementById('sb-message').focus(), 200);
});
cancelBtn.addEventListener('click', resetAndHide);

/* ========== Encryption ========== */
async function encryptForSB(plaintext){
  const pubKey = await openpgp.readKey({ armoredKey: PUBLIC_KEY_ASC });
  const message = await openpgp.createMessage({ text: plaintext });
  return openpgp.encrypt({
    message,
    encryptionKeys: pubKey,
    config: { preferredCompressionAlgorithm: openpgp.enums.compression.zip }
  });
}

/* ========== Submit ========== */
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  sendBtn.disabled = true;

  const callsign = (document.getElementById('sb-callsign').value || '').slice(0,120);
  const reply    = (document.getElementById('sb-reply').value || '').trim().slice(0,200);
  const msg      = (document.getElementById('sb-message').value || '').trim();

  if(!msg){
    statusEl.textContent = 'Message is required.';
    sendBtn.disabled = false; return;
  }

  statusEl.textContent = 'Encrypting…';
  let cipher;
  try {
    cipher = await encryptForSB(
`Callsign | ${callsign || '(none)'}
Reply (optional) | ${reply || '(none)'}

${msg}`
    );
  } catch(err){
    statusEl.textContent = 'Encryption failed.';
    sendBtn.disabled = false; return;
  }

  statusEl.textContent = 'Transmitting…';
  try{
    const r = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callsign, reply, cipher })
    });

    if(!r.ok){
      const t = await r.text().catch(()=> '');
      statusEl.textContent = `Send failed. ${t||''}`.trim();
      sendBtn.disabled = false; return;
    }

    // success UX: toast, dissolve, reset
    statusEl.textContent = 'Transmission sent';
    toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), 1200);

    setTimeout(()=>{
      panel.classList.add('dissolve');
      setTimeout(resetAndHide, 800);
    }, 400);

  } catch(err){
    statusEl.textContent = 'Network error. Try again.';
    sendBtn.disabled = false;
  }
});

function resetAndHide(){
  panel.classList.remove('show','dissolve');
  panel.setAttribute('aria-hidden','true');
  statusEl.textContent = '';
  sendBtn.disabled = false;
  form.reset();
  document.getElementById('sb-ts').value = Date.now();
}
