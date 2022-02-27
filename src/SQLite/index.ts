// eslint-disable-next-line max-classes-per-file
import * as BSQL3 from 'better-sqlite3';
import { Base, ColumnsManager, TransactionManager } from './utils';
import type { Data, condition, column } from './utils';

class Table extends Base{
	constructor(db: BSQL3.Database, name: string){
		super(db);
		this.name = name;
		this.columns = new ColumnsManager(db, name);

		const selectAll = db.prepare(`SELECT * FROM [${name}]`);
		const columnsList = selectAll.columns().map(c => c.name);
		const namedColumns = columnsList.map(column => `@${column}`).join(', ');
		// const anonymValues = columnsList.map(() => '?').join(', ');

		this.statements = {
			selectAll: this.db.prepare(`SELECT * FROM [${this.name}]`),
			select: this.db.prepare(`SELECT * FROM [${this.name}] WHERE ?`),

			insert: this.db.prepare(`INSERT INTO [${this.name}] VALUES (${namedColumns})`),
			// insertArr: this.db.prepare(`INSERT INTO [${this.name}] VALUES (${anonymValues})`),
			replace: this.db.prepare(`INSERT OR REPLACE INTO [${this.name}] VALUES (${namedColumns})`),
			// replaceArr: this.db.prepare(`INSERT OR REPLACE INTO [${this.name}] VALUES (${anonymValues})`),

			deleteAll: this.db.prepare(`DELETE FROM [${this.name}]`),
			delete: this.db.prepare(`DELETE FROM [${this.name}] WHERE ?`),

			updateAll: this.db.prepare(`UPDATE [${this.name}] SET ${
				columnsList.map(column => `${column}=?`).join(', ')
			}`),
			update: this.db.prepare(`UPDATE [${this.name}] SET ${
				columnsList.map(column => `${column}=?`).join(', ')
			} WHERE ?`),
		};
	}
	public name: string;
	public columns: ColumnsManager;
	private readonly statements: Record<string, BSQL3.Statement>;

	public static prepareCondition(condition: Data): string {
		const keys = Object.keys(condition);
		if(keys.length === 0) throw new Error('No values supplied');

		return keys.map(key => `@${key}`).join(' AND ');
	}

	private prepareValues(values: Data): Data {
		return Object.assign({}, this.columns.defaults, values);
	}

	public get(condition: condition = null): Data {
		if(condition === null){
			return this.statements.selectAll.get() as Data;
		}
		if(typeof condition === 'string'){
			return this.statements.select.get(condition) as Data;
		}

		return this.statements.select.get(
			Table.prepareCondition(condition), condition
		) as Data;
	}

	public select(condition: condition = null): Data[] {
		if(condition === null){
			return this.statements.selectAll.all() as Data[];
		}
		if(typeof condition === 'string'){
			return this.statements.select.all(condition) as Data[];
		}

		return this.statements.select.all(
			Table.prepareCondition(condition), condition
		) as Data[];
	}

	public insert(values: Data): void{
		this.statements.insert.run(
			this.prepareValues(values)
		);
	}

	public replace(values: Data): void {
		this.statements.replace.run(
			this.prepareValues(values)
		);
	}

	public update(condition: condition, newValues: Data): void {
		const v = [];

		for(const column of this.columns.list){
			v.push(column in newValues ? `@${column}` : column);
		}

		if(condition === null){
			this.statements.updateAll.run(v, newValues);
		}else if(typeof condition === 'string'){
			this.statements.update.run(v, newValues, condition);
		}else{
			this.statements.update.run(
				v, newValues,
				Table.prepareCondition(condition)
			);
		}
	}

	public delete(condition: condition = null): void {
		if(condition === null){
			this.statements.deleteAll.run();
		}else if(typeof condition === 'string'){
			this.statements.delete.run(condition);
		}else{
			this.statements.delete.run(Table.prepareCondition(condition), condition);
		}
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