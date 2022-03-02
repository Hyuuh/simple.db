import type { DataObj, value } from './base';
import Base, { objUtil } from './base';
import * as BSQL3 from 'better-sqlite3';

interface entry {
	key: string;
	value: string;
}

type change = [string, true?];

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
			clear: db.prepare(`DELETE FROM [${name}]`),
			save: db.transaction(() => {
				for(const [key, del] of this.changes){
					if(del === true){
						this.statements.delete.run(key);
					}else{
						this.statements.set.run(key, JSON.stringify(
							this.data[key]
						));
					}
				}

				if(this.closed){
					this.statements.close();
				}
			}),
			close: db.close.bind(db) as () => void,
		};

		const data = db.prepare(`SELECT * FROM [${name}]`).all() as entry[];
		for(const { key, value } of data){
			this.data[key] = JSON.parse(value) as value;
		}
	}
	public data: DataObj = {};
	private closed = false;
	private changes: change[] = [];
	private readonly statements: {
		set: BSQL3.Statement;
		clear: BSQL3.Statement;
		delete: BSQL3.Statement;
		save: BSQL3.Transaction;
		close: () => void;
	};

	public set(key: string, value: value): void {
		const props = objUtil.parseKey(key);
		super.set(props, value);

		this.changes.push([props[0]]);
	}
	public delete(key: string): void {
		const props = objUtil.parseKey(key);
		super.delete(props);

		if(props.length === 1){
			this.changes.push([props[0], true]);
		}else{
			this.changes.push([props[0]]);
		}
	}
	public clear(): void {
		this.statements.clear.run();
		this.data = {};
	}
	public save(): void {
		this.statements.save();
		this.changes = [];
	}

	public close(): void {
		this.closed = true;
	}
}