require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');

const compassDir = path.join(__dirname, '../../database/compass');
function fromExtendedJson(value) {
  if (Array.isArray(value)) return value.map(fromExtendedJson);
  if (!value || typeof value !== 'object') return value;
  if (Object.keys(value).length === 1 && value.$oid) return new mongoose.Types.ObjectId(value.$oid);
  if (Object.keys(value).length === 1 && value.$date) return new Date(value.$date);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fromExtendedJson(item)]));
}

async function seed(Model, file) {
  const docs = fromExtendedJson(JSON.parse(fs.readFileSync(path.join(compassDir, file), 'utf8')));
  const result = await Model.collection.bulkWrite(docs.map((doc) => ({
    updateOne: { filter: { _id: doc._id }, update: { $setOnInsert: doc }, upsert: true }
  })), { ordered: true });
  console.log(`${Model.collection.collectionName}: ${result.upsertedCount} added, ${result.matchedCount} already present`);
}

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI chưa được cấu hình.');
  await mongoose.connect(process.env.MONGODB_URI);
  await seed(Category, 'categories.json');
  await seed(Product, 'products_additional_10.json');
  console.log(`Active product count: ${await Product.countDocuments({ isActive: true })}`);
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});
