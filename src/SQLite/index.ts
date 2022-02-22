import * as BETTER_SQLITE3 from 'better-sqlite3';
import { Database, Options } from 'better-sqlite3';

class Base{
	constructor(db: Database){ this.db = db; }
	protected readonly db: Database;
}

class ColumnsManager extends Base{
	constructor(db: Database){
		super(db);
	}

	add(column): void {

	}

	remove(column): void {

	}

	static parse(columns: columns): string {
		return '';
	}
}

class Table extends Base{
	constructor(db: Database, name: string){
		super(db);
		this.name = name;
	}
	name: string;
	columns: ColumnsManager;
}

class TransactionManager extends Base{
	// https://www.sqlite.org/lang_transaction.html
	// https://www.sqlite.org/lang_savepoint.html
	begin(): void {
		this.db.prepare('BEGIN TRANSACTION').run();
	}

	commit(): void {
		this.db.prepare('COMMIT TRANSACTION').run();
	}

	savepoint(name?: string): void {
		this.db.prepare(`SAVEPOINT ${name}`).run();
	}

	deleteSavepoint(name?: string): void {
		this.db.prepare(`RELEASE SAVEPOINT ${name}`).run();
	}

	rollback(name?: string): void {
		if(name){
			this.db.prepare(`ROLLBACK TRANSACTION TO SAVEPOINT ${name}`).run();
		}else{
			this.db.prepare('ROLLBACK TRANSACTION').run();
		}
	}
}

type columns = string[] | string | Array<{
	name: string,
	type: string,
}>

class TablesManager extends Base{
	constructor(db: Database){
		super(db);
	}
	_tables: Record<string, Table> = {};

	create(name: string, columns: columns): Table {
		if(name in this._tables) return this._tables[name];
		this.db.prepare(`CREATE TABLE IF NOT EXISTS [${name}] (${
			ColumnsManager.parse(columns)
		})`).run();

		return this._tables[name] = new Table(this.db, name);
	}

	get(name: string): Table {
		return this._tables[name];
	}

	delete(name: string): void {
		if(name in this._tables){
			this.db.prepare(`DROP TABLE IF EXISTS [${name}]`).run();
			delete this._tables[name];
		}
	}
}

export default class extends Base{
	constructor(path: string, options?: Options){
		super(new BETTER_SQLITE3(path, options));
		this.transaction = new TransactionManager(this.db);
		this.tables = new TablesManager(this.db);
	}
	db: Database;
	transaction: TransactionManager;
	tables: TablesManager

	vacuum(file?: string): void {
		if(file){
			this.db.prepare(`VACUUM INTO [${file}]`).run();
		}else{
			this.db.prepare('VACUUM').run();
		}
	}
	
	pragma(str: string): any {
		return this.db.pragma(str);
	}
}

// https://www.sqlite.org/lang.html
// https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md