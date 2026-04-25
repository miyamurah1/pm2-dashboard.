const arr = []
setInterval(() => {
  arr.push(Buffer.alloc(1024))
  if (arr.length > 1000) arr.shift()
  console.log('running', arr.length)
}, 1000)