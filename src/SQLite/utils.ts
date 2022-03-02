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

export class ColumnsManager extends Base{
	constructor(db: BSQL3.Database, tableName: string, list: string[]){
		super(db);
		this.table = tableName;

		for(const column of list){
			if(!(column in this.defaultValues)){
				this.defaultValues[column] = null;
			}
		}

		this.list = list;
		this._s = list.join(', ');
	}
	private readonly table: string;
	public list: string[] = [];
	public defaultValues: Data = {};
	public _s: string;

	public add(column: string, defaultValue: value = null): void {
		this.db.prepare(`ALTER TABLE [${this.table}] ADD COLUMN ${column}`).run();

		this.defaultValues[column] = defaultValue;
		this.list.push(column);

		this._s = this.list.join(', ');
	}

	public delete(name: string): void {
		if(!this.list.includes(name)){
			throw new Error(`Column '${name}' not found.`);
		}
		this.db.prepare(`ALTER TABLE [${this.table}] DROP COLUMN [${name}]`).run();

		this.list.splice(this.list.indexOf(name), 1);
		delete this.defaultValues[name];
		this._s = this.list.join(', ');
	}

	public rename(oldName: string, newName: string): void {
		this.db.prepare(`ALTER TABLE [${this.table}] RENAME COLUMN ${oldName} TO ${newName}`).run();

		this.defaultValues[newName] = this.defaultValues[oldName];
		delete this.defaultValues[oldName];

		this.list[this.list.indexOf(oldName)] = newName;
		this._s = this.list.join(', ');
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