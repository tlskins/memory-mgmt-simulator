
class MemoryManager {
    constructor(totalPhysicalMemoryBytes, pageSize) {
        this.physicalMemSize = totalPhysicalMemoryBytes
        this.pageSize = pageSize

        this.processPageTables = {}
        this.totalAvailableMem = totalPhysicalMemoryBytes - 8
        this.allocatedAddresses = [{ start: 4, end: 8 }, { start: 12, end: 16 }]
        // this.availableAddresses = [{ start: 0, end: totalPhysicalMemoryBytes}]
        this.availableAddresses = [{ start: 0, end: 3}, {start: 9, end: 11}, {start: 17, end: 20}]
    }

    print() {
        console.log('Total Memory:', this.physicalMemSize)
        console.log('Page Size:', this.pageSize)
        console.log('Allocated Addresses:', this.allocatedAddresses)
        console.log('Available Addresses:', this.availableAddresses)
        console.log('PageTables: ', JSON.stringify(this.processPageTables, undefined, 2 ))
    }

    requestMemory(processId, numBytes) {
        const pages = Math.ceil( numBytes / this.pageSize )
        const totalBytesReq = pages * this.pageSize
        console.log(`totalBytesReq: ${totalBytesReq} totalPages: ${pages}`)
        if ( totalBytesReq > this.totalAvailableMem ) {
            return false
        }

        this.nextLogicalAddress++
        const blocks = this._allocatePhysicalMem(pages)
        this.processPageTables[processId] = this._generatePageTable(pages, blocks)
        return true
    }

    // page tables

    _generatePageTable(pages, blocks) {
        const pageTable = []
        let { start, end } = blocks.shift()
        for (let i=0;i<pages; i++) {
            if ( start > end ) {
                const block = blocks.shift()
                start = block.start
                end = block.end
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

    _allocateFrames(frames) {
        frames.forEach( frame => {
            this.allocatedAddresses.push(frame)
            this.totalAvailableMem -= (frame.end - frame.start) * this.pageSize
        })
        this.allocatedAddresses = this.allocatedAddresses.sort((a,b) => a.start - b.start)
        return frames
  }

    _removeAllocatedAddresses() {
        this.availableAddresses = this.availableAddresses
            .filter( addr => addr.start !== -1 )
            .sort((a,b) => a.start - b.start)
    }

    _allocatePhysicalMem(numFrames) {
        let frameStart, frameEnd
        let allocated = 0
        const frames = []

        for (let i=0; i < this.availableAddresses.length; i++) {
            const frame = this.availableAddresses[i]
            if ( frameStart === undefined ) {
                frameStart = frame.start
                frameEnd = frame.start + (numFrames - allocated)
            }

            // decrement frame capacity
            if ( frameEnd <= frame.end ) {
                frame.start = frameEnd
                if ( frame.start === frame.end ) {
                    frame.start = -1
                }
                break
            }
            // mark frame for deletion
            frame.start = -1

            frameEnd = frame.end
            allocated = frameEnd - frameStart
            frames.push({ start: frameStart, end: frameEnd })
            frameStart = undefined
            frameEnd = undefined
        }
        this._removeAllocatedAddresses()
        frames.push({ start: frameStart, end: frameEnd })
        return this._allocateFrames(frames)
    }
}

export default MemoryManager
