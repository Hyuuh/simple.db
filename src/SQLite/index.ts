import * as BETTER_SQLITE3 from 'better-sqlite3';
import { Database, Options } from 'better-sqlite3';

class Base{
	constructor(db: Database){ this.db = db; }
	protected readonly db: Database;
}

/*
column-constraint
1. 
2. PRIMARY KEY (ASC|DESC)? (conflict-clause) AUTOINCREMENT?
3. NOT NULL (conflict-clause)?
4. UNIQUE (conflict-clause)?
5. DEFAULT (value)

conflict-clause
1.
2. ON CONFLICT (ROLLBACK|ABORT|FAIL|IGNORE|REPLACE)
*/

type column = string | {
	name: string,
	type: string,
}

class ColumnsManager extends Base{
	constructor(db: Database, tableName: string){
		super(db);
		this.tableName = tableName;
	}
	tableName: string;

	add(name: string): void {
		this.db.prepare(`ALTER TABLE [${this.tableName}] ADD COLUMN ${name} BLOB`).run();
	}

	remove(name: string): void {
		this.db.prepare(`ALTER TABLE [${this.tableName}] DROP COLUMN ${name}`).run();
	}

	rename(oldName: string, newName: string): void {
		this.db.prepare(`ALTER TABLE [${this.tableName}] RENAME COLUMN ${oldName} TO ${newName}`).run();
	}

	static parseOne(column: column): string {
		if(typeof column === 'string') return column;

		return '';
	}

	static parse(columns: column[] | string): string {
		if(typeof columns === 'string') return columns;

		return '';
	}
}

class Table extends Base{
	constructor(db: Database, name: string){
		super(db);
		this.name = name;
		this.columns = new ColumnsManager(db, name);
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

class TablesManager extends Base{
	constructor(db: Database){
		super(db);
	}
	_tables: Record<string, Table> = {};

	create(name: string, columns: column[] | string): Table {
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

	rename(oldName: string, newName: string): void {
		this.db.prepare(`ALTER TABLE [${oldName}] RENAME TO [${newName}]`).run();
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

	optimize(): void {
		this.pragma('optimize');
		this.run('VACUUM');
	}
	
	pragma(str: string): unknown {
		return this.db.pragma(str);
	}

	run(str: string): unknown {
		return this.db.prepare(str).run();
	}
}

// https://www.sqlite.org/lang.html
// https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md