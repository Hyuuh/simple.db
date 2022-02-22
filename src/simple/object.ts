const regex = /\[(.*?)\]|[^.[]+/g;
export default {
	get(obj: any, props: string[]): any {
		if(props.length === 0) return obj;

		return props.reduce((acc: any, prop: string, i: number) => {
			if(typeof acc !== 'object' || acc === null){
				throw new Error(`Value at ${props.slice(0, i).join('.')} is not an object`);
			}
			if(!(prop in acc)){
				return undefined;
			}

			return acc[prop];
		}, obj);
	},
	set(obj: any, props: string[], value: any = null): any {
		if(props.length === 0) return;

		props.reduce((acc: any, prop: string, index: number) => {
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
function parseKey(key){
	if(typeof key !== 'string'){
		throw new DatabaseError('\'key\' must be a string');
	}else if(key.match(/\.{2,}|^\.|\.$/) || key === ''){
		throw new DatabaseError('\'key\' is not valid');
	}

	return key.split(/\.|\[(\d)\]/).filter(k => k);
}
*/