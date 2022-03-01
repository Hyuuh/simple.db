/* eslint-disable no-undefined */
/* eslint no-console: "warn" */
/* eslint-env mocha */
import 'mocha';
import * as Databases from '../src/';
import { unlinkSync, existsSync } from 'fs';
import { deepStrictEqual } from 'assert';

it('sqlite', () => {
	const db = new Databases.SQLite({
		path: 'test/database.sqlite',
	});
	db.optimize();

	db.tables.delete('test');

	const table = db.tables.create('test', ['a', 'b', 'c']);

	table.insert({ a: 1, b: 2 });
	table.insert({ a: 4, b: 5, c: 6 });
	table.insert({ a: 7, b: 8, c: 9 });

	expect(table.select(row => row.a === 1), [{ a: 1, b: 2, c: null }]);

	expect(table.select('a > 3 AND a < 8'), [{ a: 4, b: 5, c: 6 }, { a: 7, b: 8, c: 9 }]);

	table.update(row => row.a === 1, { a: 10 });

	expect(table.get(row => row.a === 10), { a: 10, b: 2, c: null });

	table.delete(row => row.a === 10);

	expect(table.select(row => row.a === 1), []);
	db.close();
});

describe('simple', () => {
	function testSimple(db: Databases.SimpleJSON | Databases.SimpleSQLite): void {
		db.clear();
		expect(db.data, {});

		db.set('foo', 'bar');
		db.set('baz', {
			a: 1,
			b: [1, 2, 3],
		});

		expect(db.get('foo'), 'bar');
		expect(db.get('baz'), {
			a: 1,
			b: [1, 2, 3],
		});

		expect(db.get('baz.a'), 1);
		expect(db.get('baz.b.2'), 3);

		expect(() => db.delete('baz.b.2'));
		expect(db.get('baz.b.2'), 3);

		db.delete('baz.a');
		expect(db.get('baz.a'), undefined);

		db.set('baz.b.1', 'foo');
		expect(db.get('baz'), { b: [1, 'foo', 3] });

		db.clear();
		expect(db.data, {});
		if('close' in db) db.close();
	}

	it('sqlite', () => {
		const db = new Databases.simple.SQLite({
			path: 'test/simple-db.sqlite',
		});

		testSimple(db);
	});

	it('json', () => {
		const db = new Databases.simple.JSON({
			path: 'test/simple-db.json',
		});

		testSimple(db);
	});
});

after(() => {
	for(const path of [
		'test/simple-db.json',
		'test/simple-db.sqlite',
		'test/database.sqlite',
	]){
		if(existsSync(path)) unlinkSync(path);
	}
});

function expect(value: unknown, expectedValue?: unknown): void {
	if(typeof value === 'function'){
		let hadError = false;
		try{
			value();
		}catch(e){
			hadError = true;
		}

		if(!hadError){
			throw new Error('expected function to throw an error');
		}
	}else{
		deepStrictEqual(value, expectedValue);
	}
}