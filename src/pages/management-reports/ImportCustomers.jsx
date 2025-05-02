import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

const REQUIRED_FIELDS = [
  'Customer ID',
  'Customer Name',
];

const APP_FIELDS = [
  'Customer ID',
  'Customer Name',
  'Parent Customer ID',
  'Servicing Location',
  'Billing Name',
  'Billing Address 1',
  'Billing Address 2',
  'Billing City',
  'Billing State',
  'Billing Zip',
  'Billing Country',
  'Shipping Address Line1',
  'Shipping Address Line2',
  'Shipping Address Line3',
  'Shipping City',
  'Shipping State',
  'Shipping Zip',
  'Shipping Country',
  'Payment Terms',
  'Tax Region',
  'Fax',
  'RentalBillEmailTo',
  'Salesman',
];

const SAMPLE_FILE_CONTENT = `Customer ID\tCustomer Name\tParent Customer ID\tServicing Location\tBilling Name\tBilling Address 1\tBilling Address 2\tBilling City\tBilling State\tBilling Zip\tBilling Country\tShipping Address Line1\tShipping Address Line2\tShipping Address Line3\tShipping City\tShipping State\tShipping Zip\tShipping Country\tPayment Terms\tTax Region\tFax\tRentalBillEmailTo\tSalesman\nCUST001\tAcme Corp\t\tNY Warehouse\tAcme Corp\t123 Main St\tSuite 100\tNew York\tNY\t10001\tUSA\t456 Elm St\t\t\tBrooklyn\tNY\t11201\tUSA\tNet 30\tNY\t555-1234\tbilling@acme.com\tJohn Doe\n`;

function downloadSampleFile() {
  const blob = new Blob([SAMPLE_FILE_CONTENT], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'customer_import_sample.tsv';
  a.click();
  URL.revokeObjectURL(url);
}

function autoMapColumns(appFields, fileColumns) {
  // Try to match by normalized name (case-insensitive, ignore spaces/underscores)
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const fileMap = Object.fromEntries(fileColumns.map(c => [normalize(c), c]));
  const mapping = {};
  appFields.forEach(appField => {
    const norm = normalize(appField);
    if (fileMap[norm]) {
      mapping[appField] = fileMap[norm];
    } else {
      // Try partial match
      const found = fileColumns.find(col => normalize(col).includes(norm) || norm.includes(normalize(col)));
      if (found) mapping[appField] = found;
    }
  });
  return mapping;
}

export default function ImportCustomers() {
  const fileInputRef = useRef();
  const [step, setStep] = useState(1); // 1: upload, 2: map, 3: result
  const [fileColumns, setFileColumns] = useState([]);
  const [fileRows, setFileRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [errors, setErrors] = useState([]);
  const [successCount, setSuccessCount] = useState(0);
  const [errorRows, setErrorRows] = useState([]);

  const handleFileChange = (e) => {
    setErrors([]);
    setSuccessCount(0);
    setMapping({});
    setFileColumns([]);
    setFileRows([]);
    setErrorRows([]);
    setStep(1);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      let parsed = Papa.parse(text, { delimiter: '\t', header: true, skipEmptyLines: true });
      if (parsed.meta.fields.length < 2) {
        parsed = Papa.parse(text, { delimiter: ',', header: true, skipEmptyLines: true });
      }
      setFileColumns(parsed.meta.fields);
      setFileRows(parsed.data);
      // Auto-map columns
      setMapping(autoMapColumns(APP_FIELDS, parsed.meta.fields));
      setStep(2);
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (appField, fileCol) => {
    setMapping((prev) => ({ ...prev, [appField]: fileCol }));
  };

  const handleImport = () => {
    setErrors([]);
    setSuccessCount(0);
    setErrorRows([]);
    const missing = REQUIRED_FIELDS.filter(f => !mapping[f]);
    if (missing.length > 0) {
      setErrors([`Please map required fields: ${missing.join(', ')}`]);
      return;
    }
    const errors = [];
    const errorRows = [];
    let success = 0;
    fileRows.forEach((row, idx) => {
      let rowError = '';
      for (const req of REQUIRED_FIELDS) {
        const col = mapping[req];
        if (!row[col] || row[col].toString().trim() === '') {
          rowError = `Row ${idx + 2}: Missing required field '${req}'`;
          errors.push(rowError);
          errorRows.push({ ...row, __error: rowError });
          return;
        }
      }
      // TODO: Add DB import logic here, using mapping to get values
      success++;
    });
    setErrors(errors);
    setSuccessCount(success);
    setErrorRows(errorRows);
    setStep(3);
  };

  function downloadErrorCSV() {
    if (!errorRows.length) return;
    const cols = [...fileColumns, '__error'];
    const csv = [cols.join(',')].concat(
      errorRows.map(row => cols.map(c => '"' + (row[c] || '') + '"').join(','))
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, 'import_errors.csv');
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Import Customers</h1>
      <button
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={downloadSampleFile}
      >
        Download Sample File
      </button>
      {step === 1 && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.tsv,.csv,text/tab-separated-values,text/csv"
            className="block mb-4"
            onChange={handleFileChange}
          />
          <div className="text-gray-600 text-sm mt-4">
            Accepted file type: Tab- or comma-delimited text (.txt, .tsv, .csv).<br />
            You will be able to map your columns after upload.
          </div>
        </>
      )}
      {step === 2 && (
        <div className="mb-4">
          <div className="mb-2 font-semibold">Map your file columns to required fields:</div>
          <table className="mb-4 border">
            <thead>
              <tr>
                <th className="border px-2 py-1">App Field</th>
                <th className="border px-2 py-1">File Column</th>
              </tr>
            </thead>
            <tbody>
              {APP_FIELDS.map((field) => (
                <tr key={field} className={mapping[field] ? 'bg-green-50' : ''}>
                  <td className="border px-2 py-1 font-medium text-sm">{field}{REQUIRED_FIELDS.includes(field) && <span className="text-red-600">*</span>}</td>
                  <td className="border px-2 py-1">
                    <select
                      className="border rounded px-1 py-0.5 text-sm"
                      value={mapping[field] || ''}
                      onChange={e => handleMappingChange(field, e.target.value)}
                    >
                      <option value="">(Not mapped)</option>
                      {fileColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mb-4">
            <div className="font-semibold mb-1">
              Preview (showing {Math.min(fileRows.length, 5)} of {fileRows.length} rows):
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="border text-sm" data-testid="preview-table">
                <thead>
                  <tr>
                    {fileColumns.map(col => (
                      <th key={col} className={`border px-2 py-1 ${Object.values(mapping).includes(col) ? 'bg-green-100' : ''}`}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fileRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      {fileColumns.map(col => (
                        <td key={col} className={`border px-2 py-1 ${Object.values(mapping).includes(col) ? 'bg-green-50' : ''}`}>{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {fileRows.length > 5 && (
                <div className="text-xs text-gray-500 mt-1">Showing only the first 5 rows.</div>
              )}
            </div>
          </div>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={handleImport}
          >
            Import
          </button>
        </div>
      )}
      {step === 3 && (
        <>
          <div className="mb-2">
            <span className="text-green-700 font-semibold">Successfully validated {successCount} row(s).</span>
            {errors.length > 0 && <span className="text-red-700 ml-4 font-semibold">{errors.length} row(s) failed.</span>}
          </div>
          {errors.length > 0 && (
            <div className="mb-2 text-red-700">
              <div>First 10 errors:</div>
              <ul className="list-disc ml-6">
                {errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
              </ul>
              {errors.length > 10 && <div>And {errors.length - 10} more...</div>}
              <button
                className="mt-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                onClick={downloadErrorCSV}
              >
                Download Failed Rows as CSV
              </button>
            </div>
          )}
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setStep(1)}
          >
            Import Another File
          </button>
        </>
      )}
    </div>
  );
} 