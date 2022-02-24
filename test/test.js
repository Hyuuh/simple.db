const Databases = require('../lib/index.js').default;
const { deepStrictEqual } = require('assert');

require('fs').unlinkSync('./test/db.sqlite');
const db = new Databases.SQLite('./test/db.sqlite');

db.optimize();

const table = db.tables.create('test', [
	'a',
	['b', 'PRIMARY KEY ASC'],
	'c',
	['d', 'NOT NULL']
]);

const values = [
	{ a: 'ABC', b: 3, c: 4, d: 0 },
	{ a: 'DEF', b: 1, c: 5, d: Buffer.from([0xFF, 0XFF]) },
	{ a: null , b: 2, c: 5, d: -3}
];

for(const value of values){
	table.insert(value);
}

console.log(table.select({ c: 5 }));

table.update({ c: 5 }, { d: 300 });

console.log(table.select())

console.log(table.select('b > 2'))

table.columns.add('f');
table.columns.rename('f', 'g');
console.log(table.get())
table.columns.remove('g');

// https://www.npmjs.com/package/tslib