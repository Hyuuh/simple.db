import type { RawOptions, Data, Value, cacheTypes } from './base';
import Base, { objUtil } from './base';
import * as BETTER_SQLITE3 from 'better-sqlite3';

interface entry {
	key: string;
	value: string;
}

export default class extends Base{
	constructor(options?: RawOptions){
		super();
		options = parseOptions(options);

		let db = null;
		try{
			db = new BETTER_SQLITE3(options.path);
		}catch(e){
			throw new Error("introduced 'path' is not valid");
		}

		try{
			db.prepare(`CREATE TABLE IF NOT EXISTS [${options.name}](key TEXT PRIMARY KEY, value TEXT)`).run();
		}catch(e){
			if(e.message === 'file is not a database'){
				throw new Error(`file in '${options.path}' is not a valid SQLite database`);
			}
			throw new Error("introduced database 'name' is not valid (in SQLite)");
		}

		Object.assign(this, options);
		this.statements = {
			set: db.prepare(`INSERT OR REPLACE INTO [${options.name}] VALUES(?, ?)`),
			delete: db.prepare(`DELETE FROM [${options.name}] WHERE key = ?`),
			clear: db.prepare(`DELETE FROM [${options.name}]`),
			getAll: db.prepare(`SELECT * FROM [${options.name}]`),
			get: db.prepare(`SELECT * FROM [${options.name}] WHERE key = ?`),
		};
		if(this._cacheType !== 0){
			this._cache = this._getAll();
		}
	}

	private readonly statements: Record<string, BETTER_SQLITE3.Statement> = null;

	private _getAll(): Data {
		return this.statements.getAll.all().reduce<Data>((
			acc: Record<string, Value>,
			{ key, value }: { key: string, value: string }
		) => {
			acc[key] = JSON.parse(value) as Value;

			return acc;
		}, {});
	}

	public get data(): Data {
		switch(this._cacheType){
			case 0: return this._getAll();
			case 1: return objUtil.clone(this._cache) as Data;
			case 2: return this._cache;
			default:throw new Error("'cacheType' must be a number between 0 and 2");
		}
	}

	private _get(key: string): Value {
		if(this._cacheType === 0){
			const entry = this.statements.get.get(key) as entry;
			if(!entry) return;
	
			return JSON.parse(entry.value) as Value;
		}
	}
	public get(key: string): Value {
		const [k, ...props] = objUtil.parseKey(key);


	}

	private _set(key: string, value: Value): void {
		this.statements.set.run(key, JSON.stringify(value));
	}
	public set(key: string, value: Value): void {
		const [k, ...props] = objUtil.parseKey(key);
		
	}

	private _delete(key: string): void {
		this.statements.delete.run(key);
	}
	public delete(key: string): void {
		const [k, ...props] = objUtil.parseKey(key);

	}

	public clear(): void{
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
};

function parseOptions(options: RawOptions = {}): Options{
	if(typeof options === 'string') options = { path: options };
	if(typeof options !== 'object'){
		throw new Error('the database options should be an object or a string with the path');
	}

	options = Object.assign({}, DEFAULT_OPTIONS, options);

	if(typeof options.path !== 'string'){
		throw new Error('the database path should be a string');
	}else if(!Number.isFinite(options.cacheType) || options.cacheType < 0 || options.cacheType > 2){
		throw new Error("'cacheType' should be a number between 0 and 2");
	}else if(typeof options.name !== 'string'){
		throw new Error("database 'name' should be a string");
	}else if(options.name.startsWith('sqlite_')){
		throw new Error("database 'name' can't start with 'sqlite_'");
	}else if(!options.name.includes(']')){
		throw new Error("introduced database 'name' cannot include ']'");
	}

	return options as Options;
}