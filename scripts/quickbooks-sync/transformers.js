const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toIsoDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const groupLinesByTxnId = (invoiceLines) => {
  return invoiceLines.reduce((acc, line) => {
    const txnId = line.TxnID ?? '';
    if (!txnId) return acc;

    if (!acc[txnId]) acc[txnId] = [];

    acc[txnId].push({
      item: line.ItemRefFullName ?? null,
      description: line.Desc ?? null,
      quantity: toNumber(line.Quantity, 0),
      rate: toNumber(line.Rate, 0),
      amount: toNumber(line.Amount, 0),
    });

    return acc;
  }, {});
};

export const transformQuickBooksData = ({ customers, invoices, invoiceLines }) => {
  const linesByTxnId = groupLinesByTxnId(invoiceLines);

  const transformedCustomers = customers.map((customer) => ({
    name: customer.Name ?? null,
    email: customer.Email ?? null,
    phone: customer.Phone ?? null,
    balance: toNumber(customer.Balance, 0),
  }));

  const transformedInvoices = invoices.map((invoice) => ({
    invoiceNumber: invoice.RefNumber ?? null,
    customer: invoice.CustomerRefFullName ?? null,
    date: toIsoDate(invoice.TxnDate),
    total: toNumber(invoice.AmountDue, 0),
    lineItems: linesByTxnId[invoice.TxnID] ?? [],
  }));

  return {
    source: 'quickbooks-desktop',
    syncedAt: new Date().toISOString(),
    customers: transformedCustomers,
    invoices: transformedInvoices,
  };
};
