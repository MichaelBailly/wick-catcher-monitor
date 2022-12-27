import debug from 'debug';
import { MongoClient } from 'mongodb';
import { MONGO_CMC_COLLECTION, MONGO_REFERENCES_DB } from '../../config';

const d = debug('volumeReferenceUpdater');
let updateIntervalId: NodeJS.Timeout | null = null;

export const cmcPairFamily = new Map<string, string>();

export function getFamily(pair: string) {
  return cmcPairFamily.get(pair) || 'unknown';
}

function loadReference(reference: { symbol: string; family: number }[]) {
  cmcPairFamily.clear();

  for (const { symbol, family } of reference) {
    cmcPairFamily.set(`${symbol}USDT`, family.toString());
  }
}

export async function updateCMCReference() {
  const client = new MongoClient(MONGO_REFERENCES_DB);
  await client.connect();
  const db = client.db();
  const collection = db.collection(MONGO_CMC_COLLECTION);
  const references = await collection.find().toArray();
  loadReference(
    references.map((r) => ({ symbol: r.baseAsset, family: r.cmcFamily }))
  );
  await client.close();
  d('volume references updated');
}

export function enableDailyUpdates() {
  updateIntervalId = setInterval(() => {
    const diff = Math.floor(Math.random() * 15) * 1000 * 60;
    setTimeout(async () => {
      try {
        await updateCMCReference();
      } catch (e) {
        d('error updating volume reference: %o', e);
      }
    }, diff);
  }, 1000 * 60 * 60 * 24);
}
