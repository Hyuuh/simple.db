import type { RawOptions, DataObj, value } from './base';
import Base, { objUtil } from './base';
import * as BSQL3 from 'better-sqlite3';

interface entry {
	key: string;
	value: string;
}

export default class SimpleSQLite extends Base{
	constructor(options?: RawOptions){
		super();
		const opts = parseOptions(options);

		let db = null;
		try{
			db = new BSQL3(opts.path);
		}catch(e){
			throw new Error("introduced 'path' is not valid");
		}

		db.prepare(`CREATE TABLE IF NOT EXISTS [${opts.name}](key TEXT PRIMARY KEY, value TEXT) WITHOUT ROWID`).run();

		Object.assign(this, opts);
		this.statements = {
			set: db.prepare(`INSERT OR REPLACE INTO [${opts.name}] VALUES(?, ?)`),
			delete: db.prepare(`DELETE FROM [${opts.name}] WHERE key = ?`),
			clear: db.prepare(`DELETE FROM [${opts.name}]`),
			getAll: db.prepare(`SELECT * FROM [${opts.name}]`),
			get: db.prepare(`SELECT * FROM [${opts.name}] WHERE key = ?`),
		};
		if(this.cache) this._cache = this._getAll();

		this.close = db.close.bind(db) as () => void;
	}
	declare protected _cache: DataObj;
	private readonly statements: {
		[key: string]: BSQL3.Statement
	};

	private _getAll(): DataObj {
		return this.statements.getAll.all().reduce<DataObj>((
			acc: { [key: string]: value },
			{ key, value }: { key: string, value: string }
		) => {
			acc[key] = JSON.parse(value) as value;

			return acc;
		}, {});
	}

	public get data(): DataObj {
		if(this.cache) return this._cache;

		return this._getAll();
	}

	private _get(key: string): value {
		if(this.cache){
			return this._cache[key];
		}

		const entry = this.statements.get.get(key) as entry;
		if(!entry) return;

		return JSON.parse(entry.value) as value;
	}
	public get(key: string): value {
		const [k, ...props] = objUtil.parseKey(key);

		return objUtil.get(this._get(k), props);
	}

	private _set(key: string, value: value): void {
		if(this.cache) this._cache[key] = value;
		this.statements.set.run(key, JSON.stringify(value));
	}
	public set(key: string, value: value): void {
		const [k, ...props] = objUtil.parseKey(key);

		if(props.length){
			const data = this._get(k) || {};
			objUtil.set(data, props, value);
			this._set(k, data);
		}else{
			this._set(k, value);
		}
	}

	private _delete(key: string): void {
		this.statements.delete.run(key);
	}
	public delete(key: string): void {
		const [k, ...props] = objUtil.parseKey(key);

		if(props.length){
			const data = this._get(k);

			objUtil.delete(data, props);
			this._set(k, data);
		}else{
			this._delete(k);
			if(this.cache) delete this._cache[k];
		}
	}

	public clear(): void {
		this.statements.clear.run();
		this._cache = {};
	}

	public close: () => void;
}

export interface Options {
	cache: boolean;
	path: string;
	name: string;
}

const DEFAULT_OPTIONS: Options = {
	cache: true,
	path: './simple-db.sqlite',
	name: 'simple-db',
};

function parseOptions(options: RawOptions = {}): Options {
	if(typeof options === 'string') options = { path: options };
	if(typeof options !== 'object'){
		throw new Error('the database options should be an object or a string with the path');
	}

	const opts = Object.assign({}, DEFAULT_OPTIONS, options);

	if(typeof opts.path !== 'string'){
		throw new Error('the database path should be a string');
	}else if(typeof opts.cache !== 'boolean'){
		throw new Error('the cache option should be a boolean');
	}else if(typeof opts.name !== 'string'){
		throw new Error("database 'name' should be a string");
	}else if(opts.name.startsWith('sqlite_')){
		throw new Error("database 'name' can't start with 'sqlite_'");
	}else if(opts.name.includes(']')){
		throw new Error("introduced database 'name' cannot include ']'");
	}

	return opts as Options;
}