import { v4 as uuidv4 } from 'uuid';
import { log } from '../logger.js';
import { createSession, deleteSession, getSession, clearSessionError } from '../store/sessionStore.js';
import { buildSendRequestXml, consumeManualSyncFlag, handleReceiveResponse } from '../services/syncService.js';

export interface WebConnectorAuthConfig {
  username: string;
  password: string;
}

/**
 * Builds the service object tree expected by node-soap for the Intuit WSDL
 * (service TroubleshootWebServiceFS, port TroubleshootWebServiceFSSoap).
 *
 * Method shapes follow the official QBWC Programmer's Guide / Intuit test WSDL.
 */
export function createWebConnectorService(auth: WebConnectorAuthConfig) {
  return {
    TroubleshootWebServiceFS: {
      TroubleshootWebServiceFSSoap: {
        /** Optional: QBWC may call first; return a version string. */
        serverVersion: () => {
          log.info('SOAP serverVersion');
          return { serverVersionResult: 'Scanified QBWC 1.0' };
        },

        /**
         * Optional: return '' if the connector version is acceptable.
         * Prefix with E: to block, W: for warning (see Intuit docs).
         */
        clientVersion: (args: { strVersion?: string }) => {
          log.info('SOAP clientVersion', { strVersion: args?.strVersion ?? '' });
          return { clientVersionResult: '' };
        },

        /**
         * Authenticate credentials from the .QWC file.
         * Returns ArrayOfString: [sessionTicket, secondString].
         * secondString: '' = use currently open QB company; 'none' = no work; 'nvu' = invalid user.
         */
        authenticate: (args: { strUserName?: string; strPassword?: string }) => {
          const strUserName = args?.strUserName ?? '';
          const strPassword = args?.strPassword ?? '';
          log.info('SOAP authenticate', { strUserName });

          if (strUserName !== auth.username || strPassword !== auth.password) {
            log.warn('authenticate failed (nvu)');
            return { authenticateResult: { string: ['', 'nvu'] } };
          }

          consumeManualSyncFlag();

          const ticket = uuidv4();
          createSession(ticket, strUserName);
          clearSessionError(ticket);

          log.info('authenticate ok', { ticket });
          return { authenticateResult: { string: [ticket, ''] } };
        },

        /**
         * QBWC asks for the next qbXML request.
         * Intuit's official WSDL (`sendRequestXMLResult`) is a single qbXML string; an empty string
         * means no more work. Some older samples return two strings; this implementation follows the
         * Intuit test WSDL shipped in `wsdl/QBWebConnectorSvc.wsdl`.
         */
        sendRequestXML: (args: {
          ticket?: string;
          strHCPResponse?: string;
          strCompanyFileName?: string;
          qbXMLCountry?: string;
          qbXMLMajorVers?: number;
          qbXMLMinorVers?: number;
        }) => {
          const ticket = args?.ticket ?? '';
          const session = getSession(ticket);
          if (!session) {
            log.warn('sendRequestXML: unknown ticket', { ticket });
            return { sendRequestXMLResult: '' };
          }

          session.qbMajor = args?.qbXMLMajorVers ?? session.qbMajor;
          session.qbMinor = args?.qbXMLMinorVers ?? session.qbMinor;

          log.info('SOAP sendRequestXML', {
            ticket,
            qbXMLMajorVers: session.qbMajor,
            qbXMLMinorVers: session.qbMinor,
            strCompanyFileName: args?.strCompanyFileName ?? '',
            workState: session.workState.kind,
          });

          const xml = buildSendRequestXml(session);
          return { sendRequestXMLResult: xml };
        },

        /**
         * QBWC returns QuickBooks' qbXML response. Return 0–100 (progress) or negative to trigger getLastError.
         */
        receiveResponseXML: (args: {
          ticket?: string;
          response?: string;
          hresult?: string;
          message?: string;
        }) => {
          const ticket = args?.ticket ?? '';
          const session = getSession(ticket);
          const response = args?.response ?? '';

          if (!session) {
            log.warn('receiveResponseXML: unknown ticket', { ticket });
            return { receiveResponseXMLResult: 100 };
          }

          log.info('SOAP receiveResponseXML', {
            ticket,
            hresult: args?.hresult ?? '',
            message: args?.message ?? '',
            responseLength: response.length,
          });

          const progress = handleReceiveResponse(session, response);
          return { receiveResponseXMLResult: progress };
        },

        /** Called after a negative receiveResponseXML result. */
        getLastError: (args: { ticket?: string }) => {
          const ticket = args?.ticket ?? '';
          const session = getSession(ticket);
          const msg = session?.lastError?.trim() ? session.lastError : 'No error recorded.';
          log.info('SOAP getLastError', { ticket, msg });
          return { getLastErrorResult: msg };
        },

        closeConnection: (args: { ticket?: string }) => {
          const ticket = args?.ticket ?? '';
          log.info('SOAP closeConnection', { ticket });
          deleteSession(ticket);
          return { closeConnectionResult: 'OK' };
        },

        /** QBWC calls when QB returns a connection error. */
        connectionError: (args: { ticket?: string; hresult?: string; message?: string }) => {
          log.warn('SOAP connectionError', {
            ticket: args?.ticket ?? '',
            hresult: args?.hresult ?? '',
            message: args?.message ?? '',
          });
          return { connectionErrorResult: 'done' };
        },
      },
    },
  };
}
