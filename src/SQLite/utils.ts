import type { Database } from 'better-sqlite3';

export class Base{
	constructor(db: Database){
		this.db = db;
	}

	protected readonly db: Database;
}

type DataType = 'INTEGER' | 'NUMERIC' | 'REAL' | 'TEXT' | 'BLOB';
type conflictClause = '' | ` ON CONFLICT ${'ROLLBACK' | 'ABORT' | 'FAIL' | 'IGNORE' | 'REPLACE'}`;

type columnConstraint = '' |
	`PRIMARY KEY${' ASC' |' DESC' | ''}${conflictClause}${' AUTOINCREMENT' | ''}` |
	`NOT NULL${conflictClause}` |
	`UNIQUE${conflictClause}` |
	`DEFAULT ${number | string}`;

type column = string | [string, columnConstraint, DataType?];

class ColumnsManager extends Base{
	constructor(db: Database, tableName: string){
		super(db);
		this.tableName = tableName;
	}

	public tableName: string;

	public add(column: column): void{
		this.db.prepare(`ALTER TABLE [${this.tableName}] ADD COLUMN ${
			ColumnsManager.parseOne(column)
		}`).run();
	}

	public remove(name: string): void {
		this.db.prepare(`ALTER TABLE [${this.tableName}] DROP COLUMN [${name}]`).run();
	}

	public rename(oldName: string, newName: string): void {
		this.db.prepare(`ALTER TABLE [${this.tableName}] RENAME COLUMN ${oldName} TO ${newName}`).run();
	}

	public static parseOne(column: column): string{
		if(typeof column === 'string') return `[${column}]`;
		const [name, constraint = '', type = 'BLOB'] = column;

		return `[${name}] ${type} ${constraint}`;
	}

	public static parse(columns: column[] | string): string{
		if(typeof columns === 'string') return columns;

		return columns.map(ColumnsManager.parseOne).join(', ');
	}
}

const a = 1;
export { a, ColumnsManager, type column };

export class TransactionManager extends Base{
	// https://www.sqlite.org/lang_transaction.html
	// https://www.sqlite.org/lang_savepoint.html
	public begin(): void{
		this.db.prepare('BEGIN TRANSACTION').run();
	}

	public commit(): void{
		this.db.prepare('COMMIT TRANSACTION').run();
	}

	public savepoint(name?: string): void{
		this.db.prepare(`SAVEPOINT ${name}`).run();
	}

	public deleteSavepoint(name?: string): void{
		this.db.prepare(`RELEASE SAVEPOINT ${name}`).run();
	}

	public rollback(name?: string): void{
		if(name){
			this.db.prepare(`ROLLBACK TRANSACTION TO SAVEPOINT ${name}`).run();
		}else{
			this.db.prepare('ROLLBACK TRANSACTION').run();
		}
	}
}

