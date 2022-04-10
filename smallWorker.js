function parseTerm() {
  var s0, s1, s2, s3;

  s0 = currPos;
  s1 = parseChar();

  s0 = s1;

  // (expression)
  if (s0 === FAILED) {
    s0 = currPos;

    if (input.charCodeAt(currPos) === ("(").charCodeAt(0)) {
      s1 = openRoundParenthesis;
      currPos++;
    } else {
      s1 = FAILED;

      {
        setFail(openRoundParenthesisLiteral);
      }
    }

    if (s1 !== FAILED) {
      s2 = parseAlternation();

      if (s2 !== FAILED) {
        if (input.charCodeAt(currPos) === (")").charCodeAt(0)) {
          s3 = closedRoundParenthesis;
          currPos++;
        } else {
          s3 = FAILED;

          {
            setFail(closedRoundParenthesisLiteral);
          }
        }

        if (s3 !== FAILED) {
          s1 = returnArgument(s2);
          s0 = s1;
        } else {
          currPos = s0;
          s0 = FAILED;
        }
      } else {
        currPos = s0;
        s0 = FAILED;
      }
    } else {
      currPos = s0;
      s0 = FAILED;
    }
  }

  //[range]
  if (s0 === FAILED) {
    s0 = currPos;

    if (input.charCodeAt(currPos) === ("[").charCodeAt(0)) {
      s1 = openSquareParenthesis;
      currPos++;
    } else {
      s1 = FAILED;

      {
        setFail(openSquareParenthesisLiteral);
      }
    }

    if (s1 !== FAILED) {
      s2 = parseRange();

      if (s2 !== FAILED) {
        if (input.charCodeAt(currPos) === ("]").charCodeAt(0)) {
          s3 = closedSquareParenthesis;
          currPos++;
        } else {
          s3 = FAILED;

          {
            setFail(closedSquareParenthesisLiteral);
          }
        }

        if (s3 !== FAILED) {
          s1 = returnArgument(s2);
          s0 = s1;
        } else {
          currPos = s0;
          s0 = FAILED;
        }
      } else {
        currPos = s0;
        s0 = FAILED;
      }
    } else {
      currPos = s0;
      s0 = FAILED;
    }
  }

  //{Variable}
  if (s0 === FAILED) {
    s0 = currPos;

    if (input.charCodeAt(currPos) === ("{").charCodeAt(0)) {
      s1 = openGraphParenthesis;
      currPos++;
    } else {
      s1 = FAILED;

      {
        setFail(openGraphParenthesisLiteral);
      }
    }

    if (s1 !== FAILED) {
      s2 = parseVariable();

      if (s2 !== FAILED) {
        if (input.charCodeAt(currPos) === ("}").charCodeAt(0)) {
          s3 = closedGraphParenthesis;
          currPos++;
        } else {
          s3 = FAILED;

          {
            setFail(closedGraphParenthesisLiteral);
          }
        }

        if (s3 !== FAILED) {
          s1 = returnArgument(s2);
          s0 = s1;
        } else {
          currPos = s0;
          s0 = FAILED;
        }
      } else {
        currPos = s0;
        s0 = FAILED;
      }
    } else {
      currPos = s0;
      s0 = FAILED;
    }
  }


  return s0;
}
function parseBackSlash() {
  let s0, s1
  s0 = currPos;

  if (input.charCodeAt(currPos) === ("\\").charCodeAt(0)) {
    s1 = backslash
    currPos++;
  } else {
    s1 = FAILED;
    {
      setFail(metaCharactersClass);
    }
  }

  if (s1 !== FAILED) {
    s0 = s1
  } else {
    currPos = s0;
    s0 = FAILED
  }
  return s0;
}
function parseChar() {
  let s0, s1, s2

  s0 = currPos;
  s1 = parseBackSlash();

  if (s1 !== FAILED) {
    //first thing update s0
    s0 = currPos;
    //b,f,n,r,t,v   d,s,w,D,S,W
    if (input.charCodeAt(currPos) === ("b").charCodeAt(0)) {
      s2 = backSpace//\b
      currPos++
    } else {
      s2 = FAILED

      {
        setFail(backSpaceLiteral)
      }
    }

    if (s2 !== FAILED) {
      s1 = setLiteral("\b");
      s0 = s1
    } else {
      currPos = s0
      s0 = FAILED
    }

    if (s0 === FAILED) {

      //f,n,r,t,v   d,s,w,D,S,W
      if (input.charCodeAt(currPos) === ("f").charCodeAt(0)) {
        s2 = FormFeed;
        currPos++;
      } else {
        s2 = FAILED;

        {
          setFail(formFeedLiteral);
        }
      }

      if (s2 !== FAILED) {
        s1 = setLiteral("\f");
        s0 = s1;
      } else {
        currPos = s0;
        s0 = FAILED;
      }

      if (s0 === FAILED) {

        //n,r,t,v   d,s,w,D,S,W
        if (input.charCodeAt(currPos) === ("n").charCodeAt(0)) {
          s2 = newLine;
          currPos++;
        } else {
          s2 = FAILED;
          {
            setFail(newLineLiteral);
          }
        }

        if (s2 !== FAILED) {
          s1 = setLiteral("\n");
          s0 = s1;
        } else {
          currPos = s0;
          s0 = FAILED;
        }

        if (s0 === FAILED) {

          //r,t,v   d,s,w,D,S,W
          if (input.charCodeAt(currPos) === ("r").charCodeAt(0)) {
            s2 = carriageReturn;
            currPos++;
          } else {
            s2 = FAILED;
            {
              setFail(carriageReturnLiteral);
            }
          }

          if (s2 !== FAILED) {
            s1 = setLiteral("\r");
            s0 = s1;
          } else {
            currPos = s0;
            s0 = FAILED;
          }

          if (s0 === FAILED) {

            //t,v   d,s,w,D,S,W
            if (input.charCodeAt(currPos) === ("t").charCodeAt(0)) {
              s2 = horizontalTab;
              currPos++;
            } else {
              s2 = FAILED;
              {
                setFail(horizontalTabLiteral);
              }
            }

            if (s2 !== FAILED) {
              s1 = setLiteral("\t");
              s0 = s1;
            } else {
              currPos = s0;
              s0 = FAILED;
            }

            if (s0 === FAILED) {

              //v   d,s,w,D,S,W
              if (input.charCodeAt(currPos) === ("v").charCodeAt(0)) {
                s2 = verticalTab;
                currPos++;
              } else {
                s2 = FAILED;
                {
                  setFail(verticalTabLiteral);
                }
              }

              if (s2 !== FAILED) {
                s1 = setLiteral("\v");
                s0 = s1;
              } else {
                currPos = s0;
                s0 = FAILED;
              }

              if (s0 === FAILED) {

                //d,s,w,D,S,W
                //this is the new system, every letter from now has
                // a specific Alternation linked if i can, or i create a new Value later
                if (input.charCodeAt(currPos) === ("d").charCodeAt(0)) {
                  s2 = digits;
                  currPos++;
                } else {
                  s2 = FAILED;
                  {
                    setFail(digitsClass);
                  }
                }

                if (s2 !== FAILED) {
                  s1 = setLiteral("\f"); // Alternation
                  s0 = s1;
                } else {
                  currPos = s0;
                  s0 = FAILED;
                }

                if (s0 === FAILED) {

                  //s,w,D,S,W
                  //this is the new system, every letter from now has
                  // a specific Alternation linked if i can, or i create a new Value later
                  if (input.charCodeAt(currPos) === ("s").charCodeAt(0)) {
                    s2 = spaces;
                    currPos++;
                  } else {
                    s2 = FAILED;
                    {
                      setFail(spacesClass);
                    }
                  }

                  if (s2 !== FAILED) {
                    s1 = setLiteral("\f");//Alternation
                    s0 = s1;
                  } else {
                    currPos = s0;
                    s0 = FAILED;
                  }

                  if (s0 === FAILED) {

                    //w,D,S,W
                    // specific Alternation linked if i can, or i create a new Value later
                    if (input.charCodeAt(currPos) === ("w").charCodeAt(0)) {
                      s2 = alphanumeric;
                      currPos++;
                    } else {
                      s2 = FAILED;
                      {
                        setFail(alphanumericClass);
                      }
                    }

                    if (s2 !== FAILED) {
                      s1 = setLiteral("\f");//Alternation
                      s0 = s1;
                    } else {
                      currPos = s0;
                      s0 = FAILED;
                    }

                    if (s0 === FAILED) {

                      //D,S,W
                      // specific Alternation linked if i can, or i create a new Value later
                      if (input.charCodeAt(currPos) === ("D").charCodeAt(0)) {
                        s2 = nonDigits;
                        currPos++;
                      } else {
                        s2 = FAILED;
                        {
                          setFail(nonDigitsClass);
                        }
                      }

                      if (s2 !== FAILED) {
                        s1 = setLiteral("\f");//Alternation
                        s0 = s1;
                      } else {
                        currPos = s0;
                        s0 = FAILED;
                      }

                      if (s0 === FAILED) {

                        //S,W
                        // specific Alternation linked if i can, or i create a new Value later
                        if (input.charCodeAt(currPos) === ("S").charCodeAt(0)) {
                          s2 = nonSpaces;
                          currPos++;
                        } else {
                          s2 = FAILED;
                          {
                            setFail(nonSpacesClass);
                          }
                        }

                        if (s2 !== FAILED) {
                          s1 = setLiteral("\f");//Alternation
                          s0 = s1;
                        } else {
                          currPos = s0;
                          s0 = FAILED;
                        }

                        if (s0 === FAILED) {

                          //W
                          // specific Alternation linked if i can, or i create a new Value later
                          if (input.charCodeAt(currPos) === ("W").charCodeAt(0)) {
                            s2 = nonAlphanumeric;
                            currPos++;
                          } else {
                            s2 = FAILED;
                            {
                              setFail(nonAlphanumericClass);
                            }
                          }

                          if (s2 !== FAILED) {
                            s1 = setLiteral("\f");//Alternation
                            s0 = s1;
                          } else {
                            currPos = s0;
                            s0 = FAILED;
                          }

                          if (s0 === FAILED) {
                            //All other characters
                            s2 = input.charCodeAt(currPos);
                            currPos++;
                            s1 = setLiteral(s2)
                            s0 = s1
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  else {
    currPos = s0;
    s0 = FAILED;

  }


  //point
  if (s0 === FAILED) {
    s0 = currPos;

    if (input.charCodeAt(currPos) === (".").charCodeAt(0)) {
      s1 = point;
      currPos++;
    } else {
      s1 = FAILED;

      {
        setFail(pointLiteral);
      }
    }

    if (s1 !== FAILED) {
      s1 = setLiteral("\f");//Alternation for every non space character
      s0 = s1;
    } else {
      currPos = s0;
      s0 = FAILED;
    }
  }

  //every non metacharacter {}[]())$|*+?
  if (s0 === FAILED) {
    s0 = currPos
    if (nonMetaCharacters.test(input.charAt(currPos))) {
      s1 = input.charAt(currPos);
      currPos++;
    } else {
      s1 = FAILED;
      {
        setFail(nonMetaCharactersClass);
      }
    }
    if (s1 !== FAILED) {
      s0 = setLiteral(s1)
    } else {
      currPos = s0
      s0 = FAILED
    }
  }

  return s0
}
function parseRangeChar() {
  let s0, s1, s2

  s0 = currPos;
  s1 = parseBackSlash();

  if (s1 !== FAILED) {
    //first thing update s0
    s0 = currPos;
    //b,f,n,r,t,v   d,s,w,D,S,W
    if (input.charCodeAt(currPos) === ("b").charCodeAt(0)) {
      s2 = backSpace//\b
      currPos++
    } else {
      s2 = FAILED

      {
        setFail(backSpaceLiteral)
      }
    }

    if (s2 !== FAILED) {
      s1 = setLiteral("\b");
      s0 = s1
    } else {
      currPos = s0
      s0 = FAILED
    }

    if (s0 === FAILED) {

      //f,n,r,t,v   d,s,w,D,S,W
      if (input.charCodeAt(currPos) === ("f").charCodeAt(0)) {
        s2 = FormFeed;
        currPos++;
      } else {
        s2 = FAILED;

        {
          setFail(formFeedLiteral);
        }
      }

      if (s2 !== FAILED) {
        s1 = setLiteral("\f");
        s0 = s1;
      } else {
        currPos = s0;
        s0 = FAILED;
      }

      if (s0 === FAILED) {

        //n,r,t,v   d,s,w,D,S,W
        if (input.charCodeAt(currPos) === ("n").charCodeAt(0)) {
          s2 = newLine;
          currPos++;
        } else {
          s2 = FAILED;
          {
            setFail(newLineLiteral);
          }
        }

        if (s2 !== FAILED) {
          s1 = setLiteral("\n");
          s0 = s1;
        } else {
          currPos = s0;
          s0 = FAILED;
        }

        if (s0 === FAILED) {

          //r,t,v   d,s,w,D,S,W
          if (input.charCodeAt(currPos) === ("r").charCodeAt(0)) {
            s2 = carriageReturn;
            currPos++;
          } else {
            s2 = FAILED;
            {
              setFail(carriageReturnLiteral);
            }
          }

          if (s2 !== FAILED) {
            s1 = setLiteral("\r");
            s0 = s1;
          } else {
            currPos = s0;
            s0 = FAILED;
          }

          if (s0 === FAILED) {

            //t,v   d,s,w,D,S,W
            if (input.charCodeAt(currPos) === ("t").charCodeAt(0)) {
              s2 = horizontalTab;
              currPos++;
            } else {
              s2 = FAILED;
              {
                setFail(horizontalTabLiteral);
              }
            }

            if (s2 !== FAILED) {
              s1 = setLiteral("\t");
              s0 = s1;
            } else {
              currPos = s0;
              s0 = FAILED;
            }

            if (s0 === FAILED) {

              //v   d,s,w,D,S,W
              if (input.charCodeAt(currPos) === ("v").charCodeAt(0)) {
                s2 = verticalTab;
                currPos++;
              } else {
                s2 = FAILED;
                {
                  setFail(verticalTabLiteral);
                }
              }

              if (s2 !== FAILED) {
                s1 = setLiteral("\v");
                s0 = s1;
              } else {
                currPos = s0;
                s0 = FAILED;
              }

              if (s0 === FAILED) {

                //d,s,w,D,S,W
                //this is the new system, every letter from now has
                // a specific Alternation linked if i can, or i create a new Value later
                if (input.charCodeAt(currPos) === ("d").charCodeAt(0)) {
                  s2 = digits;
                  currPos++;
                } else {
                  s2 = FAILED;
                  {
                    setFail(digitsClass);
                  }
                }

                if (s2 !== FAILED) {
                  s1 = setLiteral("\f"); // Alternation
                  s0 = s1;
                } else {
                  currPos = s0;
                  s0 = FAILED;
                }

                if (s0 === FAILED) {

                  //s,w,D,S,W
                  //this is the new system, every letter from now has
                  // a specific Alternation linked if i can, or i create a new Value later
                  if (input.charCodeAt(currPos) === ("s").charCodeAt(0)) {
                    s2 = spaces;
                    currPos++;
                  } else {
                    s2 = FAILED;
                    {
                      setFail(spacesClass);
                    }
                  }

                  if (s2 !== FAILED) {
                    s1 = setLiteral("\f");//Alternation
                    s0 = s1;
                  } else {
                    currPos = s0;
                    s0 = FAILED;
                  }

                  if (s0 === FAILED) {

                    //w,D,S,W
                    // specific Alternation linked if i can, or i create a new Value later
                    if (input.charCodeAt(currPos) === ("w").charCodeAt(0)) {
                      s2 = alphanumeric;
                      currPos++;
                    } else {
                      s2 = FAILED;
                      {
                        setFail(alphanumericClass);
                      }
                    }

                    if (s2 !== FAILED) {
                      s1 = setLiteral("\f");//Alternation
                      s0 = s1;
                    } else {
                      currPos = s0;
                      s0 = FAILED;
                    }

                    if (s0 === FAILED) {

                      //D,S,W
                      // specific Alternation linked if i can, or i create a new Value later
                      if (input.charCodeAt(currPos) === ("D").charCodeAt(0)) {
                        s2 = nonDigits;
                        currPos++;
                      } else {
                        s2 = FAILED;
                        {
                          setFail(nonDigitsClass);
                        }
                      }

                      if (s2 !== FAILED) {
                        s1 = setLiteral("\f");//Alternation
                        s0 = s1;
                      } else {
                        currPos = s0;
                        s0 = FAILED;
                      }

                      if (s0 === FAILED) {

                        //S,W
                        // specific Alternation linked if i can, or i create a new Value later
                        if (input.charCodeAt(currPos) === ("S").charCodeAt(0)) {
                          s2 = nonSpaces;
                          currPos++;
                        } else {
                          s2 = FAILED;
                          {
                            setFail(nonSpacesClass);
                          }
                        }

                        if (s2 !== FAILED) {
                          s1 = setLiteral("\f");//Alternation
                          s0 = s1;
                        } else {
                          currPos = s0;
                          s0 = FAILED;
                        }

                        if (s0 === FAILED) {

                          //W
                          // specific Alternation linked if i can, or i create a new Value later
                          if (input.charCodeAt(currPos) === ("W").charCodeAt(0)) {
                            s2 = nonAlphanumeric;
                            currPos++;
                          } else {
                            s2 = FAILED;
                            {
                              setFail(nonAlphanumericClass);
                            }
                          }

                          if (s2 !== FAILED) {
                            s1 = setLiteral("\f");//Alternation
                            s0 = s1;
                          } else {
                            currPos = s0;
                            s0 = FAILED;
                          }

                          if (s0 === FAILED) {
                            //All other characters
                            s2 = input.charCodeAt(currPos);
                            currPos++;
                            s1 = setLiteral(s2)
                            s0 = s1
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  else {
    currPos = s0;
    s0 = FAILED;

  }


  //every non metacharacter {}[]())$|*+?
  if (s0 === FAILED) {
    s0 = currPos
    if (nonMetaCharacters.test(input.charAt(currPos))) {
      s1 = input.charAt(currPos);
      currPos++;
    } else {
      s1 = FAILED;
      {
        setFail(nonMetaCharactersClass);
      }
    }
    if (s1 !== FAILED) {
      s0 = setLiteral(s1)
    } else {
      currPos = s0
      s0 = FAILED
    }
  }

  return s0
}
function parseRange(){
  //check if first is ^ or -
  //add to an Alternation
}