export type Value = Data | boolean | number | string | null | undefined;
export interface DataObj {
	[key: number | string]: Value;
}
export type Data = DataObj | Value[];

export type RawOptions = string | {
	cache?: boolean;
	path?: string;
	check?: boolean;
	name?: string;
};

class NumberUtils{
	constructor(db: Base){
		this.db = db;
	}
	private readonly db: Base;

	public add(key: string, value: number): number{
		if(typeof value !== 'number' || isNaN(value)){
			throw new Error("'value' must be a number");
		}
		let num = this.db.get(key);

		if(typeof num === 'undefined'){
			num = 0;
		}else if(typeof num !== 'number' || isNaN(num)){
			throw new Error(`data stored in the key '${key}' is not an number`);
		}

		num += value;

		this.db.set(key, num);

		return num;
	}

	public subtract(key: string, value: number): number{
		return this.add(key, -value);
	}
}

class ArrayUtils{
	constructor(db: Base){
		this.db = db;
	}

	private readonly db: Base;

	public _getArray(key: string): Value[]{
		const arr = this.db.get(key);

		if(!Array.isArray(arr)){
			throw new Error(`data stored in the key '${key}' is not an array`);
		}

		return arr;
	}

	public push(key: string, ...values: Value[]): Value[]{
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

	public extract(
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

	public splice(
		key: string,
		start: number,
		deleteCount: number,
		...items: Value[]
	): Value[] {
		const arr = this._getArray(key);
		const values = arr.splice(start, deleteCount, ...items);

		this.db.set(key, arr);

		return values;
	}

	public random(key: string): Value{
		const arr = this._getArray(key);
		return arr[Math.floor(Math.random() * arr.length)];
	}

	// from here methods throw an error if the array does not exists

	public includes(
		key: string,
		searchElement: Value,
		fromIndex?: number
	): boolean {
		return this._getArray(key).includes(searchElement, fromIndex);
	}

	public find(
		key: string,
		callback: (value: Value, index: number, obj: Value[]) => unknown,
		thisArg?: unknown
	): Value {
		return this._getArray(key).find(callback, thisArg);
	}

	public findIndex(
		key: string,
		callback: (value: Value, index: number, obj: Value[]) => unknown,
		thisArg?: unknown
	): number | -1{
		return this._getArray(key).findIndex(callback, thisArg);
	}

	public sort(
		key: string,
		compareFn?: (a: Value, b: Value) => number
	): Value[]{
		return this._getArray(key).sort(compareFn);
	}

	public reduce(
		key: string,
		callback: (previousValue: unknown, currentValue: Value, currentIndex: number, array: Value[]) => unknown,
		initialValue: unknown
	): unknown{
		return this._getArray(key).reduce(callback, initialValue);
	}

	public filter(
		key: string,
		callback: (value: Value, index: number, obj: Value[]) => unknown,
		thisArg?: unknown
	): Value[]{
		return this._getArray(key).filter(callback, thisArg);
	}

	public map(
		key: string,
		callback: (value: Value, index: number, obj: Value[]) => unknown,
		thisArg?: unknown
	): unknown[]{
		return this._getArray(key).map(callback, thisArg);
	}

	public some(
		key: string,
		callback: (value: Value, index: number, obj: Value[]) => unknown,
		thisArg?: unknown
	): boolean{
		return this._getArray(key).some(callback, thisArg);
	}

	public every(
		key: string,
		callback: (value: Value, index: number, obj: Value[]) => unknown,
		thisArg?: unknown
	): boolean{
		return this._getArray(key).every(callback, thisArg);
	}
}

export default abstract class Base{
	constructor(){
		this.array = new ArrayUtils(this);
		this.number = new NumberUtils(this);
	}
	protected _cache: Data;
	protected cache = true;

	public abstract get data(): Data;
	public get keys(): string[] {
		return Object.keys(this.data);
	}
	public get values(): Value[] {
		return Object.values(this.data);
	}
	public get entries(): Array<[string, Value]> {
		return Object.entries(this.data);
	}

	public abstract get(key: string): Value;
	public abstract set(key: string, value: Value): void;
	public abstract delete(key: string): void;
	public abstract clear(): void;

	public array: ArrayUtils;
	public number: NumberUtils;

	public toJSON(indentation = ''): string{
		return JSON.stringify(this.data, null, indentation);
	}
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

const regex = /\.{2,}|^\.|\.$/; // /\[(.*?)\]|[^.[]+/g; //
export const objUtil = {
	get(obj: Value, props: string[]): Value {
		if(props.length === 0) return obj;

		for(const prop of props){
			if(typeof obj !== 'object' || obj === null){
				throw new Error(`Value at ${props.join('.')} is not an object`);
			}

			if(prop in obj){
				// @ts-expect-error string as a index of an array
				obj = obj[prop] as Value;
			}else return;
		}

		return obj;
	},
	set(obj: Value, props: string[], value: Value = null): Value {
		if(props.length === 0) return obj;
		if(typeof obj !== 'object' || obj === null){
			throw new Error(`Value at ${props.join('.')} is not an object`);
		}

		const last = props.pop() as string;

		for(const prop of props){
			if(prop in obj){
				// @ts-expect-error string as a index of an array
				obj = obj[prop] as Value;
			}else{
				if(Array.isArray(obj)){
					throw new Error("adding a value to an array in the 'set' method is forbidden");
				}
				obj = obj[prop] = {};
			}

			if(typeof obj !== 'object' || obj === null){
				throw new Error(`Value at ${props.join('.')} is not an object`);
			}
		}

		if(Array.isArray(obj)){
			throw new Error("adding a value to an array in the 'set' method is forbidden");
		}
		obj[last] = value;

		return obj;
	},
	delete(obj: Value, props: string[]): void {
		if(props.length === 0){
			throw new Error('Invalid key');
		}
		const key = props.pop() as string;
		obj = objUtil.get(obj, props);

		if(typeof obj !== 'object' || obj === null) return;

		if(Array.isArray(obj)){
			throw new Error("deleting a value from an array in the 'delete' method is forbidden");
		}
		delete obj[key];
	},
	parseKey(key: string): string[]{
		key = key.trim();

		if(typeof key !== 'string'){
			throw new Error('\'key\' must be a string');
		}else if(regex.test(key) || key === ''){
			throw new Error('\'key\' is not valid');
		}

		return key.split('.');
	},
};

/*
function parseKey(key){
	if(typeof key !== 'string'){
		throw new DatabaseError('\'key\' must be a string');
	}else if(key.match(/\.{2,}|^\.|\.$/) || key === ''){
		throw new DatabaseError('\'key\' is not valid');
	}

	return key.split(/\.|\[(\d)\]/).filter(k => k);
}


function get(object, path, defaultValue) {
  const result = object == null ? undefined : baseGet(object, path)
  return result === undefined ? defaultValue : result
}

function baseGet(object, path) {
  path = castPath(path, object)

  let index = 0
  const length = path.length

  while (object != null && index < length) {
    object = object[toKey(path[index++])]
  }
  return (index && index == length) ? object : undefined
}

function toKey(value) {
  if (typeof value === 'string' || isSymbol(value)) {
    return value
  }
  const result = `${value}`
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result
}
*/