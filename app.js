let currentUser = null;

function setStatus(msg) { document.getElementById('status').innerText = msg || ''; }

async function register() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/api/register', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password})});
  const data = await res.json();
  if (res.ok) {
    currentUser = data.user;
    setStatus('Registered and logged in as ' + currentUser.email);
    showWallet();
  } else {
    setStatus('Error: ' + (data.error || 'unknown'));
  }
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password})});
  const data = await res.json();
  if (res.ok) {
    currentUser = data.user;
    setStatus('Logged in as ' + currentUser.email);
    showWallet();
  } else {
    setStatus('Error: ' + (data.error || 'unknown'));
  }
}

async function showWallet() {
  document.getElementById('walletBox').style.display = 'block';
  document.getElementById('eventsBox').style.display = 'block';
  await refreshWallet();
  await loadEvents();
}

async function refreshWallet() {
  const res = await fetch('/api/wallet/' + currentUser.id);
  const data = await res.json();
  if (res.ok) {
    document.getElementById('balance').innerText = data.wallet.balance.toFixed(2);
  }
}

async function deposit() {
  const amt = parseFloat(document.getElementById('depositAmt').value || '0');
  if (amt <= 0) return setStatus('Enter a valid amount');
  const res = await fetch('/api/deposit', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:currentUser.id, amount:amt})});
  const data = await res.json();
  if (res.ok) {
    setStatus('Deposit successful');
    await refreshWallet();
  } else {
    setStatus('Error: ' + (data.error || 'unknown'));
  }
}

async function loadEvents() {
  const res = await fetch('/api/events');
  const data = await res.json();
  const container = document.getElementById('events');
  container.innerHTML = '';
  data.events.forEach(ev => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${ev.title}</strong><br/>`;
    ev.markets.forEach(m => {
      const btn = document.createElement('button');
      btn.innerText = `Bet ${m.outcome} @ ${m.price}`;
      btn.onclick = () => placeBet(ev.id, m.outcome, m.price);
      div.appendChild(btn);
      div.appendChild(document.createTextNode(' '));
    });
    container.appendChild(div);
  });
}

async function placeBet(eventId, outcome, price) {
  const stake = parseFloat(prompt('Enter stake amount:'));
  if (!stake || stake <= 0) return setStatus('Invalid stake');
  const res = await fetch('/api/place-bet', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
    userId: currentUser.id, eventId, outcome, stake
  })});
  const data = await res.json();
  if (res.ok) {
    setStatus('Bet placed! Potential win: ' + data.potentialWin.toFixed(2));
    await refreshWallet();
  } else {
    setStatus('Error: ' + (data.error || 'unknown'));
  }
}
