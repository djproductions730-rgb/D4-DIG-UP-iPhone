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

export function setupFinanceSync(stores) {
  let session;
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'Finance Auto-sync');
  dialog.style.cssText = 'max-width:min(90vw,420px);padding:20px;border:1px solid #bacbd7;border-radius:14px;background:#fff;color:#17334a';
  dialog.innerHTML = `<form>
    <h2>Finance Auto-sync</h2>
    <p data-status role="status" aria-live="polite"></p>
    <fieldset><legend>Use the same account in both apps</legend>
    <label>Email <input name="email" type="email" autocomplete="username" required></label>
    <label>Password <input name="password" type="password" minlength="6" autocomplete="current-password" required></label>
    <button type="submit" value="signin">Sign in</button>
    <button type="submit" value="create">Create account</button>
    <button type="submit" value="reset" formnovalidate>Reset password</button>
    </fieldset>
    <button type="button" data-verify hidden>Check email verification</button>
    <button type="button" data-resend hidden>Send verification email</button>
    <button type="button" data-enable hidden>Enable Auto-sync</button>
    <button type="button" data-logout hidden>Stop sync and sign out</button>
    <button type="button" data-close>Close</button>
  </form>`;
  const form = dialog.querySelector('form');
  const status = dialog.querySelector('[data-status]');
  const button = key => dialog.querySelector('[data-' + key + ']');
  const credentials = form.querySelector('fieldset');
  document.body.append(dialog);

  function refresh(user) {
    session?.close();
    session = undefined;
    credentials.hidden = !!user;
    button('logout').hidden = !user;
    button('verify').hidden = button('resend').hidden = !user || user.emailVerified;
    button('enable').hidden = !user?.emailVerified;
    if (!user) {
      status.textContent = 'Sign in to connect DigUp and D47 Lona.';
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
    const password = form.elements.password.value;
    form.elements.password.value = '';
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
