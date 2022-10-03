import { MongoClient } from 'mongodb';
import { MONGO_REFERENCES_DB, MONGO_VOLUME_COLLECTION } from '../../config';
import { loadReference } from './volumeReference';

export async function updateVolumeReference() {
  const client = new MongoClient(MONGO_REFERENCES_DB);
  await client.connect();
  const db = client.db();
  const collection = db.collection(MONGO_VOLUME_COLLECTION);
  const references = await collection.find().toArray();
  loadReference(references.map((r) => ({ pair: r.pair, volUsdt: r.volUsdt })));
  await client.close();
}
