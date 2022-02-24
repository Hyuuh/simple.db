const Databases = require('../lib/index.js').default;
const { deepStrictEqual } = require('assert');

require('fs').unlinkSync('./test/db.sqlite');
const db = new Databases.SQLite('./test/db.sqlite');

db.optimize();

const table = db.tables.create('test', [
	'a',
	'b',
	['c', 'PRIMARY KEY ASC'],
	['d', 'NOT NULL']
]);

const values = [
	{ a: 1, b: 2, c: 3, d: 4 },
	{ a: 1, b: 2, c: 1, d: 5 },
	{ a: 1, b: 2, c: 2, d: 5 }
];

for(const value of values) table.insert(value);

deepStrictEqual(table.select(), values);
deepStrictEqual(table.select({ d: 5 }), values.filter(x => x.d === 5));

table.update({ d: 4 }, { d: 6 });
values.find(x => x.d === 4).d = 6;

deepStrictEqual(table.select('d > 3'), values.filter(x => x.d > 3));
deepStrictEqual(table.select(), values);

db.optimize();
console.log(table.select(), values)


// https://www.npmjs.com/package/tslib