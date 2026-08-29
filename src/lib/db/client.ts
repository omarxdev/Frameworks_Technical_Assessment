import { MongoClient, Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoMemoryServer: any;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/island-media";

export async function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "test") {
    // In test environment, spin up or reuse memory server if needed
    if (!global._mongoClientPromise) {
      try {
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        const mongod = await MongoMemoryServer.create();
        global._mongoMemoryServer = mongod;
        const memUri = mongod.getUri();
        const memClient = new MongoClient(memUri);
        global._mongoClientPromise = memClient.connect();
      } catch (err) {
        // Fallback to standard client
        const fallbackClient = new MongoClient(uri);
        global._mongoClientPromise = fallbackClient.connect();
      }
    }
    return global._mongoClientPromise;
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });
      global._mongoClientPromise = client.connect().catch(async (err) => {
        console.warn("Could not connect to local MongoDB, attempting memory fallback...");
        try {
          const { MongoMemoryServer } = await import("mongodb-memory-server");
          const mongod = await MongoMemoryServer.create();
          global._mongoMemoryServer = mongod;
          const memUri = mongod.getUri();
          const memClient = new MongoClient(memUri);
          return memClient.connect();
        } catch (innerErr) {
          throw err;
        }
      });
    }
    return global._mongoClientPromise;
  }

  client = new MongoClient(uri);
  return client.connect();
}

export async function getDb(): Promise<Db> {
  const mongoClient = await getMongoClient();
  return mongoClient.db();
}
