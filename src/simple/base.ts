export type value = Data | boolean | number | string | null | undefined;
export interface DataObj {
	[key: number | string]: value;
}
export type Data = DataObj | value[];

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

	public _getArray(key: string): value[]{
		const arr = this.db.get(key);

		if(!Array.isArray(arr)){
			throw new Error(`data stored in the key '${key}' is not an array`);
		}

		return arr;
	}

	public push(key: string, ...values: value[]): value[]{
		let arr = this.db.get(key);

		if(typeof arr === 'undefined' || arr === null){
			arr = values;
		}else{
			if(!Array.isArray(arr)){
				throw new Error(`value stored in '${key}' is not an array`);
			}
			arr.push(...values);
		}

		this.db.set(key, arr);

		return arr;
	}

	public extract(
		key: string,
		index: number | string | (
			(value: value, index: number, obj: value[]) => unknown
		)
	): value {
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

		const [value] = arr.splice(index, 1);

		this.db.set(key, arr);

		return value;
	}

	// from here methods throw an error if the array does not exists

	public splice(
		key: string,
		start: number,
		deleteCount: number,
		...items: value[]
	): value[] {
		const arr = this._getArray(key);
		const values = arr.splice(start, deleteCount, ...items);

		this.db.set(key, arr);

		return values;
	}

	public random(key: string): value {
		const arr = this._getArray(key);
		return arr[Math.floor(Math.random() * arr.length)];
	}

	// from here methods throw an error if the array does not exists

	public sort(
		key: string,
		compareFn?: (a: value, b: value) => number
	): value[]{
		const sorted = this._getArray(key).sort(compareFn);

		this.db.set(key, sorted);

		return sorted;
	}

	public includes(
		key: string,
		searchElement: value,
		fromIndex?: number
	): boolean {
		return this._getArray(key).includes(searchElement, fromIndex);
	}

	public find(
		key: string,
		callback: (value: value, index: number, obj: value[]) => unknown,
		thisArg?: unknown
	): value {
		return this._getArray(key).find(callback, thisArg);
	}

	public findIndex(
		key: string,
		callback: (value: value, index: number, obj: value[]) => unknown,
		thisArg?: unknown
	): number | -1{
		return this._getArray(key).findIndex(callback, thisArg);
	}

	public reduce(
		key: string,
		callback: (previousValue: unknown, currentValue: value, currentIndex: number, array: value[]) => unknown,
		initialValue: unknown
	): unknown{
		return this._getArray(key).reduce(callback, initialValue);
	}

	public filter(
		key: string,
		callback: (value: value, index: number, obj: value[]) => unknown,
		thisArg?: unknown
	): value[]{
		return this._getArray(key).filter(callback, thisArg);
	}

	public map(
		key: string,
		callback: (value: value, index: number, obj: value[]) => unknown,
		thisArg?: unknown
	): unknown[]{
		return this._getArray(key).map(callback, thisArg);
	}

	public some(
		key: string,
		callback: (value: value, index: number, obj: value[]) => unknown,
		thisArg?: unknown
	): boolean{
		return this._getArray(key).some(callback, thisArg);
	}

	public every(
		key: string,
		callback: (value: value, index: number, obj: value[]) => unknown,
		thisArg?: unknown
	): boolean{
		return this._getArray(key).every(callback, thisArg);
	}
}

const regex = /\.{2,}|^\.|\.$/; // /\[(.*?)\]|[^.[]+/g; //
export const objUtil = {
	get(obj: value, props: string[]): value {
		if(props.length === 0) return obj;

		for(const prop of props){
			if(typeof obj !== 'object' || obj === null){
				throw new Error(`value at ${props.join('.')} is not an object`);
			}

			if(prop in obj){
				// @ts-expect-error using isNaN to check if the string is a number
				if(Array.isArray(obj) && isNaN(prop)){
					throw new Error(`value at ${props.join('.')} is an array and the key is not a number`);
				}
				// @ts-expect-error using string as index of an array
				obj = obj[prop] as value;
			}else return;
		}

		return obj;
	},
	set(obj: value, props: string[], value: value = null): void {
		if(props.length === 0) return;

		const last = props.pop() as string;

		const final = props.reduce<value>((o, prop: string) => {
			if(typeof o !== 'object' || o === null){
				throw new Error(`value at ${props.join('.')} is not an object`);
			}

			if(prop in o){
				// @ts-expect-error using string as index of an array
				return o[prop] as value;
			}

			// @ts-expect-error comparing string with number
			if(Array.isArray(o) && prop >= o.length){
				throw new Error("adding a value to an array in the 'set' method is forbidden");
			}
			// @ts-expect-error using string as index of an array
			o[prop] = {};
			// @ts-expect-error using string as index of an array
			return o[prop] as Data;
		}, obj);

		if(typeof final !== 'object' || final === null){
			throw new Error(`value at ${props.join('.')} is not an object`);
			// @ts-expect-error comparing string with number
		}else if(Array.isArray(final) && last >= final.length){
			throw new Error("adding a value to an array in the 'set' method is forbidden");
		}
		// @ts-expect-error using string as index of an array
		final[last] = value;
	},
	delete(obj: value, props: string[]): void {
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

		return key.split(/\.|\[(\d)\]/).filter(x => x);
	},
};

export default abstract class Base{
	constructor(){
		this.array = new ArrayUtils(this);
		this.number = new NumberUtils(this);
	}

	public data: Data;
	public get keys(): string[] {
		return Object.keys(this.data);
	}
	public get values(): value[] {
		return Object.values(this.data);
	}
	public get entries(): Array<[string, value]> {
		return Object.entries(this.data);
	}

	public get(key: string): value {
		return objUtil.get(this.data, objUtil.parseKey(key));
	}

	public set(key: string, value: value): void {
		objUtil.set(this.data, objUtil.parseKey(key), value);

		this._queueSave();
	}

	public delete(key: string): void{
		objUtil.delete(this.data, objUtil.parseKey(key));

		this._queueSave();
	}

	public clear(): void{
		this.data = Array.isArray(this.data) ? [] : {};
		this.save();
	}

	public abstract save(): void;
	protected abstract _queueSave(): void;

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