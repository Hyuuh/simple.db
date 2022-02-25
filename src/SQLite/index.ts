import * as BETTER_SQLITE3 from 'better-sqlite3';
import type { Database, Options } from 'better-sqlite3';
import type { column } from './utils';
import { Base, ColumnsManager, TransactionManager } from './utils';

type value = number | string | bigint | Buffer | null;
type valuesObj = Record<string, value>;
type condition = string | valuesObj;

class Table extends Base{
	constructor(db: Database, name: string){
		super(db);
		this.name = name;
		this.columns = new ColumnsManager(db, name);
	}

	public name: string;
	public columns: ColumnsManager;

	public static prepareValues(values: valuesObj): string[]{
		const keys = Object.keys(values);

		if(keys.length === 0) throw new Error('No values supplied');

		return keys.map(key => `[${key}] = ${values[key]}`);
	}

	public static prepareCondition(condition: condition): string{
		if(typeof condition === 'string') return condition;

		return Table.prepareValues(condition).join(' AND ');
	}

	public get(condition: condition = ''): valuesObj {
		if(typeof condition === 'string'){
			return this.db.prepare(`SELECT * FROM [${this.name}]`).get() as valuesObj;
		}
		return this.db.prepare(`SELECT * FROM [${this.name}] WHERE ${
			Table.prepareCondition(condition)
		}`).get() as valuesObj;
	}

	public select(condition: condition = ''): valuesObj[] {
		if(typeof condition === 'string'){
			return this.db.prepare(`SELECT * FROM [${this.name}]`).all() as valuesObj[];
		}
		return this.db.prepare(`SELECT * FROM [${this.name}] WHERE ${
			Table.prepareCondition(condition)
		}`).all() as valuesObj[];
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

	public update(condition: condition, newValues: valuesObj): void {
		this.db.prepare(`UPDATE [${this.name}] SET ${
			Table.prepareValues(newValues).join(', ')
		} WHERE ${
			Table.prepareCondition(condition)
		}`).run(newValues);
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

	public delete(condition: condition): void {
		this.db.prepare(`DELETE FROM [${this.name}] WHERE ${
			Table.prepareCondition(condition)
		}`).run();
	}
}

class TablesManager extends Base{
	public list: Record<string, Table> = {};

	public create(name: string, columns: column[] | string): void {
		if(name in this.list) return;

		this.db.prepare(`CREATE TABLE IF NOT EXISTS [${name}] (${
			ColumnsManager.parse(columns)
		})`).run();

		this.list[name] = new Table(this.db, name);
	}

	public delete(name: string): void{
		if(name in this.list){
			this.db.prepare(`DROP TABLE IF EXISTS [${name}]`).run();
			delete this.list[name];
		}
	}

	public rename(oldName: string, newName: string): void{
		this.db.prepare(`ALTER TABLE [${oldName}] RENAME TO [${newName}]`).run();
	}
}

export default class Main extends Base{
	constructor(path: string, options?: Options){
		super(new BETTER_SQLITE3(path, options));
		this.transaction = new TransactionManager(this.db);
		this.tables = new TablesManager(this.db);
	}
	public transaction: TransactionManager;
	public tables: TablesManager;

	public optimize(): void{
		this.pragma('optimize');
		this.run('VACUUM');
	}

	// https://www.sqlite.org/pragma.html
	public pragma(str: string): unknown{
		return this.db.pragma(str);
	}

	public run(str: string): unknown{
		return this.db.prepare(str).run();
	}
}

// https://www.sqlite.org/lang.html
// https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md