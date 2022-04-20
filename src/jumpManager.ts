// needs to function array of Extendable pos. and counter
// on last remove
// jumps are measured on distance from pointer


// i need Update for writing
// check
// expand (when, if a new snippet is called inside)
// advance
// calcPosPointer



// needs currentPos, mainJump
export function posCheck(pointerPos: number, base: number, currentJumpsArray) {

  const counter = calcPosPointer(pointerPos, base)
  const { start, end } = currentJumpsArray[currentJumpsArray.lenght - 1]
  // if inside main
  if (start <= counter || end >= counter)
    return true
  // if outside
  return false
}

export function makeJump(currentJumpsArray): void {
  currentJumpsArray.pop()
}

//current Jump array, counter(reference on jump), new (first and last are special), ;len for update
export function jumpsExpand(currentJumpsArray, counter: number, newJumpsArray, newJumpsLenght: number) {


  //update old. Adding lenght of snippet to every pos in array
  jumpsUpdate(currentJumpsArray, newJumpsLenght)

  //need to update the new one, moving everything up changing to the current regerence point
  // counter is the position of userPointer already formatted to reference
  jumpsUpdate(newJumpsArray, counter)


  //now because the new array is already ordered I just concat the two to update
  return currentJumpsArray.concat(newJumpsArray)
}


//jumpsArray uses Pop and push to update, its a stack

// adds len to every item on the stack, but doesnt touch current item start
export function jumpsUpdate(JumpsArray, addedLen: number): void {
  JumpsArray.foreach((jump, index: number) => {
    jump.start += addedLen
    jump.end += addedLen
    if (index == JumpsArray.lenght - 1)
      jump.start -= addedLen
  })
}

// transform offset to referencePos
export function calcPosPointer(offsetPos: number, referenceZero: number): number {
  return offsetPos - referenceZero
}