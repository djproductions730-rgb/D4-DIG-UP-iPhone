// D4 DIG UP → D47Lona manual, offline transfer code (v1).
// No Firebase or account required. The code carries financial information; keep private.
const PREFIX = 'D4SYNC1';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_CODE = 150000;
const MAX_JSON = 300000;
const LIMIT = 60;
const pad = value => String(value ?? '').trim();

function validMonth(month) { return /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month); }
function finiteAmount(value, allowNegative = false) {
  const number = Number(value);
  return Number.isFinite(number) && (allowNegative ? Math.abs(number) <= 1e12 : number >= 0 && number <= 1e12);
}
function categorySalary(entry) {
  return pad(entry?.type).toLowerCase() === 'income' && pad(entry?.category).toLowerCase() === 'salary';
}
function isoDate(value) {
  const s = String(value ?? '');
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 35) : '';
}
function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64(encoded) {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('Sync code contains invalid characters.');
  const str = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(str + '='.repeat((4 - str.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
async function checksum(bytes) {
  if (!globalThis.crypto?.subtle) throw new Error('Open this app using the secure HTTPS link.');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest.slice(0, 10)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function compress(bytes) {
  if (typeof CompressionStream !== 'function') return { kind: 'J', bytes };
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    const zipped = new Uint8Array(await new Response(stream).arrayBuffer());
    return zipped.length < bytes.length ? {kind:'G', bytes:zipped} : {kind:'J', bytes};
  } catch (_) { return {kind:'J', bytes}; }
}
async function decompress(kind, bytes) {
  if (kind === 'J') return bytes;
  if (kind !== 'G') throw new Error('Unsupported Sync Code version.');
  if (typeof DecompressionStream !== 'function') throw new Error('This browser cannot unpack the Sync Code. Update Safari.');
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const raw = new Uint8Array(await new Response(stream).arrayBuffer());
    if (raw.length > MAX_JSON) throw new Error('Sync code data is too large.');
    return raw;
  } catch (error) {
    if (/too large/.test(String(error?.message))) throw error;
    throw new Error('Could not decompress the Sync Code.');
  }
}
function normalizedPayload(raw, strict = true) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== 1 || raw.source !== 'D4-DIG-UP') {
    throw new Error('This is not a valid D4 DIG UP Sync Code.');
  }
  if (typeof raw.exportedAt !== 'string' || !Number.isFinite(Date.parse(raw.exportedAt))) throw new Error('Sync code date is missing.');
  if (!Array.isArray(raw.banks) || raw.banks.length > 150 || !Array.isArray(raw.entries) || raw.entries.length > LIMIT) {
    throw new Error('Sync Code bank or transaction records are invalid.');
  }
  if (!raw.salaries || typeof raw.salaries !== 'object' || Array.isArray(raw.salaries) || Object.keys(raw.salaries).length > 240) {
    throw new Error('Sync Code salary months are invalid.');
  }
  const bankIds = new Set();
  const banks = raw.banks.map((bank, i) => {
    const id = pad(bank?.id), name = pad(bank?.name);
    if (!id || id.length > 100 || !name || name.length > 120 || !finiteAmount(bank?.balance, true)) throw new Error('Bank '+(i+1)+' is invalid.');
    if (bankIds.has(id)) throw new Error('Duplicate bank in Sync Code.');
    bankIds.add(id);
    return { id, name, balance: Number(bank.balance), nick: pad(bank.nick).slice(0, 70) };
  });
  const salaries = {};
  for (const [ym, total] of Object.entries(raw.salaries)) {
    if (!validMonth(ym) || !finiteAmount(total)) throw new Error('Salary for '+ym+' is invalid.');
    salaries[ym] = Math.round(Number(total)*100)/100;
  }
  const entries = raw.entries.map((e, i) => {
    const id = pad(e?.id), type = pad(e?.type), amount = Number(e?.amount),
      bankId = pad(e?.bankId), created = isoDate(e?.created);
    if (!id || id.length > 100 || !['Income','Expense','Transfer'].includes(type)
      || !finiteAmount(amount) || !created || !bankId || !bankIds.has(bankId)) {
      throw new Error('Recent transaction '+(i+1)+' is invalid.');
    }
    return { id, type, bankId, bank:pad(e.bank).slice(0,120),
      amount, category:pad(e.category).slice(0,70),
      note:pad(e.note).slice(0,100),created };
  });
  const totalTransactions = Number(raw.totalTransactions);
  if (!Number.isSafeInteger(totalTransactions) || totalTransactions < entries.length || totalTransactions > 1000000) {
    throw new Error('Transaction count is invalid.');
  }
  return { version:1, source:'D4-DIG-UP', exportedAt:raw.exportedAt, banks, salaries, entries, totalTransactions };
}
export function summarizeDigup(raw) {
  if (!raw || !Array.isArray(raw.banks) || !Array.isArray(raw.entries)) {
    throw new Error('No DIG UP financial records found on this device.');
  }
  const banks = raw.banks.filter(b => b && !/pluxee/i.test(pad(b.name)) &&
    pad(b.name) && finiteAmount(b.balance, true)).map(b=>({
    id:pad(b.id), name:pad(b.name), nick:pad(b.nick), balance:Number(b.balance)
  }));
  if (!banks.length) throw new Error('Add at least one bank account in DIG UP before generating a code.');
  const bankIds = new Set(banks.map(b => b.id));
  const salaries = {};
  for (const e of raw.entries) {
    if (!categorySalary(e) || !finiteAmount(e.amount)) continue;
    const ym = isoDate(e.created || e.date || e.when).slice(0,7);
    if (!validMonth(ym)) continue;
    salaries[ym] = Math.round(((salaries[ym] || 0) + Number(e.amount))*100)/100;
  }
  const entries = raw.entries.filter(e => e && bankIds.has(pad(e.bankId)) &&
    ['Income','Expense','Transfer'].includes(pad(e.type)) && finiteAmount(e.amount) &&
    isoDate(e.created || e.date || e.when)).map((e,i)=>({
      id:pad(e.id || 'entry-'+i).slice(0,100),
      type:pad(e.type), bankId:pad(e.bankId), bank:pad(e.bank),
      amount:Number(e.amount), category:pad(e.category), note:pad(e.note),
      created:isoDate(e.created || e.date || e.when)
    })).sort((a,b)=>b.created.localeCompare(a.created)).slice(0,LIMIT);
  return normalizedPayload({ version:1,source:'D4-DIG-UP',exportedAt:new Date().toISOString(),
    banks,entries,salaries,totalTransactions:raw.entries.length });
}
export async function createSyncCode(raw) {
  const payload = summarizeDigup(raw);
  const bytes = encoder.encode(JSON.stringify(payload));
  if (bytes.length > MAX_JSON) throw new Error('Too much DIG UP data for one code.');
  const zipped = await compress(bytes);
  const code = PREFIX+'.'+zipped.kind+'.'+await checksum(bytes)+'.'+toBase64(zipped.bytes);
  if (code.length > MAX_CODE) throw new Error('Sync Code is too long. Export a JSON backup instead.');
  return { code, summary:{ banks:payload.banks.length, transactions:payload.entries.length,
    totalTransactions:payload.totalTransactions, salaryMonths:Object.keys(payload.salaries).length,
    exportedAt:payload.exportedAt } };
}
export async function parseSyncCode(input) {
  const code = String(input||'').replace(/\s/g,'');
  if (code.length > MAX_CODE) throw new Error('Sync Code is too long.');
  const parts = code.split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX || !/^[0-9a-f]{20}$/.test(parts[2])) {
    throw new Error('Wrong Sync Code. Copy it from DIG UP → Settings → Copy Sync Code.');
  }
  const raw = await decompress(parts[1],fromBase64(parts[3]));
  if (raw.length > MAX_JSON) throw new Error('Sync code data is too large.');
  if (await checksum(raw) !== parts[2]) throw new Error('Sync Code was incomplete or changed. Copy it again.');
  let parsed;
  try { parsed = JSON.parse(decoder.decode(raw)); } catch (_) { throw new Error('Could not read the Sync Code data.'); }
  return normalizedPayload(parsed);
}
