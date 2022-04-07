

export function getWord(line: string, pos: number) {
  line = line.slice(0, pos)
  const space_pos = line.search(/(\S)+$/);
  line = line.slice(space_pos).trimStart()
  return { word: line, start: space_pos } 
}