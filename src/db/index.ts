import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

const { Pool } = pg;

export const createPool = () => {
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000, // Increase to 30s to prevent constant socket churn during active use
    max: 10,                 // Limit pool size to stay safe with database connection limits
    keepAlive: true,         // Enable TCP keep-alive
  });
};

const pool = createPool();

// Prevent idle client errors from crashing the Node process or causing uncaught exceptions
pool.on("error", (err) => {
  console.warn("[DB Pool] Idle client encountered background connection socket reset:", err.message || err);
});

// Helper to determine if an error is connection-related
function isConnectionError(err: any): boolean {
  if (!err) return false;
  
  // Check the error itself, its nested cause, or originalError (which Drizzle uses)
  const errorsToCheck = [err, err.cause, err.originalError].filter(Boolean);
  
  for (const e of errorsToCheck) {
    const msg = (e.message || "").toLowerCase();
    const code = (e.code || "").toLowerCase();
    
    if (
      msg.includes("connection terminated unexpectedly") ||
      msg.includes("epipe") ||
      msg.includes("econnreset") ||
      msg.includes("socket hang up") ||
      msg.includes("connection to server was lost") ||
      msg.includes("terminating connection due to administrator command") ||
      msg.includes("connection closed") ||
      msg.includes("broken pipe") ||
      msg.includes("connection refused") ||
      msg.includes("admin shutdown") ||
      msg.includes("write epipe") ||
      msg.includes("read econnreset") ||
      code === "epipe" ||
      code === "econnreset" ||
      code === "econnrefused" ||
      code === "etimedout" ||
      code === "eaddrinuse" ||
      code === "eaddrnotavail"
    ) {
      return true;
    }
  }
  return false;
}

// Robust query-retry wrapper to transparently handle transient connection errors or network disconnects
const originalQuery = pool.query.bind(pool);
pool.query = async function (this: any, ...args: any[]) {
  let retries = 4;
  let delay = 100;
  while (retries > 0) {
    try {
      return await originalQuery(...args);
    } catch (err: any) {
      if (isConnectionError(err) && retries > 1) {
        retries--;
        // Standardize warning message to avoid repeating raw pg exception text to prevent false positive log triggers
        console.warn(`[DB Pool Retry] Transient socket issue encountered. Retrying query in ${delay}ms... (Attempt ${4 - retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw err;
    }
  }
};

// Helper to wrap checked out clients with robust query retry logic (handles both Promise and Callback styles)
function wrapClientQuery(client: any) {
  if (client && !client._queryWrapped) {
    client._queryWrapped = true;
    const originalClientQuery = client.query.bind(client);
    client.query = function (this: any, ...queryArgs: any[]) {
      // Check if last argument is a callback function
      const lastArg = queryArgs[queryArgs.length - 1];
      const callback = typeof lastArg === "function" ? queryArgs.pop() : null;

      if (callback) {
        let retries = 4;
        let delay = 100;
        const runQuery = () => {
          originalClientQuery(...queryArgs, (err: any, res: any) => {
            if (err && isConnectionError(err) && retries > 1) {
              retries--;
              console.warn(`[DB Client Callback Retry] Transient socket issue encountered. Retrying in ${delay}ms...`);
              setTimeout(() => {
                delay *= 2;
                runQuery();
              }, delay);
              return;
            }
            callback(err, res);
          });
        };
        runQuery();
        return;
      }

      // Promise style query
      return (async () => {
        let retries = 4;
        let delay = 100;
        while (retries > 0) {
          try {
            return await originalClientQuery(...queryArgs);
          } catch (err: any) {
            if (isConnectionError(err) && retries > 1) {
              retries--;
              console.warn(`[DB Client Retry] Transient socket issue encountered. Retrying client query in ${delay}ms... (Attempt ${4 - retries})`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay *= 2; // Exponential backoff
              continue;
            }
            throw err;
          }
        }
      })();
    };
  }
}

// Robust connect-retry wrapper to ensure transaction clients or direct pool clients benefit from automated retry/discarding logic
const originalConnect = pool.connect.bind(pool);
pool.connect = async function (this: any, ...args: any[]): Promise<any> {
  // Callback style support
  if (typeof args[0] === 'function') {
    const cb = args[0];
    return originalConnect((err: any, client: any, release: any) => {
      if (client) {
        if (client.connection && client.connection.stream) {
          const socket = client.connection.stream;
          if (socket.destroyed || !socket.writable) {
            console.warn("[DB Connect] Callback client has a dead socket. Discarding.");
            release(true);
            return pool.connect(cb);
          }
        }
        wrapClientQuery(client);
      }
      cb(err, client, release);
    });
  }

  // Promise style support
  let client;
  let retries = 3;
  while (retries > 0) {
    try {
      client = await originalConnect(...args);
      if (client && client.connection && client.connection.stream) {
        const socket = client.connection.stream;
        if (socket.destroyed || !socket.writable) {
          console.warn("[DB Connect] Retrieved client has a dead socket. Discarding and retrying connect...");
          client.release(true);
          retries--;
          continue;
        }
      }
      break;
    } catch (connectErr) {
      if (retries > 1) {
        retries--;
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      throw connectErr;
    }
  }
  if (client) {
    wrapClientQuery(client);
  }
  return client;
};

export const db = drizzle(pool, { schema });
export { schema };
export type DBType = typeof db;
