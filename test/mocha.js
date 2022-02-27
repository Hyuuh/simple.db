/* eslint-env mocha */

// @ts-ignore
const Databases = require('../').default;
const { unlinkSync } = require('fs');
const { deepStrictEqual } = require('assert');

if(typeof it === 'undefined'){
	eval('function it(){}')
	eval('function describe(){}')
}

it('sqlite', () => {
	const db = new Databases.SQLite({
		path: 'test/database.sqlite',
	});

	db.tables.delete('test');
	db.tables.create('test', ['a', 'b', 'c']);

	const table = db.tables.list.test;

	table.insert({ a: 1, b: 2, c: 3 });
	table.insert({ a: 4, b: 5, c: 6 });
	table.insert({ a: 7, b: 8, c: 9 });

	expect(table.select({ a: 1 }), [{ a: 1, b: 2, c: 3 }]);

	expect(table.select('a > 3 AND a < 8'), [{ a: 4, b: 5, c: 6 }, { a: 7, b: 8, c: 9 }]);

	table.update({ a: 1 }, { a: 10 });

	expect(table.select({ a: 1 }), [{ a: 10, b: 2, c: 3 }]);

	table.delete({ a: 10 });

	expect(table.select({ a: 1 }), []);
});

function testSimple(db){
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

	expect(() => db.delete('baz.b.2')).toThrow();
	expect(db.get('baz.b.2'), 3);

	db.delete('baz.a');
	expect(db.get('baz.a'), undefined);

	db.set('baz.b.1', 'foo');
	expect(db.get('baz'), { b: [1, 'foo', 3] });

	db.clear();
	expect(db.data, {});
}
describe('simple', () => {
	it('json', () => {
		const db = new Databases.simple.JSON({
			path: 'test/simple-db.json',
		});
		
		testSimple(db);
	});

	it('sqlite', () => {
		const db = new Databases.simple.SQLite({
			path: 'test/simple-db.sqlite',
		});
		
		testSimple(db);
	});
});

function expect(value, expectedValue){
	if(typeof value === 'function'){
		return {
			toThrow(){
				let hadError = false;
				try{
					value();
				}catch(e){
					hadError = true;
				}

				if(!hadError){
					throw new Error('expected function to throw an error');
				}
			},
			toBe(){
				deepStrictEqual(value(), expectedValue);
			}
		}
	}

	deepStrictEqual(value, expectedValue);
}

const db = new Databases.simple.SQLite({
	path: 'simple-db.sqlite',
});

console.log(
	db.db.prepare('SELECT * FROM [simple-db] WHERE ?').columns().map(c => c.name).join(', ')
)

