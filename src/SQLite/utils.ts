import { Database } from 'better-sqlite3';

export class Base{
	constructor(db: Database){ this.db = db; }
	protected readonly db: Database;
}

type DataType = 'INTEGER' | 'NUMERIC' | 'REAL' | 'TEXT' | 'BLOB';
type conflictClause = '' | ` ON CONFLICT ${'ROLLBACK' | 'ABORT' | 'FAIL' | 'IGNORE' | 'REPLACE'}`;

type columnConstraint = '' |
	`PRIMARY KEY${' ASC' |' DESC' | ''}${conflictClause}${' AUTOINCREMENT' | ''}` |
	`NOT NULL${conflictClause}` |
	`UNIQUE${conflictClause}` |
	`DEFAULT ${number | string}`;



export type column = string | [string, columnConstraint, DataType?];

export class ColumnsManager extends Base{
	constructor(db: Database, tableName: string){
		super(db);
		this.tableName = tableName;
	}
	tableName: string;

	add(column: column): void {
		this.db.prepare(`ALTER TABLE [${this.tableName}] ADD COLUMN ${
			ColumnsManager.parseOne(column)
		}`).run();
	}

	remove(name: string): void {
		this.db.prepare(`ALTER TABLE [${this.tableName}] DROP COLUMN [${name}]`).run();
	}

	rename(oldName: string, newName: string): void {
		this.db.prepare(`ALTER TABLE [${this.tableName}] RENAME COLUMN ${oldName} TO ${newName}`).run();
	}

	static parseOne(column: column): string {
		if(typeof column === 'string') return `[${column}]`;
		const [name, constraint = '', type = 'BLOB'] = column;

		return `[${name}] ${type} ${constraint}`;
	}

	static parse(columns: column[] | string): string {
		if(typeof columns === 'string') return columns;

		return columns.map(ColumnsManager.parseOne).join(', ');
	}
}

export class TransactionManager extends Base{
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

