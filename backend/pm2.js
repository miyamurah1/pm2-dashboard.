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
    pm2.restart(name, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// ── Key fix: instead of mapping events → status ourselves,
// we fetch the real status directly from PM2 after each event.
// This is 100% accurate because it reads pm2_env.status directly.
function toStatus(pmEvent) {
  const map = {
    'online':   'online',
    'start':    'online',    // ← was 'launching', caused stuck state
    'restart':  'online',    // ← was 'launching', caused stuck state
    'stop':     'stopped',
    'exit':     'stopped',
    'stopping': 'stopping',
    'error':    'errored',
    'launch':   'launching', // only true launching event
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
      // After any event, fetch the real status from PM2
      // instead of guessing from the event name
      pm2.describe(event.process.name, (err, list) => {
        const realStatus = list?.[0]?.pm2_env?.status ?? toStatus(event.event)
        onEvent({
          type: 'process_event',
          process: event.process.name,
          status: realStatus,
          at: Date.now()
        })
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