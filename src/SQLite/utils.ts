import type * as BSQL3 from 'better-sqlite3';

export class Base{
	constructor(db: BSQL3.Database){
		Object.defineProperty(this, 'db', {
			value: db,
			writable: false,
			enumerable: false,
			configurable: false,
		});
	}

	protected readonly db: BSQL3.Database;
}

export type value = Buffer | bigint | number | string | null;
export interface Data {
	[key: string | number]: value
}
export type condition = string | null | ((row: Data) => unknown);

type conflictClause = '' | ` ON CONFLICT ${'ABORT' | 'FAIL' | 'IGNORE' | 'REPLACE' | 'ROLLBACK'}`;
type columnConstraint = '' |
	// `DEFAULT ${number | string}` |
	`NOT NULL${conflictClause}` |
	`PRIMARY KEY${' ASC' |' DESC' | ''}${conflictClause}${' AUTOINCREMENT' | ''}` |
	`UNIQUE${conflictClause}`;

type valueType = 'BLOB' | 'INTEGER' | 'NUMERIC' | 'REAL' | 'TEXT';
export type column = string | [string, value?, columnConstraint?, valueType?];


export class ColumnsManager extends Base{
	constructor(db: BSQL3.Database, tableName: string){
		super(db);
		this.table = tableName;
	}
	public list: string[] = [];
	public table: string;
	public defaults: Data = {};
	public _s: string;

	public add(column: column): void {
		this.db.prepare(`ALTER TABLE [${this.table}] ADD COLUMN ${
			ColumnsManager.parse(column)
		}`).run();

		ColumnsManager._add(column, this);
	}

	public delete(name: string): void {
		this.db.prepare(`ALTER TABLE [${this.table}] DROP COLUMN [${name}]`).run();

		this.list.splice(this.list.indexOf(name), 1);
		this._s = this.list.join(', ');
	}

	public rename(oldName: string, newName: string): void {
		this.db.prepare(`ALTER TABLE [${this.table}] RENAME COLUMN ${oldName} TO ${newName}`).run();

		this.list[this.list.indexOf(oldName)] = newName;

		this._s = this.list.join(', ');
	}

	public static parse(column: column): string {
		if(typeof column === 'string'){
			return `[${column}]`;
		}

		return `[${column[0]}] ${column[3] ?? 'BLOB'} ${column[2] ?? ''}`;
	}

	public static _add(column: column, CM: ColumnsManager): void {
		if(typeof column === 'string'){
			CM.defaults[column] = null;
			CM.list.push(column);
		}else{
			CM.defaults[column[0]] = column[1] ?? null;
			CM.list.push(column[0]);
		}

		CM._s = CM.list.join(', ');
	}
}

export class TransactionManager extends Base{
	constructor(db: BSQL3.Database){
		super(db);

		this.db.prepare('PRAGMA foreign_keys = ON').run();
		this.statements = {
			begin:  this.db.prepare('BEGIN TRANSACTION'),
			commit: this.db.prepare('COMMIT TRANSACTION'),
			rollback: this.db.prepare('ROLLBACK TRANSACTION'),
		};
	}
	private readonly statements: Record<string, BSQL3.Statement>;

	// https://www.sqlite.org/lang_transaction.html
	// https://www.sqlite.org/lang_savepoint.html
	public begin(): void {
		this.statements.begin.run();
	}

	public commit(): void {
		this.statements.commit.run();
	}

	public savepoint(name: string): void {
		this.db.prepare(`SAVEPOINT ${name}`).run();
	}

	public deleteSavepoint(name: string): void {
		this.db.prepare(`RELEASE SAVEPOINT ${name}`).run();
	}

	public rollback(name?: string): void {
		if(name){
			this.db.prepare(`ROLLBACK TRANSACTION TO SAVEPOINT ${name}`).run();
		}else{
			this.statements.rollback.run();
		}
	}
}