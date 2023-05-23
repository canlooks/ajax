(async () => {
    await test()
    console.log(3)
})()

async function test() {
    await new Promise(resolve => {
        setTimeout(resolve, 1000)
    })
    throw 'err'
}