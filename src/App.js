import './App.css';
import { calculateFrames, generatePageTable } from './memoryManager';
import { Component } from 'react'
import './tailwind.output.css'

class App extends Component {
  state = {
    // physicalMemSize: undefined,
    // pageSize: undefined,
    // availFrames: undefined,
    // memorySet: false,
    physicalMemSize: 40,
    pageSize: 2,
    availFrames: 20,
    memorySet: true,
    running: false,

    errorMsg: undefined,
    pageTables: {},
    hoverId: undefined,
    // memory: [],
    memory: new Array(20),
    // processes: [],
    processes: [
      { 
        processId: "one",
        numBytes: 20,
        numFrames: 10,
        timeUnits: 2,
        timeRan: 0,
        status: 'Waiting',
      },
      { 
        processId: "two",
        numBytes: 20,
        numFrames: 10,
        timeUnits: 3,
        timeRan: 0,
        status: 'Waiting',
      },
      { 
        processId: "three",
        numBytes: 8,
        numFrames: 4,
        timeUnits: 4,
        timeRan: 0,
        status: 'Waiting',
      }
    ],
    currTime: 0,

    // new process form
    processId: '',
    numBytes: 0,
    timeUnits: 0,
  }

  onAddProcess = () => {
    const { pageSize, processes, processId, numBytes, timeUnits } = this.state
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

  advanceSystemClock = () => {
    let { currTime, memory, pageTables } = this.state
    const [processes, allocateProcs, deallocateProcs, availFrames] = this.advanceProcesses()
    console.log('alloc / dealloc', allocateProcs, deallocateProcs)

    const afterDealloc = this.deallocateMemory(memory, deallocateProcs, pageTables)
    memory = afterDealloc[0]
    pageTables = afterDealloc[1]
    console.log('afterDealloc', memory, pageTables)

    const afterAlloc = this.allocateMemory(memory, allocateProcs, pageTables)
    memory = afterAlloc[0]
    pageTables = afterAlloc[1]
    console.log('afteralloc', memory, pageTables)


    currTime++
    this.setState({
      memory,
      pageTables,
      processes,
      availFrames,
      currTime,
    })
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
      console.log('deleting', id)
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

  render() {
    const {
      currTime,
      errorMsg,
      hoverId,
      physicalMemSize,
      pageSize,
      pageTables,
      processId,
      processes,
      numBytes,
      running,
      memory,
      memorySet,
      timeUnits,
      availFrames,
    } = this.state

    let currId
    let start = 0
    const memBlocks = []
    memory.forEach((processId, addr) => {
      if (!currId) {
        currId = processId
      }
      
      if (processId !== currId) {
        memBlocks.push({ processId: currId, start, end: addr -1 })
        start = addr
        currId = processId
      }
    })
    memBlocks.push({ processId: currId, start, end: memory.length - 1 })

    return(
      <div className="App">
        <div className="flex flex-col w-full">
          <div className="flex flex-row w-full bg-indigo-300 p-8">
            <div className="flex flex-col w-full justify-center content-center items-center">
              <h2 className="font-sans m-2">
                Total Memory: 
                { memorySet ?
                  <span> { physicalMemSize } </span>
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
                  <span> { pageSize } </span>
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
                  Available Pages: { availFrames }
                </h2>
              }
              { !memorySet &&
                <button
                  className="rounded-lg shadow bg-teal-300 hover:bg-blue-300 font-sans font-semibold underline w-20 px-4 py-2 mt-6"
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
              <h2 className="text-xl underline">Process Queue</h2>
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
                      this.setState({ running: true })
                    }}
                  >
                    Run
                  </button>
                </div>
              }

              { processes.length > 0 &&
                <table className="table-auto mt-4 w-full">
                  <tr>
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Id</th>
                    <th className="px-4 py-2">Size (bytes)</th>
                    <th className="px-4 py-2">Total Time</th>
                    <th className="px-4 py-2">Run Time</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                  { processes.map((process, i) => 
                    <tr key={i} 
                      className={`flex-row rounded w-24 p-2 m-2`}
                    >
                      <td className="border px-4 py-2"> { i } </td>
                      <td className="border px-4 py-2"> { process.processId } </td>
                      <td className="border px-4 py-2"> { process.numBytes } </td>
                      <td className="border px-4 py-2"> { process.timeUnits } </td>
                      <td className="border px-4 py-2"> { process.timeRan } </td>
                      <td className="border px-4 py-2"> { process.status } </td>
                    </tr>
                  )}
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

            <div className="flex-col w-4/12 p-8">
              <h2 className="text-xl underline">Logical Memory</h2>
              { processes.filter( p => p.status === 'Running' ).map((process, i) => 
                <div key={i} 
                  className="flex-row rounded bg-blue-200 w-full p-2 m-2"
                >
                  <div>
                    Id: { process.processId }
                  </div>
                  <div>
                    Size: { process.numBytes } Bytes
                  </div>
                  <div>
                    Pages: { process.numFrames }
                  </div>
                </div>
              )}
              { availFrames > 0 &&
                <div className="flex-row rounded bg-gray-200 w-full p-2 m-2">
                  <div>
                    Size: { availFrames * pageSize } Bytes
                  </div>
                  <div>
                    Pages: { availFrames }
                  </div>
                </div>
              }
            </div>

            <div className="flex-col w-4/12 p-8">
              <h2 className="text-xl underline">Page Tables</h2>
              { Object.entries( pageTables ).map(([processId, pageTable], i) => 
                <div key={i}
                  className="rounded bg-gray-200 p-2 m-2"
                  onMouseEnter={() => this.setState({ hoverId: processId })}
                  onMouseLeave={() => this.setState({ hoverId: undefined })}
                >
                  Process: { processId }
                  { hoverId === processId && pageTable.map((table,j) => 
                    <div key={j}>
                      <span className="mx-2">Page: { table.page }</span>
                      <span className="mx-2">Frame: { table.frame }</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-col w-4/12 p-8">
              <h2 className="text-xl underline">Physical Memory</h2>
              { 
                memBlocks.map((block, i) => 
                  <div key={i} 
                    className={`flex-row rounded bg-${block.processId ? 'blue' : 'gray'}-200 w-full p-2 m-2`}
                  >
                    { block.processId &&
                      <div>
                        { block.processId }
                      </div>
                    }
                    <div>
                      Start: { block.start }
                    </div>
                    <div>
                      End: { block.end }
                    </div>
                  </div>
                )
              }
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default App;
