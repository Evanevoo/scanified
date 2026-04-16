import odbc from 'odbc';
import { logger } from './logger.js';

const CUSTOMER_QUERY = `
  SELECT
    Name,
    Email,
    Phone,
    Balance
  FROM Customer
`;

const INVOICE_QUERY = `
  SELECT
    TxnID,
    RefNumber,
    CustomerRefFullName,
    TxnDate,
    AmountDue
  FROM Invoice
`;

const INVOICE_LINE_QUERY = `
  SELECT
    TxnID,
    ItemRefFullName,
    Desc,
    Quantity,
    Rate,
    Amount
  FROM InvoiceLine
`;

export const fetchQuickBooksData = async (connectionString) => {
  let connection;

  try {
    logger.info('Opening QODBC connection');
    connection = await odbc.connect(connectionString);

    logger.info('Querying customers');
    const customers = await connection.query(CUSTOMER_QUERY);

    logger.info('Querying invoices');
    const invoices = await connection.query(INVOICE_QUERY);

    logger.info('Querying invoice lines');
    const invoiceLines = await connection.query(INVOICE_LINE_QUERY);

    return { customers, invoices, invoiceLines };
  } catch (error) {
    logger.error('QuickBooks query failed', { message: error.message, stack: error.stack });
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
        logger.info('QODBC connection closed');
      } catch (closeError) {
        logger.warn('Failed to close QODBC connection cleanly', { message: closeError.message });
      }
    }
  }
};
