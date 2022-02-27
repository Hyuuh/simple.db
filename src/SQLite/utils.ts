import type { Database as BETTER_SQLITE3_DATABASE } from 'better-sqlite3';

export class Base{
	constructor(db: BETTER_SQLITE3_DATABASE){
		Object.defineProperty(this, 'db', {
			value: db,
			writable: false,
			enumerable: false,
			configurable: false,
		});
	}

	protected readonly db: BETTER_SQLITE3_DATABASE;
}

type DataType = 'BLOB' | 'INTEGER' | 'NUMERIC' | 'REAL' | 'TEXT';
type conflictClause = '' | ` ON CONFLICT ${'ABORT' | 'FAIL' | 'IGNORE' | 'REPLACE' | 'ROLLBACK'}`;

type columnConstraint = '' |
	`DEFAULT ${number | string}` |
	`NOT NULL${conflictClause}` |
	`PRIMARY KEY${' ASC' |' DESC' | ''}${conflictClause}${' AUTOINCREMENT' | ''}` |
	`UNIQUE${conflictClause}`;

export type column = string | [string, columnConstraint, DataType?];

export class ColumnsManager extends Base{
	constructor(db: BETTER_SQLITE3_DATABASE, tableName: string, list: string[]){
		super(db);
		this.table = tableName;
		this.list = list;
	}
	public list: string[];
	public table: string;

	public add(column: column): void {
		this.db.prepare(`ALTER TABLE [${this.table}] ADD COLUMN ${
			ColumnsManager.parse(column)
		}`).run();

		this.list.push(Array.isArray(column) ? column[0] : column);
	}

	public delete(name: string): void {
		this.db.prepare(`ALTER TABLE [${this.table}] DROP COLUMN [${name}]`).run();

		this.list.splice(this.list.indexOf(name), 1);
	}

	public rename(oldName: string, newName: string): void {
		this.db.prepare(`ALTER TABLE [${this.table}] RENAME COLUMN ${oldName} TO ${newName}`).run();

		this.list[this.list.indexOf(oldName)] = newName;
	}

	public static parse(column: column): string{
		if(typeof column === 'string') return `[${column}]`;
		const [name, constraint = '', type = 'BLOB'] = column;

		return `[${name}] ${type} ${constraint}`;
	}
}

export class TransactionManager extends Base{
	// https://www.sqlite.org/lang_transaction.html
	// https://www.sqlite.org/lang_savepoint.html
	public begin(): void {
		this.db.prepare('BEGIN TRANSACTION').run();
	}

	public commit(): void {
		this.db.prepare('COMMIT TRANSACTION').run();
	}

	public savepoint(name?: string): void {
		if(name){
			this.db.prepare(`SAVEPOINT ${name}`).run();
		}else{
			this.db.prepare('SAVEPOINT').run();
		}
	}

	public deleteSavepoint(name?: string): void {
		if(name){
			this.db.prepare(`RELEASE SAVEPOINT ${name}`).run();
		}else{
			this.db.prepare('RELEASE SAVEPOINT').run();
		}
	}

	public rollback(name?: string): void {
		if(name){
			this.db.prepare(`ROLLBACK TRANSACTION TO SAVEPOINT ${name}`).run();
		}else{
			this.db.prepare('ROLLBACK TRANSACTION').run();
		}
	}
}