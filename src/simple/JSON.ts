import Base, { RawOptions, Data, Value, cacheTypes, obj } from './base';
import * as fs from 'fs';

export default class extends Base{
	constructor(options?: RawOptions){
		super();

		options = parseOptions(options);

		if(!fs.existsSync(options.path)){
			fs.writeFileSync(options.path, '{}');
		}

		if(this._cacheType !== 0){
			this._cache = JSONRead(this.path);
		}
	}
	path: string = null;
	check = false;

	get data(): Data {
		switch(this._cacheType){
			case 0: return JSONRead(this.path);
			case 1: return obj.clone(this._cache);
			case 2: return this._cache;
			default: throw new Error("'cacheType' must be a number between 0 and 2");
		}
	}
	get(key: string): Value {
		return obj.get(this.data, obj.parseKey(key));
	}
	set(key: string, value: Value): void {
		const data = obj.set(this.data, obj.parseKey(key), value);

		if(this._cacheType !== 2){
			this._cache = obj.clone(data);
		}

		JSONWrite(this.path, data);
	}
	delete(key: string): void {
		obj.delete(this.data, obj.parseKey(key));
	}
	clear(): void {
		this._cache = Array.isArray(this.data) ? [] : {};
		JSONWrite(this.path, this._cache);
	}
}

interface Options {
	cacheType: cacheTypes;
	path: string;
	check: boolean;
}

const DEFAULT_OPTIONS = {
	cacheType: 1,
	path: './simple-db.json',
	check: false
};

function parseOptions(options: RawOptions = {}): Options {
	if(typeof options === 'string') options = { path: options };
	if(typeof options !== 'object'){
		throw new Error('the database options should be an object or a string with the path');
	}

	options = Object.assign({}, DEFAULT_OPTIONS, options);

	if(typeof options.path !== 'string'){
		throw new Error('the database path should be a string');
	}else if(!Number.isFinite(options.cacheType)){
		throw new Error("'cacheType' should be a number between 0 and 2");
	}else if(typeof options.check !== 'boolean'){
		throw new Error("'check' should be a boolean value");
	}

	return options as Options;
}

function JSONWrite(path: string, data: Data, check = false){
	let stringifiedData;

	try{
		stringifiedData = JSON.stringify(data, null, '\t');
	}catch(e){
		throw new Error('Circular structures cannot be stored');
	}

	try{
		fs.writeFileSync(path, stringifiedData);
	// eslint-disable-next-line no-empty
	}catch(e){}

	if(check){
		const dataInJSON = fs.readFileSync(path, 'utf-8');

		if(dataInJSON !== stringifiedData){
			const path2 = `../backup-${Date.now()}.json`;

			JSONWrite(path2, data);
			throw new Error(`Error writing JSON in '${path}', data saved in '${path2}'`);
		}
	}
}

function JSONRead(path: string): Data {
	let data;

	try{
		data = fs.readFileSync(path, 'utf-8');
	}catch(e){
		throw new Error(`the database in ${path} was deleted`);
	}

	try{
		data = JSON.parse(data);
	}catch(e){
		throw new Error(`Error parsing JSON in '${path}'`);
	}

	return data;
}