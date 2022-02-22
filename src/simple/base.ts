export type Value = string | number | boolean | Data;
export type Data = { [x: string]: Value; } | Value[];

export type cacheTypes = 0 | 1 | 2;

export type RawOptions = {
	cacheType?: cacheTypes;
	path?: string;
	check?: boolean;
	name?: string;
} | string;

class NumberUtils{
	constructor(db: Base){
		this.db = db;
	}
	db: Base = null;

	add(key: string, Value: number): number {
		if(typeof Value !== 'number' || isNaN(Value)){
			throw new Error('\'Value\' must be a number');
		}
		let num = this.db.get(key);

		if(typeof num === 'undefined'){
			num = 0;
		}else if(typeof num !== 'number' || isNaN(num)){
			throw new Error(`data stored in the key '${key}' is not an number`);
		}

		num += Value;

		this.db.set(key, num);

		return num;
	}

	subtract(key: string, Value: number): number {
		return this.add(key, -Value);
	}
}

class ArrayUtils{
	constructor(db: Base){
		this.db = db;
	}
	db: Base = null;

	_getArray(key: string): Value[] {
		const arr = this.db.get(key);

		if(!Array.isArray(arr)){
			throw new Error(`data stored in the key '${key}' is not an array`);
		}

		return arr;
	}

	push(key: string, ...values: Value[]): Value[] {
		let arr = this.db.get(key);

		if(typeof arr === 'undefined' || arr === null){
			arr = values;
		}else{
			if(!Array.isArray(arr)){
				throw new Error(`Value stored in '${key}' is not an array`);
			}
			arr.push(...values);
		}

		this.db.set(key, arr);

		return arr;
	}

	extract(
		key: string,
		index: number | string | (
			(value: Value, index: number, obj: Value[]) => unknown
		)
	): Value {
		const arr = this.db.get(key);

		if(typeof arr === 'undefined') return;
		if(!Array.isArray(arr)){
			throw new Error(`data stored in the key '${key}' is not an array`);
		}

		if(typeof index === 'function'){
			index = arr.findIndex(index);
		}else if(typeof index === 'string'){
			index = arr.indexOf(index);
		}

		if(typeof index !== 'number'){
			throw new Error('\'index\' must be a number or a function that returns a number or a string in the array');
		}
		if(index === -1) return;

		const [Value] = arr.splice(index, 1);

		this.db.set(key, arr);

		return Value;
	}

	// from here methods throw an error if the array does not exists

	splice(
		key: string,
		start: number,
		deleteCount: number,
		...items: Value[]
	){
		const arr = this._getArray(key);
		const values = arr.splice(start, deleteCount, ...items);

		this.db.set(key, arr);

		return values;
	}

	random(key: string): Value {
		const arr = this._getArray(key);
		return arr[Math.floor(Math.random() * arr.length)];
	}

	// from here methods throw an error if the array does not exists

	includes(
		key: string,
		searchElement: Value,
		fromIndex?: number
	): boolean {
		return this._getArray(key).includes(searchElement, fromIndex);
	}

	find(
		key: string,
		callback: (value: any, index: number, obj: any[]) => unknown,
		thisArg?: any
	){
		return this._getArray(key).find(callback, thisArg);
	}

	findIndex(
		key: string,
		callback: (value: any, index: number, obj: any[]) => unknown,
		thisArg?: any
	){
		return this._getArray(key).findIndex(callback, thisArg);
	}

	sort(
		key: string,
		compareFn?: (a: Value, b: Value) => number
	): Value[] {
		return this._getArray(key).sort(compareFn);
	}

	reduce(
        key: string,
        callback: (previousValue: any, currentValue: Value, currentIndex: number, array: any[]) => any,
        initialValue: any
    ): any {
		return this._getArray(key).reduce(callback, initialValue);
	}

	filter(
		key: string,
		callback: (value: any, index: number, obj: any[]) => unknown,
		thisArg?: any
	){
		return this._getArray(key).filter(callback, thisArg);
	}

	map(
		key: string,
		callback: (value: any, index: number, obj: any[]) => unknown,
		thisArg?: any
	){
		return this._getArray(key).map(callback, thisArg);
	}

	some(
		key: string,
		callback: (value: any, index: number, obj: any[]) => unknown,
		thisArg?: any
	){
		return this._getArray(key).some(callback, thisArg);
	}

	every(
		key: string,
		callback: (value: any, index: number, obj: any[]) => unknown,
		thisArg?: any
	){
		return this._getArray(key).every(callback, thisArg);
	}
}

export default abstract class Base{
	constructor(){
		this.array = new ArrayUtils(this);
		this.number = new NumberUtils(this);
	}
	_cache: Data = {};
	_cacheType: cacheTypes = 0;

	abstract get data(): Data;
	get keys(): string[] {
		return Object.keys(this.data);
	}
	get values(): Value[] {
		return Object.values(this.data);
	}
	get entries(): [string, Value][] {
		return Object.entries(this.data);
	}

	abstract get(key: string): Value;
	abstract set(key: string, value: Value): void;
	abstract delete(key: string): void;
	abstract clear(): void;

	array: ArrayUtils = null;
	number: NumberUtils = null;

	toJSON(indentation: string = null): string {
		return JSON.stringify(this.data, null, indentation);
	}
}

const regex = /\[(.*?)\]|[^.[]+/g;
export const obj = {
	get(obj: any, props: string[]): any {
		if(props.length === 0) return obj;

		return props.reduce((acc: Value, prop: string, i: number) => {
			if(typeof acc !== 'object' || acc === null){
				throw new Error(`Value at ${props.slice(0, i).join('.')} is not an object`);
			}
			if(!(prop in acc)){
				return undefined;
			}

			return acc[prop];
		}, obj);
	},
	set(obj: any, props: string[], value: Value = null): any {
		if(props.length === 0) return;

		props.reduce((acc: Value, prop: string, index: number) => {
			if(acc == undefined) return undefined;

			if(acc[prop] === undefined){
				acc[prop] = {};
			}
			if(index === props.length - 1){
				acc[prop] = value;
			}

			return acc[prop];
		}, obj);

		return obj;
	},
	delete(obj: any, props: string[]): void {
		const key = props.pop();
		obj = this.get(obj, props);

		if(obj == undefined) return;

		delete obj[key];
	},
	clone(obj: any): any {
		try{
			return JSON.parse(
				JSON.stringify(obj)
			);
		}catch(e){
			return undefined;
		}
	},
	parseKey(key: string): string[] {
		key = key.trim();

		if(typeof key !== 'string'){
			throw new Error('\'key\' must be a string');
		}else if(key.match(/\.{2,}|^\.|\.$/) || key === ''){
			throw new Error('\'key\' is not valid');
		}

		return key.split('.');
	},
};


/*
database
	|--get*
	|--set*
	|--delete*
	|--clear*
	|--array
	|    |--push*
	|    |--extract*
	|    |--splice*
	|    |--includes
	|    |--find
	|    |--findIndex
	|    |--filter
	|    |--map
	|    |--sort
	|    |--some
	|    |--every
	|    |--reduce
	|    |--random
	|
	|--number
	|    |--add*
	|    |--subtract*
	|
	|--keys
	|--values
	|--entries
*/