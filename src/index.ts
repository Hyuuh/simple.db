import SQLiteDatabase from './SQLite/index';
import simpleSQLite from './simple/SQLite';
import simpleJSON from './simple/JSON';

export default {
	SQLite: SQLiteDatabase,
	simple: {
		SQLite: simpleSQLite,
		JSON: simpleJSON,
	},
};