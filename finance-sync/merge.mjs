// Merge independent edits without silently resolving conflicting financial values.
export function mergeLedger(base, local, remote, path = 'ledger') {
  if (equal(local, remote) || equal(remote, base)) return local;
  if (equal(local, base)) return remote;

  if ([base, local, remote].every(isRecord)) {
    const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
    return Object.fromEntries([...keys].flatMap(key => {
      const value = mergeLedger(own(base, key), own(local, key), own(remote, key), path + '.' + key);
      return value === undefined ? [] : [[key, value]];
    }));
  }

  if ([base, local, remote].every(isKeyedList)) {
    const [previous, device, cloud] = [base, local, remote].map(byId);
    const ids = new Set([...cloud.keys(), ...device.keys(), ...previous.keys()]);
    return [...ids].flatMap(id => {
      const value = mergeLedger(previous.get(id), device.get(id), cloud.get(id), path + '[' + id + ']');
      return value === undefined ? [] : [value];
    });
  }

  throw new Error('Both devices changed the same record. Both versions were kept.');
}

function equal(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => equal(value, right[index]));
  }
  if (isRecord(left) && isRecord(right)) {
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length &&
      keys.every(key => Object.hasOwn(right, key) && equal(left[key], right[key]));
  }
  return false;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function own(object, key) {
  return Object.hasOwn(object, key) ? object[key] : undefined;
}

function isKeyedList(value) {
  return Array.isArray(value) && value.every(row => isRecord(row) && (
    (typeof row.id === 'string' && row.id !== '') || Number.isSafeInteger(row.id)
  )) && byId(value).size === value.length;
}

function byId(value) {
  return new Map(value.map(row => [String(row.id), row]));
}
