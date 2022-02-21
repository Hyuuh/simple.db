import fs from 'fs';
import object from './object.js';
import { ArrayUtils, NumberUtils } from './extras.js';
import util from 'util';

interface Options {
	cacheType?: number;
	check?: boolean;
	path?: string;
}

class JSONDatabase{
	constructor(options: Options){
		options = parseOptions(options);

		if(!fs.existsSync(options.path)){
			fs.writeFileSync(options.path, '{}');
		}

		Object.assign(this, {
			path: options.path,
			check: options.check,
			_cacheType: options.cacheType,
			array: new ArrayUtils(this),
			number: new NumberUtils(this),
		});

		if(this._cacheType !== 0){
			this._cache = JSONRead(this.path);
		}
	}
	_cache = {};
	_cacheType = 0;
	path = null;
	check = false;

	get data(): object {
		switch(this._cacheType){
			case 0:
				return JSONRead(this.path);
			case 1:
				return object.clone(this._cache);
			case 2:
				return this._cache;
			default:
				throw new Error('\'cacheType\' must be a number between 0 and 2');
		}
	}
	get keys(): string[] {
		return Object.keys(this.data);
	}
	get values(): string[] {
		return Object.values(this.data);
	}
	get entries(): [string, Value][] {
		return Object.entries(this.data);
	}

	get(key){
		return object.get(
			this.data,
			object.parseKey(key)
		);
	}

	set(key, value){
		const data = object.set(this.data, object.parseKey(key), value);

		if(this._cacheType !== 2){
			this._cache = object.clone(data);
		}

		JSONWrite(this.path, data);
	}

	delete(key){
		object.delete(this.data, object.parseKey(key));
	}

	clear(){
		if(Array.isArray(this.data)){
			JSONWrite(this.path, []);
			this._cache = [];
		}else{
			JSONWrite(this.path, {});
			this._cache = {};
		}
	}

	// -----

	array = null;
	number = null;

	toJSON(indentation = null): string {
		return JSON.stringify(this.data(), null, indentation);
	}

	[Symbol.for('nodejs.util.inspect.custom')](depth = 0): string{
		if(typeof depth !== 'number') throw new Error('\'depth\' should be a number');

		const str = util.inspect(this.data, {
			colors: true, depth,
		});
		return `Database ${str}`;
	}
}

export default JSONDatabase;

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
	|--data (getter)
	|--keys (getter)
	|--values (getter)
	|--entries (getter)
*/

function JSONWrite(path, data, check = false){
	try{
		data = JSON.stringify(data, null, '\t');
	}catch(e){
		throw new Error('Circular structures cannot be stored');
	}

	try{
		fs.writeFileSync(path, data);
	}catch(e){}

	if(check){
		const dataInJSON = fs.readFileSync(path, 'utf-8');

		if(dataInJSON !== data){
			const path2 = `../backup-${Date.now()}.json`;

			JSONWrite(path2, data);
			throw new Error(`Error writing JSON in '${path}', data saved in '${path2}'`);
		}
	}
}

function JSONRead(path){
	let data = {};

	try{
		data = fs.readFileSync(path, 'utf-8');
	}catch(e){
		throw new Error(`the database in ${path} was deleted`);
	}

	try{
		// @ts-ignore
		data = JSON.parse(data);
	}catch(e){
		throw new Error(`Error parsing JSON in '${path}'`);
	}

	return data;
}

function parseOptions(options = {}){
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

