import { onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "./firebase.js";
import { store } from "./store.js";

const discordClientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
const discordRedirectUri = import.meta.env.VITE_DISCORD_REDIRECT_URI;

export function initAuth() {
  const btnLogin = document.getElementById('btn-login-discord');
  const btnLogout = document.getElementById('btn-logout');
  const userInfo = document.getElementById('user-info');
  const userNameDisplay = document.getElementById('user-name-display');
  const userRoleBadge = document.getElementById('user-role-badge');
  
  // Set defaults
  window.currentUserIsAdmin = false;
  window.currentUserId = null;
  window.currentUserRole = 'GUEST';

  btnLogin?.addEventListener('click', () => {
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${encodeURIComponent(discordRedirectUri)}&response_type=code&scope=identify`;
    window.location.href = oauthUrl;
  });

  btnLogout?.addEventListener('click', () => {
    signOut(auth);
  });

  // Handle callback if code is in URL
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    // Clear URL
    window.history.replaceState({}, document.title, window.location.pathname);
    // Exchange code
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: discordRedirectUri })
    })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        signInWithCustomToken(auth, data.token);
      } else {
        alert("Login failed: " + (data.error || "Unknown error"));
      }
    })
    .catch(err => {
      console.error(err);
      alert("Login error");
    });
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      window.currentUserId = user.uid;
      const idTokenResult = await user.getIdTokenResult();
      window.currentUserIsAdmin = !!idTokenResult.claims.admin;
      window.currentUserRole = window.currentUserIsAdmin ? 'ADMIN' : 'PLAYER';
      
      // We don't have discordName directly on `user` unless we set displayName, so let's check claims
      const discordName = idTokenResult.claims.discordName || user.displayName || "User";

      if (btnLogin) btnLogin.style.display = 'none';
      if (userInfo) userInfo.style.display = 'flex';
      if (userNameDisplay) userNameDisplay.textContent = discordName;
      if (userRoleBadge) {
          userRoleBadge.textContent = window.currentUserRole;
          userRoleBadge.style.color = window.currentUserIsAdmin ? 'var(--orange)' : 'var(--lime)';
      }
      
      // Show/Hide Admin UI elements globally
      document.body.classList.toggle('is-admin', window.currentUserIsAdmin);
      
      // Initialize store only after we know auth state, so it pulls correct data
      store.init();
    } else {
      window.currentUserId = null;
      window.currentUserIsAdmin = false;
      window.currentUserRole = 'GUEST';
      
      if (btnLogin) btnLogin.style.display = 'block';
      if (userInfo) userInfo.style.display = 'none';
      
      document.body.classList.remove('is-admin');
      
      // Clear data or init read-only
      store.init(); 
    }
  });
}
