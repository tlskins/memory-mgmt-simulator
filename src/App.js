import './App.css';
import { Component } from 'react'
import './tailwind.output.css'
import _ from "lodash"
import CSVReader from 'react-csv-reader'


const DemoState = {
    // memory settings
    physicalMemSize: 64,
    pageSize: 4,
    availFrames: 16,
    memorySet: true,

    // runtime
    errorMsg: undefined,
    currTime: 0,
    running: false,
    playing: false,
    finished: false,
    logs: [],

    // memory mgmt
    pageTables: {},
    memory: new Array(16),
    processes: [
      { 
        processId: "email",
        numBytes: 12,
        numFrames: 3,
        timeUnits: 5,
        timeRan: 0,
        status: 'Waiting',
      },
      { 
        processId: "excel",
        numBytes: 32,
        numFrames: 8,
        timeUnits: 3,
        timeRan: 0,
        status: 'Waiting',
      },
      { 
        processId: "browser",
        numBytes: 36,
        numFrames: 9,
        timeUnits: 8,
        timeRan: 0,
        status: 'Waiting',
      },
      { 
        processId: "music",
        numBytes: 16,
        numFrames: 4,
        timeUnits: 12,
        timeRan: 0,
        status: 'Waiting',
      },
      { 
        processId: "IO",
        numBytes: 26,
        numFrames: 7,
        timeUnits: 4,
        timeRan: 0,
        status: 'Waiting',
      }
    ],
}

const ResetState = {
  // memory settings
  physicalMemSize: 0,
  pageSize: 0,
  availFrames: 0,
  memorySet: false,

  // runtime
  errorMsg: undefined,
  currTime: 0,
  running: false,
  playing: false,
  finished: false,
  logs: [],

  // memory mgmt
  pageTables: {},
  memory: [],
  processes: [],
}

class App extends Component {
  state = {
    // memory settings
    physicalMemSize: undefined,
    pageSize: undefined,
    availFrames: undefined,
    memorySet: false,

    // ui
    hoverId: undefined,
    hoverMemoryId: undefined,

    // memory mgmt
    pageTables: {},
    memory: [],
    processes: [],

    // runtime
    errorMsg: undefined,
    currTime: 0,
    running: false,
    playing: false,
    finished: false,
    logs: [],

    // new process form
    processId: '',
    numBytes: 0,
    timeUnits: 0,
  }
  timer = undefined

  onAddProcess = () => {
    const { pageSize, processes, processId, numBytes, timeUnits } = this.state

    if ( timeUnits <= 0 ) {
      this.setState({ errorMsg: 'Process must run for at least 1 unit of time' })
      return
    } 
    if ( numBytes <= 0 ) {
      this.setState({ errorMsg: 'Process must be greater than 0 bytes' })
      return
    } 
    if ( !processId ) {
      this.setState({ errorMsg: 'Process missing process id' })
      return
    }

    this.setState({
      processes: [ ...processes, {
        processId,
        numBytes,
        numFrames: Math.ceil( numBytes / pageSize ),
        timeUnits,
        timeRan: 0,
        status: 'Waiting',
      }],
      processId: '',
      numBytes: 0,
      timeUnits: 0,
    })
  }

  onDemo = () => {
    if ( this.timer ) {
      clearTimeout( this.searchTimer )
    }
    this.timer = undefined
    this.setState(Object.assign(this.state, _.cloneDeep(DemoState)))
  }

  onReset = () => {
    if ( this.timer ) {
      clearTimeout( this.searchTimer )
    }
    this.timer = undefined
    this.setState(Object.assign(this.state, _.cloneDeep(ResetState)))
  }

  onPlay = () => {
    this.setState({ running: true, playing: true, finished: false })
    this.timerSystemClock()
  }

  onStop = () => {
    if ( this.timer ) {
      clearTimeout( this.searchTimer )
    }
    this.timer = undefined
    this.setState({ running: false, playing: false })
  }

  onFileLoaded = data => {
    const { pageSize } = this.state

    const processes = data.map( row => ({
      processId: row[0].toString(),
      numBytes: parseInt(row[1]),
      numFrames: Math.ceil( parseInt(row[1]) / pageSize ),
      timeUnits: parseInt(row[2]),
      timeRan: 0,
      status: 'Waiting',
    }))

    this.setState({ processes })
  }

  timerSystemClock = () => {
    if ( this.timer ) {
      clearTimeout( this.searchTimer )
    }
    this.timer = undefined
    this.timer = setTimeout(() => {
      const playing = this.advanceSystemClock()
      if (playing) {
        this.timerSystemClock()
      }
    }, 1800 )
  }

  advanceSystemClock = () => {
    let { currTime, memory, pageTables, logs } = this.state
    const [processes, allocateProcs, deallocateProcs, availFrames] = this.advanceProcesses()

    const afterDealloc = this.deallocateMemory(memory, deallocateProcs, pageTables)
    memory = afterDealloc[0]
    pageTables = afterDealloc[1]

    const afterAlloc = this.allocateMemory(memory, allocateProcs, pageTables)
    memory = afterAlloc[0]
    pageTables = afterAlloc[1]
    const finished = processes.every( proc => proc.status === "Finished")
    const playing = this.state.playing ? !finished : false

    if (currTime !== 0 || this.state.processes.some( proc => proc.status !== "Waiting")) {
      currTime++
    }

    logs = [
      ...logs,
      ...deallocateProcs.map(([procId,procFrames])=> ({
        msg: `Deallocating ${procFrames} frames for ${procId}`,
        time: currTime,
      })),
      ...allocateProcs.map(([procId,procFrames])=> ({
        msg: `Allocating ${procFrames} frames for ${procId}`,
        time: currTime,
      })),
    ]

    this.setState({
      availFrames,
      currTime,
      finished,
      logs,
      memory,
      pageTables,
      playing,
      processes,
    })

    return playing
  }

  advanceProcesses = () => {
    let { availFrames } = this.state
    const allocate = []
    const deallocate = []

    const processes = this.state.processes.map( process => {
      if ( process.status === 'Running' ) {
        process.timeRan += 1
        if ( process.timeRan >= process.timeUnits ) {
          process.status = 'Finished'
          availFrames += process.numFrames
          deallocate.push([process.processId, process.numFrames])
        }
        return { ...process }
      }

      if ( process.status === 'Waiting' && process.numFrames <= availFrames ) {
        availFrames -= process.numFrames
        allocate.push([process.processId, process.numFrames])
        return { ...process, status: 'Running' }
      }

      return process
    })

    return [processes, allocate, deallocate, availFrames]
  }

  allocateMemory(memory, processes, pageTables) {
    if ( processes.length === 0 ) {
      return [memory, pageTables]
    }
    let idx = 0
    let [processId, numFrames] = processes[idx]
    let currAlloc = 0
    let page = 0
    for(let i=0;i<memory.length;i++) {
      if (!memory[i]) {
        // add to page table
        if (!pageTables[processId]) {
          pageTables[processId] = []
        }
        pageTables[processId].push({ page, frame: i })
        page++

        // allocate memory
        memory[i] = processId
        currAlloc++

        // next process if all frames are allocated
        if ( currAlloc === numFrames ) {
          idx++
          if ( idx === processes.length ) {
            break
          }
          [processId, numFrames] = processes[idx]
          page = 0
          currAlloc = 0
        }
      }
    }
    return [memory, pageTables]
  }

  deallocateMemory(memory, processes, pageTables) {
    if ( processes.length === 0 ) {
      return [memory, pageTables]
    }
    const ids = processes.map( ([id,_]) => id )
    // remove from page table
    ids.forEach( id => {
      delete pageTables[id]
    })
    // deallocate memory
    for(let i=0;i<memory.length;i++) {
      if (ids.includes(memory[i])) {
        memory[i] = undefined
      }
    }
    return [memory, pageTables]
  }

  memoryBlocks = () => {
    const { memory } = this.state
    let currId = null
    let start = 0
    const memBlocks = []
    for (let addr=0; addr<memory.length; addr++) {
      const processId = memory[addr]
      if (currId === null) {
        currId = processId
      }
      if (processId !== currId) {
        memBlocks.push({ processId: currId, start, end: addr-1 })
        start = addr
      }
      currId = processId
    }
    memBlocks.push({ processId: currId, start, end: memory.length-1 })
    return memBlocks
  }

  render() {
    const {
      currTime,
      errorMsg,
      hoverId,
      hoverMemoryId,
      logs,
      physicalMemSize,
      pageSize,
      pageTables,
      playing,
      processId,
      processes,
      numBytes,
      running,
      memorySet,
      timeUnits,
      availFrames,
    } = this.state

    const memBlocks = this.memoryBlocks()
    const runningProcesses = processes.filter( p => p.status === 'Running' )
    const totalPages = physicalMemSize / pageSize
    const availFramesHeight = Math.round(availFrames / totalPages * 500)
    const availFramesRounded = runningProcesses.length === 0 ? "rounded-t-2xl" : ""
    const availOverflow = hoverMemoryId === "Logical-Avail" ? "" : "overflow-hidden"

    return(
      <div className="App">
        <div className="flex flex-col w-full">
          <div className="flex flex-row w-full">
            <div className="flex flex-col w-full justify-center content-center items-center bg-yellow-300 p-8 m-4 shadow">
              <h1 className="font-sans font-medium text-xl m-2">
                Paging Memory Management Simulator
              </h1>
              <p className="mt-8">
                Simulates logical and physical memory usage for sequences of processes using a paging memory management scheme.
              </p>
              <a href="https://github.com/tlskins/memory-mgmt-simulator"
                className="underline text-blue-700 mt-4"
              >
                https://github.com/tlskins/memory-mgmt-simulator
              </a>
            </div>
          </div>

          <div className="flex flex-row w-full bg-indigo-300 p-8">
            <div className="flex flex-col w-full justify-center content-center items-center">
              <h2 className="font-sans m-2">
                Total Memory: 
                { memorySet ?
                  <span className="rounded-lg bg-yellow-300 text-lg shadow px-2 py-1 m-2"> { physicalMemSize } </span>
                  :
                  <input type="text"
                    className="mx-2 rounded p-1 w-20"
                    value={physicalMemSize}
                    onChange={ e => {
                      const physicalMemSize = Math.trunc(parseFloat(e.target.value))
                      this.setState({ physicalMemSize: isNaN(physicalMemSize) ? 0 : physicalMemSize })
                    }}
                  />
                }
                bytes
              </h2>
              <h2 className="font-sans m-2">
                Page Size:
                { memorySet ?
                  <span className="rounded-lg bg-yellow-300 text-lg shadow px-2 py-1 m-2"> { pageSize } </span>
                  :
                  <input type="text"
                    className="mx-2 rounded p-1 w-20"
                    value={pageSize}
                    onChange={ e => {
                      const pageSize = Math.trunc(parseFloat(e.target.value))
                      this.setState({ pageSize: isNaN(pageSize) ? 0 : pageSize })
                    }}
                  />
                }
                bytes
              </h2>

              { memorySet &&
                <h2 className="font-sans m-2">
                  Available Pages: 
                  <span className="rounded-lg bg-yellow-300 text-lg shadow px-2 py-1 m-2"> { availFrames } </span>
                </h2>
              }

              <div className="flex flex-row">
                { !memorySet &&
                  <button
                    className="rounded-lg shadow bg-teal-300 hover:bg-blue-300 font-sans font-semibold underline w-20 px-2 py-1 m-6"
                    onClick={() => {
                      if ( physicalMemSize <= 0 ) {
                        this.setState({ errorMsg: 'Physical memory must be greater than 0' })
                        return
                      }
                      if ( pageSize <= 0 ) {
                        this.setState({ errorMsg: 'Page size must be greater than 0' })
                        return
                      }
                      if ( pageSize % 2 !== 0 ) {
                        this.setState({ errorMsg: 'Page size must be a multiple of 2' })
                        return
                      }
                      const totalFrames = physicalMemSize / pageSize
                      this.setState({
                        memorySet: true,
                        memory: new Array(totalFrames),
                        totalFrames,
                        availFrames: totalFrames,
                      })
                    }}
                  >
                    Enter
                  </button>
                }

                { !running &&
                  <button
                    className="rounded-lg shadow bg-teal-300 hover:bg-blue-300 font-sans font-semibold underline w-20 px-2 py-1 m-6"
                    onClick={ this.onDemo }
                  >
                    Demo
                  </button>
                }

                <button
                  className="rounded-lg shadow bg-orange-300 hover:bg-blue-300 font-sans font-semibold underline w-20 px-2 py-1 m-6"
                  onClick={ this.onReset }
                >
                  Reset
                </button>

                { (memorySet && !playing) &&
                  <button
                    className="rounded-lg shadow bg-green-400 hover:bg-blue-300 font-sans font-semibold underline w-20 px-2 py-1 m-6"
                    onClick={ this.onPlay }
                  >
                    Play
                  </button>
                }

                { playing &&
                  <button
                    className="rounded-lg shadow bg-green-400 hover:bg-red-400 font-sans font-semibold underline w-20 px-2 py-1 m-6"
                    onClick={ this.onStop }
                  >
                    Stop
                  </button>
                }
              </div>

              { (!running && memorySet) &&
                <div className="flex flex-col my-4">
                  <div>
                    <CSVReader
                      cssClass="flex flex-col"
                      cssInputClass="bg-white border"
                      onFileLoaded={this.onFileLoaded}
                      onError={e => console.log('csv err', e)}
                      parserOptions={{
                        header: false,
                        dynamicTyping: true,
                        skipEmptyLines: true,
                      }}
                    />
                  </div>
                  <p>
                    Upload processes via CSV file with no header row<br />
                    Columns: (1) process id, (2) size in bytes, (3) time units
                  </p>
                </div>
              }
            </div>
          </div>

          { errorMsg &&
            <div className="flex w-full justify-center content-center items-center my-4 py-12 bg-orange-400 cursor-pointer hover:bg-orange-600"
              onClick={() => this.setState({ errorMsg: undefined })}
            >
              <h2 className="flex-row text-xl">
                { errorMsg }
              </h2>
            </div>
          }

          <div className="flex flex-row">
            <div className="flex-col w-3/12 p-8">
              <h2 className="text-xl underline">FIFO Process Queue</h2>
              { (memorySet && !running) &&
                <div>
                  <div className="flex flex-row m-2">
                    <p className="m-2 w-32">Process Id</p>
                    <input type="text"
                      className="p-2 bg-indigo-300 rounded"
                      value={ processId }
                      onChange={ e => this.setState({ processId: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-row m-2">
                    <p className="m-2 w-32">Size (Bytes)</p>
                    <input type="text"
                      className="p-2 bg-indigo-300 rounded"
                      value={ numBytes }
                      onChange={ e => {
                        const numBytes = Math.trunc(parseFloat(e.target.value))
                        this.setState({ numBytes: isNaN(numBytes) ? 0 : numBytes })
                      }}
                    />
                  </div>
                  <div className="flex flex-row m-2">
                    <p className="m-2 w-32">Units of Time</p>
                    <input type="text"
                      className="p-2 bg-indigo-300 rounded"
                      value={ timeUnits }
                      onChange={ e => {
                        const timeUnits = Math.trunc(parseFloat(e.target.value))
                        this.setState({ timeUnits: isNaN(timeUnits) ? 0 : timeUnits })
                      }}
                    />
                  </div>
                  <button className="m-2 p-2 w-32 rounded-lg shadow bg-teal-300 hover:bg-blue-300 rounded"
                    onClick={this.onAddProcess}
                  >
                    Add Process
                  </button>
                  <button className="m-2 p-2 w-32 rounded-lg shadow bg-teal-300 hover:bg-blue-300 rounded"
                    onClick={ () => {
                      if ( processes.length === 0 ) {
                        this.setState({ errorMsg: 'Must have at least 1 process to run' })
                        return
                      }
                      this.setState({ running: true }, this.advanceSystemClock)
                    }}
                  >
                    Run
                  </button>
                </div>
              }

              { processes.length > 0 &&
                <table className="table-auto mt-4 w-full">
                  <tr>
                    <th className="px-2 py1">#</th>
                    <th className="px-2 py-1">Id</th>
                    <th className="px-2 py-1">Size (bytes)</th>
                    <th className="px-2 py-1">Total Time</th>
                    <th className="px-2 py-1">Run Time</th>
                    <th className="px-2 py-1">Status</th>
                  </tr>
                  { processes.map((process, i) => {
                    let bg = "bg-gray-400"
                    if (process.status === "Running") {
                      bg = "bg-green-400"
                    }
                    if (process.status === "Finished") {
                      bg = "bg-blue-300"
                    }
                    return(
                      <tr key={i} 
                        className={`flex-row rounded w-24 p-2 m-2 ${bg}`}
                      >
                        <td className="border px-2 py-1"> { i+1 } </td>
                        <td className="border px-2 py-1"> { process.processId } </td>
                        <td className="border px-2 py-1"> { process.numBytes } </td>
                        <td className="border px-2 py-1"> { process.timeUnits } </td>
                        <td className="border px-2 py-1"> { process.timeRan } </td>
                        <td className="border px-2 py-1"> { process.status } </td>
                      </tr>
                    )
                  })}
                </table>
              }

              { (memorySet && running) &&
                <div>
                  <div className="flex flex-row m-2">
                    <p className="m-2 w-32">Time { currTime } </p>
                    <button className="m-2 p-2 w-32 rounded-lg shadow bg-teal-300 hover:bg-blue-300 rounded"
                      onClick={ this.advanceSystemClock }
                    >
                      Advance Time
                    </button>
                  </div>
                </div>
              }
            </div>

            <div className="flex-col w-3/12 p-8 justify-center content-center items-center">
              <h2 className="text-xl underline">Logical Memory</h2>
              { runningProcesses.map((process, i) => {
                const isLast = i === runningProcesses.length - 1
                const isFull = availFrames === 0

                const height = Math.round(process.numFrames / totalPages * 500)
                let varStyle = i === 0 ? "rounded-t-2xl" : ""
                if (isFull && isLast) {
                  varStyle = "rounded-b-2xl"
                }
                if (!isFull || !isLast) {
                  varStyle += " border-b-2 border-white"
                }
                const memoryOverflowId = `Logical-Process-${i}`
                if (hoverMemoryId !== memoryOverflowId) {
                  varStyle += " overflow-hidden"
                }

                return(
                  <div key={i}
                    style={{ height }}
                    className={`flex flex-row bg-blue-300 p-2 mx-2 ${varStyle} shadow-lg justify-center content-center items-center`}
                    onMouseEnter={() => this.setState({ hoverMemoryId: memoryOverflowId })}
                    onMouseLeave={() => this.setState({ hoverMemoryId: undefined })}
                  >
                    <div className="flex flex-col font-medium text-justify">
                      <div>
                        Process: <span className="text-white">{ process.processId }</span>
                      </div>
                      <div>
                        Size: <span className="text-white">{ process.numBytes }</span>
                      </div>
                      <div>
                        Pages: <span className="text-white">{ process.numFrames }</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              { availFrames > 0 &&
                <div style={{ height: availFramesHeight }}
                  className={`flex flex-row bg-gray-400 p-2 mx-2 ${availFramesRounded} rounded-b-2xl shadow-lg justify-center content-center items-center ${availOverflow}`}
                  onMouseEnter={() => this.setState({ hoverMemoryId: "Logical-Avail" })}
                  onMouseLeave={() => this.setState({ hoverMemoryId: undefined })}
                >
                  <div className="flex flex-col font-medium text-justify">
                    <div>
                      Size: <span className="text-white">{ availFrames * pageSize }</span>
                    </div>
                    <div>
                      Pages: <span className="text-white">{ availFrames }</span>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div className="flex-col w-3/12 p-8">
              <h2 className="text-xl underline">Page Tables</h2>
              { Object.entries( pageTables ).map(([processId, pageTable], i) => 
                <div key={i}
                  className="rounded bg-yellow-300 shadow-lg p-2 m-2"
                  onMouseEnter={() => this.setState({ hoverId: processId })}
                >
                  <h2 className="font-semibold my-2">
                    Process: <span className="text-blue-600 underline">{ processId }</span>
                  </h2>
                  { hoverId === processId && pageTable.map((table,j) => 
                    <div key={j}>
                      <span className="mx-2">Page: { table.page }</span>
                      <span className="mx-2">Frame: { table.frame }</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-col w-3/12 p-8">
              <h2 className="text-xl underline">Physical Memory</h2>
              { memorySet && memBlocks.map(({ start, end, processId }, i) => {
                  const isLast = i === memBlocks.length - 1
                  const frames = end - start + 1
                  const height = Math.round(frames / totalPages * 500)
                  let varStyle = i === 0 ? "rounded-t-2xl" : ""
                  if (isLast) {
                    varStyle += " rounded-b-2xl"
                  }
                  if (!isLast) {
                    varStyle += " border-b-2 border-white"
                  }
                  const memoryOverflowId = `Physical-Avail-${i}`
                  if (hoverMemoryId !== memoryOverflowId) {
                    varStyle += " overflow-hidden"
                  }

                  return(
                    <div key={i} 
                      style={{ height }}
                      className={`flex flex-row bg-${processId ? 'blue-300' : 'gray-400'} ${varStyle} p-2 mx-2 shadow-lg justify-center content-center items-center`}
                      onMouseEnter={() => this.setState({ hoverMemoryId: memoryOverflowId })}
                      onMouseLeave={() => this.setState({ hoverMemoryId: undefined })}
                    >
                      <div className="flex flex-col font-medium text-justify">
                        { processId &&
                          <div>
                            Process: <span className="text-white">{ processId }</span>
                          </div>
                        }
                        <div>
                          Size: <span className="text-white">{ frames * pageSize }</span>
                        </div>
                        <div>
                          Frames: <span className="text-white">{ frames }</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </div>

          <div className="flex flex-row justify-center content-center items-center">
            <div className="flex-col p-8">
              <h2 className="text-xl underline">Memory Allocation Logs</h2>
              { logs.reverse().map( log => (
                <p>
                  @ {log.time} - { log.msg }
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default App;
