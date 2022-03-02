import * as Databases from '../src/';
import { createBench, existsSync, unlinkSync } from './utils';

if(existsSync('test/database.sqlite')){
	unlinkSync('test/database.sqlite');
}
const db = new Databases.SQLite({
	path: 'test/database.sqlite',
});
const table = db.tables.create('test', ['a', 'b', 'c']);
table.delete();

interface Row {
	[key: string]: number;
}

const values: Row[] = [];
for(let i = 0; i < 100; i++){
	values.push({
		a: 100 * Math.random(),
		b: 100 * Math.random(),
		c: 100 * Math.random(),
	});
}

table.insert(values);

// #region select

createBench('select')
	.add('js', () => {
		table.select((row2: Row) => row2.a < row2.b && row2.b < row2.c);
	})
	.add('sql', () => {
		table.select('a < b AND b < c');
	})
	.add('all', () => {
		table.select();
	})
	.run();

db.transaction.begin();

createBench('select in transaction')
	.add('js', () => {
		table.select((row2: Row) => row2.a < row2.b && row2.b < row2.c);
	})
	.add('sql', () => {
		table.select('a < b AND b < c');
	})
	.add('all', () => {
		table.select();
	})
	.run();

db.transaction.commit();

// #endregion

// #region insert

createBench('insert')
	.add('many (transaction)', () => {
		table.insert(values.slice(0, 10));
	})
	.add('each', () => {
		for(const value of values.slice(0, 10)){
			table.insert(value);
		}
	})
	.run();

// #endregion

db.close();
unlinkSync('test/database.sqlite');