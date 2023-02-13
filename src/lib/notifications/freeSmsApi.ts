import debug from 'debug';
import { FREE_SMS_API_PASSWORD, FREE_SMS_API_USER } from '../../config';
import { TradeEndEvent } from '../../types/TradeEndEvent';
import { TradeResult } from '../../types/TradeResult';
import { events } from '../events';
import { TradeDriver } from '../tradeDriver';
import { TradeDriverSellError } from '../tradeDriver/TradeDriverSellError';
import {
  isATradeDriverTransactionError,
  TradeDriverTransactionError,
} from '../tradeDriver/TradeDriverTransactionError';

const log = debug('notifications:freesmsapi');

events.on('tradeEnd', async (event: TradeEndEvent) => {
  const { tradeDriver, tradeResult } = event;
  if (isATradeDriverTransactionError(tradeResult)) {
    let transactionType = 'Buy';
    if (tradeResult instanceof TradeDriverSellError) {
      transactionType = 'Sell';
    }
    if (transactionType === 'Buy') {
      sendBuyFailureNotification(tradeDriver, tradeResult);
    } else {
      sendSellFailureNotification(tradeDriver, tradeResult);
    }
  } else {
    sendTradeResultNotification(tradeResult);
  }
});
log('registered to tradeEnd event');

export async function sendTradeResultNotification(tradeResult: TradeResult) {
  const pnl = (
    tradeResult.soldAmount * tradeResult.soldPrice -
    tradeResult.quoteAmount
  ).toFixed(2);
  let message = `Trade complete ${tradeResult.pair} ${pnl}`;
  if (tradeResult.sellStrategy) {
    message += ` - strategy: ${tradeResult.sellStrategy}`;
  }
  sendSms(message);
}

export async function sendBuyFailureNotification(
  tradeDriver: TradeDriver,
  error: TradeDriverTransactionError
) {
  const message = `Buy order for ${tradeDriver.pair} failed`;
  sendSms(message);
}

export async function sendSellFailureNotification(
  tradeDriver: TradeDriver,
  error: TradeDriverTransactionError
) {
  let message = `Sell order for ${tradeDriver.pair} failed`;
  sendSms(message);
}

async function sendSms(message: string) {
  log('send sms starts');
  if (!FREE_SMS_API_USER || !FREE_SMS_API_PASSWORD) {
    log('no credentials, skipping');
    return;
  }

  const data = {
    user: FREE_SMS_API_USER,
    pass: FREE_SMS_API_PASSWORD,
    msg: message,
  };

  const params = new URLSearchParams(data);

  try {
    const response = await fetch(
      `https://smsapi.free-mobile.fr/sendmsg?${params.toString()}`
    );
    if (!response.ok) {
      log('failed to send sms: %d %s', response.status, response.statusText);
    }
    log('SMS sent');
  } catch (e) {
    log('Error sending sms: %o', e);
  }
}
