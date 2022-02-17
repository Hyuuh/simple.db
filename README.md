<a href="https://www.buymeacoffee.com/Fabricio191" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="28" width="135"></a>
[![Discord](https://img.shields.io/discord/555535212461948936?style=for-the-badge&color=7289da)](https://discord.gg/zrESMn6)

# A module to do a database in a simple way in JSON or SQLite3

### Installation

```js
npm i simplest.db --save
```

if you don't want to use the SQLite database type, you should do 

```js
npm i simplest.db --no-optional
```

if you have any problem in the installation related to better-sqlite3 see [this](https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/troubleshooting.md)

# Quick example

```js
const Database = require('simplest.db');
const db = new Database({
    path: './test.json'
})

db.set('ABC', null)
db.set('foo.bar', [123, 456])

console.log(db);
/*
Database {
    ABC: null,
    foo: {
        bar: [123, 456]
    }
}
*/

db.get('foo.bar[0]') //123
db.numbers.add('foo.bar[1]', 4) //460
db.array.push('foo.bar', 800) //[123, 460, 800]

console.log(db);
/*
Database {
    ABC: null,
    foo: {
        bar: [123, 460, 800]
    }
}
*/

console.log(db.entries)
/*
[
    {
        key: 'ABC',
        value: null
    }, 
    {
        key: 'foo',
        value: {
            bar: [123, 460, 800]
        }
    }
]
*/

console.log(db.keys)
//['ABC', 'foo']

console.log(db.values)
/*
[
    null, 
    {
        bar: [123, 460, 800]
    }
]
*/


db.delete('foo.bar')

/*
Database {
    ABC: null
    foo: {}
}
*/

db.clear()

//Database {}
```

# Index
* [Database](#database)
    * [set](#set-get-and-delete)
    * [get](#set-get-and-delete)
    * [delete](#set-get-and-delete)
    * [clear]()
    * [keys]()
    * [values]()
    * [entries]()
    * [number]()
        * [add]()
        * [subtract]()
    * [array]()
        * [push]()
        * [extract]()
        * [splice]()
        * [includes]()
        * [find]()
        * [findIndex]()
        * [filter]()
        * [map]()
        * [sort]()
        * [some]()
        * [every]()
        * [reduce]()
        * [random]()