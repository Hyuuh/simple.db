import SQLiteDatabase from './SQLite/index';
import simpleSQLite from './simple/SQLite';
import simpleJSON from './simple/JSON';

export default {
	SQLite: SQLiteDatabase,
	simple: {
		SQLite: simpleSQLite,
		JSON: simpleJSON,
	}
}

type KEY = 'Y' | 'Mo' | 'W' | 'D' | 'H' | 'M' | 'S' | 'Ms';

const asd: Record<KEY, number> = {
	Y: 0,
	Mo: 0,
	W: 0,
	D: 0,
	H: 0,
	M: 0,
	S: 0,
	Ms: 0,
}