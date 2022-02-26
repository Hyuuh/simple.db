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
	constructor(db: BETTER_SQLITE3_DATABASE, tableName: string){
		super(db);
		this.tableName = tableName;
	}

	public tableName: string;

	public add(column: column): void{
		this.db.prepare(`ALTER TABLE [${this.tableName}] ADD COLUMN ${
			ColumnsManager.parse(column)
		}`).run();
	}

	public delete(name: string): void {
		this.db.prepare(`ALTER TABLE [${this.tableName}] DROP COLUMN [${name}]`).run();
	}

	public rename(oldName: string, newName: string): void {
		this.db.prepare(`ALTER TABLE [${this.tableName}] RENAME COLUMN ${oldName} TO ${newName}`).run();
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