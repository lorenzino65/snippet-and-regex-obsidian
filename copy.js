'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * Returns a new set representing the union of a and b.
 */
function union(a, b) {
  var s = new Set(a);
  addAll(s, b);
  return s;
}
/**
 * Adds all items from the set b to a.
 */

function addAll(a, b) {
  for (var x of b) {
    a.add(x);
  }
}
/**
 * Returns whether two sets are equal
 */

function equal(a, b) {
  if (a === b) return true;
  if (a.size !== b.size) return false;

  for (var x of a) {
    if (!b.has(x)) {
      return false;
    }
  }

  return true;
}

/**
 * Base AST node
 */

class Node {
  constructor() {
    Object.defineProperty(this, 'followpos', {
      value: new Set()
    });
  }

  calcFollowpos() {
    for (var key in this) {
      if (this[key] instanceof Node) {
        this[key].calcFollowpos();
      }
    }
  }

}
/**
 * Represents a variable reference
 */

class Variable extends Node {
  constructor(name) {
    super();
    this.name = name;
  }

  copy() {
    return new Variable(this.name);
  }

}
/**
 * Represents a comment
 */

class Comment extends Node {
  constructor(value) {
    super();
    this.value = value;
  }

}
/**
 * Represents an assignment statement.
 * e.g. `variable = expression;`
 */

class Assignment extends Node {
  constructor(variable, expression) {
    super();
    this.variable = variable;
    this.expression = expression;
  }

}
/**
 * Represents an alternation.
 * e.g. `a | b`
 */

class Alternation extends Node {
  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
  }

  get nullable() {
    return this.a.nullable || this.b.nullable;
  }

  get firstpos() {
    return union(this.a.firstpos, this.b.firstpos);
  }

  get lastpos() {
    return union(this.a.lastpos, this.b.lastpos);
  }

  copy() {
    return new Alternation(this.a.copy(), this.b.copy());
  }

}
/**
 * Represents a concatenation, or chain.
 * e.g. `a b c`
 */

class Concatenation extends Node {
  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
  }

  get nullable() {
    return this.a.nullable && this.b.nullable;
  }

  get firstpos() {
    var s = this.a.firstpos;

    if (this.a.nullable) {
      s = union(s, this.b.firstpos);
    }

    return s;
  }

  get lastpos() {
    var s = this.b.lastpos;

    if (this.b.nullable) {
      s = union(s, this.a.lastpos);
    }

    return s;
  }

  calcFollowpos() {
    super.calcFollowpos();

    for (var n of this.a.lastpos) {
      addAll(n.followpos, this.b.firstpos);
    }
  }

  copy() {
    return new Concatenation(this.a.copy(), this.b.copy());
  }

}
/**
 * Represents a repetition.
 * e.g. `a+`, `b*`, or `c?`
 */

class Repeat extends Node {
  constructor(expression, op) {
    super();
    this.expression = expression;
    this.op = op;
  }

  get nullable() {
    return this.op === '*' || this.op === '?';
  }

  get firstpos() {
    return this.expression.firstpos;
  }

  get lastpos() {
    return this.expression.lastpos;
  }

  calcFollowpos() {
    super.calcFollowpos();

    if (this.op === '*' || this.op === '+') {
      for (var n of this.lastpos) {
        addAll(n.followpos, this.firstpos);
      }
    }
  }

  copy() {
    return new Repeat(this.expression.copy(), this.op);
  }

}
function buildRepetition(expression, min = 0, max = Infinity) {
  if (min < 0 || min > max) {
    throw new Error("Invalid repetition range: ".concat(min, " ").concat(max));
  }

  var res = null;

  for (var i = 0; i < min; i++) {
    res = concat(res, expression.copy());
  }

  if (max === Infinity) {
    res = concat(res, new Repeat(expression.copy(), '*'));
  } else {
    for (var _i = min; _i < max; _i++) {
      res = concat(res, new Repeat(expression.copy(), '?'));
    }
  }

  return res;
}

function concat(a, b) {
  if (!a) {
    return b;
  }

  return new Concatenation(a, b);
}
/**
 * Base class for leaf nodes
 */


class Leaf extends Node {
  get nullable() {
    return false;
  }

  get firstpos() {
    return new Set([this]);
  }

  get lastpos() {
    return new Set([this]);
  }

}
/**
 * Represents a literal value, e.g. a number
 */


class Literal extends Leaf {
  constructor(value) {
    super();
    this.value = value;
  }

  copy() {
    return new Literal(this.value);
  }

}
/**
 * Marks the end of an expression
 */

class EndMarker extends Leaf { }
/**
 * Represents a tag
 * e.g. `a:(a b)`
 */

class Tag extends Leaf {
  constructor(name) {
    super();
    this.name = name;
  }

  get nullable() {
    return true;
  }

  copy() {
    return new Tag(this.name);
  }

}

var nodes = /*#__PURE__*/Object.freeze({
  Node: Node,
  Variable: Variable,
  Comment: Comment,
  Assignment: Assignment,
  Alternation: Alternation,
  Concatenation: Concatenation,
  Repeat: Repeat,
  buildRepetition: buildRepetition,
  Literal: Literal,
  EndMarker: EndMarker,
  Tag: Tag
});

function peg$subclass(child, parent) {
  function ctor() {
    this.constructor = child;
  }

  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
}

function peg$SyntaxError(message, expected, found, location) {
  this.message = message;
  this.expected = expected;
  this.found = found;
  this.location = location;
  this.name = "SyntaxError";

  if (typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(this, peg$SyntaxError);
  }
}

peg$subclass(peg$SyntaxError, Error);

peg$SyntaxError.buildMessage = function (expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function (expectation) {
      return "\"" + literalEscape(expectation.text) + "\"";
    },
    "class": function (expectation) {
      var escapedParts = "",
        i;

      for (i = 0; i < expectation.parts.length; i++) {
        escapedParts += expectation.parts[i] instanceof Array ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1]) : classEscape(expectation.parts[i]);
      }

      return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
    },
    any: function (expectation) {
      return "any character";
    },
    end: function (expectation) {
      return "end of input";
    },
    other: function (expectation) {
      return expectation.description;
    }
  };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\0/g, '\\0').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/[\x00-\x0F]/g, function (ch) {
      return '\\x0' + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) {
      return '\\x' + hex(ch);
    });
  }

  function classEscape(s) {
    return s.replace(/\\/g, '\\\\').replace(/\]/g, '\\]').replace(/\^/g, '\\^').replace(/-/g, '\\-').replace(/\0/g, '\\0').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/[\x00-\x0F]/g, function (ch) {
      return '\\x0' + hex(ch);
    }).replace(/[\x10-\x1F\x7F-\x9F]/g, function (ch) {
      return '\\x' + hex(ch);
    });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = new Array(expected.length),
      i,
      j;

    for (i = 0; i < expected.length; i++) {
      descriptions[i] = describeExpectation(expected[i]);
    }

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }

      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== void 0 ? options : {};

  var FAILED = {},
    peg$startRuleFunctions = {
      rules: peg$parserules
    },
    peg$startRuleFunction = peg$parserules,
    peg$c0 = function (s) {
      return s;
    },
    hashtag = "#",
    peg$c2 = peg$literalExpectation("#", false),
    peg$c3 = /^[^\r\n]/,
    peg$c4 = peg$classExpectation(["\r", "\n"], true, false),
    startingNewLine = /^[\r\n]/,
    peg$c6 = peg$classExpectation(["\r", "\n"], false, false),
    peg$c7 = function (v) {
      return new n.Comment(v.join(''));
    },
    frontslash = "/",
    frontslashLiteral = peg$literalExpectation("/", false),
    setAssign = function (v, e) {
      return new n.Assignment(v, e);
    },
    setVariable = function (v) {
      return new n.Variable(v);
    },
    peg$c14 = "|",
    peg$c15 = peg$literalExpectation("|", false),
    peg$c16 = function (a, b) {
      return new n.Alternation(a, b);
    },
    setConcatenation = function (a, b) {
      return new n.Concatenation(a, b);
    },
    peg$c18 = ":",
    peg$c19 = peg$literalExpectation(":", false),
    setTag = function (t, e) {
      return new n.Concatenation(e, new n.Tag(t));
    },
    asterisk = "*",
    asteriskLiteral = peg$literalExpectation("*", false),
    setAsteriskRepeat = function (t) {
      return new n.Repeat(t, '*');
    },
    questionMark = "?",
    questionMarkLiteral = peg$literalExpectation("?", false),
    setQuestionMarkRepeat = function (t) {
      return new n.Repeat(t, '?');
    },
    PlusSign = "+",
    PlusSignLiteral = peg$literalExpectation("+", false),
    setPlusRepeat = function (t) {
      return new n.Repeat(t, '+');
    },
    OpenGraphParenthesis = "{",
    OpenGraphParenthesisLiteral = peg$literalExpectation("{", false),
    CloseGraphParenthesis = "}",
    CloseGraphParenthesisLiteral = peg$literalExpectation("}", false),
    setFixedRepetition = function (t, m) {
      return n.buildRepetition(t, m, m);
    },
    comma = ",",
    commaLiteral = peg$literalExpectation(",", false),
    setMinRepetition = function (t, min) {
      return n.buildRepetition(t, min, Infinity);
    },
    setMaxRepetition = function (t, max) {
      return n.buildRepetition(t, 0, max);
    },
    setRepetition = function (t, min, max) {
      return n.buildRepetition(t, min, max);
    },
    setLiteral = function (x) {
      return new n.Literal(x);
    },
    openRoundParenthesis = "(",
    openRoundParenthesisLiteral = peg$literalExpectation("(", false),
    closedRoundParenthesis = ")",
    closedRoundParenthesisLiteral = peg$literalExpectation(")", false),
    returnArgument = function (e) {
      return e;
    },
    wordCharacters = /^\w/,
    wordCharactersClass = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "_"], false, false),
    digits = /^[0-9]/,
    digitsClass = peg$classExpectation([["0", "9"]], false, false),
    setNumber = function (num) {
      return parseInt(num.join(''));
    },
    peg$c55 = /^[ \t\r\n]/,
    peg$c56 = peg$classExpectation([" ", "\t", "\r", "\n"], false, false),
    currPos = 0,
    peg$posDetailsCache = [{
      line: 1,
      column: 1
    }],
    peg$maxFailPos = 0,
    peg$maxFailExpected = [],
    peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function peg$literalExpectation(text, ignoreCase) {
    return {
      type: "literal",
      text: text,
      ignoreCase: ignoreCase
    };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return {
      type: "class",
      parts: parts,
      inverted: inverted,
      ignoreCase: ignoreCase
    };
  }

  function peg$endExpectation() {
    return {
      type: "end"
    };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos],
      p;

    if (details) {
      return details;
    } else {
      p = pos - 1;

      while (!peg$posDetailsCache[p]) {
        p--;
      }

      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;
      return details;
    }
  }

  function peg$computeLocation(startPos, endPos) {
    var startPosDetails = peg$computePosDetails(startPos),
      endPosDetails = peg$computePosDetails(endPos);
    return {
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
  }

  function setFail(expected) {
    if (currPos < peg$maxFailPos) {
      return;
    }

    if (currPos > peg$maxFailPos) {
      peg$maxFailPos = currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(peg$SyntaxError.buildMessage(expected, found), expected, found, location);
  }

  function peg$parserules() {
    var s0, s1;
    s0 = [];
    s1 = peg$parsestatement();

    if (s1 !== FAILED) {
      while (s1 !== FAILED) {
        s0.push(s1);
        s1 = peg$parsestatement();
      }
    } else {
      s0 = FAILED;
    }

    return s0;
  }

  function peg$parsestatement() {
    var s0, s1, s2;
    s0 = currPos;
    s1 = parseAssignmentOrComment();

    if (s1 !== FAILED) {
      s2 = parseSpaces();

      if (s2 !== FAILED) {
        s1 = peg$c0(s1);
        s0 = s1;
      } else {
        currPos = s0;
        s0 = FAILED;
      }
    } else {
      currPos = s0;
      s0 = FAILED;
    }

    return s0;
  }

  function parseAssignmentOrComment() {
    var s0;
    s0 = parseAssignment();

    if (s0 === FAILED) {
      s0 = peg$parsecomment();
    }

    return s0;
  }

  function peg$parsecomment() {
    var s0, s1, s2, s3;
    s0 = currPos;

    if (input.charCodeAt(currPos) === 35) {
      s1 = hashtag;
      currPos++;
    } else {
      s1 = FAILED;

      {
        setFail(peg$c2);
      }
    }

    if (s1 !== FAILED) {
      s2 = [];

      if (peg$c3.test(input.charAt(currPos))) {
        s3 = input.charAt(currPos);
        currPos++;
      } else {
        s3 = FAILED;

        {
          setFail(peg$c4);
        }
      }

      while (s3 !== FAILED) {
        s2.push(s3);

        if (peg$c3.test(input.charAt(currPos))) {
          s3 = input.charAt(currPos);
          currPos++;
        } else {
          s3 = FAILED;

          {
            setFail(peg$c4);
          }
        }
      }

      if (s2 !== FAILED) {
        if (startingNewLine.test(input.charAt(currPos))) {
          s3 = input.charAt(currPos);
          currPos++;
        } else {
          s3 = FAILED;

          {
            setFail(peg$c6);
          }
        }

        if (s3 !== FAILED) {
          s1 = peg$c7(s2);
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

    return s0;
  }

  function parseAssignment() {
    var s0, s1, s2, s3, s4, s5, s6, s7;
    s0 = currPos;
    s1 = parseVariable();

    if (s1 !== FAILED) {
      s2 = parseSpaces();

      if (s2 !== FAILED) {
        if (input.charCodeAt(currPos) === 47) {
          s3 = frontslash;
          currPos++;
        } else {
          s3 = FAILED;

          {
            setFail(frontslashLiteral);
          }
        }

        if (s3 !== FAILED) {
          s4 = parseSpaces();

          if (s4 !== FAILED) {
            s5 = parseAlternation();

            if (s5 !== FAILED) {
              s6 = parseSpaces();

              if (s6 !== FAILED) {
                if (input.charCodeAt(currPos) === 47) {
                  s7 = frontslash;
                  currPos++;
                } else {
                  s7 = FAILED;

                  {
                    setFail(frontslashLiteral);
                  }
                }

                if (s7 !== FAILED) {
                  s1 = setAssign(s1, s5);
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
    } else {
      currPos = s0;
      s0 = FAILED;
    }

    return s0;
  }

  function parseVariable() {
    var s0, s1;
    s0 = currPos;
    s1 = parseName();

    if (s1 !== FAILED) {
      s1 = setVariable(s1);
    }

    s0 = s1;
    return s0;
  }

  function parseAlternation() {
    var s0, s1, s2, s3, s4, s5;
    s0 = currPos;
    s1 = parseConcatenation();

    if (s1 !== FAILED) {
      s2 = parseSpaces();

      if (s2 !== FAILED) {
        if (input.charCodeAt(currPos) === 124) {
          s3 = peg$c14;
          currPos++;
        } else {
          s3 = FAILED;

          {
            setFail(peg$c15);
          }
        }

        if (s3 !== FAILED) {
          s4 = parseSpaces();

          if (s4 !== FAILED) {
            s5 = parseAlternation();

            if (s5 !== FAILED) {
              s1 = peg$c16(s1, s5);
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
      } else {
        currPos = s0;
        s0 = FAILED;
      }
    } else {
      currPos = s0;
      s0 = FAILED;
    }

    if (s0 === FAILED) {
      s0 = parseConcatenation();
    }

    return s0;
  }

  function parseConcatenation() {
    var s0, s1, s2, s3;
    s0 = currPos;
    s1 = parseRepeat();

    if (s1 !== FAILED) {
      s2 = parseSpaces();

      if (s2 !== FAILED) {
        s3 = parseConcatenation();

        if (s3 !== FAILED) {
          s1 = setConcatenation(s1, s3);
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

    if (s0 === FAILED) {
      s0 = parseRepeat();
    }

    return s0;
  }

  function parseRepeat() {
    var s0, s1, s2, s3, s4, s5, s6;
    s0 = currPos;
    s1 = parseName();

    if (s1 !== FAILED) {
      if (input.charCodeAt(currPos) === 58) {
        s2 = peg$c18;
        currPos++;
      } else {
        s2 = FAILED;

        {
          setFail(peg$c19);
        }
      }
      if (s2 !== FAILED) {
        s3 = parseRepeat();

        if (s3 !== FAILED) {
          s1 = setTag(s1, s3);
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

    if (s0 === FAILED) {
      s0 = currPos;
      s1 = parseTerm();

      if (s1 !== FAILED) {
        if (input.charCodeAt(currPos) === 42) {
          s2 = asterisk;
          currPos++;
        } else {
          s2 = FAILED;

          {
            setFail(asteriskLiteral);
          }
        }

        if (s2 !== FAILED) {
          s1 = setAsteriskRepeat(s1);
          s0 = s1;
        } else {
          currPos = s0;
          s0 = FAILED;
        }
      } else {
        currPos = s0;
        s0 = FAILED;
      }

      if (s0 === FAILED) {
        s0 = currPos;
        s1 = parseTerm();

        if (s1 !== FAILED) {
          if (input.charCodeAt(currPos) === 63) {
            s2 = questionMark;
            currPos++;
          } else {
            s2 = FAILED;
            {
              setFail(questionMarkLiteral);
            }
          }


          if (s2 !== FAILED) {
            s1 = setQuestionMarkRepeat(s1);
            s0 = s1;
          } else {
            currPos = s0;
            s0 = FAILED;
          }
        } else {
          currPos = s0;
          s0 = FAILED;
        }

        if (s0 === FAILED) {
          s0 = currPos;
          s1 = parseTerm();

          if (s1 !== FAILED) {
            if (input.charCodeAt(currPos) === 43) {
              s2 = PlusSign;
              currPos++;
            } else {
              s2 = FAILED;

              {
                setFail(PlusSignLiteral);
              }
            }

            if (s2 !== FAILED) {
              s1 = setPlusRepeat(s1);
              s0 = s1;
            } else {
              currPos = s0;
              s0 = FAILED;
            }
          } else {
            currPos = s0;
            s0 = FAILED;
          }

          if (s0 === FAILED) {
            s0 = currPos;
            s1 = parseTerm();

            if (s1 !== FAILED) {
              if (input.charCodeAt(currPos) === 123) {
                s2 = OpenGraphParenthesis;
                currPos++;
              } else {
                s2 = FAILED;

                {
                  setFail(OpenGraphParenthesisLiteral);
                }
              }

              if (s2 !== FAILED) {
                s3 = parseNumber();

                if (s3 !== FAILED) {
                  if (input.charCodeAt(currPos) === 125) {
                    s4 = CloseGraphParenthesis;
                    currPos++;
                  } else {
                    s4 = FAILED;

                    {
                      setFail(CloseGraphParenthesisLiteral);
                    }
                  }

                  if (s4 !== FAILED) {
                    s1 = setFixedRepetition(s1, s3);
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
            } else {
              currPos = s0;
              s0 = FAILED;
            }

            if (s0 === FAILED) {
              s0 = currPos;
              s1 = parseTerm();

              if (s1 !== FAILED) {
                if (input.charCodeAt(currPos) === 123) {
                  s2 = OpenGraphParenthesis;
                  currPos++;
                } else {
                  s2 = FAILED;

                  {
                    setFail(OpenGraphParenthesisLiteral);
                  }
                }

                if (s2 !== FAILED) {
                  s3 = parseNumber();

                  if (s3 !== FAILED) {
                    if (input.charCodeAt(currPos) === 44) {
                      s4 = comma;
                      currPos++;
                    } else {
                      s4 = FAILED;

                      {
                        setFail(commaLiteral);
                      }
                    }

                    if (s4 !== FAILED) {
                      if (input.charCodeAt(currPos) === 125) {
                        s5 = CloseGraphParenthesis;
                        currPos++;
                      } else {
                        s5 = FAILED;

                        {
                          setFail(CloseGraphParenthesisLiteral);
                        }
                      }

                      if (s5 !== FAILED) {
                        s1 = setMinRepetition(s1, s3);
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
                } else {
                  currPos = s0;
                  s0 = FAILED;
                }
              } else {
                currPos = s0;
                s0 = FAILED;
              }

              if (s0 === FAILED) {
                s0 = currPos;
                s1 = parseTerm();

                if (s1 !== FAILED) {
                  if (input.charCodeAt(currPos) === 123) {
                    s2 = OpenGraphParenthesis;
                    currPos++;
                  } else {
                    s2 = FAILED;

                    {
                      setFail(OpenGraphParenthesisLiteral);
                    }
                  }

                  if (s2 !== FAILED) {
                    if (input.charCodeAt(currPos) === 44) {
                      s3 = comma;
                      currPos++;
                    } else {
                      s3 = FAILED;

                      {
                        setFail(commaLiteral);
                      }
                    }

                    if (s3 !== FAILED) {
                      s4 = parseNumber();

                      if (s4 !== FAILED) {
                        if (input.charCodeAt(currPos) === 125) {
                          s5 = CloseGraphParenthesis;
                          currPos++;
                        } else {
                          s5 = FAILED;

                          {
                            setFail(CloseGraphParenthesisLiteral);
                          }
                        }

                        if (s5 !== FAILED) {
                          s1 = setMaxRepetition(s1, s4);
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
                  } else {
                    currPos = s0;
                    s0 = FAILED;
                  }
                } else {
                  currPos = s0;
                  s0 = FAILED;
                }

                if (s0 === FAILED) {
                  s0 = currPos;
                  s1 = parseTerm();

                  if (s1 !== FAILED) {
                    if (input.charCodeAt(currPos) === 123) {
                      s2 = OpenGraphParenthesis;
                      currPos++;
                    } else {
                      s2 = FAILED;

                      {
                        setFail(OpenGraphParenthesisLiteral);
                      }
                    }

                    if (s2 !== FAILED) {
                      s3 = parseNumber();

                      if (s3 !== FAILED) {
                        if (input.charCodeAt(currPos) === 44) {
                          s4 = comma;
                          currPos++;
                        } else {
                          s4 = FAILED;

                          {
                            setFail(commaLiteral);
                          }
                        }

                        if (s4 !== FAILED) {
                          s5 = parseNumber();

                          if (s5 !== FAILED) {
                            if (input.charCodeAt(currPos) === 125) {
                              s6 = CloseGraphParenthesis;
                              currPos++;
                            } else {
                              s6 = FAILED;

                              {
                                setFail(CloseGraphParenthesisLiteral);
                              }
                            }

                            if (s6 !== FAILED) {
                              s1 = setRepetition(s1, s3, s5);
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

                  if (s0 === FAILED) {
                    s0 = parseTerm();
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function parseTerm() {
    var s0, s1, s2, s3;
    s0 = parseVariable();

    if (s0 === FAILED) {
      s0 = currPos;
      s1 = parseNumber();

      if (s1 !== FAILED) {
        s1 = setLiteral(s1);
      }

      s0 = s1;

      if (s0 === FAILED) {
        s0 = currPos;

        if (input.charCodeAt(currPos) === 40) {
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
            if (input.charCodeAt(currPos) === 41) {
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
    }

    return s0;
  }

  function parseName() {
    var s0, s1, s2
    s0 = currPos;
    s1 = []

    s2 = parseNameChar();

    if (s2 !== FAILED) {
      s1 = [];
      while (s2 !== FAILED) {
        s1.push(s2);
        s2 = parseNameChar();
      }
    } else {
      s1 = FAILED
    }

    if (s1 !== FAILED) {
      s1 = s1.join('');
      s0 = s1;
    } else {
      currPos = s0;
      s0 = FAILED;
    }
    return s0;
  }

  function parseNameChar() {
    var s0;

    if (wordCharacters.test(input.charAt(currPos))) {
      s0 = input.charAt(currPos);
      currPos++;
    } else {
      s0 = FAILED;
      {
        setFail(wordCharactersClass);
      }
    }
    return s0;
  }

  function parseNumber() {
    var s0, s1, s2;
    s0 = currPos;
    s1 = [];

    if (digits.test(input.charAt(currPos))) {
      s2 = input.charAt(currPos);
      currPos++;
    } else {
      s2 = FAILED;

      {
        setFail(digitsClass);
      }
    }

    if (s2 !== FAILED) {
      while (s2 !== FAILED) {
        s1.push(s2);

        if (digits.test(input.charAt(currPos))) {
          s2 = input.charAt(currPos);
          currPos++;
        } else {
          s2 = FAILED;

          {
            setFail(digitsClass);
          }
        }
      }
    } else {
      s1 = FAILED;
    }

    if (s1 !== FAILED) {
      s1 = setNumber(s1);
    }

    s0 = s1;
    return s0;
  }

  function parseSpaces() {
    var s0, s1;
    s0 = [];

    if (peg$c55.test(input.charAt(currPos))) {
      s1 = input.charAt(currPos);
      currPos++;
    } else {
      s1 = FAILED;

      {
        setFail(peg$c56);
      }
    }

    while (s1 !== FAILED) {
      s0.push(s1);

      if (peg$c55.test(input.charAt(currPos))) {
        s1 = input.charAt(currPos);
        currPos++;
      } else {
        s1 = FAILED;

        {
          setFail(peg$c56);
        }
      }
    }

    return s0;
  }

  var n = nodes;
  peg$result = peg$startRuleFunction();

  if (peg$result !== FAILED && currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== FAILED && currPos < input.length) {
      setFail(peg$endExpectation());
    }

    throw peg$buildStructuredError(peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
  }
}

var grammar = {
  SyntaxError: peg$SyntaxError,
  parse: peg$parse
};

/**
 * Processes a list of statements into a symbol table
 */

class SymbolTable {
  constructor(statements, externalSymbols = {}) {
    this.variables = {};
    this.symbols = {};
    this.main = null;
    this.size = 0;
    this.addExternalSymbols(externalSymbols);
    this.process(statements);
  }

  addExternalSymbols(externalSymbols) {
    for (var key in externalSymbols) {
      this.variables[key] = new Literal(externalSymbols[key]);
      this.symbols[key] = externalSymbols[key];
      this.size++;
    }
  }

  process(statements) {
    for (var statement of statements) {
      if (statement instanceof Assignment) {
        this.variables[statement.variable.name] = this.processExpression(statement.expression);

        if (statement.expression instanceof Literal) {
          this.symbols[statement.variable.name] = statement.expression.value;
          this.size++;
        }
      }
    }

    this.main = this.variables.main;

    if (!this.main) {
      throw new Error('No main variable declaration found');
    }
  }

  processExpression(expr) {
    // Process children
    for (var key in expr) {
      if (expr[key] instanceof Node) {
        expr[key] = this.processExpression(expr[key]);
      }
    } // Replace variable references with their values


    if (expr instanceof Variable) {
      var value = this.variables[expr.name];
      if (value == null) throw new Error("Undeclared indentifier ".concat(expr.name));
      expr = this.processExpression(value.copy());
    }

    return expr;
  }

}

var END_MARKER = new EndMarker();
/**
 * This is an implementation of the direct regular expression to DFA algorithm described
 * in section 3.9.5 of "Compilers: Principles, Techniques, and Tools" by Aho,
 * Lam, Sethi, and Ullman. http://dragonbook.stanford.edu
 * There is a PDF of the book here:
 * http://www.informatik.uni-bremen.de/agbkb/lehre/ccfl/Material/ALSUdragonbook.pdf
 */

function buildDFA(root, numSymbols) {
  root = new Concatenation(root, END_MARKER);
  root.calcFollowpos();
  var failState = new State(new Set(), numSymbols);
  var initialState = new State(root.firstpos, numSymbols);
  var dstates = [failState, initialState]; // while there is an unmarked state S in dstates

  while (1) {
    var s = null;

    for (var j = 1; j < dstates.length; j++) {
      if (!dstates[j].marked) {
        s = dstates[j];
        break;
      }
    }

    if (s == null) {
      break;
    } // mark S


    s.marked = true; // for each input symbol a

    for (var a = 0; a < numSymbols; a++) {
      // let U be the union of followpos(p) for all
      //  p in S that correspond to a
      var u = new Set();

      for (var p of s.positions) {
        if (p instanceof Literal && p.value === a) {
          addAll(u, p.followpos);
        }
      }

      if (u.size === 0) {
        continue;
      } // if U is not in dstates


      var ux = -1;

      for (var i = 0; i < dstates.length; i++) {
        if (equal(u, dstates[i].positions)) {
          ux = i;
          break;
        }
      }

      if (ux === -1) {
        // Add U as an unmarked state to dstates
        dstates.push(new State(u, numSymbols));
        ux = dstates.length - 1;
      }

      s.transitions[a] = ux;
    }
  }

  return dstates;
}

class State {
  constructor(positions, len) {
    this.positions = positions;
    this.transitions = new Uint16Array(len);
    this.accepting = positions.has(END_MARKER);
    this.marked = false;
    this.tags = new Set();

    for (var pos of positions) {
      if (pos instanceof Tag) {
        this.tags.add(pos.name);
      }
    }
  }

}

var INITIAL_STATE = 1;
var FAIL_STATE = 0;
/**
 * A StateMachine represents a deterministic finite automaton.
 * It can perform matches over a sequence of values, similar to a regular expression.
 */

class StateMachine {
  constructor(dfa) {
    this.stateTable = dfa.stateTable;
    this.accepting = dfa.accepting;
    this.tags = dfa.tags;
  }
  /**
   * Returns an iterable object that yields pattern matches over the input sequence.
   * Matches are of the form [startIndex, endIndex, tags].
   */


  match(str) {
    var self = this;
    var state = INITIAL_STATE;
    var startRun = null;
    var lastAccepting = null;
    var lastState = null;
    for (var s = 0; s < str.length - 1; s++) {
      for (var p = s; p < str.length; p++) {
        var c = str[p];
        lastState = state;
        state = self.stateTable[state][c];

        if (state === FAIL_STATE) {
          // yield the last match if any
          if (startRun != null && lastAccepting == str.length - 1) {
            return [startRun, self.tags[lastState]];
          } // reset the state as if we started over from the initial state


          state = self.stateTable[INITIAL_STATE][c];
          startRun = null;
        } // start a run if not in the failure state


        if (state !== FAIL_STATE && startRun == null) {
          startRun = p;
        } // if accepting, mark the potential match end


        if (self.accepting[state]) {
          lastAccepting = p;
        } // reset the state to the initial state if we get into the failure state


        if (state === FAIL_STATE) {
          state = INITIAL_STATE;
        }
      } // yield the last match if any

    }


    if (startRun != null && lastAccepting == str.length - 1) {

      return [startRun, self.tags[state]];
    }
    return [-1, []]
  }
  /**
   * For each match over the input sequence, action functions matching
   * the tag definitions in the input pattern are called with the startIndex,
   * endIndex, and sub-match sequence.
   */


  apply(str, actions) {
    for (var [start, end, tags] of this.match(str)) {
      for (var tag of tags) {
        if (typeof actions[tag] === 'function') {
          actions[tag](start, end, str.slice(start, end + 1));
        }
      }
    }
  }

}

function parse(string, externalSymbols) {
  var ast = grammar.parse(string);
  return new SymbolTable(ast, externalSymbols);
}
function build(symbolTable) {
  var states = buildDFA(symbolTable.main, symbolTable.size);
  return new StateMachine({
    stateTable: states.map(s => Array.from(s.transitions)),
    accepting: states.map(s => s.accepting),
    tags: states.map(s => Array.from(s.tags))
  });
}
function compile(string, externalSymbols) {
  return build(parse(string, externalSymbols));
}

exports.build = build;
exports.default = compile;
exports.parse = parse;
//# sourceMappingURL=compile.js.map
