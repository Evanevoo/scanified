/**
 * Mirrors recordDedupeKey logic in ImportApprovals.jsx (split cards share import file id).
 */
function recordDedupeKey(record, getOrderNumber, parseDataField) {
  if (record?.displayId != null && record.displayId !== '') {
    return String(record.displayId);
  }
  const data = parseDataField(record?.data);
  const orderNum = (getOrderNumber(data) || '').toString().trim();
  const id = record?.id != null ? String(record.id) : '';
  if (typeof id === 'string' && id.startsWith('scanned_')) return id;
  if (id && orderNum) return `${id}\t${orderNum}`;
  return id || (orderNum ? `_order_${orderNum}` : '');
}

const parseDataField = (data) => (typeof data === 'string' ? JSON.parse(data) : data || {});
const getOrderNumber = (data) => data?.order_number || data?.reference_number;

describe('import approval record dedupe keys', () => {
  it('uses displayId for split cards on the same import file', () => {
    const fileId = 'import-file-abc';
    const a = {
      id: fileId,
      displayId: `${fileId}_0`,
      data: { order_number: '75764', reference_number: '75764' },
    };
    const b = {
      id: fileId,
      displayId: `${fileId}_1`,
      data: { order_number: '75794', reference_number: '75794' },
    };
    expect(recordDedupeKey(a, getOrderNumber, parseDataField)).not.toBe(
      recordDedupeKey(b, getOrderNumber, parseDataField),
    );
  });

  it('falls back to id plus order when displayId is missing', () => {
    const fileId = 'import-file-xyz';
    const a = { id: fileId, data: { order_number: '75764' } };
    const b = { id: fileId, data: { order_number: '75794' } };
    expect(recordDedupeKey(a, getOrderNumber, parseDataField)).toBe(`${fileId}\t75764`);
    expect(recordDedupeKey(b, getOrderNumber, parseDataField)).toBe(`${fileId}\t75794`);
  });
});
