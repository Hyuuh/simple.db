import type { Data, DataObj } from './base';
import Base from './base';
import * as fs from 'fs';

export default class SimpleJSON extends Base{
	constructor(path = './simple-db.sqlite', check = false){
		super();

		if(!fs.existsSync(path)){
			fs.writeFileSync(path, '{}');
		}

		this.path = path;
		this.check = check;
		this.data = readJSON(this.path);
	}
	private readonly path: string;
	private readonly check: boolean;

	public clear(): void {
		this.data = Array.isArray(this.data) ? [] : {};
		this.save();
	}

	public save(){
		writeJSON(this.path, this.data, this.check);
	}
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