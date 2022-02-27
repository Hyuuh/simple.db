import * as BETTER_SQLITE3 from 'better-sqlite3';
import type { Database as BETTER_SQLITE3_DATABASE, Options } from 'better-sqlite3';
import { Base, ColumnsManager, TransactionManager } from './utils';
import type { column } from './utils';

type value = Buffer | bigint | number | string | null;
interface valuesObj {
	[key: string | number]: value
}
type condition = valuesObj | string;

class Table extends Base{
	constructor(db: BETTER_SQLITE3_DATABASE, name: string){
		super(db);
		this.name = name;
		this.columns = new ColumnsManager(db, name);
	}
	public name: string;
	public columns: ColumnsManager;

	public static prepareValues(values: valuesObj): string[] {
		const keys = Object.keys(values);

		if(keys.length === 0) throw new Error('No values supplied');

		return keys.map(key => `@${key}`);
	}

	public static prepareCondition(condition: condition): string {
		if(typeof condition === 'string') return condition;

		return Table.prepareValues(condition).join(' AND ');
	}

	public get(condition: condition = ''): valuesObj {
		if(typeof condition === 'string'){
			if(condition === ''){
				return this.db.prepare(`SELECT * FROM [${this.name}]`).get() as valuesObj;
			}
			return this.db.prepare(`SELECT * FROM [${this.name}] WHERE ${condition}`).get() as valuesObj;
		}

		return this.db.prepare(`SELECT * FROM [${this.name}] WHERE ${
			Table.prepareCondition(condition)
		}`).get(condition) as valuesObj;
	}

	public select(condition: condition = ''): valuesObj[] {
		if(typeof condition === 'string'){
			return this.db.prepare(`SELECT * FROM [${this.name}]`).all() as valuesObj[];
		}
		return this.db.prepare(`SELECT * FROM [${this.name}] WHERE ${
			Table.prepareCondition(condition)
		}`).all(condition) as valuesObj[];
	}

	public insert(values: value[] | valuesObj): void{
		if(Array.isArray(values)){
			this.db.prepare(`INSERT INTO [${this.name}] VALUES (${
				values.map(() => '?').join(', ')
			})`).run(values);
		}else{
			const keys = Object.keys(values);
			this.db.prepare(`INSERT INTO [${this.name}] (${
				keys.join(', ')
			}) VALUES (${
				keys.map(key => `@${key}`).join(', ')
			})`).run(values);
		}
	}

	public replace(condition: condition, values: value[] | valuesObj): void {
		if(Array.isArray(values)){
			this.db.prepare(`REPLACE INTO [${this.name}] VALUES (${
				values.map(() => '?').join(', ')
			}) WHERE ${
				Table.prepareCondition(condition)
			}`).run(values);
		}else{
			this.db.prepare(`REPLACE INTO [${this.name}] (${
				Object.keys(values).join(', ')
			}) VALUES (${
				Object.keys(values).map(key => `@${key}`).join(', ')
			}) WHERE ${
				Table.prepareCondition(condition)
			}`).run(values);
		}
	}

	public update(condition: condition, newValues: valuesObj): void {
		this.db.prepare(`UPDATE [${this.name}] SET ${
			Object.keys(newValues).map(key => `@${key}`).join(', ')
		} WHERE ${
			Table.prepareCondition(condition)
		}`).run(newValues);
	}

	public delete(condition: condition): void {
		this.db.prepare(`DELETE FROM [${this.name}] WHERE ${
			Table.prepareCondition(condition)
		}`).run();
	}

	public clear(): void {
		this.db.prepare(`DELETE FROM [${this.name}]`).run();
	}
}

class TablesManager extends Base{
	constructor(db: BETTER_SQLITE3_DATABASE){
		super(db);

		db.prepare("SELECT * FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
			.all()
			.forEach((table: { name: string }) => {
				this.list[table.name] = new Table(db, table.name);
			});
	}
	public list: Record<string, Table> = {};

	public create(name: string, columns: column[] | string): Table {
		if(name in this.list) return this.list[name];
		if(columns.length === 0){
			throw new Error('columns are empty');
		}

		this.db.prepare(`CREATE TABLE IF NOT EXISTS [${name}] (${
			typeof columns === 'string' ? columns :
				columns.map(ColumnsManager.parse).join(', ')
		})`).run();

		this.list[name] = new Table(this.db, name);
		return this.list[name];
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

interface Opts extends Options {
	path?: string;
}

export default class Database extends Base{
	constructor(options: Opts = {}){
		super(new BETTER_SQLITE3(options.path || './database.sqlite', options));
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