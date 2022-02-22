import Base, { RawOptions, Data, Value, cacheTypes } from './base';
import obj from './object'
import * as BETTER_SQLITE3 from 'better-sqlite3';

export default class extends Base{
	constructor(options?: RawOptions){
		super();
		options = parseOptions(options);

		let db;
		try{
			db = new BETTER_SQLITE3(options.path);
		}catch(e){
			throw new Error("introduced 'path' is not valid");
		}

		try{
			db.prepare(`CREATE TABLE IF NOT EXISTS ${options.name}(key TEXT PRIMARY KEY, value TEXT)`).run();
		}catch(e){
			if(e.message === 'file is not a database'){
				throw new Error(`file in '${options.path}' is not a valid SQLite database`);
			}
			throw new Error("introduced database 'name' is not valid (in SQLite)");
		}

		Object.assign(this, options);
		this.statements = {
			set: db.prepare(`INSERT OR REPLACE INTO ${options.name} VALUES(?, ?)`),
			delete: db.prepare(`DELETE FROM ${options.name} WHERE key = ?`),
			clear: db.prepare(`DELETE FROM ${options.name}`),
			getAll: db.prepare(`SELECT * FROM ${options.name}`),
			get: db.prepare(`SELECT * FROM ${options.name} WHERE key = ?`),
		}
		if(this._cacheType !== 0){
			this._cache = this._getAll();
		}
	}
	statements: Record<string, BETTER_SQLITE3.Statement> = null;

	_getAll(): Data {
		return this.statements.getAll.all().reduce((
			acc: Record<string, Value>,
			{ key, value }: { key: string, value: string }
		) => {
			acc[key] = JSON.parse(value);

			return acc;
		}, {});
	}
	get data(): Data {
		switch(this._cacheType){
			case 0: return this._getAll();
			case 1: return obj.clone(this._cache);
			case 2: return this._cache;
			default: throw new Error("'cacheType' must be a number between 0 and 2");
		}
	}
	get(key: string): Value {
		const [k, ...props] = obj.parseKey(key);
		const entry = this.statements.get.get(k);
		if(!entry) return;

		return obj.get(JSON.parse(entry.value), props);
	}
	set(key: string, value: Value): void {
		value = JSON.stringify(value);

		this.statements.set.run(key, JSON.stringify(value));
	}
	delete(key: string): void {
		this.statements.delete.run(key);
	}
	clear(): void {
		this.statements.clear.run();
	}
}

interface Options {
	cacheType: cacheTypes;
	path: string;
	name: string;
}

const DEFAULT_OPTIONS = {
	cacheType: 1,
	path: './simple-db.sqlite',
	name: 'simple-db',
}

function parseOptions(options: RawOptions = {}): Options {
	if(typeof options === 'string') options = { path: options };
	if(typeof options !== 'object'){
		throw new Error('the database options should be an object or a string with the path');
	}

	options = Object.assign({}, DEFAULT_OPTIONS, options);

	if(typeof options.path !== 'string'){
		throw new Error('the database path should be a string');
	}else if(!Number.isFinite(options.cacheType)){
		throw new Error("'cacheType' should be a number between 0 and 2");
	}else if(typeof options.name !== 'string'){
		throw new Error("database 'name' should be a string");
	}else if(options.name.startsWith('sqlite_')){
		throw new Error("database 'name' can't start with 'sqlite_' (in SQLite)");
	}else if(!options.name.match(/^[A-z_'"`][A-z\d_'"`]*$/)){
		throw new Error("introduced database 'name' is not valid (in SQLite)");
	}

	return options as Options;
}