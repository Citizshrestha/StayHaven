import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function dropDuplicateIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Collections to check
    const collections = ['rooms', 'hoteltables', 'paymenttransactions', 'otps'];

    for (const collectionName of collections) {
      console.log(`\n📋 Checking collection: ${collectionName}`);
      
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        
        console.log(`Found ${indexes.length} indexes:`);
        indexes.forEach(idx => {
          console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });

        // Drop specific duplicate indexes
        if (collectionName === 'rooms') {
          // Keep only the schema.index() version
          try {
            await collection.dropIndex('uniqueToken_1');
            console.log('  ✅ Dropped duplicate uniqueToken_1 index');
          } catch (err) {
            if (err.code === 27) {
              console.log('  ℹ️  uniqueToken_1 index does not exist (already clean)');
            } else {
              console.log(`  ⚠️  Could not drop uniqueToken_1: ${err.message}`);
            }
          }
        }

        if (collectionName === 'hoteltables') {
          try {
            await collection.dropIndex('uniqueToken_1');
            console.log('  ✅ Dropped duplicate uniqueToken_1 index');
          } catch (err) {
            if (err.code === 27) {
              console.log('  ℹ️  uniqueToken_1 index does not exist (already clean)');
            } else {
              console.log(`  ⚠️  Could not drop uniqueToken_1: ${err.message}`);
            }
          }
        }

        if (collectionName === 'paymenttransactions') {
          try {
            await collection.dropIndex('transactionId_1');
            console.log('  ✅ Dropped duplicate transactionId_1 index');
          } catch (err) {
            if (err.code === 27) {
              console.log('  ℹ️  transactionId_1 index does not exist (already clean)');
            } else {
              console.log(`  ⚠️  Could not drop transactionId_1: ${err.message}`);
            }
          }
        }

        if (collectionName === 'otps') {
          try {
            await collection.dropIndex('expiresAt_1');
            console.log('  ✅ Dropped duplicate expiresAt_1 index');
          } catch (err) {
            if (err.code === 27) {
              console.log('  ℹ️  expiresAt_1 index does not exist (already clean)');
            } else {
              console.log(`  ⚠️  Could not drop expiresAt_1: ${err.message}`);
            }
          }
        }

      } catch (err) {
        console.log(`  ⚠️  Collection ${collectionName} does not exist or error: ${err.message}`);
      }
    }

    console.log('\n✅ Index cleanup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Mongoose will recreate indexes from schema definitions');
    console.log('3. No more duplicate index warnings should appear\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

dropDuplicateIndexes();
