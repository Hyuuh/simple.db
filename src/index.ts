import SQLite from './SQLite/index';
import SimpleSQLite from './simple/SQLite';
import SimpleJSON from './simple/JSON';

const simple = {
	SQLite: SimpleSQLite,
	JSON: SimpleJSON,
} as const;

export {
	SQLite,
	SimpleSQLite,
	SimpleJSON,
	simple
};
export default {
	SQLite,
	SimpleSQLite,
	SimpleJSON,
	simple,
} as const;