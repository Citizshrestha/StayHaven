import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Never import server.js, config/db.js, dotenv, or application seeders here.
// This suite owns the default Mongoose connection in its isolated node:test process.
export async function withEphemeralWalletDatabase(run) {
  assert.equal(mongoose.connection.readyState, 0, 'Refuse to use an existing database connection');
  const values = {
    NODE_ENV: 'test',
    MONGODB_URI: '',
    MONGO_URI: '',
    DATABASE_URL: '',
    KHALTI_ENV: 'sandbox',
    ESEWA_ENV: 'sandbox',
    KHALTI_SECRET_KEY: 'test_wallet_integration_key_never_real',
    ESEWA_SECRET_KEY: 'wallet-integration-only',
    ESEWA_PRODUCT_CODE: 'EPAYTEST',
    CLIENT_URL: 'http://wallet-tests.invalid',
    SERVER_URL: 'http://wallet-tests.invalid',
  };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  const replSet = new MongoMemoryReplSet({
    binary: { version: '7.0.24', downloadDir: join(tmpdir(), 'wallet-test-mongodb-binaries') },
    instanceOpts: [{ launchTimeout: 60000 }],
    replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1' },
  });
  try {
    await replSet.start();
    const dbName = `wallet_integration_${randomUUID().replaceAll('-', '')}`;
    const uri = replSet.getUri(dbName);
    assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:/);
    process.env.MONGODB_URI = uri;
    process.env.MONGO_URI = uri;
    process.env.DATABASE_URL = uri;
    const connect = async () => {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      assert.equal(mongoose.connection.name, dbName);
      assert.equal(mongoose.connection.host, '127.0.0.1');
    };
    await connect();
    await run({
      dbName,
      async reconnect() {
        await mongoose.disconnect();
        await connect();
      },
      async reset() {
        assert.equal(mongoose.connection.name, dbName, 'Refuse cleanup outside the test database');
        assert.equal(mongoose.connection.host, '127.0.0.1');
        // Preserve real indexes, including unique indexes used by concurrent callbacks.
        for (const collection of Object.values(mongoose.connection.collections)) {
          await collection.deleteMany({});
        }
      },
    });
  } finally {
    try {
      await mongoose.disconnect();
    } finally {
      try {
        await replSet.stop();
      } finally {
        for (const [key, value] of Object.entries(previous)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
    }
  }
}
