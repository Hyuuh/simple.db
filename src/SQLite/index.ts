// eslint-disable-next-line max-classes-per-file
import * as BSQL3 from 'better-sqlite3';
import { Base, ColumnsManager, TransactionManager } from './utils';
import type { Data, condition, column } from './utils';

interface TableStatements {
	selectAll: BSQL3.Statement;
	insert: BSQL3.Statement;
	deleteAll: BSQL3.Statement;
}

let lastID = 0;

function parseCondition(db: BSQL3.Database, condition: condition): string {
	if(typeof condition === 'string') return condition;
	if(typeof condition === 'function'){
		const ID = lastID++;

		db.function(
			`F${ID}`,
			// @ts-expect-error error on types from @types/better-sqlite3
			{ varargs: true, deterministic: true, directOnly: true },
			// eslint-disable-next-line no-confusing-arrow
			(...args) => condition(...args) ? 1 : 0
		);

		return `${ID}()`;
	}
}

class Table extends Base{
	constructor(db: BSQL3.Database, name: string){
		super(db);
		this.name = name;
		this.columns = new ColumnsManager(db, name);

		const selectAll = db.prepare(`SELECT * FROM [${name}]`);
		const columnsList = selectAll.columns().map(c => c.name);
		const namedColumns = columnsList.map(column => `@${column}`).join(', ');

		this.statements = {
			selectAll: this.db.prepare(`SELECT * FROM [${name}]`),
			insert: this.db.prepare(`INSERT INTO [${name}] VALUES (${namedColumns})`),
			deleteAll: this.db.prepare(`DELETE FROM [${name}]`),
		};
	}
	public name: string;
	public columns: ColumnsManager;
	private readonly statements: TableStatements;

	public static prepareValues(values: Data): string {
		return Object.keys(values).map(k => `@${k}`).join(', ');
	}

	public insert(values: Data): void {
		this.statements.insert.run(
			Object.assign({}, this.columns.defaults, values)
		);
	}

	public get(condition: condition = null): Data {
		if(condition === null){
			return this.statements.selectAll.get() as Data;
		}

		const [SQL, data] = Table.parseCondition(condition);
		return this.db.prepare(`SELECT * FROM [${this.name}] WHERE ${SQL}`).get(data) as Data;
	}

	public select(condition: condition = null): Data[] {
		if(condition === null){
			return this.statements.selectAll.all() as Data[];
		}

		const [SQL, data] = Table.parseCondition(condition);
		return this.db.prepare(`SELECT * FROM [${this.name}] WHERE ${SQL}`).all(data) as Data[];
	}

	public replace(values: Data): void {
		this.db.prepare(`REPLACE INTO [${this.name}] VALUES (${
			Table.prepareValues(values)
		})`).run(values);
	}

	public update(condition: condition, values: Data): void {
		if(condition === null){
			this.db.prepare(`UPDATE [${this.name}] SET ${
				Table.prepareValues(values)
			}`).run(values);
		}

		const [SQL, data] = Table.parseCondition(condition);

		this.db.prepare(`UPDATE [${this.name}] SET ${
			Table.prepareValues(values)
		} WHERE ${SQL}`).run(values, data);
	}

	public delete(condition: condition = null): void {
		if(condition === null){
			this.statements.deleteAll.run();
		}

		const [SQL, data] = Table.parseCondition(condition);

		this.db.prepare(`DELETE FROM [${this.name}] WHERE ${SQL}`).run(data);
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
			columns.map(c => ColumnsManager.parse(c)).join(', ')
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

export default class Database extends Base{
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