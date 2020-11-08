import logo from './logo.svg';
import './App.css';
// import MemoryManager from './memoryManager';
import { Component } from 'react'

class App extends Component {
  state = {
    physicalMemSize: 40,
    pageSize: 2,
  
    totalAvailableMem: 40 - 8,
    processPageTables: {},
    allocatedAddresses: [
      { start: 4, end: 8 },
      { start: 12, end: 16 },
    ],
    availableAddresses: [
      { start: 0, end: 3 },
      { start: 9, end: 11 },
      { start: 17, end: 20 },
    ],
  }

  componentDidMount() {
    // const mm = new MemoryManager( 40, 2 )
    // mm.requestMemory("P1", 6)
    // mm.print()
  }

  print() {
    const {
      physicalMemSize,
      pageSize,
      allocatedAddresses,
      availableAddresses,
      processPageTables,
    } = this.state
    console.log('Total Memory:', physicalMemSize)
    console.log('Page Size:', pageSize)
    console.log('Allocated Addresses:', allocatedAddresses)
    console.log('Available Addresses:', availableAddresses)
    console.log('PageTables: ', JSON.stringify(processPageTables, undefined, 2 ))
  }

  requestMemory(processId, numBytes) {
    const { pageSize, processPageTables } = this.state
    const numPages = Math.ceil( numBytes / pageSize )
    const totalBytesReq = numPages * pageSize
    console.log(`Requesting: totalBytesReq: ${totalBytesReq} totalPages: ${numPages}`)
    if ( totalBytesReq > this.state.totalAvailableMem ) {
        return false
    }

    const [frames, allocatedAddresses, availableAddresses, totalAvailableMem] = this._calculateFrames(numPages)
    const pageTable = this._generatePageTable(numPages, frames)

    this.setState({
      allocatedAddresses,
      availableAddresses,
      totalAvailableMem,
      processPageTables: { ...processPageTables, [processId]: pageTable }
    })
    return true
  }

  // page tables

  _generatePageTable(numPages, frames) {
    const pageTable = []
    let { start, end } = frames.shift()
    for (let i=0;i<numPages; i++) {
        if ( start > end ) {
            const frame = frames.shift()
            start = frame.start
            end = frame.end
        }
        pageTable.push({
            page: i,
            frame: start,
        })
        start += 1
    }
    return pageTable
  }

  // physical memory

  _calculateFrames(numFrames) {
    const { pageSize } = this.state
    let { availableAddresses, allocatedAddresses, totalAvailableMem } = this.state

    // build frames
    let frameStart, frameEnd
    let allocated = 0
    const frames = []
    const removedIdx = []
    for (let i=0; i < availableAddresses.length; i++) {
        const frame = availableAddresses[i]
        if ( frameStart === undefined ) {
            frameStart = frame.start
            frameEnd = frame.start + (numFrames - allocated)
        }

        // decrement frame capacity
        if ( frameEnd <= frame.end ) {
            frame.start = frameEnd
            if ( frame.start === frame.end ) {
                removedIdx.push(i)
            }
            break
        }
        // mark frame for deletion
        removedIdx.push(i)

        frameEnd = frame.end
        allocated = frameEnd - frameStart
        frames.push({ start: frameStart, end: frameEnd })
        frameStart = undefined
        frameEnd = undefined
    }
    frames.push({ start: frameStart, end: frameEnd })

    // remove marked for deletion
    availableAddresses = availableAddresses
        .filter( (_,idx) => removedIdx.includes(idx) )
        .sort((a,b) => a.start - b.start)

    // allocate frames
    totalAvailableMem -= frames.reduce((acc, frame) => (frame.end - frame.start) * pageSize + acc, 0.0)
    allocatedAddresses = [...allocatedAddresses, ...frames].sort((a,b) => a.start - b.start)

    return [frames, allocatedAddresses, availableAddresses, totalAvailableMem]
  }

  render() {
    const {
      physicalMemSize,
      pageSize,
      allocatedAddresses,
      availableAddresses,
      processPageTables,
    } = this.state

    return(
      <div className="App">
        <div className="flex-row w-full p-8">
          <div className="flex flex-col">
            <h2>
              Total Memory: <span> { physicalMemSize } </span> bytes
            </h2>
            <h2>
              Page Size: <span> { pageSize } </span> bytes
            </h2>
          </div>
        </div>
        
        <div className="flex-row w-full p-8">
          <h2>Allocated Frames</h2>
          { allocatedAddresses.map((addr, i) => 
            <div key={i}>
              Start: { addr.start }
              End: { addr.end }
            </div>
          )}
        </div>

        <div className="flex-row w-full p-8">
          <h2>Available Frames</h2>
          { availableAddresses.map((addr, i) => 
            <div key={i}>
              Start: { addr.start }
              End: { addr.end }
            </div>
          )}
        </div>

        <div className="flex-row w-full p-8">
          <h2>Page Tables</h2>
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
      </div>
    )
  }
}

export default App;
