const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/remind';
const OUTPUT_DIR = path.join(__dirname, '../../db-exports');

async function exportCollections() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`Found ${collections.length} collections`);

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`Exporting ${collectionName}...`);
      
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      
      const filePath = path.join(OUTPUT_DIR, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
      
      console.log(`✓ ${collectionName}: ${documents.length} documents → ${filePath}`);
    }

    console.log('\nExport complete!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

exportCollections();
