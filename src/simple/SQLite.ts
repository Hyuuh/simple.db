import type { DataObj, value } from './base';
import Base, { objUtil } from './base';
import * as BSQL3 from 'better-sqlite3';

interface entry {
	key: string;
	value: string;
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

		try{
			this.db = new BSQL3(path);
		}catch(e){
			throw new Error("introduced 'path' is not valid");
		}

		this.db.prepare(`CREATE TABLE IF NOT EXISTS [${name}](key TEXT PRIMARY KEY, value TEXT) WITHOUT ROWID`).run();

		this.statements = {
			set: this.db.prepare(`INSERT OR REPLACE INTO [${name}] VALUES(?, ?)`),
			delete: this.db.prepare(`DELETE FROM [${name}] WHERE key = ?`),
			clear: this.db.prepare(`DELETE FROM [${name}]`),
			begin: this.db.prepare('BEGIN TRANSACTION'),
			commit: this.db.prepare('COMMIT TRANSACTION'),
		};

		const data = this.db.prepare(`SELECT * FROM [${name}]`).all() as entry[];
		for(const { key, value } of data){
			this.data[key] = JSON.parse(value) as value;
		}
	}
	private readonly db: BSQL3.Database;
	public data: DataObj = {};
	private closed = false;
	private readonly statements: {
		set: BSQL3.Statement;
		clear: BSQL3.Statement;
		delete: BSQL3.Statement;
		begin: BSQL3.Statement;
		commit: BSQL3.Statement;
	};

	public set(key: string, value: value): void {
		const props = objUtil.parseKey(key);
		super.set(props, value);

		this._queueSave();
		this.statements.set.run(
			props[0],
			JSON.stringify(this.data[props[0]])
		);
	}
	public delete(key: string): void {
		const props = objUtil.parseKey(key);
		super.delete(props);

		this._queueSave();
		if(props.length === 1){
			this.statements.delete.run(props[0]);
		}else{
			this.statements.set.run(
				props[0],
				JSON.stringify(this.data[props[0]])
			);
		}
	}

	public clear(): void {
		this.statements.clear.run();
		this.data = {};
	}

	public save(): void {
		if(!this.db.inTransaction) return;
		this.statements.commit.run();

		if(this.closed) this.db.close();
		else this.statements.begin.run();
	}

	protected _queueSave(): void {
		if(this.saveQueued) return;

		this.saveQueued = true;
		this.statements.begin.run();
		setTimeout(() => {
			this.statements.commit.run();
			this.saveQueued = false;
			if(this.closed) this.db.close();
		}, 100);
	}

	public close(): void {
		if(this.saveQueued) this.closed = true;
		else this.db.close();
	}
}