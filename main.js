import { store } from './store.js';
import { initAuth } from './auth-ui.js';

initAuth();

// ---- Navigation Logic ----
const navLinks = document.querySelectorAll('.nav-links a, .nav-link');
const pages = document.querySelectorAll('.page');
const topbarTitle = document.getElementById('topbar-title');

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navLinks.forEach(l => l.classList.remove('active'));
    pages.forEach(p => p.classList.remove('active'));
    
    link.classList.add('active');
    const targetId = link.getAttribute('data-target');
    if (document.getElementById(targetId)) {
        document.getElementById(targetId).classList.add('active');
    }
    
    if (topbarTitle) {
        const clone = link.cloneNode(true);
        const span = clone.querySelector('span');
        const b = clone.querySelector('b');
        if (span) span.remove();
        if (b) b.remove();
        topbarTitle.textContent = clone.textContent.trim();
    }
  });
});

// Mobile Sidebar toggle
document.querySelector('.menu-btn')?.addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.style.display = sidebar.style.display === 'flex' ? 'none' : 'flex';
  }
});

// ---- Modals Helper ----
function openModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.add('show'); 
}
function closeModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('show'); 
}

// Modal open/close handlers
document.getElementById('btn-create-tourney-top')?.addEventListener('click', () => openModal('modal-create-tournament'));
document.getElementById('btn-create-first-tourney')?.addEventListener('click', () => openModal('modal-create-tournament'));
document.getElementById('close-modal-create-tourney')?.addEventListener('click', () => closeModal('modal-create-tournament'));
document.getElementById('btn-cancel-create-tourney')?.addEventListener('click', () => closeModal('modal-create-tournament'));

// Edit Tournament Modal handlers
document.getElementById('close-modal-edit-tourney')?.addEventListener('click', () => closeModal('modal-edit-tournament'));
document.getElementById('btn-cancel-edit-tourney')?.addEventListener('click', () => closeModal('modal-edit-tournament'));

document.getElementById('btn-switch-tourney')?.addEventListener('click', () => {
  renderTournamentManagerList();
  openModal('modal-tournament-manager');
});
document.getElementById('btn-open-create-from-mgr')?.addEventListener('click', () => {
  closeModal('modal-tournament-manager');
  openModal('modal-create-tournament');
});
document.getElementById('close-modal-tourney-mgr')?.addEventListener('click', () => closeModal('modal-tournament-manager'));
document.getElementById('btn-close-tourney-mgr')?.addEventListener('click', () => closeModal('modal-tournament-manager'));

// Player Registration Modals
const openRegistration = () => {
  const tourney = store.getActiveTournament();
  if (!tourney) {
    alert('Please create or select an active tournament first!');
    openModal('modal-create-tournament');
    return;
  }

  const teamsCount = tourney.numTeams || 10;
  const playersPerTeam = tourney.mode === "2v2" ? 2 : (tourney.mode === "3v3" ? 3 : 4);
  const reqPlayers = tourney.requiredPlayers || (teamsCount * playersPerTeam);

  if ((tourney.players || []).length >= reqPlayers) {
    return alert('Slots are full! No more registrations allowed for this tournament.');
  }

  document.getElementById('reg-modal-tourney-title').textContent = tourney.name;
  document.getElementById('reg-display-fee').textContent = `₹${tourney.registrationFee}`;
  openModal('modal-register-player');
};
document.getElementById('btn-open-register-top')?.addEventListener('click', openRegistration);
document.getElementById('btn-hero-register')?.addEventListener('click', openRegistration);
document.getElementById('btn-add-player')?.addEventListener('click', openRegistration);
document.getElementById('close-modal-register')?.addEventListener('click', () => closeModal('modal-register-player'));
document.getElementById('btn-cancel-register')?.addEventListener('click', () => closeModal('modal-register-player'));

// Tie breaker cancel
document.getElementById('btn-cancel-tie')?.addEventListener('click', () => closeModal('modal-tie-breaker'));

// ---- Registration Form Options (Fee vs Invite) ----
const optPayFee = document.getElementById('opt-pay-fee');
const optInviteCode = document.getElementById('opt-invite-code');
const regChosenMethod = document.getElementById('reg-chosen-method');
const regInviteGroup = document.getElementById('reg-invite-group');
const regFeeCheckbox = document.getElementById('reg-fee-paid');

optPayFee?.addEventListener('click', () => {
  optPayFee.classList.add('selected');
  optInviteCode.classList.remove('selected');
  regChosenMethod.value = 'fee';
  regInviteGroup.style.display = 'none';
  regFeeCheckbox.checked = true; // Auto-tick fee paid when registering by paying
});

optInviteCode?.addEventListener('click', () => {
  optInviteCode.classList.add('selected');
  optPayFee.classList.remove('selected');
  regChosenMethod.value = 'invite';
  regInviteGroup.style.display = 'block';
  regFeeCheckbox.checked = false;
});

// Category selector pills in Registration modal
document.querySelectorAll('#reg-category-picker .category-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('#reg-category-picker .category-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    document.getElementById('reg-player-category').value = pill.getAttribute('data-val');
  });
});

// ---- Tournament Form Submit ----
document.getElementById('form-create-tournament')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('create-tourney-name').value.trim();
  const mode = document.getElementById('create-tourney-mode').value;
  const numTeams = parseInt(document.getElementById('create-tourney-teams')?.value, 10) || 10;
  const format = document.getElementById('create-tourney-format').value;
  const prizePool = document.getElementById('create-tourney-prize').value;
  const registrationFee = document.getElementById('create-tourney-fee').value;
  const inviteCode = document.getElementById('create-tourney-code').value.trim();

  if (!name) return alert('Please enter a tournament name');

  store.createTournament({
    name,
    mode,
    numTeams,
    format,
    prizePool,
    registrationFee,
    inviteCode
  });

  e.target.reset();
  closeModal('modal-create-tournament');
});

// ---- Player Registration Submit ----
document.getElementById('form-register-player')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const tourney = store.getActiveTournament();
  if (!tourney) return alert('No active tournament');

  const name = document.getElementById('reg-player-name').value.trim();
  const method = regChosenMethod.value;
  const inviteCode = document.getElementById('reg-invite-input').value.trim();

  if (!name) return alert('Please enter player name');

  if (method === 'invite') {
    if (inviteCode !== tourney.inviteCode) {
      return alert(`Invalid invite code! Required: "${tourney.inviteCode}"`);
    }
  }

  // Player registers with PENDING category. Category and rating are decided by admins after registration closes.
  const res = store.registerPlayer({
    name,
    method,
    inviteCode,
    category: "PENDING",
    rating: 0
  });

  if (!res.success) {
    return alert(res.error);
  }

  // Set device identity to this registered player automatically!
  setDeviceIdentity({ type: 'player', id: res.player.id, name: res.player.name });

  alert(`✅ Player "${name}" registered successfully! Your device is now connected as "${name}". Tournament admins will assign your category & rating once registration closes.`);
  e.target.reset();
  optPayFee.classList.add('selected');
  optInviteCode.classList.remove('selected');
  regChosenMethod.value = 'fee';
  regInviteGroup.style.display = 'none';
  regFeeCheckbox.checked = true;

  closeModal('modal-register-player');
});

// ---- Tournament Manager List ----
function renderTournamentManagerList() {
  const container = document.getElementById('tournaments-list-container');
  if (!container) return;
  container.innerHTML = '';

  const tourneys = Object.values(store.state.tournaments || {});
  const activeId = store.state.activeTournamentId;

  if (tourneys.length === 0) {
    container.innerHTML = '<p style="color:var(--muted); font-size:12px; text-align:center; padding:16px;">No tournaments created yet.</p>';
    return;
  }

  tourneys.forEach(t => {
    const isCurrent = t.id === activeId;
    const div = document.createElement('div');
    div.className = `tourney-list-item ${isCurrent ? 'selected' : ''}`;
    div.innerHTML = `
      <div>
        <strong style="color:#fff; font-size:13px; display:block;">${t.name} ${isCurrent ? '<span style="color:var(--lime); font-size:10px;">(ACTIVE)</span>' : ''}</strong>
        <small style="color:var(--muted); font:10px 'DM Mono';">
          ${t.numTeams || 10} Teams • ${t.mode || '4v4'} • ${t.format === 'playoffs' ? 'Playoffs' : 'Upper/Lower'} • Prize: ₹${t.prizePool} • Fee: ₹${t.registrationFee}
          <br>${(t.players || []).length} Players • ${(t.captains || []).length} Captains
        </small>
        <div style="font: 10px 'DM Mono'; color: var(--lime); margin-top: 5px;">
           🔑 Admin Invite Code: <strong style="background:#222; padding:2px 6px; border-radius:3px; border:1px solid #444;">${t.inviteCode || 'None'}</strong>
        </div>
      </div>
      <div style="display:flex; gap:6px; align-items:flex-start; flex-wrap:wrap;">
        <button class="ghost" style="padding:5px 8px; font-size:11px; border-color:#555;" onclick="openEditTourney('${t.id}')">⚙️ Manage</button>
        ${!isCurrent ? `<button class="primary" style="padding:5px 10px; font-size:11px;" onclick="selectTourney('${t.id}')">Select</button>` : ''}
        <button class="btn-delete-player" style="padding:5px 8px; font-size:11px;" onclick="deleteTourney('${t.id}')">Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
}

window.selectTourney = function(id) {
  store.setActiveTournament(id);
  closeModal('modal-tournament-manager');
};

window.openEditTourney = function(id) {
  const t = store.state.tournaments?.[id];
  if (!t) return;
  document.getElementById('edit-tourney-id').value = t.id;
  document.getElementById('edit-tourney-name').value = t.name || '';
  document.getElementById('edit-tourney-mode').value = t.mode || '4v4';
  document.getElementById('edit-tourney-teams').value = t.numTeams || 10;
  document.getElementById('edit-tourney-format').value = t.format || 'playoffs';
  document.getElementById('edit-tourney-prize').value = t.prizePool || 1000;
  document.getElementById('edit-tourney-fee').value = t.registrationFee || 50;
  document.getElementById('edit-tourney-code').value = t.inviteCode || '';

  openModal('modal-edit-tournament');
};

document.getElementById('form-edit-tournament')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-tourney-id').value;
  if (!id) return;

  const updates = {
    name: document.getElementById('edit-tourney-name').value.trim(),
    mode: document.getElementById('edit-tourney-mode').value,
    numTeams: parseInt(document.getElementById('edit-tourney-teams').value, 10) || 10,
    format: document.getElementById('edit-tourney-format').value,
    prizePool: Number(document.getElementById('edit-tourney-prize').value) || 0,
    registrationFee: Number(document.getElementById('edit-tourney-fee').value) || 0,
    inviteCode: document.getElementById('edit-tourney-code').value.trim()
  };

  store.updateTournament(id, updates);
  closeModal('modal-edit-tournament');
  renderTournamentManagerList();
  alert('✅ Tournament settings updated successfully!');
});

window.deleteTourney = function(id) {
  const t = store.state.tournaments?.[id];
  if (confirm(`Delete tournament "${t ? t.name : 'this'}"? All associated data will be removed.`)) {
    store.deleteTournament(id);
    renderTournamentManagerList();
  }
};

// ---- Render Active Tournament Details ----
function renderActiveTournamentUI() {
  const tourney = store.getActiveTournament();
  const noTourneyState = document.getElementById('no-tourney-state');
  const activeTourneyContainer = document.getElementById('active-tourney-container');
  const sidebarTourneyName = document.getElementById('sidebar-tourney-name');
  const sidebarTourneyMeta = document.getElementById('sidebar-tourney-meta');
  const topbarTourney = document.getElementById('topbar-tourney');

  if (!tourney) {
    if (noTourneyState) noTourneyState.style.display = 'block';
    if (activeTourneyContainer) activeTourneyContainer.style.display = 'none';
    if (sidebarTourneyName) sidebarTourneyName.textContent = 'No Tournament';
    if (sidebarTourneyMeta) sidebarTourneyMeta.textContent = 'Create one above';
    if (topbarTourney) topbarTourney.textContent = 'None';
    return;
  }

  if (noTourneyState) noTourneyState.style.display = 'none';
  if (activeTourneyContainer) activeTourneyContainer.style.display = 'block';

  if (sidebarTourneyName) sidebarTourneyName.textContent = tourney.name;
  if (sidebarTourneyMeta) sidebarTourneyMeta.textContent = `${tourney.numTeams || 10} Teams • ${tourney.mode || '4v4'} • Prize ₹${tourney.prizePool}`;
  if (topbarTourney) topbarTourney.textContent = tourney.name;

  document.getElementById('dash-tourney-title').textContent = tourney.name;
  document.getElementById('dash-tourney-date').textContent = tourney.createdAt || 'Today';

  const teamsCount = tourney.numTeams || 10;
  const playersPerTeam = tourney.mode === "2v2" ? 2 : (tourney.mode === "3v3" ? 3 : 4);
  const reqPlayers = tourney.requiredPlayers || (teamsCount * playersPerTeam);

  document.getElementById('spec-teams').textContent = `${teamsCount} Teams`;
  document.getElementById('spec-mode').textContent = tourney.mode || '4v4';
  document.getElementById('spec-format').textContent = tourney.format === 'playoffs' ? 'Playoffs' : 'Upper/Lower Bracket';
  document.getElementById('spec-target').textContent = `${(tourney.players || []).length} / ${reqPlayers} Players`;
  document.getElementById('spec-prize').textContent = `₹${tourney.prizePool || 0}`;
  document.getElementById('spec-fee').textContent = `₹${tourney.registrationFee || 0}`;
}

// ---- Render Dashboard ----
function renderDashboard() {
  const tourney = store.getActiveTournament();
  if (!tourney) return;

  const players = tourney.players || [];
  const captains = tourney.captains || [];
  const feePaidCount = players.filter(p => p.feePaid).length;

  document.getElementById('stat-players').textContent = players.length;
  document.getElementById('stat-fee-paid').textContent = feePaidCount;
  document.getElementById('stat-teams').textContent = captains.length;

  const statusEl = document.getElementById('stat-auction-status');
  if (statusEl) {
    if (!tourney.biddersCategory) {
      statusEl.textContent = 'Set Bidders';
      statusEl.style.color = 'var(--muted)';
    } else if (tourney.auctionState?.currentLotPlayerId) {
      statusEl.textContent = 'Live Bidding';
      statusEl.style.color = 'var(--lime)';
    } else {
      statusEl.textContent = 'Bidders Ready';
      statusEl.style.color = 'var(--green)';
    }
  }

  const navCount = document.getElementById('nav-players-count');
  if (navCount) navCount.textContent = players.length;

  // Dash teams overview
  const dashTeamsGrid = document.getElementById('dash-teams-grid');
  if (dashTeamsGrid) {
    dashTeamsGrid.innerHTML = '';
    if (captains.length === 0) {
      dashTeamsGrid.innerHTML = '<p style="color:var(--muted); font-size:12px; padding:10px;">No bidder captains configured yet. Choose bidders in the Live Auction tab.</p>';
    } else {
      captains.forEach(c => {
        const teamPlayers = players.filter(p => p.teamId === c.id);
        const div = document.createElement('div');
        div.style.background = '#1a1a1d';
        div.style.padding = '12px';
        div.style.borderRadius = '6px';
        div.style.border = '1px solid #303035';
        div.innerHTML = `
          <b>${c.teamName}</b>
          <strong style="color:var(--lime); margin:6px 0 2px;">₹${c.budget}</strong>
          <small>Purse Left</small>
          <div style="font-size:10px; color:#aaa; margin-top:8px;">${teamPlayers.length} Players: ${teamPlayers.map(p => p.name).join(', ') || 'None'}</div>
        `;
        dashTeamsGrid.appendChild(div);
      });
    }
  }
}

// ---- Render Database Players (High to Low Rating) ----
function renderPlayers() {
  const grid = document.getElementById('players-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const tourney = store.getActiveTournament();
  if (!tourney) return;

  const allPlayers = tourney.players || [];

  // Counts
  document.getElementById('count-all').textContent = allPlayers.length;
  const countPendingEl = document.getElementById('count-pending');
  if (countPendingEl) countPendingEl.textContent = allPlayers.filter(p => p.category === 'PENDING').length;
  document.getElementById('count-pro').textContent = allPlayers.filter(p => p.category === 'PRO').length;
  document.getElementById('count-mid').textContent = allPlayers.filter(p => p.category === 'MID').length;
  document.getElementById('count-noob').textContent = allPlayers.filter(p => p.category === 'NOOB').length;

  const filterActive = document.querySelector('.filter.active');
  const filter = filterActive ? filterActive.getAttribute('data-filter') : 'ALL';

  let players = [...allPlayers];
  if (filter !== 'ALL') {
    players = players.filter(p => p.category === filter);
  }

  // Sorted strictly High to Low Rating
  players.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  if (players.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; border: 1px dashed #303036; border-radius: 8px;">
        <span style="font-size: 32px; display: block; margin-bottom: 8px;">👥</span>
        <p style="color:var(--muted); font-size:13px; margin:0 0 12px;">No players in this section yet.</p>
        <button class="primary" onclick="document.getElementById('btn-add-player').click()">+ Register Player</button>
      </div>
    `;
    return;
  }

  players.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'player-card';

    const assignedCaptain = p.teamId ? (tourney.captains || []).find(c => c.id === p.teamId) : null;
    const teamLabel = assignedCaptain ? `<span style="color:var(--violet); font-size:10px; font-weight:700;">Squad: ${assignedCaptain.teamName} (₹${p.bidAmount})</span>` : `<span style="color:var(--green); font-size:10px;">Available</span>`;

    const isPending = !p.category || p.category === 'PENDING';
    const avatarCatClass = isPending ? 'small' : p.category.toLowerCase();
    const avatarLetter = isPending ? '?' : p.name.charAt(0).toUpperCase();

    // Category control: if pending, show 3 1-click assign buttons; if assigned, show category badge
    let categoryHtml = '';
    if (isPending) {
      categoryHtml = `
        <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap; margin-top:3px;">
          <span style="color:#ffcc5f; font-size:10px; font-weight:bold;">Admin Classify:</span>
          <button class="btn" style="padding:2px 6px; font-size:9px; background:#1c2538; color:#7dd3fc; border:1px solid #38bdf8; border-radius:3px; cursor:pointer;" onclick="assignPlayerCategory('${p.id}', 'PRO')">💎 Pro</button>
          <button class="btn" style="padding:2px 6px; font-size:9px; background:#2d281a; color:#fde047; border:1px solid #facc15; border-radius:3px; cursor:pointer;" onclick="assignPlayerCategory('${p.id}', 'MID')">⚡ Mid</button>
          <button class="btn" style="padding:2px 6px; font-size:9px; background:#182b20; color:#86efac; border:1px solid #4ade80; border-radius:3px; cursor:pointer;" onclick="assignPlayerCategory('${p.id}', 'NOOB')">🌱 Noob</button>
        </div>
      `;
    } else {
      categoryHtml = `
        <button class="btn" style="padding:2px 6px; font-size:9px; background:#222; border:1px solid #444; color:#fff; border-radius:3px; cursor:pointer;" onclick="cyclePlayerCategory('${p.id}', '${p.category}')" title="Click to cycle category">
           ${p.category === 'PRO' ? '💎 PRO' : (p.category === 'MID' ? '⚡ MID' : '🌱 NOOB')} ⟳
        </button>
      `;
    }

    card.innerHTML = `
      <div style="font:10px 'DM Mono'; color:var(--muted); width:20px;">#${idx+1}</div>
      <div class="avatar ${avatarCatClass}">${avatarLetter}</div>
      <div class="player-info" style="flex:1;">
        <h3 style="color:#fff; font-size:14px; font-weight:700; margin:0 0 3px;">${p.name}</h3>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
           ${categoryHtml}
           
           <!-- Fee Paid Checkbox -->
           <label style="display:flex; align-items:center; gap:4px; font:10px 'DM Mono'; color:#aaa; cursor:pointer;">
             <input type="checkbox" ${p.feePaid ? 'checked' : ''} onchange="togglePlayerFee('${p.id}', this.checked)" style="accent-color:var(--lime); width:13px; height:13px;">
             ${p.feePaid ? '<span style="color:var(--green)">Fee Paid</span>' : '<span style="color:#ff6a6a">Unpaid</span>'}
           </label>
        </div>
        <div>${teamLabel}</div>
      </div>

      <!-- Rating Display & Inline Edit -->
      <div class="player-rating" style="text-align:right; margin-right:12px;">
        <input type="number" class="inline-rating-input" value="${p.rating || 0}" min="0" max="100" onchange="updatePlayerRating('${p.id}', this.value)" title="Admin click to edit rating">
        <span style="font:8px 'DM Mono'; color:#777; display:block; margin-top:2px;">RATING</span>
      </div>

      <div class="player-card-actions">
        <button class="btn-delete-player" title="Delete player" onclick="removePlayer('${p.id}')">
          🗑️
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

window.assignPlayerCategory = function(id, cat) {
  const currentRating = cat === 'PRO' ? 90 : (cat === 'MID' ? 78 : 64);
  const input = prompt(`Enter rating for this ${cat} player (1-100):`, currentRating);
  const rating = input !== null ? (parseInt(input, 10) || currentRating) : currentRating;
  store.updatePlayer(id, { category: cat, rating: rating });
};

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
    e.currentTarget.classList.add('active');
    renderPlayers();
  });
});

window.cyclePlayerCategory = function(id, current) {
  const next = current === 'PRO' ? 'MID' : (current === 'MID' ? 'NOOB' : 'PRO');
  store.updatePlayer(id, { category: next });
};

window.togglePlayerFee = function(id, checked) {
  store.updatePlayer(id, { feePaid: checked });
};

window.updatePlayerRating = function(id, val) {
  const num = parseInt(val, 10);
  if (!isNaN(num) && num >= 1 && num <= 100) {
    store.updatePlayer(id, { rating: num });
  }
};

window.removePlayer = function(id) {
  const tourney = store.getActiveTournament();
  if (!tourney) return;
  const p = (tourney.players || []).find(item => item.id === id);
  const name = p ? p.name : 'this player';
  if (confirm(`Delete "${name}" from this tournament?`)) {
    store.removePlayer(id);
  }
};

// ---- Dynamic Category Auction Logic ----

// Step 1: Admin clicks which category will be bidders
document.querySelectorAll('.btn-cat-select').forEach(btn => {
  btn.addEventListener('click', () => {
    const tourney = store.getActiveTournament();
    if (!tourney) return alert('Select or create a tournament first');

    const cat = btn.getAttribute('data-bidder');
    const eligibleCount = (tourney.players || []).filter(p => p.category === cat).length;
    if (eligibleCount === 0) {
      return alert(`No ${cat} players registered yet! Register some ${cat} players first.`);
    }

    if (confirm(`Set ${cat} players as the Bidders / Captains? Each will receive a ₹100 purse.`)) {
      store.setBiddersCategory(cat);
      updateAuctionLotDropdown();
    }
  });
});

function updateAuctionLotDropdown() {
  const tourney = store.getActiveTournament();
  const select = document.getElementById('select-auction-category');
  if (!select || !tourney) return;

  // Preserve currently selected category so it does not reset on every bid/lot completion!
  const previousCategory = select.value;

  // Active bidder highlight
  document.querySelectorAll('.btn-cat-select').forEach(b => {
    if (b.getAttribute('data-bidder') === tourney.biddersCategory) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  // Populate options excluding bidders category
  const categories = ['PRO', 'MID', 'NOOB'];
  select.innerHTML = '<option value="">Choose category to auction...</option>';
  categories.forEach(cat => {
    if (cat !== tourney.biddersCategory) {
      const count = (tourney.players || []).filter(p => p.category === cat && !p.teamId).length;
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = `${cat === 'PRO' ? '💎 Pro' : (cat === 'MID' ? '⚡ Mid' : '🌱 Noob')} (${count} unsold)`;
      select.appendChild(opt);
    }
  });

  // Restore the selected category so admin doesn't have to re-select it after every bid or sold player
  if (previousCategory && previousCategory !== tourney.biddersCategory) {
    select.value = previousCategory;
  }
}

// Step 2: Draw Random Player
document.getElementById('btn-draw-random-player')?.addEventListener('click', () => {
  const tourney = store.getActiveTournament();
  if (!tourney) return alert('Select a tournament first');
  if (!tourney.biddersCategory || (tourney.captains || []).length === 0) {
    return alert('Please complete Step 1: Select which category will be bidders first!');
  }

  const select = document.getElementById('select-auction-category');
  const cat = select.value;
  if (!cat) return alert('Please select a category to auction!');

  const drawn = store.drawRandomAuctionPlayer(cat);
  if (!drawn) {
    alert(`No unsold players remaining in ${cat} category!`);
  }
});

// ---- Real Identity Management ----
function getDeviceIdentity() {
  if (window.currentUserIsAdmin) {
    return { type: 'admin', id: 'admin', name: window.currentUserId || 'Admin' };
  }
  const tourney = store.getActiveTournament();
  if (tourney && tourney.captains) {
    const cap = tourney.captains.find(c => c.ownerUid === window.currentUserId || c.playerId === window.currentUserId);
    if (cap) return { type: 'captain', id: cap.id, name: cap.name };
  }
  return { type: 'player', id: window.currentUserId, name: 'Player' };
}
function setDeviceIdentity(identity) {}
function renderDeviceIdentityUI() {}
// Step 3: Bidding & Increments (+5)
function renderAuctionStage() {
  const tourney = store.getActiveTournament();
  const activeDisplay = document.getElementById('active-player-display');
  const emptyDisplay = document.getElementById('empty-auction-display');
  const bidDeck = document.getElementById('captain-bid-deck');
  const bidFeed = document.getElementById('auction-bid-feed');

  // Role elements
  const adminConfigPanel = document.getElementById('admin-auction-config-panel');
  const adminActions = document.getElementById('admin-auction-actions');
  const myCaptainConsole = document.getElementById('my-captain-console');
  const spectatorBanner = document.getElementById('auction-spectator-banner');
  const spectatorRoleName = document.getElementById('spectator-role-name');
  const myPurseEl = document.getElementById('my-captain-purse');
  const myCaptainStatusEl = document.getElementById('my-captain-status');
  const btnMyBidPlus5 = document.getElementById('btn-my-bid-plus5');
  const btnMyMatchBid = document.getElementById('btn-my-match-bid');

  renderDeviceIdentityUI();
  const identity = getDeviceIdentity();

  // Show/Hide Admin Configuration Panel (Only admin configures bidder category & draws player)
  if (adminConfigPanel) {
    // adminConfigPanel display handled by CSS
  }

  if (!tourney || !tourney.auctionState?.currentLotPlayerId) {
    if (activeDisplay) activeDisplay.style.display = 'none';
    if (emptyDisplay) emptyDisplay.style.display = 'block';
    if (myCaptainConsole) myCaptainConsole.style.display = 'none';
    if (spectatorBanner) spectatorBanner.style.display = 'none';
    renderCaptainsSidebar();
    return;
  }

  const lotPlayer = (tourney.players || []).find(p => p.id === tourney.auctionState.currentLotPlayerId);
  if (!lotPlayer) {
    if (activeDisplay) activeDisplay.style.display = 'none';
    if (emptyDisplay) emptyDisplay.style.display = 'block';
    return;
  }

  if (activeDisplay) activeDisplay.style.display = 'block';
  if (emptyDisplay) emptyDisplay.style.display = 'none';

  // Player lot info
  document.getElementById('auc-avatar').className = `avatar giant ${lotPlayer.category.toLowerCase()}`;
  document.getElementById('auc-avatar').textContent = lotPlayer.name.charAt(0).toUpperCase();
  document.getElementById('auc-name').textContent = lotPlayer.name;
  document.getElementById('auc-cat').innerHTML = `${lotPlayer.category} • RATING: <span style="color:var(--orange); font-weight:800;">${lotPlayer.rating}</span>`;

  // Highest bid info
  const currentBid = tourney.auctionState.currentBid || 0;
  const highestCapIds = tourney.auctionState.highestCaptains || [];
  const highestCaptains = (tourney.captains || []).filter(c => highestCapIds.includes(c.id));

  document.getElementById('auc-highest-bid').textContent = `₹${currentBid}`;
  const bidderDisplay = document.getElementById('auc-highest-bidder');

  if (highestCaptains.length === 0) {
    bidderDisplay.textContent = 'Starting at ₹5';
    bidderDisplay.style.color = 'var(--muted)';
  } else if (tourney.auctionState.isTied || highestCaptains.length > 1) {
    bidderDisplay.innerHTML = `<span style="color:#ff6a6a; font-weight:bold;">⚔️ TIE: ${highestCaptains.map(c => c.name).join(' vs ')}</span>`;
  } else {
    bidderDisplay.innerHTML = `Lead Bidder: <strong style="color:var(--lime);">${highestCaptains[0].name}</strong>`;
  }

  // --- DEVICE-SPECIFIC ROLE LOGIC ---
  // 1. Admin controls (SOLD, Declare Tie, Skip) - ONLY visible for Admin!
  if (adminActions) {
    adminActions.style.display = identity.type === 'admin' ? 'flex' : 'none';
  }

  // 2. Captain's Personal Console - Visible only if current device is a Captain!
  if (identity.type === 'captain') {
    const myCaptain = (tourney.captains || []).find(c => c.id === identity.id);
    if (myCaptain) {
      if (myCaptainConsole) myCaptainConsole.style.display = 'block';
      if (spectatorBanner) spectatorBanner.style.display = 'none';

      const nextBid = currentBid === 0 ? 5 : currentBid + 5;
      const canAffordPlus5 = myCaptain.budget >= nextBid;
      const canAffordMatch = currentBid > 0 && myCaptain.budget >= currentBid;
      const isLead = highestCapIds.includes(myCaptain.id);

      if (myPurseEl) myPurseEl.textContent = `₹${myCaptain.budget} / 100`;

      if (myCaptainStatusEl) {
        if (isLead && tourney.auctionState.isTied) {
          myCaptainStatusEl.innerHTML = `<span style="color:var(--orange);">⚔️ TIED WITH COMPETITOR</span>`;
        } else if (isLead) {
          myCaptainStatusEl.innerHTML = `<span style="color:var(--lime);">👑 YOU HAVE HIGHEST BID</span>`;
        } else {
          myCaptainStatusEl.innerHTML = `<span style="color:#aaa;">Team ${myCaptain.teamName}</span>`;
        }
      }

      if (btnMyBidPlus5) {
        btnMyBidPlus5.textContent = isLead ? `👑 Highest (₹${currentBid})` : `🔥 BID +5 (₹${nextBid})`;
        btnMyBidPlus5.disabled = !canAffordPlus5 || (isLead && !tourney.auctionState.isTied);
        btnMyBidPlus5.onclick = () => {
          const res = store.placeBidForCaptain(myCaptain.id);
          if (!res.success) alert(res.error);
        };
      }

      if (btnMyMatchBid) {
        btnMyMatchBid.textContent = `⚔️ MATCH BID ₹${currentBid} (TIE)`;
        // Can match only if there's a bid, not already leading/tied, and has purse
        btnMyMatchBid.disabled = !canAffordMatch || isLead || currentBid === 0;
        btnMyMatchBid.onclick = () => {
          const res = store.matchBidForCaptain(myCaptain.id);
          if (!res.success) alert(res.error);
        };
      }
    } else {
      if (myCaptainConsole) myCaptainConsole.style.display = 'none';
    }
  } else {
    if (myCaptainConsole) myCaptainConsole.style.display = 'none';
    if (spectatorBanner) {
      spectatorBanner.style.display = identity.type === 'admin' ? 'none' : 'block';
      if (spectatorRoleName) spectatorRoleName.textContent = identity.name || 'Player';
    }
  }

  // Captains status overview deck (Shows all teams for live room awareness)
  if (bidDeck) {
    bidDeck.innerHTML = '';
    const nextBid = currentBid === 0 ? 5 : currentBid + 5;

    (tourney.captains || []).forEach(c => {
      const isLead = highestCapIds.includes(c.id);
      const canAfford = c.budget >= nextBid;

      const card = document.createElement('div');
      card.className = `captain-bid-card ${isLead ? 'leading' : ''}`;
      
      // If admin device, admin can bid on behalf of captain if necessary, otherwise show status
      const actionBtnHtml = identity.type === 'admin' 
        ? `<button class="btn-bid-plus5" ${(!canAfford || (isLead && !tourney.auctionState.isTied)) ? 'disabled' : ''} onclick="bidForCaptain('${c.id}')">
             ${isLead ? 'Current High' : `+5 Bid (₹${nextBid})`}
           </button>`
        : `<div style="font:10px 'DM Mono'; color:${isLead ? 'var(--lime)' : '#888'}; padding:6px 0; text-align:center; font-weight:700;">
             ${isLead ? '👑 HIGHEST BIDDER' : (canAfford ? 'Eligible to Bid' : 'Insufficient Purse')}
           </div>`;

      card.innerHTML = `
        <div class="cap-name">${c.name} ${isLead ? '👑' : ''}</div>
        <div class="cap-purse">Purse: ₹${c.budget} / 100</div>
        ${actionBtnHtml}
      `;
      bidDeck.appendChild(card);
    });
  }

  // Bid Feed
  if (bidFeed) {
    bidFeed.innerHTML = '';
    const logs = tourney.auctionState.bidLog || [];
    if (logs.length === 0) {
      bidFeed.innerHTML = '<p style="color:#666;">Bidding underway...</p>';
    } else {
      logs.slice(0, 8).forEach(l => {
        const p = document.createElement('p');
        p.style.margin = '4px 0';
        p.innerHTML = `<span style="color:var(--muted)">[${l.time}]</span> ${l.sold ? `<strong style="color:var(--green)">${l.text}</strong>` : l.text}`;
        bidFeed.appendChild(p);
      });
    }
  }

  renderCaptainsSidebar();

  // --- AUTOMATIC TIE-BREAKER POPUP FOR AUCTIONED PLAYER'S DEVICE ---
  if (tourney.auctionState.isTied) {
    const tiedCapIds = tourney.auctionState.tiedCaptains || tourney.auctionState.highestCaptains || [];
    if (tiedCapIds.length >= 2) {
      // Check if this device is the player being auctioned OR is admin
      const isThisLotPlayer = identity.type === 'player' && (identity.id === lotPlayer.id || identity.name.toLowerCase() === lotPlayer.name.toLowerCase());
      const isAdmin = identity.type === 'admin';

      if (isThisLotPlayer || isAdmin) {
        openTieBreakerModal(tiedCapIds, currentBid, isThisLotPlayer);
      }
    }
  } else {
    // If not tied anymore, close tie modal if it was open
    const tieModal = document.getElementById('modal-tie-breaker');
    if (tieModal && tieModal.classList.contains('show')) {
      closeModal('modal-tie-breaker');
    }
  }
}

window.bidForCaptain = function(captainId) {
  const res = store.placeBidForCaptain(captainId);
  if (!res.success) {
    alert(res.error);
  }
};

// SOLD Button (Admin Only)
document.getElementById('btn-sold')?.addEventListener('click', () => {
  const tourney = store.getActiveTournament();
  if (!tourney || !tourney.auctionState?.currentLotPlayerId) return;

  const currentBid = tourney.auctionState.currentBid;
  const highestCapIds = tourney.auctionState.highestCaptains || [];

  if (highestCapIds.length === 0 || currentBid === 0) {
    return alert('No bids placed yet! Place at least one bid before selling.');
  }

  // Check if tie
  if (highestCapIds.length > 1 || tourney.auctionState.isTied) {
    openTieBreakerModal(highestCapIds, currentBid, false);
    return;
  }

  store.sellCurrentLot(highestCapIds[0], currentBid);
});

// Skip Lot (Admin Only)
document.getElementById('btn-skip-lot')?.addEventListener('click', () => {
  if (confirm('Skip this player for now?')) {
    store.skipCurrentLot();
  }
});

// Declare Tie Button (Admin Only: Automatically finds highest/tied bidders)
document.getElementById('btn-declare-tie')?.addEventListener('click', () => {
  const tourney = store.getActiveTournament();
  if (!tourney || !tourney.auctionState?.currentLotPlayerId) return;

  const captains = tourney.captains || [];
  if (captains.length < 2) return alert('Need at least 2 captains to declare a tie.');

  // Automatically detect tied captains without asking admin to type indices!
  store.setAuctionTie();
});

// Open Tie Breaker Modal (Player Decides Team on their screen)
function openTieBreakerModal(captainIds, bidAmount, isAuctionedPlayer = false) {
  const tourney = store.getActiveTournament();
  if (!tourney) return;

  const player = (tourney.players || []).find(p => p.id === tourney.auctionState?.currentLotPlayerId);
  const captains = (tourney.captains || []).filter(c => captainIds.includes(c.id));

  document.getElementById('tie-amount-display').textContent = `₹${bidAmount}`;
  document.getElementById('tie-player-name').textContent = player ? player.name : 'Player';

  const titleEl = document.querySelector('#modal-tie-breaker h2');
  if (titleEl) {
    titleEl.textContent = isAuctionedPlayer 
      ? `⚔️ You are in a Tie! Choose Your Team!`
      : `⚔️ Auction Tie Breaker (${player ? player.name : 'Player'})`;
  }

  const container = document.getElementById('tie-choice-options');
  container.innerHTML = '';

  captains.forEach(c => {
    const card = document.createElement('div');
    card.className = 'tie-choice-card';
    card.innerHTML = `
      <div style="font-size:28px; margin-bottom: 6px;">🛡️</div>
      <strong style="font-size:16px;">${c.teamName}</strong>
      <span style="display:block; margin: 4px 0 10px;">Captain: ${c.name}</span>
      <button class="primary" style="width:100%; padding:9px 12px; font-weight:800; background:var(--lime); color:#111; border-radius:5px;">
        Join ${c.name}'s Team
      </button>
    `;
    card.onclick = () => {
      store.sellCurrentLot(c.id, bidAmount);
      closeModal('modal-tie-breaker');
      alert(`🎉 ${player.name} selected ${c.teamName}!`);
    };
    container.appendChild(card);
  });

  openModal('modal-tie-breaker');
}

// Render Captains / Rosters Sidebar
function renderCaptainsSidebar() {
  const list = document.getElementById('captains-wallets');
  if (!list) return;
  list.innerHTML = '';

  const tourney = store.getActiveTournament();
  if (!tourney) return;

  const captains = tourney.captains || [];
  if (captains.length === 0) {
    list.innerHTML = '<p style="color:var(--muted); font-size:12px; padding:12px;">No bidder captains yet. Select Bidders Category above.</p>';
    return;
  }

  captains.forEach((c, idx) => {
    const colors = ['violet', 'orange', 'green', 'blue'];
    const colorClass = colors[idx % colors.length];
    const teamPlayers = (tourney.players || []).filter(p => p.teamId === c.id);

    const div = document.createElement('div');
    div.style.background = '#1a1a1d';
    div.style.padding = '14px';
    div.style.borderRadius = '6px';
    div.style.border = '1px solid #303035';
    div.style.position = 'relative';
    div.style.marginBottom = '12px';

    div.innerHTML = `
      <b style="color:#fff; font-size:13px;">${c.teamName}</b>
      <div style="font:10px 'DM Mono'; color:var(--muted); margin:2px 0 6px;">Captain: ${c.name}</div>
      <strong style="color:var(--lime); font-size:22px; display:block; margin:2px 0;">₹${c.budget}</strong>
      <small style="color:var(--muted); font:9px 'DM Mono';">REMAINING PURSE</small>
      <i class="team-color ${colorClass}" style="position:absolute; right:12px; top:12px;"></i>
      <div style="margin-top:10px; font-size:11px; color:#aaa; border-top:1px solid #28282c; padding-top:6px;">
        Squad (${teamPlayers.length}): ${teamPlayers.map(p => `<span style="display:inline-block; background:#222; padding:2px 5px; border-radius:3px; margin:2px;">${p.name} (₹${p.bidAmount})</span>`).join('') || '<span style="color:#666">Empty</span>'}
      </div>
    `;
    list.appendChild(div);
  });
}

// ---- Fixtures & Standings Logic ----
document.getElementById('btn-generate-fixtures')?.addEventListener('click', () => {
  const tourney = store.getActiveTournament();
  if (!tourney) return alert('Select or create a tournament first');

  const teams = tourney.captains || [];
  if (teams.length < 2) return alert('Need at least 2 teams to generate fixtures. Complete the auction or add captains.');

  if (!confirm('Generating new fixtures will reset current match scores. Continue?')) return;

  const shuffled = [...teams].sort(() => 0.5 - Math.random());
  const half = Math.ceil(shuffled.length / 2);
  const groupA = shuffled.slice(0, half);
  const groupB = shuffled.slice(half);

  tourney.fixtures = {
    groupA: generateRoundRobin(groupA),
    groupB: generateRoundRobin(groupB)
  };

  store.save();
});

function generateRoundRobin(teams) {
  const matches = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        id: `m_${Math.random().toString(36).substr(2,8)}`,
        homeId: teams[i].id,
        awayId: teams[j].id,
        homeName: teams[i].teamName,
        awayName: teams[j].teamName,
        homeScore: null,
        awayScore: null,
        played: false
      });
    }
  }
  return matches;
}

function renderFixtures() {
  const contA = document.getElementById('fixtures-group-a');
  const contB = document.getElementById('fixtures-group-b');
  const tourney = store.getActiveTournament();

  const renderGroup = (matches, container, groupKey) => {
    if (!container) return;
    container.innerHTML = '';
    if (!matches || matches.length === 0) {
      container.innerHTML = '<p style="color:var(--muted); padding: 14px; font-size:12px;">No fixtures generated yet. Click "⚡ Generate Fixtures" above.</p>';
      return;
    }

    matches.forEach((m, idx) => {
      const div = document.createElement('div');
      div.className = 'fixture';
      div.innerHTML = `
        <span style="font:9px 'DM Mono'; color:var(--muted);">#${idx+1}</span>
        <strong style="text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.homeName}</strong>
        <b style="text-align:center;">VS</b>
        <strong style="text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.awayName}</strong>
        <div style="display:flex; gap:4px; align-items:center;">
           <input type="number" id="s1_${m.id}" value="${m.homeScore ?? ''}" placeholder="0" style="width:32px; padding:3px; font-size:11px; text-align:center; background:#111; color:#fff; border:1px solid #333; border-radius:3px;">
           <span style="color:#777; font-size:10px;">:</span>
           <input type="number" id="s2_${m.id}" value="${m.awayScore ?? ''}" placeholder="0" style="width:32px; padding:3px; font-size:11px; text-align:center; background:#111; color:#fff; border:1px solid #333; border-radius:3px;">
           <button style="padding:4px 6px; font-size:10px; font-weight:bold; background:var(--lime); color:#111; border:none; border-radius:3px; cursor:pointer;" onclick="saveMatch('${groupKey}', ${idx}, '${m.id}')">✓</button>
        </div>
      `;
      container.appendChild(div);
    });
  };

  const fixtures = tourney?.fixtures || { groupA: [], groupB: [] };
  renderGroup(fixtures.groupA, contA, 'groupA');
  renderGroup(fixtures.groupB, contB, 'groupB');
}

window.saveMatch = function(groupKey, idx, matchId) {
  const s1 = parseInt(document.getElementById(`s1_${matchId}`).value, 10);
  const s2 = parseInt(document.getElementById(`s2_${matchId}`).value, 10);

  if (isNaN(s1) || isNaN(s2)) return alert('Enter round scores for both teams');

  const tourney = store.getActiveTournament();
  if (!tourney || !tourney.fixtures) return;

  const match = tourney.fixtures[groupKey][idx];
  match.homeScore = s1;
  match.awayScore = s2;
  match.played = true;
  store.save();
};

function calcStandings(matches) {
  const table = {};

  matches.forEach(m => {
    if (!table[m.homeId]) table[m.homeId] = { id: m.homeId, name: m.homeName, p:0, w:0, l:0, pts:0, rd:0 };
    if (!table[m.awayId]) table[m.awayId] = { id: m.awayId, name: m.awayName, p:0, w:0, l:0, pts:0, rd:0 };

    if (m.played) {
      table[m.homeId].p++;
      table[m.awayId].p++;

      const rdHome = m.homeScore - m.awayScore;
      const rdAway = m.awayScore - m.homeScore;

      table[m.homeId].rd += rdHome;
      table[m.awayId].rd += rdAway;

      if (m.homeScore > m.awayScore) {
        table[m.homeId].w++;
        table[m.homeId].pts += 3;
        table[m.awayId].l++;
      } else if (m.awayScore > m.homeScore) {
        table[m.awayId].w++;
        table[m.awayId].pts += 3;
        table[m.homeId].l++;
      } else {
        table[m.homeId].pts += 1;
        table[m.awayId].pts += 1;
      }
    }
  });

  const arr = Object.values(table);
  arr.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    return b.rd - a.rd;
  });
  return arr;
}

function renderStandings() {
  const tbodyA = document.getElementById('standings-group-a');
  const tbodyB = document.getElementById('standings-group-b');
  const tourney = store.getActiveTournament();

  const renderTable = (matches, tbody) => {
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!matches || matches.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:16px; color:var(--muted);">No matches recorded yet.</td></tr>';
      return;
    }

    const standings = calcStandings(matches);
    if (standings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:16px; color:var(--muted);">No teams in this group.</td></tr>';
      return;
    }

    standings.forEach((s, i) => {
      const isTop = i < 2;
      const tr = document.createElement('tr');
      if (!isTop && standings.length > 2) tr.className = 'eliminated';
      tr.innerHTML = `
        <td><div class="pos ${isTop ? 'qualified' : ''}">${i+1}</div></td>
        <td>
           <div class="table-team">
             <div class="team-logo">${s.name.substring(0,2).toUpperCase()}</div>
             <strong>${s.name}</strong>
           </div>
        </td>
        <td>${s.p}</td>
        <td>${s.w}</td>
        <td>${s.l}</td>
        <td class="${s.rd > 0 ? 'positive' : (s.rd < 0 ? 'negative' : '')}" style="font-weight:700;">
          ${s.rd > 0 ? '+'+s.rd : s.rd}
        </td>
        <td style="font-weight:800; color:var(--lime);">${s.pts}</td>
      `;
      tbody.appendChild(tr);
    });
  };

  const fixtures = tourney?.fixtures || { groupA: [], groupB: [] };
  renderTable(fixtures.groupA, tbodyA);
  renderTable(fixtures.groupB, tbodyB);
}

// ---- Global State Listener ----
window.addEventListener('stateChanged', () => {
  renderActiveTournamentUI();
  renderDashboard();
  renderPlayers();
  updateAuctionLotDropdown();
  renderAuctionStage();
  renderFixtures();
  renderStandings();
  renderTournamentManagerList();
});

// Initial Render
renderActiveTournamentUI();
renderDashboard();
renderPlayers();
updateAuctionLotDropdown();
renderAuctionStage();
renderFixtures();
renderStandings();
renderTournamentManagerList();
