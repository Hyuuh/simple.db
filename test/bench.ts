/* eslint-disable */
import { Suite } from 'benchmark';
import * as Databases from '../src/';
import { unlinkSync, existsSync } from 'fs';

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

new Suite('select')
	.add('js', () => {
		table.select((row2: Row) => row2.a < row2.b && row2.b < row2.c)
	})
	.add('sql', () => {
		table.select('a < b AND b < c')
	})
	.add('all', () => {
		table.select()
	})
	.on('start', initializeBench)
	.run();

db.transaction.begin();

new Suite('select in transaction')
	.add('js', () => {
		table.select((row2: Row) => row2.a < row2.b && row2.b < row2.c)
	})
	.add('sql', () => {
		table.select('a < b AND b < c')
	})
	.add('all', () => {
		table.select()
	})
	.on('start', initializeBench)
	.run();

db.transaction.commit();

// #endregion

// #region insert

new Suite('insert')
	.add('many (transaction)', () => {
		table.insert(values.slice(0, 10));
	})
	.add('each', () => {
		for(const value of values.slice(0, 10)){
			table.insert(value);
		}
	})
	.on('start', initializeBench)
	.run();

// #endregion

interface BenchResult {
	name: string;
	hz: string;
	runs: number;
	tolerance: number;
}

function initializeBench(){
	console.log(this.name);

	this.on('error', (event: { target: { error: Error } }) => {
		throw event.target.error;
	});
	this.on('complete', function(){
		const benchs: BenchResult[] = [];

		for(let i = 0; i < this.length; i++){
			benchs.push({
				name: this[i].name,
				hz: this[i].hz.toFixed(this[i].hz < 100 ? 2 : 0),
				runs: this[i].stats.sample.length,
				tolerance: this[i].stats.rme,
			});
		}

		const namePad = benchs.reduce((acc, curr) => {
			if(curr.name.length > acc) return curr.name.length;
			return acc;
		}, 0);
		const hzPad = benchs.reduce((acc, curr) => {
			if(curr.hz.length > acc) return curr.hz.length;
			return acc;
		}, 0);

		for(const bench of benchs){
			console.log(
				`${bench.name.padEnd(namePad, ' ')} x ${
				bench.hz.padStart(hzPad, ' ')} ops/sec \xb1${
				bench.tolerance.toFixed(2)}% (${bench.runs} runs sampled)`
			);
		}
		console.log();
	});
}

db.close();
unlinkSync('test/database.sqlite');