type key = string; // `${string}${'' | `.${key}`}`;
type value = any; // string | number | boolean | null | undefined | Record<string, value> | Array<value>;

type cacheTypes = 0 | 1 | 2;

class NumberUtils{
	constructor(db: Base){
		this.db = db;
	}
	db: Base = null;

	add(key: key, value: number): number {
		if(typeof value !== 'number' || isNaN(value)){
			throw new Error('\'value\' must be a number');
		}
		let num = this.db.get(key);

		if(typeof num === 'undefined'){
			num = 0;
		}else if(typeof num !== 'number' || isNaN(num)){
			throw new Error(`data stored in the key '${key}' is not an number`);
		}

		num += value;

		this.db.set(key: key, num);

		return num;
	}

	subtract(key: key, value: number): number {
		return this.add(key: key, -value);
	}
}

class ArrayUtils{
	constructor(db: Base){
		this.db = db;
	}
	db: Base = null;

	_getArray(key: key): value[] {
		const arr = this.db.get(key);

		if(!Array.isArray(arr)){
			throw new Error(`data stored in the key '${key}' is not an array`);
		}

		return arr;
	}

	push(key: key, ...values: value[]): number {
		let arr = this.db.get(key);

		if(typeof arr === 'undefined' || arr === null){
			arr = values;
		}else{
			if(!Array.isArray(arr)){
				throw new Error(`value stored in '${key}' is not an array`);
			}
			arr.push(...values);
		}

		this.db.set(key: key, arr);

		return arr;
	}

	extract(key: key, index: number | string | function): value {
		const arr = this.db.get(key);

		if(typeof arr === 'undefined') return;

		if(typeof index === 'function'){
			index = arr.findIndex(index);
		}else if(typeof index === 'string'){
			index = arr.indexOf(index);
		}

		if(typeof index !== 'number'){
			throw new Error('\'index\' must be a number or a function that returns a number or a string in the array');
		}
		if(index === -1) return;

		const [value] = arr.splice(index, 1);

		this.db.set(key: key, arr);

		return value;
	}

	// from here methods throw an error if the array does not exists

	splice(key: key, start: number, deleteCount: number, ...items: value[]){
		const arr = this._getArray(key);
		const values = arr.splice(start, deleteCount, ...items);

		this.db.set(key: key, arr);

		return values;
	}

	random(key: key): value {
		const arr = this._getArray(key);
		return arr[Math.floor(Math.random() * arr.length)];
	}

	// from here methods throw an error if the array does not exists

	includes(key: key, searchElement: any, fromIndex?: number): boolean {
		return this._getArray(key).includes(searchElement, fromIndex);
	}

	sort(key: key, compareFunction){
		return this._getArray(key).sort(compareFunction);
	}

	reduce(
        key: key,
        callback: (previousValue: any, currentValue: value, currentIndex: number, array: any[]) => any,
        initialValue: any
    ): any{
		return this._getArray(key).reduce(callback, initialValue);
	}

	find(key: key, callback, thisArg?: any){
		return this._getArray(key).find(callback, thisArg);
	}

	findIndex(key: key, callback, thisArg?: any){
		return this._getArray(key).findIndex(callback, thisArg);
	}

	filter(key: key, callback, thisArg?: any){
		return this._getArray(key).filter(callback, thisArg);
	}

	map(key: key, callback, thisArg?: any){
		return this._getArray(key).map(callback, thisArg);
	}

	some(key: key, callback, thisArg?: any){
		return this._getArray(key).some(callback, thisArg);
	}

	every(key: key, callback, thisArg?: any){
		return this._getArray(key).every(callback, thisArg);
	}
}

const regex = /\[(.*?)\]|[^.[]+/g;
const obj = {
	get(obj, props){
		if(props.length === 0){
			return obj;
		}

		return props.reduce((acc, prop) => {
			if(acc == undefined || acc[prop] == undefined){
				return undefined;
			}

			return acc[prop];
		}, obj);
	},
	set(obj, props, value = null){
		if(props.length === 0){
			return value;
		}

		props.reduce((acc, prop, index) => {
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
	delete(obj, props){
		const key = props.pop();
		obj = this.get(obj, props);

		if(obj == undefined) return;

		delete obj[key];
	},
	clone(obj){
		try{
			return JSON.parse(
				JSON.stringify(obj)
			);
		}catch(e){
			return undefined;
		}
	},
	parseKey(key){
		key = key.trim();

		if(typeof key !== 'string'){
			throw new Error('\'key\' must be a string');
		}else if(key.match(/\.{2,}|^\.|\.$/) || key === ''){
			throw new Error('\'key\' is not valid');
		}

		const props = [];

		for(let i = 0; i < key.length; i++){
			
		}

		return key.split('.');
	},
};

type Options = {
	cacheType?: 0 | 1 | 2;
	check?: boolean;
	path?: string;
	name?: string;
} | undefined;

abstract class Base{
	constructor(options: Options){
		options = parseOptions(options);

		Object.assign(this, {
			_cacheType: options.cacheType,
			array: new ArrayUtils(this),
			number: new NumberUtils(this),
		});

		// if(this._cacheType > 0) this._cache = this.data;
	}
	_cache = {};
	_cacheType: cacheTypes = 0;
	path: string = null;
	check = false;

	abstract get data(): Record<string, value>;
	get keys(): string[] {
		return Object.keys(this.data);
	}
	get values(): value[] {
		return Object.values(this.data);
	}
	get entries(): [string, value][] {
		return Object.entries(this.data);
	}

	abstract get(key: key): value;
	abstract set(key: key, value: value): void;
	abstract delete(key: key): void;
	abstract clear(): void;

	array: NumberUtils = null;
	number: ArrayUtils = null;

	toJSON(indentation: string = null): string {
		return JSON.stringify(this.data, null, indentation);
	}
}

export default Base;
export { key, value, Options, obj }

function parseOptions(options: Options = {}){
	if(typeof options !== 'object'){
		throw new Error('the database options should be an object or a string with the path');
	}

	const { cacheType = 0, check = false, path } = options;

	if(typeof cacheType !== 'number' || isNaN(cacheType)){
		throw new Error('\'cacheType\' should be a number between 0 and 2');
	}else if(typeof check !== 'boolean'){
		throw new Error('\'check\' should be a boolean value');
	}

	if(path && typeof path !== 'string'){
		throw new Error('database \'path\' must be a string');
	}

	return { cacheType, path, check };
}



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