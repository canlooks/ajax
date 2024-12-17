// import {mergeConfig} from '../src'
//
// const t = mergeConfig({
//     headers: {
//         a: '1'
//     }
// }, {
//     headers: new Headers({b: '2'})
// })
//
// // @ts-ignore
// console.log(11, t.headers.get('a'))
// // @ts-ignore
// console.log(11, t.headers.get('b'))

const url1 = new URL('https://www.baidu.com')

const url2 = new URL('https://google.com/abc?a=1', url1)

console.log(20, url2.toString())
