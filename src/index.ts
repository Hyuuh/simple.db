import SQLite from './SQLite/index';
import simpleSQLite from './simple/SQLite';
import simpleJSON from './simple/JSON';

const simple = {
	SQLite: simpleSQLite,
	JSON: simpleJSON,
} as const;

export {
	SQLite,
	simpleSQLite,
	simpleJSON,
	simple
};
export default {
	SQLite,
	simpleSQLite,
	simpleJSON,
	simple,
} as const;