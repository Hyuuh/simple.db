// eslint-disable-next-line max-classes-per-file
import * as BSQL3 from 'better-sqlite3';
import { Base, ColumnsManager, TransactionManager } from './utils';
import type { Data, condition, column, value } from './utils';

interface TableStatements {
	selectAll: BSQL3.Statement;
	insert: BSQL3.Statement;
	deleteAll: BSQL3.Statement;
}

let lastID = 0;

class Table extends Base{
	constructor(db: BSQL3.Database, name: string){
		super(db);
		this.name = name;
		this.columns = new ColumnsManager(db, name);

		const selectAll = db.prepare(`SELECT * FROM [${name}]`);
		const columnsList = selectAll.columns().map(c => c.name);

		this.statements = {
			selectAll: this.db.prepare(`SELECT * FROM [${name}]`),
			insert: this.db.prepare(`INSERT INTO [${name}] (${
				columnsList.join(', ')
			}) VALUES(${
				columnsList.map(c => `@${c}`).join(', ')
			})`),
			deleteAll: this.db.prepare(`DELETE FROM [${name}]`),
		};
	}
	public name: string;
	public columns: ColumnsManager;
	private readonly statements: TableStatements;

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

	public insert(values: Data): void {
		this.statements.insert.run(
			Object.assign({}, this.columns.defaults, values)
		);
	}

	public replace(values: Data, defaults = false): void {
		this.db.prepare(`REPLACE INTO [${this.name}] ${
			Table.prepareValues(values)
		}`).run(
			defaults ?
				Object.assign({}, this.columns.defaults, values) :
				values
		);
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

	public create(name: string, columns: column[]): Table {
		if(name in this.list) return this.list[name];
		if(columns.length === 0){
			throw new Error('columns are empty');
		}

		this.db.prepare(`CREATE TABLE IF NOT EXISTS [${name}] (${
			columns.map(ColumnsManager.parse).join(', ')
		})`).run();

		const table = new Table(this.db, name);
		for(const c of columns) ColumnsManager._add(c, table.columns);

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

interface Opts extends BSQL3.Options {
	path?: string;
}

export default class SQLite extends Base{
	constructor(options: Opts = {}){
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

/*
const db = new Database({
	path: './test/database.sqlite',
});

db.tables.delete('test');
const table = db.tables.create('test', ['a', 'b', 'H', 'j', 'x']);

table.insert({ a: NaN, b: 2, H: 'hello', j: Infinity, x: 3.3123131 });

table.columns.add('c');
table.columns.rename('a', 'f');
table.columns.delete('b');

console.log(table.select());
*/

// https://www.sqlite.org/lang.html
// https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md