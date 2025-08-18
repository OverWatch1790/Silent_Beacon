/* ==========================
   Silent Beacon – Comms JS
   ========================== */

/** Cloudflare Worker endpoint (relay) */
const WORKER_URL = 'https://sb-relay.overwatch1790.workers.dev/';

/** Optional: if the inline key fails to parse, we fetch this file (upload to your repo). */
const FALLBACK_KEY_URL = './proton.pub.asc';

/** Your Proton public key (inline). We will TRY this first, then fall back to the file if needed. */
const PUBLIC_KEY_ASC_INLINE = `
-----BEGIN PGP PUBLIC KEY BLOCK-----

xjMEZKBTyBYJKwYBBAHaRw8BAQdAVnqbCVaw5PyjOnOkJolNcZIG8U/LaQRCt2PQBBH3P/fNMU92ZXJXYXRjaDE3OTBAcHJvdG9uLm1lIDxPdmVyV2F0Y2gxNzkwQHByb3Rvbi5tZT7CjAQQFgoAPgWCZKBTyAQLCQcICZBm/yLWGD5NWwMVCAoEFgACAQIZAQKbAwIeARYhBDoIkVCKSMHFEf3rHmb/ItYYPk1bAABpggEA9CWvaM0t2Jf5OZr+eTm5QEgBCRj+SdP43rSA8ZoI4bgBANPcCr+8TFU86dttlF8Lag4Ivxw6SG8+lADyIkw1XsMPzjgEZKBTyBIKKwYBBAGXVQEFAQEHQI9N25+McxGwawd57BEcA/H8vdtHEQtOJA4WWc6kd9NUAwEIB8J4BBgWCAAqBYJkoFPICZBm/yLWGD5NWwKbDBYhBDoIkVCKSMHFEf3rHmb/ItYYPk1bAAB27gEAsngTbrNXpPPYF3SMMpCkOE+JW9lMFfaX10M3i31XUgFAP46KM/SbUKx4VbrhU9enxZP6Jw5Ev67XvYdMGg1qFoD
=Y4gN

-----END PGP PUBLIC KEY BLOCK-----
`.trim();

/* ---------------------------------------
   Load OpenPGP if the page didn't already
---------------------------------------- */
async function ensureOpenPGP() {
  if (window.openpgp) return window.openpgp;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/openpgp@5.11.1/dist/openpgp.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('OpenPGP failed to load'));
    document.head.appendChild(s);
  });
  return window.openpgp;
}

/* ---------------------------------------
   Obtain a valid armored public key
   1) try inline key
   2) fall back to ./proton.pub.asc (uploaded file)
---------------------------------------- */
async function getArmoredKey() {
  const openpgp = await ensureOpenPGP();

  // Try inline first
  if (PUBLIC_KEY_ASC_INLINE && PUBLIC_KEY_ASC_INLINE.includes('BEGIN PGP PUBLIC KEY BLOCK')) {
    try {
      await openpgp.readKey({ armoredKey: PUBLIC_KEY_ASC_INLINE });
      return PUBLIC_KEY_ASC_INLINE;
    } catch (e) {
      console.warn('Inline key parse failed, falling back to file:', e?.message || e);
    }
  }

  // Fallback: fetch exact .asc from repo
  const resp = await fetch(FALLBACK_KEY_URL, { cache: 'no-store' });
  if (!resp.ok) throw new Error('Failed to fetch proton.pub.asc');
  const armored = await resp.text();

  // Validate
  await openpgp.readKey({ armoredKey: armored });
  return armored;
}

/* -------------------------
   Matrix background canvas
-------------------------- */
(function(){
  const canvas = document.getElementById('matrix');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function size(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', size);
  size();

  const letters = "01";
  const fs = 16;
  let cols = Math.floor(canvas.width / fs);
  let drops = Array(cols).fill(1);

  function draw(){
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#0f0";
    ctx.font = fs + "px monospace";
    for(let i=0;i<drops.length;i++){
      const ch = letters[Math.floor(Math.random()*letters.length)];
      ctx.fillText(ch, i*fs, drops[i]*fs);
      if(drops[i]*fs > canvas.height && Math.random() > 0.975) drops[i]=0;
      drops[i]++;
    }
  }
  setInterval(draw, 33);
})();

/* -------------------------
   UI element wiring
-------------------------- */
const openBtn   = document.getElementById('openSecure');
const panel     = document.getElementById('panel');
const form      = document.getElementById('sb-form');
const statusEl  = document.getElementById('sb-status');
const sendBtn   = document.getElementById('sendBtn');
const cancelBtn = document.getElementById('cancelBtn');
const toast     = document.getElementById('toast');
const tsField   = document.getElementById('sb-ts');
if (tsField) tsField.value = Date.now();

if (openBtn && panel){
  openBtn.addEventListener('click', ()=>{
    panel.classList.add('show');
    panel.setAttribute('aria-hidden','false');
    const msgEl = document.getElementById('sb-message');
    if (msgEl) setTimeout(()=> msgEl.focus(), 150);
  });
}

if (cancelBtn){
  cancelBtn.addEventListener('click', resetAndHide);
}

function resetAndHide(){
  if (panel){
    panel.classList.remove('show','dissolve');
    panel.setAttribute('aria-hidden','true');
  }
  if (statusEl) statusEl.textContent = '';
  if (sendBtn) sendBtn.disabled = false;
  if (form) form.reset();
  if (tsField) tsField.value = Date.now();
}

/* -------------------------
   Encrypt with Proton key
-------------------------- */
async function encryptForSB(plaintext){
  const openpgp = await ensureOpenPGP();
  const armored = await getArmoredKey();                 // ✅ robust key acquisition
  const pubKey  = await openpgp.readKey({ armoredKey: armored });
  const message = await openpgp.createMessage({ text: plaintext });
  return openpgp.encrypt({
    message,
    encryptionKeys: pubKey,
    config: { preferredCompressionAlgorithm: openpgp.enums.compression.zip }
  });
}

/* -------------------------
   Submit handler
-------------------------- */
if (form){
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (sendBtn) sendBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'Encrypting…';

    const callsign = (document.getElementById('sb-callsign')?.value || '').slice(0,120);
    const reply    = (document.getElementById('sb-reply')?.value || '').trim().slice(0,200);
    const msg      = (document.getElementById('sb-message')?.value || '').trim();

    if(!msg){
      if (statusEl) statusEl.textContent = 'Message is required.';
      if (sendBtn) sendBtn.disabled = false;
      return;
    }

    let cipher;
    try {
      // Include callsign/reply inside the encrypted body for your eyes only
      cipher = await encryptForSB(
`Callsign | ${callsign || '(none)'}
Reply (optional) | ${reply || '(none)'}

${msg}`
      );
    } catch(err){
      if (statusEl) statusEl.textContent = 'Encryption failed: ' + (err?.message || '');
      if (sendBtn) sendBtn.disabled = false;
      return;
    }

    if (statusEl) statusEl.textContent = 'Transmitting…';
    try{
      const r = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callsign, reply, cipher })
      });

      if(!r.ok){
        const t = await r.text().catch(()=> '');
        if (statusEl) statusEl.textContent = `Send failed. ${t||''}`.trim();
        if (sendBtn) sendBtn.disabled = false;
        return;
      }

      // success UX
      if (statusEl) statusEl.textContent = 'Transmission sent';
      if (toast){
        toast.classList.add('show');
        setTimeout(()=> toast.classList.remove('show'), 1200);
      }
      if (panel){
        setTimeout(()=>{
          panel.classList.add('dissolve');
          setTimeout(resetAndHide, 800);
        }, 400);
      } else {
        resetAndHide();
      }

    } catch(err){
      if (statusEl) statusEl.textContent = 'Network error. Try again.';
      if (sendBtn) sendBtn.disabled = false;
    }
  });
}

/* -------------------------
   Debug helpers (optional)
-------------------------- */
window._sbTestKey = async function(){
  try {
    const openpgp = await ensureOpenPGP();
    const armored = await getArmoredKey();
    await openpgp.readKey({ armoredKey: armored });
    console.log('✅ Proton key parsed OK');
    alert('✅ Proton key parsed OK');
  } catch(e){
    console.error('❌ Key parse failed', e);
    alert('❌ Key parse failed: ' + e.message);
  }
};
