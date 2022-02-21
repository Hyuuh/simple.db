import * as fs from 'fs';
import Base, { Options, value, key, obj } from './base';

class JSONDatabase extends Base{
	constructor(options: Options){
		super(options);

		if(!fs.existsSync(options.path)){
			fs.writeFileSync(options.path, '{}');
		}

		if(this._cacheType !== 0){
			this._cache = JSONRead(this.path);
		}
	}

	get data(): object {
		switch(this._cacheType){
			case 0:
				return JSONRead(this.path);
			case 1:
				return obj.clone(this._cache);
			case 2:
				return this._cache;
			default:
				throw new Error('\'cacheType\' must be a number between 0 and 2');
		}
	}
	get(key: key): value {
		return obj.get(this.data, obj.parseKey(key));
	}
	set(key: key, value: value): void{
		const data = obj.set(this.data, obj.parseKey(key), value);

		if(this._cacheType !== 2){
			this._cache = obj.clone(data);
		}

		JSONWrite(this.path, data);
	}
	delete(key: key): void {
		obj.delete(this.data, obj.parseKey(key));
	}
	clear(): void {
		this._cache = Array.isArray(this.data) ? [] : {};
		JSONWrite(this.path, this._cache);
	}
}

export default JSONDatabase;

function JSONWrite(path: string, data, check = false){
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

function JSONRead(path: string){
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
