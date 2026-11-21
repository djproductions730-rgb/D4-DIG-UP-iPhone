// The caller supplies the authenticated Firestore instance and modular SDK.
export function openLedger({ db, sdk, user, ledger, onChange, onError }) {
  if (!user?.uid || user.emailVerified !== true) {
    throw new Error('Verify the email address on your finance account before connecting.');
  }
  if (ledger !== 'digup' && ledger !== 'lona') throw new Error('Unknown finance ledger.');

  const { doc, onSnapshot, runTransaction } = sdk;
  const record = doc(db, 'financeAccounts', user.uid, 'ledgers', ledger);
  let connected = true;

  const unsubscribe = onSnapshot(record, { includeMetadataChanges: true }, snapshot => {
    if (!connected || snapshot.metadata.hasPendingWrites) return;
    try {
      onChange(readLedger(snapshot), { fromCache: snapshot.metadata.fromCache });
    } catch (error) {
      onError(error);
    }
  }, error => {
    if (connected) onError(error);
  });

  return {
    close() {
      connected = false;
      unsubscribe();
    },
    async save(value, expectedRevision) {
      if (!connected) throw new Error('The finance account is disconnected.');
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        throw new Error('Read the current ledger before saving.');
      }
      const payload = JSON.stringify(value);
      if (typeof payload !== 'string' || payload.length > 240000) {
        throw new Error('This ledger exceeds the current sync size limit.');
      }
      return runTransaction(db, async transaction => {
        const current = readLedger(await transaction.get(record));
        if (!connected) throw new Error('The finance account is disconnected.');
        if (current.revision !== expectedRevision) {
          return { saved: false, current };
        }
        const revision = current.revision + 1;
        transaction.set(record, { revision, payload });
        return { saved: true, revision };
      });
    }
  };
}

function readLedger(snapshot) {
  if (!snapshot.exists()) return { revision: 0, value: null };
  const { revision, payload } = snapshot.data();
  if (!Number.isSafeInteger(revision) || revision < 1 || typeof payload !== 'string') {
    throw new Error('The cloud ledger is invalid.');
  }
  return { revision, value: JSON.parse(payload) };
}
