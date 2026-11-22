const cents = value => Math.round(Number(value) * 100);
const sameId = (a, b) => String(a) === String(b);

export function cycleCoverage(payments, emi, cycle) {
  const explicit = payments.filter(row => Number.isSafeInteger(row.cycle) && row.cycle > 0);
  const before = new Set(explicit.filter(row => row.cycle < cycle).map(row => row.cycle)).size;
  const legacy = payments.filter(row => !explicit.includes(row))
    .reduce((sum, row) => sum + (cents(row.amount) || 0), 0) -
    explicit.reduce((sum, row) => sum + (row.legacyCoverageCents || 0), 0);
  if (explicit.some(row => row.cycle === cycle)) return cents(emi);
  return Math.min(cents(emi), Math.max(0, legacy - (cycle - 1 - before) * cents(emi)));
}

export function recordEmi(ledger, { loanId, cycle, emi, bankId, amount, date, note, deduct }) {
  const loan = ledger.loans?.find(row => sameId(row.id, loanId));
  const bank = ledger.banks.find(row => sameId(row.id, bankId));
  if (!loan || !bank) throw Error('The linked loan or bank is unavailable.');
  if (!Number.isSafeInteger(cycle) || cycle < 1 || cycle > Number(loan.months) ||
      !Number.isSafeInteger(cents(emi)) || cents(emi) <= 0 ||
      !Number.isSafeInteger(cents(amount)) || cents(amount) <= 0 ||
      !Number.isSafeInteger(cents(bank.balance))) throw Error('Check the EMI and bank balance.');
  if (Number(loan.emi) > 0 && cents(loan.emi) !== cents(emi))
    throw Error('The EMI amount changed. Reopen the loan and try again.');
  const payments = loan.payments || [];
  const id = 'd47lona:linked:' + loanId + ':' + cycle;
  const covered = cycleCoverage(payments, emi, cycle);
  if (payments.some(row => sameId(row.id ?? row.reference, id)) ||
      ledger.entries.some(row => sameId(row.id, id)) || covered >= cents(emi))
    return false;
  const applied = (cents(emi) - covered) / 100;
  if (cents(amount) < cents(applied)) throw Error('The remaining EMI amount changed. Reopen the loan.');
  const txId = deduct ? id : null;
  loan.payments = [...payments, { id, date, amount: applied, bank: bank.name,
    bankId: bank.id, txId, note, cycle, legacyCoverageCents: covered, local: true }];
  if (deduct) {
    const before = Number(bank.balance);
    bank.balance = (cents(before) - cents(applied)) / 100;
    ledger.entries.push({ id, bankId: bank.id, bank: bank.name, type: 'Expense',
      category: 'Loan EMI', amount: applied, note, created: date + 'T12:00:00+05:30',
      balanceBefore: before, balanceAfter: bank.balance, loanId: loan.id, loanPaymentId: id });
  }
  return true;
}

export function undoEmi(ledger, loanId, paymentId) {
  const loan = ledger.loans?.find(row => sameId(row.id, loanId));
  const payment = loan?.payments?.find(row => sameId(row.id ?? row.reference, paymentId));
  if (!payment) return false;
  if (payment.local !== true && payment.source !== 'D47Lona')
    throw Error('Imported payments have no linked deduction to reverse.');
  const txId = payment.local === true ? payment.txId : payment.reference;
  const tx = txId == null ? null : ledger.entries.find(row => sameId(row.id, txId) &&
    sameId(row.loanId, loan.id) && sameId(row.bankId, payment.bankId));
  if (!tx && payment.local === true && txId != null)
    throw Error('The original EMI transaction is unavailable.');
  if (tx) {
    const bank = ledger.banks.find(row => sameId(row.id, tx.bankId));
    if (!bank || !Number.isSafeInteger(cents(bank.balance)) || cents(tx.amount) !== cents(payment.amount))
      throw Error('The original bank or EMI amount changed. Review the transaction before undoing.');
    bank.balance = (cents(bank.balance) + cents(tx.amount)) / 100;
    ledger.entries = ledger.entries.filter(row => row !== tx);
  }
  loan.payments = loan.payments.filter(row => row !== payment);
  return true;
}
