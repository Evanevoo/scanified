/**
 * QBXML request builders for QuickBooks Desktop (QBFS via Web Connector).
 * Version in the processing instruction comes from QBWC (qbXMLMajorVers / qbXMLMinorVers).
 */

export function wrapQbxmlMessage(inner: string, major: number, minor: number): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<?qbxml version="${major}.${minor}"?>\n` +
    `<QBXML>\n` +
    `<QBXMLMsgsRq onError="stopOnError">\n` +
    `${inner}\n` +
    `</QBXMLMsgsRq>\n` +
    `</QBXML>`
  );
}

/** Fetch customers with fields needed for barcode sync (AccountNumber = barcode storage). */
export function buildCustomerQueryRq(requestId: string): string {
  return `
<CustomerQueryRq requestID="${escapeXml(requestId)}">
  <IncludeRetElement>ListID</IncludeRetElement>
  <IncludeRetElement>EditSequence</IncludeRetElement>
  <IncludeRetElement>Name</IncludeRetElement>
  <IncludeRetElement>CompanyName</IncludeRetElement>
  <IncludeRetElement>IsActive</IncludeRetElement>
  <IncludeRetElement>AccountNumber</IncludeRetElement>
</CustomerQueryRq>`.trim();
}

export interface CustomerAddInput {
  name: string;
  companyName?: string;
  /** Stored in AccountNumber (barcode-friendly). */
  accountNumber?: string;
}

export function buildCustomerAddRq(requestId: string, input: CustomerAddInput): string {
  const company = input.companyName ? `<CompanyName>${escapeXml(input.companyName)}</CompanyName>` : '';
  const acct =
    input.accountNumber !== undefined && input.accountNumber !== ''
      ? `<AccountNumber>${escapeXml(input.accountNumber)}</AccountNumber>`
      : '';
  return `
<CustomerAddRq requestID="${escapeXml(requestId)}">
  <CustomerAdd>
    <Name>${escapeXml(input.name)}</Name>
    ${company}
    ${acct}
  </CustomerAdd>
</CustomerAddRq>`.trim();
}

export interface CustomerModInput {
  listId: string;
  editSequence: string;
  name?: string;
  accountNumber: string;
}

export function buildCustomerModRq(requestId: string, mod: CustomerModInput): string {
  const nameTag = mod.name ? `<Name>${escapeXml(mod.name)}</Name>` : '';
  return `
<CustomerModRq requestID="${escapeXml(requestId)}">
  <CustomerMod>
    <ListID>${escapeXml(mod.listId)}</ListID>
    <EditSequence>${escapeXml(mod.editSequence)}</EditSequence>
    ${nameTag}
    <AccountNumber>${escapeXml(mod.accountNumber)}</AccountNumber>
  </CustomerMod>
</CustomerModRq>`.trim();
}

/** Multiple CustomerModRq in one envelope (single round-trip). */
export function buildCustomerModBatchRq(mods: CustomerModInput[], idPrefix: string): string {
  const parts = mods.map((m, i) => buildCustomerModRq(`${idPrefix}-${i}`, m));
  return parts.join('\n');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
