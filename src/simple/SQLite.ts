let BETTER_SQLITE3_DATABASE;

try{
	BETTER_SQLITE3_DATABASE = require('better-sqlite3');
}catch(e){}

class SQLiteDatabase{
	constructor({ name, path = './simple-db.sqlite', check }){
		if(!BETTER_SQLITE3_DATABASE){
			throw new Error('You must have \'better-sqlite3\' module installed in order to use the SQLite database type');
		}

		let db;
		try{
			db = new BETTER_SQLITE3_DATABASE(path);
		}catch(e){
			throw new Error('introduced \'path\' is not valid');
		}

		try{
			db.prepare(`CREATE TABLE IF NOT EXISTS ${name}(key TEXT PRIMARY KEY, value TEXT)`).run();
		}catch(e){
			if(e.message === 'file is not a database'){
				throw new Error(`file in '${path}' is not a valid SQLite database`);
			}
			throw new Error('introduced database \'name\' is not valid (in SQLite)');
		}

		Object.assign(this, {
			check, path,
			statements: {
				set: db.prepare(`INSERT OR REPLACE INTO ${name} VALUES(?, ?)`),

				delete: db.prepare(`DELETE FROM ${name} WHERE key = ?`),
				clear: db.prepare(`DELETE FROM ${name}`),

				getAll: db.prepare(`SELECT * FROM ${name}`),
				get: db.prepare(`SELECT * FROM ${name} WHERE key = ?`),
			},
		});
	}
	path = null;
	statements = null;
	check = false;

	set(key, value){
		value = JSON.stringify(value);

		this.statements.set.run(key, value);

		if(this.check){
			const stored = this.statements.get.get(key);

			if(!stored || stored.value !== value){
				throw new Error(`a value didn't store correctly in SQLite database at '${this.path}'`);
			}
		}
	}

	delete(key){
		return this.statements.delete.run(key);
	}
	clear(){
		this.statements.clear.run();
	}

	getAll(){
		return this.statements.getAll.all()
			.reduce((acc, { key, value }) => {
				acc[key] = JSON.parse(value);

				return acc;
			}, {});
	}
	get(key){
		const entry = this.statements.get.get(key);

		if(!entry) return;

		return JSON.parse(entry.value);
	}
}

export default SQLiteDatabase;