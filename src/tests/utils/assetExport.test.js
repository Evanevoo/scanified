import { describe, expect, it } from 'vitest';
import {
  ASSET_DETAIL_CSV_HEADERS,
  assetToDetailExportRow,
  escapeCsvCell,
  getDeliveredAtCustomerDate,
  getOwnershipLabel,
  historyRowToExportRow,
  rowsToCsvString,
} from '../../utils/assetExport';

describe('assetExport', () => {
  it('escapes CSV cells', () => {
    expect(escapeCsvCell('hello')).toBe('"hello"');
    expect(escapeCsvCell('a "quote"')).toBe('"a ""quote"""');
    expect(escapeCsvCell(null)).toBe('""');
  });

  it('resolves ownership and delivery date', () => {
    expect(getOwnershipLabel({ ownership: 'Customer Owned' })).toBe('Customer Owned');
    expect(getOwnershipLabel({ owner_name: 'Acme' })).toBe('Acme');
    expect(getDeliveredAtCustomerDate({ rental_start_date: '2026-01-15' })).toBe('2026-01-15');
    expect(getDeliveredAtCustomerDate({ delivery_date: '2026-02-01' })).toBe('2026-02-01');
  });

  it('maps asset detail rows with ownership, location, and delivery', () => {
    const row = assetToDetailExportRow({
      id: 'a1',
      barcode_number: 'BC1',
      serial_number: 'SN1',
      product_code: 'OX',
      description: 'Oxygen',
      status: 'rented',
      ownership: 'Company',
      location: 'SASKATOON',
      rental_start_date: '2026-03-01',
      customers: { name: 'Cust Co', phone: '555', CustomerListID: 'C1' },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-03-02T00:00:00Z',
    });

    expect(row).toHaveLength(ASSET_DETAIL_CSV_HEADERS.length);
    expect(row[0]).toBe('a1');
    expect(row[11]).toBe('Company'); // Ownership
    expect(row[12]).toBe('Saskatoon'); // Location display
    expect(row[14]).toBe('C1');
    expect(row[15]).toBe('Cust Co');
    expect(row[17]).toBeTruthy(); // Delivered to Customer formatted
  });

  it('maps history rows including customer location', () => {
    const row = historyRowToExportRow(
      {
        created_at: '2026-03-01T12:00:00Z',
        action: 'SHIP',
        history_type: 'rental_start',
        customer_name: 'Cust Co',
        customer_id: 'C1',
        order_number: 'ORD-1',
        notes: 'delivered',
      },
      { id: 'a1', barcode_number: 'BC1', serial_number: 'SN1' }
    );

    expect(row[0]).toBe('a1');
    expect(row[5]).toBe('SHIP');
    expect(row[6]).toBe('rental_start');
    expect(row[9]).toContain('Cust Co');
    expect(row[10]).toBe('ORD-1');
  });

  it('builds csv strings', () => {
    const csv = rowsToCsvString(['A', 'B'], [['1', '2']]);
    expect(csv).toBe('"A","B"\n"1","2"');
  });
});
