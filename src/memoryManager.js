// const PHYSICAL_MEMORY_BYTES = 100
// const PAGE_SIZE = 4


class MemoryManager {
    constructor(totalPhysicalMemoryBytes, pageSize) {
        this.physicalMemSize = totalPhysicalMemoryBytes
        this.pageSize = pageSize

        this.pageTable = {}
        this.totalAvailableMem = totalPhysicalMemoryBytes
        this.allocatedAddresses = [{ start: 11, end: 19 }, { start: 26, end: 29 }]
        // this.availableAddresses = [{ start: 0, end: totalPhysicalMemoryBytes}]
        this.availableAddresses = [{ start: 0, end: 10}, {start: 20, end: 25}, {start: 30, end: 100}]
    }

    print() {
        console.log('Total Memory:', this.physicalMemSize)
        console.log('Page Size:', this.pageSize)
        console.log('Allocated Addresses:', this.allocatedAddresses)
        console.log('Available Addresses:', this.availableAddresses)
    }

    allocateBlocks(blocks) {
        blocks.forEach( block => {
            this.allocatedAddresses.push(block)
            this.totalAvailableMem -= block.end - block.start
        })
        this.allocatedAddresses = this.allocatedAddresses.sort((a,b) => a.start - b.start)
        return blocks
  }

    removeAllocatedAddresses() {
        this.availableAddresses = this.availableAddresses
            .filter( addr => addr.start !== -1 )
            .sort((a,b) => a.start - b.start)
    }

    allocateMemBytes(numBytes) {
        let blockStart, blockEnd
        let allocated = 0
        const blocks = []

        for (let i=0; i < this.availableAddresses.length; i++) {
        const block = this.availableAddresses[i]
        console.log('iteration ',i,' blocks ', blocks)
        if ( blockStart === undefined ) {
            blockStart = block.start
            blockEnd = block.start + (numBytes - allocated)
        }

        // remove available blocks
        if ( blockEnd <= block.end ) {
            block.start = blockEnd + 1
            break
        }
        // mark block for deletion
        block.start = -1

        blockEnd = block.end
        allocated = blockEnd - blockStart
        blocks.push({ start: blockStart, end: blockEnd })
        blockStart = undefined
        blockEnd = undefined
        }
        this.removeAllocatedAddresses()
        blocks.push({ start: blockStart, end: blockEnd })
        return this.allocateBlocks(blocks)
    }
}

export default MemoryManager
