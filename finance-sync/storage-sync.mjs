import { openLedger } from './ledger.mjs';
import { mergeLedger } from './merge.mjs';

export function syncStorage({ db, sdk, user, stores, onStatus }) {
  const channels = stores.map(({ name, key, validate, apply, readOnly = false }) => {
    const checkpoint = 'finance-sync:' + user.uid + ':' + key;
    let base = read(checkpoint);
    let observed;
    let busy = false;
    let stopped = false;
    let failed = false;
    let status = 'Connecting…';

    const setStatus = message => {
      status = message;
      onStatus();
    };

    const connection = openLedger({
      db, sdk, user, ledger: name,
      onChange(snapshot, { fromCache }) {
        if (fromCache || stopped || (observed && snapshot.revision < observed.revision)) return;
        observed = snapshot;
        void reconcile();
      },
      onError() {
        failed = true;
        setStatus('Sync unavailable. Device records are still saved.');
      }
    });

    async function reconcile() {
      if (stopped || !observed || busy || failed) return;
      busy = true;
      try {
        const snapshot = observed;
        const local = read(key);
        const remote = snapshot.value;
        if (readOnly) {
          if (remote === null) {
            setStatus('Waiting for DigUp to upload its records.');
            return;
          }
          if (!validate(remote)) throw new Error('Ledger format was invalid.');
          if (JSON.stringify(local) !== JSON.stringify(remote)) {
            localStorage.setItem(key, JSON.stringify(remote));
            apply();
          }
          setStatus('Synced');
          return;
        }
        if ((local !== null && !validate(local)) || (remote !== null && !validate(remote))) {
          throw new Error('Ledger format was invalid. Both copies were kept.');
        }
        let next;
        if (remote === null) next = local;
        else if (local === null) next = remote;
        // A new iPhone installation contains blank default accounts. Never treat those
        // placeholder balances as competing edits to verified cloud records.
        else if (!base && isPristine(name, local)) next = remote;
        else if (!base && isPristine(name, remote)) next = local;
        else next = mergeLedger(base?.value ?? (name === 'digup'
          ? { banks: [], entries: [], loans: [], plans: [], savings: [] }
          : { version: 1, banks: [], loans: [], ledger: [], salaries: {} }), local, remote);

        if (JSON.stringify(next) !== JSON.stringify(remote)) {
          const result = await connection.save(next, snapshot.revision);
          if (stopped) return;
          if (!result.saved) {
            if (observed.revision <= result.current.revision) observed = result.current;
            return;
          }
          if (observed.revision < result.revision) observed = { revision: result.revision, value: next };
        }

        base = { value: next };
        localStorage.setItem(checkpoint, JSON.stringify(base));
        if (JSON.stringify(next) !== JSON.stringify(local)) {
          // Leave edits made while the transaction was in flight for the next pass.
          if (JSON.stringify(read(key)) === JSON.stringify(local)) {
            localStorage.setItem(key, JSON.stringify(next));
            apply();
          } else {
            base = { value: local };
            localStorage.setItem(checkpoint, JSON.stringify(base));
          }
        }
        setStatus('Synced');
      } catch (error) {
        if (stopped) return;
        const message = String(error?.message || '');
        setStatus(/Both devices|Ledger format|size limit/.test(message)
          ? message : 'Waiting to sync. Device records are still saved.');
      } finally {
        busy = false;
      }
    }
    return { reconcile, status: () => status, close() { stopped = true; connection.close(); } };
  });

  const tick = () => channels.forEach(channel => void channel.reconcile());
  const timer = setInterval(tick, 2500);
  window.addEventListener('storage', tick);
  window.addEventListener('online', tick);
  return {
    status: () => channels.map(channel => channel.status()),
    close() {
      clearInterval(timer);
      window.removeEventListener('storage', tick);
      window.removeEventListener('online', tick);
      channels.forEach(channel => channel.close());
    }
  };
}

// Only blank first-run records qualify: no loans, payments, salary history,
// transaction records or edited bank balances. Real local financial data wins no
// automatic priority and instead uses a guarded three-way merge.
function isPristine(name, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (name === 'digup') {
    return ['entries','loans','plans','savings'].every(key =>
      !value[key] || (Array.isArray(value[key]) && value[key].length === 0))
      && (!value.banks || (Array.isArray(value.banks) && value.banks.length === 0));
  }
  if (name === 'lona') {
    const banks = Array.isArray(value.banks) ? value.banks : [];
    const defaultNames = new Set(['hdfc bank','axis bank']);
    return value.version === 1 &&
      Array.isArray(value.loans) && value.loans.length === 0 &&
      Array.isArray(value.ledger) && value.ledger.length === 0 &&
      (!value.salaries || !Object.keys(value.salaries).length) &&
      !(Number(value.salary) > 0) &&
      banks.length <= 2 &&
      banks.every(bank => defaultNames.has(String(bank.name || '').trim().toLowerCase())
        && Number(bank.balance) === 0
        && !bank.reserved);
  }
  return false;
}

function read(key) {
  return JSON.parse(localStorage.getItem(key) ?? 'null');
}
