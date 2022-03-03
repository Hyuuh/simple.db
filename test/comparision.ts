/* eslint-disable */
import * as Databases from '../src/';
// @ts-expect-error megadb has no types
import * as MegaDB from 'megadb';
import * as quickdb from 'quick.db';
import { createBench } from './utils';

function randomString(): string {
	return Math.floor(
		Math.random() * 100000000000000000
	).toString(32);
}

interface value {
	[key: string]: string[] | {
		[key: string]: number | boolean | string;
	}
}

const entries: Array<[string, value]> = [];
for(let i = 0; i < 1000; i++){
	entries.push([
		randomString(),
		{
			[randomString()]: {
				[randomString()]: 1234,
				[randomString()]: false,
				[randomString()]: randomString(),
			},
			[randomString()]: [
				randomString(),
				randomString(),
				randomString(),
			],
		},
	]);
}

const megadb = new MegaDB.crearDB('megadb', './test');
const simpleSQLite = new Databases.SimpleSQLite('./test/simple-db.sqlite');
const simpleJSON = new Databases.SimpleJSON('./test/simple-db.json');

/*
simple.JSON
set    x 0.15 ops/sec ±5.88% (5 runs sampled)
get    x 4041 ops/sec ±2.03% (81 runs sampled)
delete x 0.73 ops/sec ±12.51% (7 runs sampled)

megadb
set    x 0.13 ops/sec ±8.51% (5 runs sampled)
get    x 1628 ops/sec ±1.99% (88 runs sampled)
delete x 1733 ops/sec ±1.60% (87 runs sampled)

simple.SQLite
set    x 11.58 ops/sec ±2.97% (34 runs sampled)
get    x  4473 ops/sec ±3.32% (87 runs sampled)
delete x 13.36 ops/sec ±6.06% (37 runs sampled)

quick.db
set    x 2.40 ops/sec ±2.26% (11 runs sampled)
get    x 6.30 ops/sec ±0.98% (20 runs sampled)
delete x 8.51 ops/sec ±1.54% (26 runs sampled)
*/

createBench('simple.JSON')
	.add('set', () => {
		for(const [key, value] of entries){
			simpleJSON.set(key, value);
		}
	})
	.add('get', () => {
		for(const [key] of entries){
			simpleJSON.get(key);
		}
	})
	.add('delete', () => {
		for(const [key] of entries){
			simpleJSON.delete(key);
		}
	})
	.run();

createBench('megadb')
	.add('set', () => {
		for(const [key, value] of entries){
			megadb.establecer(key, value);
		}
	})
	.add('get', () => {
		for(const [key] of entries){
			megadb.obtener(key);
		}
	})
	.add('delete', () => {
		for(const [key] of entries){
			megadb.eliminar(key);
		}
	})
	.run();

createBench('simple.SQLite')
	.add('set', () => {
		for(const [key, value] of entries){
			simpleSQLite.set(key, value);
		}
	})
	.add('get', () => {
		for(const [key] of entries){
			simpleSQLite.get(key);
		}
	})
	.add('delete', () => {
		for(const [key] of entries){
			simpleSQLite.delete(key);
		}
	})
	.run();

createBench('quick.db')
	.add('set', () => {
		for(const [key, value] of entries){
			quickdb.set(key, value);
		}
	})
	.add('get', () => {
		for(const [key] of entries){
			quickdb.get(key);
		}
	})
	.add('delete', () => {
		for(const [key] of entries){
			quickdb.delete(key);
		}
	})
	.run();

// https://www.npmjs.com/package/megadb
// https://www.npmjs.com/package/quick.db

/*
const db = require('quick.db');
 
// Setting an object in the database:
db.set('userInfo', { difficulty: 'Easy' })
// -> { difficulty: 'Easy' }
 
// Pushing an element to an array (that doesn't exist yet) in an object:
db.push('userInfo.items', 'Sword')
// -> { difficulty: 'Easy', items: ['Sword'] }
 
// Adding to a number (that doesn't exist yet) in an object:
db.add('userInfo.balance', 500)
// -> { difficulty: 'Easy', items: ['Sword'], balance: 500 }
 
// Repeating previous examples:
db.push('userInfo.items', 'Watch')
// -> { difficulty: 'Easy', items: ['Sword', 'Watch'], balance: 500 }
db.add('userInfo.balance', 500)
// -> { difficulty: 'Easy', items: ['Sword', 'Watch'], balance: 1000 }
 
// Fetching individual properties
db.get('userInfo.balance') // -> 1000
db.get('userInfo.items') // ['Sword', 'Watch']
*/