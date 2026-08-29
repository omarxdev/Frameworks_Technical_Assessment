import { MongoClient, Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoMemoryServer: any;
}

export const DB_NAME = process.env.MONGODB_DB || "island-media";

const uri = () =>
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/island-media";

const startMemoryServer = async () => {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create();
  global._mongoMemoryServer = mongod;
  return new MongoClient(mongod.getUri()).connect();
};

export const getMongoClient = async (): Promise<MongoClient> => {
  if (global._mongoClientPromise) return global._mongoClientPromise;

  if (process.env.NODE_ENV === "test" || process.env.USE_MEMORY_DB === "true") {
    global._mongoClientPromise = startMemoryServer();
    return global._mongoClientPromise;
  }

  const client = new MongoClient(uri(), {
    connectTimeoutMS: 8000,
    serverSelectionTimeoutMS: 8000,
  });

  global._mongoClientPromise = client.connect().catch(async (err) => {
    if (process.env.NODE_ENV === "production") throw err;
    console.warn(
      `Could not reach MongoDB at the configured URI (${err.message}). Falling back to an in-memory server for this process.`
    );
    return startMemoryServer();
  });

  return global._mongoClientPromise;
};

export const getDb = async (): Promise<Db> => {
  const client = await getMongoClient();
  return client.db(DB_NAME);
};
