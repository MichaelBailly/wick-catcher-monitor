import { Collection, MongoClient, ObjectId } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { MONGO_DB, MONGO_TRADE_COLLECTION, RECORDER_FILE_PATH } from './config';
import { TradeRecord } from './types/TradeRecord';

async function run() {
  await ensureProcessedDir();
  const files = await getTradeFiles();
  console.log(files);
  const client = await getMongo();
  const collection = client.db().collection(MONGO_TRADE_COLLECTION);

  for (const file of files) {
    const trade = await readTrade(file);
    await recordTrade(collection, trade);
    await moveProcessed(file);
  }

  await client.close();
}

async function readTrade(file: string): Promise<TradeRecord> {
  const filePath = join(RECORDER_FILE_PATH, file);
  const content = await readFile(filePath, 'utf-8');
  const trade = JSON.parse(content);
  trade._id = new ObjectId();
  trade.buyTimestamp = new Date(trade.buyTimestamp);
  trade.sellTimestamp = new Date(trade.sellTimestamp);
  trade.boughtTimestamp = new Date(trade.boughtTimestamp);
  trade.soldTimestamp = new Date(trade.soldTimestamp);
  trade.pnl = trade.soldAmount * trade.soldPrice - trade.amount * trade.price;
  if (!trade.id) {
    trade.id = randomUUID();
  }
  return trade;
}

async function recordTrade(collection: Collection, trade: TradeRecord) {
  return await collection.insertOne(trade);
}

async function moveProcessed(file: string) {
  const processedDir = join(RECORDER_FILE_PATH, 'processed');
  const filePath = join(RECORDER_FILE_PATH, file);
  const processedPath = join(processedDir, file);
  await rename(filePath, processedPath);
}

async function getMongo() {
  const client = new MongoClient(MONGO_DB);
  await client.connect();
  return client;
}

async function ensureProcessedDir() {
  const processedDir = join(RECORDER_FILE_PATH, 'processed');
  let dirStat;
  try {
    dirStat = await stat(processedDir);
  } catch (e) {
    if (!isErrnoException(e)) {
      throw e;
    }
    if (e?.code === 'ENOENT') {
      return await mkdir(processedDir);
    } else {
      throw e;
    }
  }
  if (!dirStat?.isDirectory()) {
    throw new Error('Processed dir is not a directory');
  }
}

async function getTradeFiles() {
  const files = await readdir(RECORDER_FILE_PATH, { withFileTypes: true });

  return files
    .filter(
      (f) =>
        f.isFile() && f.name.startsWith('trade-') && f.name.endsWith('.json')
    )
    .map((f) => f.name);
}

run();

function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
  if ('code' in (e as any)) return true;
  else return false;
}
