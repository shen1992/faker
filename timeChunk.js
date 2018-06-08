const timeChunk = function(arr, fn ,count) {
    let obj
    let t

    let len = arr.length

    const start = function() {
        for (let i = 0; i < Math.min(count || 1, arr.length); i++) {
            let obj = arr.shift()
            fn(obj)
        }
    }

    t = setInterval(function() {
        if (arr.length === 0 ) {
            return clearInterval(t)
        }
        start()
    }, 200)
}

var renderFriendList = timeChunk(arr, function(n) {

})