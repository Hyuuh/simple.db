import { unlinkSync, existsSync } from 'fs';
import { Suite } from 'benchmark';
import { deepStrictEqual } from 'assert';

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

interface BenchResult {
	name: string;
	hz: string;
	runs: number;
	tolerance: number;
}

/* eslint-disable */
function createBench(name = ''){
	return new Suite()
		.on('start', () => {
			console.log(name);
		})
		.on('error', (event: { target: { error: Error } }) => {
			throw event.target.error;
		})
		.on('complete', function(){
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
		});;
}
/* eslint-enable */

export {
	createBench,
	expect,
	unlinkSync,
	existsSync
};