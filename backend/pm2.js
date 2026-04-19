const pm2 = require('pm2')

function connectPM2() {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function getProcessList() {
  return new Promise((resolve, reject) => {
    pm2.list((err, list) => {
      if (err) reject(err)
      else resolve(list)
    })
  })
}

// ── Control functions ─────────────────────────────────────────────────────
// Each wraps pm2's callback API in a Promise so we can use async/await

function restartProcess(name) {
  return new Promise((resolve, reject) => {
    pm2.restart(name, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function stopProcess(name) {
  return new Promise((resolve, reject) => {
    pm2.stop(name, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function startProcess(name) {
  return new Promise((resolve, reject) => {
    pm2.start(name, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// ── PM2 event name → frontend status string ───────────────────────────────
function toStatus(pmEvent) {
  const map = {
    'online':   'online',
    'start':    'launching',
    'restart':  'launching',
    'stop':     'stopped',
    'exit':     'stopped',
    'stopping': 'stopping',
    'error':    'errored',
    'launch':   'launching',
  }
  return map[pmEvent] ?? pmEvent
}

function watchEvents(onEvent) {
  pm2.launchBus((err, bus) => {
    if (err) {
      console.error('PM2 bus error', err)
      return
    }

    bus.on('process:event', (event) => {
      onEvent({
        type: 'process_event',
        process: event.process.name,
        status: toStatus(event.event),
        at: Date.now()
      })
    })

    bus.on('log:out', (log) => {
      onEvent({
        type: 'log',
        process: log.process.name,
        level: 'info',
        message: log.data,
        at: Date.now()
      })
    })

    bus.on('log:err', (log) => {
      onEvent({
        type: 'log',
        process: log.process.name,
        level: 'error',
        message: log.data,
        at: Date.now()
      })
    })
  })
}

module.exports = {
  connectPM2,
  getProcessList,
  watchEvents,
  restartProcess,
  stopProcess,
  startProcess,
}