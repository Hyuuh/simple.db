/* eslint-disable eqeqeq */
/* eslint-disable no-undefined */

const regex = /\[(.*?)\]|[^.[]+/g;
export default {
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