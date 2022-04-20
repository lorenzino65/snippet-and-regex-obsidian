

export function getWord(line: string, pos: number) {
  line = line.slice(0, pos)
  const space_pos = line.search(/(\S)+$/);
  line = line.slice(space_pos).trimStart()
  return { word: line, start: space_pos }
}

export function checkContext(contextNum: number, contextCondition: any[]) {
  if (contextNum === 0) {
    return true
  }

}

export function parseResponse(match: string | any[], variables: string[]): [string, any[]] {
  let jumps = []
  if (Array.isArray(match)) {
    //
    match = match.toString()
  }
  return [match, jumps]
}

