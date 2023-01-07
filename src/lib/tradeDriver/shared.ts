import { format } from 'date-fns';
import debug from 'debug';
import { writeFile } from 'fs/promises';
import { RECORDER_FILE_PATH } from '../../config';
import { BinanceOrderResponse } from '../../types/BinanceOrderResponse';
import { BinanceTransactionError } from '../../types/BinanceTransactionError';

const d = debug('lib:tradeDriver:sellTransaction:shared');

export async function onTransactionError(
  error: BinanceTransactionError | Error
) {
  d('start onTransactionError');
  const errorFilename = `${RECORDER_FILE_PATH}/binance-transaction-${format(
    new Date(),
    'yyyyMMddHHmmssSS'
  )}.err`;
  const fileContents = [];
  if (error instanceof BinanceTransactionError && error.response) {
    d('error is BinanceTransactionError');
    fileContents.push(`response.ok: ${error.response.ok}`);
    fileContents.push(`response.status: ${error.response.status}`);
    fileContents.push(`response.statusText: ${error.response.statusText}`);
    fileContents.push(`response.bodyUsed: ${error.response.bodyUsed}`);
    try {
      d('reading response body');
      const body = await error.response.text();
      fileContents.push(`response.body: ${body}`);
      d('setting error.body');
      error.body = body;
    } catch (e) {
      fileContents.push(`response.body: Unable to read response.body: ${e}`);
    }
  }
  fileContents.push(`error.message: ${error.message}`);

  writeFile(errorFilename, fileContents.join('\n'), 'utf8');

  return error;
}

export async function recordBinanceTransactionResponse(
  response: BinanceOrderResponse
) {
  const filename = `${RECORDER_FILE_PATH}/binance-transaction-${format(
    new Date(),
    'yyyyMMdd-HHmmss'
  )}.json`;
  try {
    await writeFile(filename, JSON.stringify(response, null, 2), 'utf8');
  } catch (e) {
    console.log('ERROR: failed to record binance transaction response');
    console.log(e);
  }
}
