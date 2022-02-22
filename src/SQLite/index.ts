import * as BETTER_SQLITE3 from 'better-sqlite3';
import { Database, Options } from 'better-sqlite3';

class Base{
	constructor(db: Database){
		this.db = db;
	}
	protected readonly db: Database;
}

class ColumnsManager extends Base{
	constructor(db: Database){
		super(db);

	}
}

class Table extends Base{
	constructor(db: Database){
		super(db);
	}
}

export default class TableManager extends Base{
	constructor(path: string, options?: Options){
		super(new BETTER_SQLITE3(path, options));

	}
	db: Database = null;

	create(name: string, columns): void {

	}

	delete(name: string): void {

	}

	get(name: string): Table {

	}
}