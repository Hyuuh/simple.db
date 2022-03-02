import type { RawOptions, Data, DataObj, value } from './base';
import Base, { objUtil } from './base';
import * as fs from 'fs';

export default class SimpleJSON extends Base{
	constructor(options?: RawOptions){
		super();

		const opts = parseOptions(options);

		Object.assign(this, opts);
		if(!fs.existsSync(opts.path)){
			fs.writeFileSync(opts.path, '{}');
		}

		if(this.cache) this._cache = readJSON(this.path);
	}
	private readonly path: string;
	private readonly check = false;

	private _save(data: Data){
		writeJSON(this.path, data, this.check);
	}
	public get data(): Data {
		if(this.cache) return this._cache;
		return readJSON(this.path);
	}

	public get(key: string): value {
		return objUtil.get(this.data, objUtil.parseKey(key));
	}

	public set(key: string, value: value): void {
		const d = this.data;
		objUtil.set(d, objUtil.parseKey(key), value);

		this._save(d);
	}

	public delete(key: string): void{
		const d = this.data;
		objUtil.delete(d, objUtil.parseKey(key));

		this._save(d);
	}

	public clear(): void{
		this._cache = Array.isArray(this.data) ? [] : {};
		writeJSON(this.path, this._cache);
	}
}

export interface Options {
	cache: boolean;
	path: string;
	check: boolean;
}

const DEFAULT_OPTIONS: Options = {
	cache: true,
	path: './simple-db.json',
	check: false,
};

function parseOptions(options: RawOptions = {}): Options {
	if(typeof options === 'string') options = { path: options };
	if(typeof options !== 'object'){
		throw new Error('the database options should be an object or a string with the path');
	}

	options = Object.assign({}, DEFAULT_OPTIONS, options);

	if(typeof options.path !== 'string'){
		throw new Error('the database path should be a string');
	}else if(typeof options.cache !== 'boolean'){
		throw new Error('the cache option should be a boolean');
	}else if(typeof options.check !== 'boolean'){
		throw new Error("'check' should be a boolean value");
	}

	return options as Options;
}

function writeJSON(path: string, data: Data, check = false){
	let stringifiedData = null;

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

			writeJSON(path2, data);
			throw new Error(`Error writing JSON in '${path}', data saved in '${path2}'`);
		}
	}
}

function readJSON(path: string): Data {
	let data = null;

	try{
		data = fs.readFileSync(path, 'utf-8');
	}catch(e){
		throw new Error(`the database in ${path} was deleted`);
	}

	try{
		data = JSON.parse(data) as DataObj;
	}catch(e){
		throw new Error(`Error parsing JSON in '${path}'`);
	}

	return data;
}