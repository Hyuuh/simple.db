// eslint-disable-next-line max-classes-per-file
import * as BSQL3 from 'better-sqlite3';
import { Base, ColumnsManager, TransactionManager } from './utils';
import type { Data, condition, value } from './utils';

let lastID = 0;

class Table extends Base{
	constructor(db: BSQL3.Database, name: string){
		super(db);
		this.name = name;

		const selectAll = db.prepare(`SELECT * FROM [${name}]`);
		const columnsList = selectAll.columns().map(c => `${c.name}`);
		this.columns = new ColumnsManager(db, name, columnsList);

		const a = `(${
			columnsList.join(', ')
		}) VALUES(${
			columnsList.map(c => `@${c}`).join(', ')
		})`;

		this.statements = {
			selectAll,
			deleteAll: this.db.prepare(`DELETE FROM [${name}]`),
			insert: this.db.prepare(`INSERT INTO [${name}] ${a}`),
			insertMany: this.db.transaction(values => {
				for(const value of values) this.statements.insert.run(
					Object.assign({}, this.columns.defaultValues, value)
				);
			}),
			replace: this.db.prepare(`REPLACE INTO [${this.name}] ${a}`),
			replaceMany: this.db.transaction(values => {
				for(const value of values) this.statements.replace.run(
					Object.assign({}, this.columns.defaultValues, value)
				);
			}),
		};
	}
	public name: string;
	public columns: ColumnsManager;
	private readonly statements: {
		selectAll: BSQL3.Statement;
		deleteAll: BSQL3.Statement;
		insert: BSQL3.Statement;
		insertMany: BSQL3.Transaction;
		replace: BSQL3.Statement;
		replaceMany: BSQL3.Transaction;
	};

	public static prepareValues(values: Data, forSet?: boolean): string {
		const keys = Object.keys(values);

		if(forSet){
			return keys.map(key => `${key} = @${key}`).join(', ');
		}

		return `(${keys.join(', ')}) VALUES(${
			keys.map(k => `@${k}`).join(', ')
		})`;
	}

	private _objectifyRow(row: value[]): Data {
		return row.reduce<Data>((acc, arg, i) => {
			acc[this.columns.list[i]] = arg;
			return acc;
		}, {});
	}

	private prepareCondition(condition: condition): string {
		if(condition === null) return '1';
		if(typeof condition === 'string') return condition;

		const ID = `F${lastID++}`;

		if(lastID === Number.MAX_SAFE_INTEGER) lastID = 0;

		this.db.function(
			ID,
			{ varargs: true, directOnly: true },
			// eslint-disable-next-line @typescript-eslint/no-extra-parens
			(...args: value[]) => (
				condition(this._objectifyRow(args)) ? 1 : 0
			)
		);

		return `${ID}(${this.columns._s})`;
	}

	public insert(values: Data | Data[]): void {
		if(Array.isArray(values)){
			this.statements.insertMany(values);
		}else{
			this.statements.insert.run(
				Object.assign({}, this.columns.defaultValues, values)
			);
		}
	}

	public replace(values: Data | Data[], defaults = false): void {
		if(defaults){
			if(Array.isArray(values)){
				this.statements.replaceMany(values);
			}else{
				this.statements.replace.run(
					Object.assign({}, this.columns.defaultValues, values)
				);
			}
		}else if(Array.isArray(values)){
			this.db.transaction(() => {
				for(const vals of values) this.replace(vals);
			})();
		}else{
			this.db.prepare(`REPLACE INTO [${this.name}] ${
				Table.prepareValues(values)
			}`).run(values);
		}
	}

	public get(condition: condition = null): Data {
		if(condition === null){
			return this.statements.selectAll.get() as Data;
		}

		return this.db.prepare(
			`SELECT * FROM [${this.name}] WHERE ${this.prepareCondition(condition)}`
		).get() as Data;
	}

	public select(condition: condition = null): Data[] {
		if(condition === null){
			return this.statements.selectAll.all() as Data[];
		}

		return this.db.prepare(
			`SELECT * FROM [${this.name}] WHERE ${this.prepareCondition(condition)}`
		).all() as Data[];
	}

	public update(condition: condition, values: Data): void {
		if(condition === null){
			this.db.prepare(`UPDATE [${this.name}] SET ${
				Table.prepareValues(values, true)
			}`).run(values);
		}

		this.db.prepare(`UPDATE [${this.name}] SET ${
			Table.prepareValues(values, true)
		} WHERE ${
			this.prepareCondition(condition)
		}`).run(values);
	}

	public delete(condition: condition = null): void {
		if(condition === null){
			this.statements.deleteAll.run();
		}

		this.db.prepare(`DELETE FROM [${this.name}] WHERE ${
			this.prepareCondition(condition)
		}`).run();
	}
}

class TablesManager extends Base{
	constructor(db: BSQL3.Database){
		super(db);

		db.prepare("SELECT * FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
			.all()
			.forEach((table: { name: string }) => {
				this.list[table.name] = new Table(db, table.name);
			});
	}
	public list: Record<string, Table> = {};

	public create(
		name: string,
		columns: string[],
		defaultValues: Data = {}
	): Table {
		if(name in this.list) return this.list[name];
		if(columns.length === 0) throw new Error('columns are empty');

		this.db.prepare(`CREATE TABLE IF NOT EXISTS [${name}] (${
			columns.join(', ')
		})`).run();

		const table = new Table(this.db, name);
		Object.assign(table.columns.defaultValues, defaultValues);

		this.list[name] = table;
		return table;
	}

	public get(name: string): Table {
		return this.list[name];
	}

	public delete(name: string): void{
		this.db.prepare(`DROP TABLE IF EXISTS [${name}]`).run();
		delete this.list[name];
	}

	public rename(oldName: string, newName: string): void {
		this.db.prepare(`ALTER TABLE [${oldName}] RENAME TO [${newName}]`).run();

		this.list[newName] = this.list[oldName];
		delete this.list[oldName];
	}
}

interface Options extends BSQL3.Options {
	path?: string;
}

export default class SQLite extends Base{
	constructor(options: Options = {}){
		super(new BSQL3(options.path || './database.sqlite', options));
		this.transaction = new TransactionManager(this.db);
		this.tables = new TablesManager(this.db);
	}
	public transaction: TransactionManager;
	public tables: TablesManager;

	public pragma(str: string): unknown {
		// https://www.sqlite.org/pragma.html
		return this.db.pragma(str);
	}

	public run(str: string): unknown {
		return this.db.prepare(str).run();
	}

	public optimize(): void {
		this.pragma('optimize');
		this.run('VACUUM');
	}

	public close(): void {
		this.db.close();
	}
}

// https://www.sqlite.org/lang.html
// https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md