import debug from 'debug';
import { MongoClient } from 'mongodb';
import { MONGO_REFERENCES_DB, MONGO_VOLUME_COLLECTION } from '../../config';
import { loadReference } from './volumeReference';

const d = debug('volumeReferenceUpdater');

export async function updateVolumeReference() {
  const client = new MongoClient(MONGO_REFERENCES_DB);
  await client.connect();
  const db = client.db();
  const collection = db.collection(MONGO_VOLUME_COLLECTION);
  const references = await collection.find().toArray();
  loadReference(references.map((r) => ({ pair: r.pair, volUsdt: r.volUsdt })));
  await client.close();
  d('volume references updated');
}

export async function enableDailyUpdates() {
  setInterval(() => {
    const diff = Math.floor(Math.random() * 15) * 1000 * 60;
    setTimeout(async () => {
      try {
        await updateVolumeReference();
      } catch (e) {
        d('error updating volume reference: %o', e);
      }
    }, diff);
  }, 1000 * 60 * 60 * 24);
}
