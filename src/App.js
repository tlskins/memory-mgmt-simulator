import './App.css';
import { calculateFrames, generatePageTable } from './memoryManager';
import { Component } from 'react'
import './tailwind.output.css'

class App extends Component {
  state = {
    physicalMemSize: undefined,
    pageSize: undefined,
    totalAvailFrames: undefined,
    memorySet: false,
    running: false,

    errorMsg: undefined,
    processPageTables: {},
    allocated: [],
    available: [],
    
    processes: [],
    processId: '',
    numBytes: 0,
    timeUnits: 0,
    currTime: 0,
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

  advanceTime = () => {
    const { currTime, totalAvailFrames } = this.state
    let allocFrames = 0
    const toAllocate = []
    const processes = this.state.processes.map( process => {
      if ( process.status === 'Running' ) {
        process.timeRan += 1
        if ( process.timeRan >= process.timeUnits ) {
          process.status = 'Finished'
        }
        return { ...process }
      }
      if ( process.status === 'Waiting' && process.numFrames + allocFrames <= totalAvailFrames ) {
        allocFrames += process.numFrames
        toAllocate.push(process)
        return { ...process, status: 'Running' }
      }
      return process
    })
    this.setState({ currTime: currTime+1, processes })
    this.onAllocateProcesses(processes)
  }

  onAllocateProcesses(processes) {
    let {
      processPageTables,
      available,
      allocated,
      totalAvailFrames,
    } = this.state

    let frames = []
    let newAlloc = [...allocated]
    let newAvail = [...available]
    let newTotal = totalAvailFrames
    processes.forEach(({ numFrames, processId }) => {
      const result = calculateFrames(
        numFrames,
        newAvail,
        newAlloc,
        newTotal,
      )
      frames = [...frames, ...result[0]]
      newAlloc = result[1]
      newAvail = result[2]
      newTotal = result[3]
      console.log('calc:', frames, newAlloc, newAvail, newTotal)
      processPageTables = {
        ...processPageTables,
        [processId]: generatePageTable(numFrames, frames)
      }
    })
    
    this.setState({
      allocated: newAlloc,
      available: newAvail,
      totalAvailFrames: newTotal,
      processPageTables,
    })
  }

  render() {
    const {
      allocated,
      available,
      currTime,
      errorMsg,
      physicalMemSize,
      pageSize,
      processPageTables,
      processId,
      processes,
      numBytes,
      running,
      memorySet,
      timeUnits,
      totalAvailFrames,
    } = this.state

    const physicalMemory = [
      ...allocated.map( a => ({ ...a, allocated: true })),
      ...available.map( a => ({ ...a, allocated: false })), 
    ].sort((a,b) => a.start - b.start)

    console.log('render', running, memorySet)

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
                  Available Pages: { totalAvailFrames }
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
                    this.setState({
                      memorySet: true,
                      available: [{start: 0, end: physicalMemSize / pageSize }],
                      totalAvailFrames: physicalMemSize / pageSize,
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
                    <th className="px-4 py-2">Time</th>
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
                      onClick={ this.advanceTime }
                    >
                      Advance Time
                    </button>
                  </div>
                </div>
              }
            </div>

            <div className="flex-col w-4/12 p-8">
              <h2 className="text-xl underline">Logical Memory</h2>
              { processes.map((process, i) => 
                <div key={i} 
                  className={`flex-row rounded bg-orange-200 w-24 p-2 m-2`}
                >
                  <div>
                    Id: { process.processId }
                  </div>
                  <div>
                    Size: { process.numBytes } Bytes
                  </div>
                </div>
              )}
            </div>

            <div className="flex-col w-4/12 p-8">
              <h2 className="text-xl underline">Page Tables</h2>
              { Object.entries( processPageTables ).map(([processId, pageTable], i) => 
                <div key={i}>
                  Process: { processId }
                  { pageTable.map((table,j) => 
                    <div key={j}>
                      Page: { table.page }
                      Frame: { table.frame }
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-col w-4/12 p-8">
              <h2 className="text-xl underline">Physical Memory</h2>
              { physicalMemory.map((addr, i) => 
                <div key={i} 
                  className={`flex-row rounded bg-${addr.allocated ? 'blue' : 'orange'}-200 w-24 p-2 m-2`}
                >
                  <div>
                    Start: { addr.start }
                  </div>
                  <div>
                    End: { addr.end }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default App;
