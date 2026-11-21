import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import * as accounts from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import * as sdk from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';
import { syncStorage } from './storage-sync.mjs';

const firebase = initializeApp({
  apiKey: 'AIzaSyA62m1oJeJxN9yLVyPhiGF_ziIwmvmZLGA',
  authDomain: 'd4-finance-sync.firebaseapp.com',
  projectId: 'd4-finance-sync',
  appId: '1:409652875790:web:319b0eeffb367f0a7aa25f'
}, 'd4-finance-sync');
const auth = accounts.getAuth(firebase);
const db = sdk.getFirestore(firebase);
const bindingKey = 'd4-finance-sync-account';
const activeKey = 'd4-finance-sync-enabled';

const dialogStyles = `
dialog.d4-sync-dialog {
  box-sizing:border-box; position:fixed; inset:0; margin:auto;
  width:min(calc(100% - 28px), 420px); max-width:none;
  max-height:calc(100dvh - 36px); overflow:auto; overscroll-behavior:contain;
  padding:clamp(18px, 5vw, 28px); border:1px solid #66518d; border-radius:24px;
  background:radial-gradient(ellipse at top left,#30234c,transparent 65%),#151226;
  color:#faf7ff; color-scheme:dark; box-shadow:0 24px 90px #080511c9;
  font:500 15px/1.45 system-ui,sans-serif;
}
.d4-sync-dialog::backdrop { background:#080611bd; backdrop-filter:blur(7px); }
.d4-sync-dialog *, .d4-sync-dialog *::before, .d4-sync-dialog *::after { box-sizing:border-box; }
.d4-sync-dialog [hidden] { display:none!important; }
.d4-sync-dialog form,.d4-sync-dialog fieldset { margin:0; padding:0; border:0; min-width:0; }
.d4-sync-dialog header { display:flex; justify-content:space-between; align-items:center; gap:10px; margin:0 0 12px; }
.d4-sync-dialog h2 { color:#faf7ff!important; margin:0; font:750 clamp(21px, 6vw, 27px)/1.15 system-ui,sans-serif; letter-spacing:-.025em; }
.d4-sync-dialog legend { padding:0; margin:0 0 14px; color:#e4dafa; font-size:14px; }
.d4-sync-dialog p[data-status] { margin:0 0 14px; padding:10px 12px; border-radius:12px; background:#261e3c; color:#eadffa; font-size:14px; }
.d4-sync-dialog p[data-status]:empty { display:none; }
.d4-sync-dialog label { display:block; margin:0 0 6px; font-size:14px; color:#f4eeff; }
.d4-sync-dialog input { display:block; width:100%; min-width:0; min-height:48px; margin:0; padding:10px 12px;
  color:#fff; background:#110e20; border:1px solid #665681; border-radius:12px; font:inherit; font-size:16px; }
.d4-sync-dialog input::placeholder { color:#b7abc9; }
.d4-sync-dialog .sync-field + .sync-field { margin-top:13px; }
.d4-sync-dialog .sync-password { position:relative; }
.d4-sync-dialog .sync-password input { padding-inline-end:76px; }
.d4-sync-dialog button { appearance:none; border:1px solid transparent; background:transparent; color:#eee6ff;
  padding:8px 12px; min-height:44px; margin:0; border-radius:12px; font:650 14px/1.25 system-ui,sans-serif; cursor:pointer; }
.d4-sync-dialog :is(button,input):focus-visible { outline:2px solid #d6b5ff; outline-offset:2px; }
.d4-sync-dialog button[data-close] { min-width:44px; flex:none; padding:0; background:#34294c; font-size:23px; }
.d4-sync-dialog button[data-show-password] { position:absolute; right:2px; top:2px; }
.d4-sync-dialog button.sync-primary { display:block; width:100%; margin-top:15px; color:#1b0e30; background:linear-gradient(110deg,#dfc0ff,#b8a4ff); }
.d4-sync-dialog .sync-links { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:7px; }
.d4-sync-dialog .sync-links button { padding-inline:2px; }
.d4-sync-dialog .sync-links button:hover { background:#34294c; }
.d4-sync-dialog .sync-account-actions button:not(.sync-primary) { width:100%; margin-top:7px; border-color:#665681; }
`;

export function setupFinanceSync(stores) {
  let session;
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'Finance Auto-sync');
  dialog.className = 'd4-sync-dialog';
  dialog.setAttribute('aria-labelledby', 'd4-sync-title');
  const styles = document.createElement('style');
  styles.textContent = dialogStyles;
  document.head.append(styles);
  dialog.innerHTML = `<form>
    <header>
      <h2 id="d4-sync-title">Finance Auto-sync</h2>
      <button type="button" data-close aria-label="Close Finance Auto-sync">×</button>
    </header>
    <p data-status role="status" aria-live="polite"></p>
    <fieldset><legend>Use the same account in DigUp and D47 Lona.</legend>
      <div class="sync-field">
        <label for="d4-sync-email">Email</label>
        <input id="d4-sync-email" name="email" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" required>
      </div>
      <div class="sync-field">
        <label for="d4-sync-password">Password</label>
        <div class="sync-password">
          <input id="d4-sync-password" name="password" type="password" minlength="6" autocomplete="current-password" required>
          <button type="button" data-show-password aria-controls="d4-sync-password">Show</button>
        </div>
      </div>
      <button class="sync-primary" type="submit" value="signin">Sign in</button>
      <div class="sync-links">
        <button type="submit" value="create">Create account</button>
        <button type="submit" value="reset" formnovalidate>Reset password</button>
      </div>
    </fieldset>
    <div class="sync-account-actions">
      <button type="button" data-verify hidden>Check email verification</button>
      <button type="button" data-resend hidden>Send verification email</button>
      <button class="sync-primary" type="button" data-enable hidden>Enable Auto-sync</button>
      <button type="button" data-logout hidden>Stop sync and sign out</button>
    </div>
  </form>`;
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[data-status]');
  const button = key => dialog.querySelector('[data-' + key + ']');
  const credentials = form.querySelector('fieldset');
  document.body.append(dialog);
  const passwordInput = form.elements.password;
  const showPassword = button('show-password');

  function setPasswordVisible(visible) {
    passwordInput.type = visible ? 'text' : 'password';
    showPassword.textContent = visible ? 'Hide' : 'Show';
    showPassword.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  }

  setPasswordVisible(false);
  showPassword.onclick = () => setPasswordVisible(passwordInput.type === 'password');
  dialog.addEventListener('close', () => {
    passwordInput.value = '';
    setPasswordVisible(false);
  });

  function refresh(user) {
    session?.close();
    session = undefined;
    credentials.hidden = !!user;
    button('logout').hidden = !user;
    button('verify').hidden = button('resend').hidden = !user || user.emailVerified;
    button('enable').hidden = !user?.emailVerified;
    if (!user) {
      status.textContent = '';
      return;
    }
    if (!user.emailVerified) {
      status.textContent = 'Verify your email to enable sync.';
      return;
    }
    const bound = localStorage.getItem(bindingKey);
    if (bound && bound !== user.uid) {
      status.textContent = 'This browser has records linked to a different account. Sign out and use your original account.';
      button('enable').hidden = true;
      return;
    }
    if (localStorage.getItem(activeKey) !== user.uid || bound !== user.uid) {
      status.textContent = 'Enable Auto-sync to copy the financial records on this device to this account and receive changes from your other app.';
      return;
    }
    button('enable').hidden = true;
    status.textContent = 'Connecting…';
    session = syncStorage({ db, sdk, user, stores, onStatus() {
      status.textContent = [...new Set(session?.status() ?? ['Connecting…'])].join(' · ');
    } });
  }

  const safely = async action => {
    try { await action(); }
    catch (error) {
      status.textContent = error?.code === 'auth/invalid-credential'
        ? 'Email or password is incorrect.' : 'Could not complete this action. Check your login or internet connection.';
    }
  };
  accounts.onAuthStateChanged(auth, user => void safely(() => refresh(user)));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const email = form.elements.email.value.trim();
    if (event.submitter?.value === 'reset' && !form.elements.email.reportValidity()) return;
    const password = passwordInput.value;
    passwordInput.value = '';
    setPasswordVisible(false);
    void safely(async () => {
      if (event.submitter?.value === 'reset') {
        await accounts.sendPasswordResetEmail(auth, email);
        status.textContent = 'If this account exists, check your email for a password reset link.';
      } else if (event.submitter?.value === 'create') {
        const result = await accounts.createUserWithEmailAndPassword(auth, email, password);
        await accounts.sendEmailVerification(result.user);
        status.textContent = 'Verification sent. Open the link, then check verification here.';
      } else {
        await accounts.signInWithEmailAndPassword(auth, email, password);
      }
    });
  });
  button('verify').onclick = () => void safely(async () => {
    const user = auth.currentUser;
    if (!user) return;
    await accounts.reload(user);
    await accounts.getIdToken(user, true);
    refresh(user);
  });
  button('resend').onclick = () => void safely(async () => {
    if (!auth.currentUser) return;
    await accounts.sendEmailVerification(auth.currentUser);
    status.textContent = 'Verification email sent.';
  });
  button('enable').onclick = () => void safely(() => {
    const user = auth.currentUser;
    if (!user?.emailVerified) return;
    const bound = localStorage.getItem(bindingKey);
    if (bound && bound !== user.uid) return;
    localStorage.setItem(bindingKey, user.uid);
    localStorage.setItem(activeKey, user.uid);
    refresh(user);
  });
  button('logout').onclick = () => void safely(async () => {
    localStorage.removeItem(activeKey);
    session?.close();
    await accounts.signOut(auth);
  });
  button('close').onclick = () => dialog.close();

  return () => {
    if (!dialog.open) dialog.showModal();
  };
}
