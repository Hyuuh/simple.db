const Databases = require('../lib/index.js').default;

require('fs').unlinkSync('./test/db.sqlite');
const db = new Databases.SQLite('./test/db.sqlite');

db.optimize();

const table = db.tables.create('test', ['a', 'b', ['c', 'PRIMARY KEY ASC'], ['d', 'NOT NULL']]);

table.insert({a: 1, b: 2, c: 3, d: 4});
table.insert({a: 1, b: 2, c: 1, d: 5});
table.insert({a: 1, b: 2, c: 2, d: 5});

console.log(table.select({ d: 5 }));

table.update({ d: 4 }, { d: 6 });


console.log(table.select('d > 3'));
console.log(table.select('d > 5'));


// https://www.npmjs.com/package/tslib