/* eslint-disable no-undefined */
/* eslint no-console: "warn" */
/* eslint-env mocha */
import 'mocha';
import * as Databases from '../src/';
import { expect, existsSync, unlinkSync } from './utils';

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


		// number utils
		db.set('asd.xd', 123);
		db.number.add('asd.xd', 10);
		db.number.subtract('asd.xd', 3);

		expect(db.values[2], { xd: 130 });

		// array utils

		db.array.push('t', 1, 2, 3, 4, 5);
		expect(
			db.array.extract('t', (v: number) => v > 3),
			4
		);

		db.array.splice('t', 1, 2, 'foo', 'bar');
		expect(db.get('t'), [1, 'foo', 'bar', 5]);

		// @ts-expect-error db.array.random() may return undefined
		if(![1, 'foo', 'bar', 5].includes(db.array.random('t'))){
			throw new Error('expected db.array.random() to return one of the values of the array');
		}

		// from here all the other methods are from Array.prototype if there was no error already, there won't be

		// end

		db.clear();
		expect(db.data, {});
		if('close' in db) db.close();
	}

	it('sqlite', () => {
		const db = new Databases.simple.SQLite('test/simple-db.sqlite');

		testSimple(db);
	});

	it('json', () => {
		const db = new Databases.simple.JSON('test/simple-db.json');

		testSimple(db);
	});
});

after(async () => {
	await new Promise(res => {
		setTimeout(res, 1000);
	});

	for(const path of [
		'test/simple-db.json',
		'test/simple-db.sqlite',
		'test/database.sqlite',
	]){
		if(existsSync(path)) unlinkSync(path);
	}
});