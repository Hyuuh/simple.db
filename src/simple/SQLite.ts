import Base, { Options, value, key, objectUtils } from './base';
import * as BETTER_SQLITE3_DATABASE from 'better-sqlite3';

class SQLiteDatabase extends Base{
	constructor(options: Options){
		super(options);
		if(!BETTER_SQLITE3_DATABASE){
			throw new Error('You must have \'better-sqlite3\' module installed in order to use the SQLite database type');
		}

		let db;
		try{
			db = new BETTER_SQLITE3_DATABASE(options.path);
		}catch(e){
			throw new Error('introduced \'path\' is not valid');
		}

		try{
			db.prepare(`CREATE TABLE IF NOT EXISTS ${options.name}(key TEXT PRIMARY KEY, value TEXT)`).run();
		}catch(e){
			if(e.message === 'file is not a database'){
				throw new Error(`file in '${options.path}' is not a valid SQLite database`);
			}
			throw new Error('introduced database \'name\' is not valid (in SQLite)');
		}

		Object.assign(this, {
			check: options.check,
			path: options.path,
			statements: {
				set: db.prepare(`INSERT OR REPLACE INTO ${options.name} VALUES(?, ?)`),

				delete: db.prepare(`DELETE FROM ${options.name} WHERE key = ?`),
				clear: db.prepare(`DELETE FROM ${options.name}`),

				getAll: db.prepare(`SELECT * FROM ${options.name}`),
				get: db.prepare(`SELECT * FROM ${options.name} WHERE key = ?`),
			},
		});
	}
	path: string = null;
	statements = null;
	check = false;

	get data(): Record<string, value> {
		return this.statements.getAll.all()
			.reduce((acc: , { key, value }) => {
				acc[key] = JSON.parse(value);

				return acc;
			}, {});
	}
	set(key: key, value: value){
		value = JSON.stringify(value);

		this.statements.set.run(key, value);

		if(this.check){
			const stored = this.statements.get.get(key);

			if(!stored || stored.value !== value){
				throw new Error(`a value didn't store correctly in SQLite database at '${this.path}'`);
			}
		}
	}
	delete(key: key){
		return this.statements.delete.run(key);
	}
	clear(){
		this.statements.clear.run();
	}
	get(key: key){
		const entry = this.statements.get.get(key);

		if(!entry) return;

		return JSON.parse(entry.value);
	}
}

export default SQLiteDatabase;