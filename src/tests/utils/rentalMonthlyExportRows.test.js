import {
  applySearchToMonthlyExportRows,
  filterMonthlyExportRowsBySearch,
} from '../../utils/rentalMonthlyExportRows';

const normalize = (v) => String(v || '').trim().toLowerCase();
const normalizeName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

describe('rentalMonthlyExportRows', () => {
  const exportRows = [
    { customer_id: 'C1', customer: { name: 'Alpha Co' }, itemCount: 2 },
    { customer_id: 'C2', customer: { name: 'Beta LLC' }, itemCount: 1 },
  ];

  const filtered = [
    { customer_id: 'C1', customer: { name: 'Alpha Co' } },
  ];

  it('returns all rows when search query is empty', () => {
    expect(applySearchToMonthlyExportRows(exportRows, filtered, '', normalize, normalizeName)).toEqual(
      exportRows,
    );
  });

  it('narrows to customers in filtered list when search is active', () => {
    expect(
      applySearchToMonthlyExportRows(exportRows, filtered, 'alpha', normalize, normalizeName),
    ).toEqual([exportRows[0]]);
  });

  it('returns empty when search active but filtered list is empty', () => {
    expect(
      filterMonthlyExportRowsBySearch(exportRows, [], normalize, normalizeName),
    ).toEqual([]);
  });

  it('matches by customer name key when ids differ in casing', () => {
    const rows = [{ customer_id: 'c1', customer: { Name: 'Alpha Co' } }];
    const vis = [{ customer_id: 'C1', customer: { name: 'Alpha Co' } }];
    expect(filterMonthlyExportRowsBySearch(rows, vis, normalize, normalizeName)).toEqual(rows);
  });
});
