import type { DataObj, value } from './base';
import Base, { objUtil } from './base';
import * as BSQL3 from 'better-sqlite3';

interface entry {
	key: string;
	value: string;
}

interface KeysChanged {
	update: string[];
	delete: string[];
}

export default class SimpleSQLite extends Base{
	constructor(path = './simple-db.sqlite', name = 'simple-db'){
		super();

		if(typeof path !== 'string'){
			throw new Error('the database path should be a string');
		}else if(typeof name !== 'string'){
			throw new Error("database 'name' should be a string");
		}else if(name.startsWith('sqlite_')){
			throw new Error("database 'name' can't start with 'sqlite_'");
		}else if(name.includes(']')){
			throw new Error("introduced database 'name' cannot include ']'");
		}

		let db = null;
		try{
			db = new BSQL3(path);
		}catch(e){
			throw new Error("introduced 'path' is not valid");
		}

		db.prepare(`CREATE TABLE IF NOT EXISTS [${name}](key TEXT PRIMARY KEY, value TEXT) WITHOUT ROWID`).run();

		this.statements = {
			set: db.prepare(`INSERT OR REPLACE INTO [${name}] VALUES(?, ?)`),
			delete: db.prepare(`DELETE FROM [${name}] WHERE key = ?`),
			getAll: db.prepare(`SELECT * FROM [${name}]`),
			get: db.prepare(`SELECT * FROM [${name}] WHERE key = ?`),
			clear: db.prepare(`DELETE FROM [${name}]`),
			save: db.transaction(() => {
				for(const key of this._keysChanged.update){
					this.statements.set.run(key, JSON.stringify(this.data[key]));
				}
				for(const key of this._keysChanged.delete){
					this.statements.delete.run(key);
				}
			}),
		};
		this._cache = this._getAll();
		this.close = db.close.bind(db) as () => void;
	}
	declare protected _cache: DataObj;
	private readonly statements: {
		set: BSQL3.Statement;
		getAll: BSQL3.Statement;
		get: BSQL3.Statement;
		clear: BSQL3.Statement;
		delete: BSQL3.Statement;
		save: BSQL3.Transaction;
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

	public data: DataObj = {};

	public get(key: string): value {
		return objUtil.get(this.data, objUtil.parseKey(key));
	}

	public set(key: string, value: value): void {
		const [k, ...props] = objUtil.parseKey(key);

		if(props.length){
			const data = this.get(k);
			objUtil.set(data, props, value);
			this._set(k, data);
		}else{
			this._set(k, value);
		}
	}

	public delete(key: string): void {
		const [k, ...props] = objUtil.parseKey(key);

		if(props.length){
			const data = this._get(k);

			objUtil.delete(data, props);
			this._set(k, data);
		}else{
			delete this.data[k];
		}
	}

	public clear(): void {
		this.statements.clear.run();
		this.data = {};
	}

	public close: () => void;

	private readonly _keysChanged: KeysChanged = {
		update: [],
		delete: [],
	};
	public save(): void {
		this.statements.save();
		this._keysChanged.update = [];
		this._keysChanged.delete = [];
	}
}