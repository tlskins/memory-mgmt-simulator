
export const calculateFrames = ( numFrames, availableAddresses, allocatedAddresses, totalAvailFrames ) => {
    let allocFrames = 0
    const frames = []
    let available = []
    let allocated = allocatedAddresses.map(({ start, end }) => ({ start, end }))
    availableAddresses.forEach(({ start, end }) => {
        if ( allocFrames < numFrames ) {
            let frameEnd = start + (numFrames - allocFrames)
            if ( frameEnd > end ) {
                frameEnd = end
            }
            frames.push({ start, end: frameEnd })
            allocated.push({ start, end: frameEnd })
            allocFrames += frameEnd - start
            if ( frameEnd !== end ) {
                available.push({ start: frameEnd, end })
            }
        }
        else {
            available.push({ start, end })
        }
    })

    return [
        frames,
        allocated.sort((a,b)=>a.start - b.start),
        available.sort((a,b)=>a.start-b.start),
        totalAvailFrames - allocFrames,
    ]
  }


   export const generatePageTable = (numPages, frames) => {
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