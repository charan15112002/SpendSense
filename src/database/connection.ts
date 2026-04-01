/**
 * SQLite Database Connection (Lock ID: M1)
 *
 * Single database instance for the app. Uses react-native-sqlite-storage.
 * Per Section 7 (C9): SQLite replaces AsyncStorage for proper queries and indexing.
 */

import SQLite from 'react-native-sqlite-storage';
import {
  DATABASE_NAME,
  CREATE_TRANSACTIONS_TABLE,
  CREATE_TRANSACTIONS_INDICES,
} from './schema';

SQLite.enablePromise(true);

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabase({
    name: DATABASE_NAME,
    location: 'default',
  });

  await db.executeSql(CREATE_TRANSACTIONS_TABLE);
  for (const indexSql of CREATE_TRANSACTIONS_INDICES) {
    await db.executeSql(indexSql);
  }

  dbInstance = db;
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
