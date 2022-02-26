import type { RawOptions, DataObj, Value, cacheTypes } from './base';
import Base, { objUtil } from './base';
import * as BETTER_SQLITE3 from 'better-sqlite3';

interface entry {
	key: string;
	value: string;
}

export default class Database extends Base{
	constructor(options?: RawOptions){
		super();
		const opts = parseOptions(options);

		let db = null;
		try{
			db = new BETTER_SQLITE3(opts.path);
		}catch(e){
			throw new Error("introduced 'path' is not valid");
		}

		db.prepare(`CREATE TABLE IF NOT EXISTS [${opts.name}](key TEXT PRIMARY KEY, value TEXT)`).run();

		Object.assign(this, opts);
		this.statements = {
			set: db.prepare(`INSERT OR REPLACE INTO [${opts.name}] VALUES(?, ?)`),
			delete: db.prepare(`DELETE FROM [${opts.name}] WHERE key = ?`),
			clear: db.prepare(`DELETE FROM [${opts.name}]`),
			getAll: db.prepare(`SELECT * FROM [${opts.name}]`),
			get: db.prepare(`SELECT * FROM [${opts.name}] WHERE key = ?`),
		};
		if(this._cacheType !== 0){
			this._cache = this._getAll();
		}
	}
	protected _cache: DataObj;

	private readonly statements: {
		[key: string]: BETTER_SQLITE3.Statement
	};

	private _getAll(): DataObj {
		return this.statements.getAll.all().reduce<DataObj>((
			acc: { [key: string]: Value },
			{ key, value }: { key: string, value: string }
		) => {
			acc[key] = JSON.parse(value) as Value;

			return acc;
		}, {});
	}

	public get data(): DataObj {
		switch(this._cacheType){
			case 0: return this._getAll();
			case 1: return objUtil.clone(this._cache) as DataObj;
			case 2: return this._cache;
			default: throw new Error("'cacheType' must be a number between 0 and 2");
		}
	}

	private _get(key: string): Value {
		if(this._cacheType === 0){
			const entry = this.statements.get.get(key) as entry;
			if(!entry) return;

			return JSON.parse(entry.value) as Value;
		}

		return this._cache[key];
	}
	public get(key: string): Value {
		const [k, ...props] = objUtil.parseKey(key);

		return objUtil.get(this._get(k), props);
	}

	private _set(key: string, value: Value): void {
		this.statements.set.run(key, JSON.stringify(value));
	}
	public set(key: string, value: Value): void {
		const [k, ...props] = objUtil.parseKey(key);

		const data = this._get(k);

		objUtil.set(data, props, value);

		this._set(k, data);
	}

	private _delete(key: string): void {
		this.statements.delete.run(key);
	}
	public delete(key: string): void {
		const [k, ...props] = objUtil.parseKey(key);

		if(props.length){
			const data = this._get(k);

			objUtil.delete(data, props);
			this.set(key, data);
		}else{
			this._delete(k);
			if(this._cacheType !== 0){
				delete this._cache[k];
			}
		}
	}

	public clear(): void{
		this.statements.clear.run();
		this._cache = {};
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

	const opts = Object.assign({}, DEFAULT_OPTIONS, options);

	if(typeof opts.path !== 'string'){
		throw new Error('the database path should be a string');
	}else if(!Number.isFinite(opts.cacheType) || opts.cacheType < 0 || opts.cacheType > 2){
		throw new Error("'cacheType' should be a number between 0 and 2");
	}else if(typeof opts.name !== 'string'){
		throw new Error("database 'name' should be a string");
	}else if(opts.name.startsWith('sqlite_')){
		throw new Error("database 'name' can't start with 'sqlite_'");
	}else if(opts.name.includes(']')){
		throw new Error("introduced database 'name' cannot include ']'");
	}

	return opts as Options;
}