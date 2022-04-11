'use strict';

const { arrayBuffer } = require("stream/consumers");

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
 * Represents a definition reference
 */

class Definition extends Node {
  constructor(name) {
    super();
    this.name = name;
  }

  copy() {
    return new Definition(this.name);
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
  Definition: Definition,
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

function SyntaxErrorObject(message, expected, found, location) {
  this.message = message;
  this.expected = expected;
  this.found = found;
  this.location = location;
  this.name = "SyntaxError";

  if (typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(this, SyntaxErrorObject);
  }
}

peg$subclass(SyntaxErrorObject, Error);

SyntaxErrorObject.buildMessage = function (expected, found) {
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

function parseFuntion(input, options) {
  options = options !== void 0 ? options : {};

  var FAILED = {},
    startRuleFunctions = {
      rules: parseRules
    },
    startRuleFunction = parseRules,
    definitionsArea = true,
    hashtag = "#",
    hashtagClass = literalExpectation("#", false),
    nonSpaces = /^[^\r\n]/,
    nonSpacesClass = classExpectation(["\r", "\n"], true, false),
    startingNewLine = /^[\r\n]/,
    startingNewLineClass = classExpectation(["\r", "\n"], false, false),
    nonMetaCharacters = /[^\{\}\[\]\(\)\$\|\*\+\?\/]/,
    nonMetaCharactersClass = classExpectation(["{", "}", "[", "]", "(", ")", "$", "|", "*", "+", "?", "/"], true, false),
    setComment = function (v) {
      return new n.Comment(v.join(''));
    },
    backslash = "\\",
    backslashLiteral = literalExpectation("\\", false),
    frontslash = "/",
    frontslashLiteral = literalExpectation("/", false),
    setAssign = function (v, e) {
      return new n.Assignment(v, e);
    },
    setVariable = function (v) {
      return new n.Variable(v);
    },
    setDefinition = function (v) {
      return new n.Definition(v);
    },
    orChar = "|",
    orCharLiteral = literalExpectation("|", false),
    setAlternation = function (a, b) {
      return new n.Alternation(a, b);
    },
    setConcatenation = function (a, b) {
      return new n.Concatenation(a, b);
    },
    point = ".",
    pointLiteral = literalExpectation(".", false),
    colon = ":",
    colonLiteral = literalExpectation(":", false),
    setTag = function (t, e) {
      return new n.Concatenation(e, new n.Tag(t));
    },
    asterisk = "*",
    asteriskLiteral = literalExpectation("*", false),
    setAsteriskRepeat = function (t) {
      return new n.Repeat(t, '*');
    },
    questionMark = "?",
    questionMarkLiteral = literalExpectation("?", false),
    setQuestionMarkRepeat = function (t) {
      return new n.Repeat(t, '?');
    },
    PlusSign = "+",
    PlusSignLiteral = literalExpectation("+", false),
    setPlusRepeat = function (t) {
      return new n.Repeat(t, '+');
    },
    setFixedRepetition = function (t, m) {
      return n.buildRepetition(t, m, m);
    },
    comma = ",",
    commaLiteral = literalExpectation(",", false),
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
    openRoundParenthesisLiteral = literalExpectation("(", false),
    closedRoundParenthesis = ")",
    closedRoundParenthesisLiteral = literalExpectation(")", false),
    openSquareParenthesis = "[",
    openSquareParenthesisLiteral = literalExpectation("[", false),
    closedSquareParenthesis = "]",
    closedSquareParenthesisLiteral = literalExpectation("]", false),
    openGraphParenthesis = "{",
    openGraphParenthesisLiteral = literalExpectation("{", false),
    closedGraphParenthesis = "}",
    closedGraphParenthesisLiteral = literalExpectation("}", false),
    returnArgument = function (e) {
      return e;
    },
    wordCharacters = /^\w/,
    wordCharactersClass = classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "_"], false, false),
    digits = /^[0-9]/,
    digitsClass = classExpectation([["0", "9"]], false, false),
    setNumber = function (num) {
      return parseInt(num.join(''));
    },
    spaces = /^[ \t\r\n]/,
    spacesClass = classExpectation([" ", "\t", "\r", "\n"], false, false),
    currPos = 0,
    peg$posDetailsCache = [{
      line: 1,
      column: 1
    }],
    maxFailPos = 0,
    maxFailExpectedArray = [],
    peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    startRuleFunction = startRuleFunctions[options.startRule];
  }

  function literalExpectation(text, ignoreCase) {
    return {
      type: "literal",
      text: text,
      ignoreCase: ignoreCase
    };
  }

  function classExpectation(parts, inverted, ignoreCase) {
    return {
      type: "class",
      parts: parts,
      inverted: inverted,
      ignoreCase: ignoreCase
    };
  }

  function endExpectation() {
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

  function computeLocation(startPos, endPos) {
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
    if (currPos < maxFailPos) {
      return;
    }

    if (currPos > maxFailPos) {
      maxFailPos = currPos;
      maxFailExpectedArray = [];
    }

    maxFailExpectedArray.push(expected);
  }

  function buildStructuredError(expected, found, location) {
    return new SyntaxErrorObject(SyntaxErrorObject.buildMessage(expected, found), expected, found, location);
  }

  function parseRules() {
    var s0, s1;
    s0 = [];
    s1 = parseStatement();

    if (s1 !== FAILED) {
      while (s1 !== FAILED) {
        s0.push(s1);
        s1 = parseStatement();
      }
    } else {
      s0 = FAILED;
    }

    return s0;
  }

  function parseStatement() {
    var s0, s1, s2;
    s0 = currPos;
    s1 = parseAssignmentOrComment();

    if (s1 !== FAILED) {
      s2 = parseSpaces();

      if (s2 !== FAILED) {
        s1 = returnArgument(s1);
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

    s0 = parseComment();
    if (s0 === FAILED) {
      s0 = parseAssignment();
    }

    return s0;
  }

  function parseComment() {
    var s0, s1, s2, s3;
    s0 = currPos;

    if (input.charCodeAt(currPos) === "#".charCodeAt(0)) {
      s1 = hashtag;
      currPos++;
    } else {
      s1 = FAILED;

      {
        setFail(hashtagClass);
      }
    }

    if (s1 !== FAILED) {
      if (input.charCodeAt(currPos) === "#".charCodeAt(0)) {
        definitionsArea = !definitionsArea
      }
    }

    if (s1 !== FAILED) {
      s2 = [];

      if (nonSpaces.test(input.charAt(currPos))) {
        s3 = input.charAt(currPos);
        currPos++;
      } else {
        s3 = FAILED;

        {
          setFail(nonSpacesClass);
        }
      }

      while (s3 !== FAILED) {
        s2.push(s3);

        if (nonSpaces.test(input.charAt(currPos))) {
          s3 = input.charAt(currPos);
          currPos++;
        } else {
          s3 = FAILED;

          {
            setFail(nonSpacesClass);
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
            setFail(startingNewLineClass);
          }
        }

        if (s3 !== FAILED) {
          s1 = setComment(s2);
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
    if (definitionsArea) {
      s1 = parseDefinition()
    } else {
      s1 = parseVariable();
    }

    if (s1 !== FAILED) {
      s2 = parseSpaces();

      if (s2 !== FAILED) {
        if (input.charCodeAt(currPos) === "/".charCodeAt(0)) {
          s3 = frontslash;
          currPos++;
        } else {
          s3 = FAILED;

          {
            setFail(frontslashLiteral);
          }
        }

        if (s3 !== FAILED) {
          s5 = parseAlternation();

          if (s5 !== FAILED) {

            if (input.charCodeAt(currPos) === "/".charCodeAt(0)) {
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
  function parseDefinition() {
    var s0, s1;
    s0 = currPos;
    s1 = parseName();

    if (s1 !== FAILED) {
      s1 = setDefinition(s1);
    }

    s0 = s1;
    return s0;
  }

  function parseAlternation() {
    var s0, s1, s2, s3;
    s0 = currPos;
    s1 = parseConcatenation();

    if (s1 !== FAILED) {
      if (input.charCodeAt(currPos) === ("|").charCodeAt(0)) {
        s2 = orChar;
        currPos++;
      } else {
        s2 = FAILED;

        {
          setFail(orCharLiteral);
        }
      }

      if (s2 !== FAILED) {
        s3 = parseAlternation();

        if (s3 !== FAILED) {
          s1 = setAlternation(s1, s3);
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
      s0 = parseConcatenation();
    }
    return s0;
  }

  function parseConcatenation() {
    var s0, s1, s2;
    s0 = currPos;
    s1 = parseRepeat();

    if (s1 !== FAILED) {
      s2 = parseConcatenation();

      if (s2 !== FAILED) {
        s1 = setConcatenation(s1, s2);
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
      s0 = parseRepeat();
    }

    return s0;
  }

  function parseRepeat() {
    var s0, s1, s2, s3, s4, s5, s6;
    s0 = currPos;
    s1 = parseTerm();

    if (s1 !== FAILED) {
      if (input.charCodeAt(currPos) === "*".charCodeAt(0)) {
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
        if (input.charCodeAt(currPos) === "?".charCodeAt(0)) {
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
          if (input.charCodeAt(currPos) === "+".charCodeAt(0)) {
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
            if (input.charCodeAt(currPos) === "{".charCodeAt(0)) {
              s2 = openGraphParenthesis;
              currPos++;
            } else {
              s2 = FAILED;

              {
                setFail(openGraphParenthesisLiteral);
              }
            }

            if (s2 !== FAILED) {
              s3 = parseNumber();

              if (s3 !== FAILED) {
                if (input.charCodeAt(currPos) === "}".charCodeAt(0)) {
                  s4 = closedGraphParenthesis;
                  currPos++;
                } else {
                  s4 = FAILED;

                  {
                    setFail(closedGraphParenthesisLiteral);
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
              if (input.charCodeAt(currPos) === "{".charCodeAt(0)) {
                s2 = openGraphParenthesis;
                currPos++;
              } else {
                s2 = FAILED;

                {
                  setFail(openGraphParenthesisLiteral);
                }
              }

              if (s2 !== FAILED) {
                s3 = parseNumber();

                if (s3 !== FAILED) {
                  if (input.charCodeAt(currPos) === ",".charCodeAt(0)) {
                    s4 = comma;
                    currPos++;
                  } else {
                    s4 = FAILED;

                    {
                      setFail(commaLiteral);
                    }
                  }

                  if (s4 !== FAILED) {
                    if (input.charCodeAt(currPos) === "}".charCodeAt(0)) {
                      s5 = closedGraphParenthesis;
                      currPos++;
                    } else {
                      s5 = FAILED;

                      {
                        setFail(closedGraphParenthesisLiteral);
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
                if (input.charCodeAt(currPos) === "{".charCodeAt(0)) {
                  s2 = openGraphParenthesis;
                  currPos++;
                } else {
                  s2 = FAILED;

                  {
                    setFail(openGraphParenthesisLiteral);
                  }
                }

                if (s2 !== FAILED) {
                  if (input.charCodeAt(currPos) === ",".charCodeAt(0)) {
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
                      if (input.charCodeAt(currPos) === "}".charCodeAt(0)) {
                        s5 = closedGraphParenthesis;
                        currPos++;
                      } else {
                        s5 = FAILED;

                        {
                          setFail(closedGraphParenthesisLiteral);
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
                  if (input.charCodeAt(currPos) === "{".charCodeAt(0)) {
                    s2 = openGraphParenthesis;
                    currPos++;
                  } else {
                    s2 = FAILED;

                    {
                      setFail(openGraphParenthesisLiteral);
                    }
                  }

                  if (s2 !== FAILED) {
                    s3 = parseNumber();

                    if (s3 !== FAILED) {
                      if (input.charCodeAt(currPos) === ",".charCodeAt(0)) {
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
                          if (input.charCodeAt(currPos) === "}".charCodeAt(0)) {
                            s6 = closedGraphParenthesis;
                            currPos++;
                          } else {
                            s6 = FAILED;

                            {
                              setFail(closedGraphParenthesisLiteral);
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
        s2 = parseWholeRange();

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

    //{Definition}
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
        s2 = parseDefinition();

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

  function parseWholeRange() {
    //primo carattere ^ o - speciali

    //controllare per ogni altro char se seguito da - 
    // o se uno slash controllare wWsSdD

    var s0, s1, s2, s3, s4;
    s0 = currPos;
    s1 = [];


    if (input.charCodeAt(currPos) === "^".charCodeAt(0)) {
      s2 = inverseChar;
      currPos++;
    } else {
      s2 = FAILED;

      {
        setFail(inverseCharLiteral);
      }
    }

    if (s2 !== FAILED) {
      s0 = currPos
      s2 = parseAntiRange(true) // return Alternation or char or Failed
      s3 = []

      if (s2 !== FAILED) {
        while (s2 !== FAILED) {
          s3 = s3.concat(s2)
          s2 = parseAntiRange()
        }
      } else {
        s3 = s2
      }

      if (s3 !== FAILED) {
        s1 = setAntiRange(s3);// s1 was an Array of integers codeChars to remove
      }else{
        s1 = s3
      }
    } else {
      s0 = currPos
      s2 = parseRange(true) // return Alternation or char or Failed

      if (s2 !== FAILED) {
        while (s2 !== FAILED) {
          s1 = setAlternation(s1, s2)
          s2 = parseRange()
        }
      } else {
        s1 = parseRange()
      }
    }







    if (s1 !== FAILED) {
      s1 = setNumber(s1);
    }

    s0 = s1;
    return s0;
  }
  function parseRange(first = false) {

    //controllare i cosi con la \ davanti, e ] e - 

    let s0, s1, s2

    s0 = currPos;
    if (first) {
      s1 = parseFirstRangeChar(); // return Failed or char (accept "]")

    } else {
      s1 = parseRangeChar(); // return Failed or char (doesnt accept "]")
    }

    if (s1 !== FAILED) {

      s0 = currPos;
      if (input.charCodeAt(currPos) === "-".charCodeAt(0)) {
        currPos++
        s2 = parseRangeChar()
        if (s2 !== FAILED) {
          s1 = setRange(s1, s2)
        } else {
          if (input.charCodeAt(currPos) === "]".charCodeAt(0)) {
            s2 = setLiteral("-")
            currPos++
            s1 = setAlternation(s1, s2)
          } else {
            currPos = s0
            s0 = FAILED;
          }
        }
      } else {
        s0 = setLiteral(s1)
      }
    } else {
      currPos = s0
      s0 = currPos;
      s1 = parseBackSlash();


      if (s1 !== FAILED) {
        //first thing update s0
        s0 = currPos;
        //d,s,w,D,S,W
        if (input.charCodeAt(currPos) === ("d").charCodeAt(0)) {
          s2 = digits//\b
          currPos++
        } else {
          s2 = FAILED

          {
            setFail(digitsClass)
          }
        }

        if (s2 !== FAILED) {
          s1 = setDigitsRange()
          s0 = s1
        } else {
          currPos = s0
          s0 = FAILED
        }

        if (s0 === FAILED) {
          s0 = currPos
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
            s1 = setSpacesRange();//Alternation
            s0 = s1;
          } else {
            currPos = s0;
            s0 = FAILED;
          }

          if (s0 === FAILED) {
            s0 = currPos
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
              s1 = setWordRange() //Alternation
              s0 = s1;
            } else {
              currPos = s0;
              s0 = FAILED;
            }

            if (s0 === FAILED) {
              s0 = currPos
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
                s1 = setNonDigitsRange();//Alternation
                s0 = s1;
              } else {
                currPos = s0;
                s0 = FAILED;
              }

              if (s0 === FAILED) {
                s0 = currPos
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
                  s1 = setNonSpacesRange();//Alternation
                  s0 = s1;
                } else {
                  currPos = s0;
                  s0 = FAILED;
                }

                if (s0 === FAILED) {
                  s0 = currPos
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
                    s1 = setNonWordRange()//Alternation
                    s0 = s1;
                  } else {
                    currPos = s0;
                    s0 = FAILED;
                  }

                  if (s0 === FAILED) {
                    currPos = s0
                    s0 = FAILED
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
        s1 = s2;
        s0 = s1
      } else {
        currPos = s0
        s0 = FAILED
      }

      if (s0 === FAILED) {
        s0 = currPos
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
          s1 = s2;
          s0 = s1;
        } else {
          currPos = s0;
          s0 = FAILED;
        }

        if (s0 === FAILED) {
          s0 = currPos
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
            s1 = s2;
            s0 = s1;
          } else {
            currPos = s0;
            s0 = FAILED;
          }

          if (s0 === FAILED) {
            s0 = currPos
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
              s1 = s2;
              s0 = s1;
            } else {
              currPos = s0;
              s0 = FAILED;
            }

            if (s0 === FAILED) {
              s0 = currPos
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
                s1 = s2;
                s0 = s1;
              } else {
                currPos = s0;
                s0 = FAILED;
              }

              if (s0 === FAILED) {
                s0 = currPos
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
                  s1 = s2;
                  s0 = s1;
                } else {
                  currPos = s0;
                  s0 = FAILED;
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

    if (s0 === FAILED) {
      s0 = currPos
      if (/[^\]\\]/.test(input.charCodeAt(currPos))) {
        if (input.charCodeAt(currPos) === NaN) {
          s0 = FAILED
        } else {
          currPos++
          s0 = input.charAt(currPos);
        }
      } else {
        s0 = FAILED
      }
    }

    return s0
  }
  function parseFirstRangeChar() {
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
        s1 = s2;
        s0 = s1
      } else {
        currPos = s0
        s0 = FAILED
      }

      if (s0 === FAILED) {
        s0 = currPos
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
          s1 = s2;
          s0 = s1;
        } else {
          currPos = s0;
          s0 = FAILED;
        }

        if (s0 === FAILED) {
          s0 = currPos
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
            s1 = s2;
            s0 = s1;
          } else {
            currPos = s0;
            s0 = FAILED;
          }

          if (s0 === FAILED) {
            s0 = currPos
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
              s1 = s2;
              s0 = s1;
            } else {
              currPos = s0;
              s0 = FAILED;
            }

            if (s0 === FAILED) {
              s0 = currPos
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
                s1 = s2;
                s0 = s1;
              } else {
                currPos = s0;
                s0 = FAILED;
              }

              if (s0 === FAILED) {
                s0 = currPos
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
                  s1 = s2;
                  s0 = s1;
                } else {
                  currPos = s0;
                  s0 = FAILED;
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

    if (s0 === FAILED) {
      s0 = currPos
      if (/[^\\]/.test(input.charCodeAt(currPos))) {
        if (input.charCodeAt(currPos) === NaN) {
          s0 = FAILED
        } else {
          currPos++
          s0 = input.charAt(currPos);
        }
      } else {
        s0 = FAILED
      }
    }

    return s0
  }

  function parseAntiRange(first = false) {

    //controllare i cosi con la \ davanti, e ] e - 

    let s0, s1, s2

    s0 = currPos;
    if (first) {
      s1 = parseFirstRangeChar(); // return Failed or char (accept "]")

    } else {
      s1 = parseRangeChar(); // return Failed or char (doesnt accept "]")
    }

    if (s1 !== FAILED) {

      s0 = currPos;
      if (input.charCodeAt(currPos) === "-".charCodeAt(0)) {
        currPos++
        s2 = parseRangeChar()
        if (s2 !== FAILED) {
          s1 = setPreAntiRange(s1,s2) // goes from s1 to s2 and returns an array
        } else {
          if (input.charCodeAt(currPos) === "]".charCodeAt(0)) {
            s2 = setLiteral("-")
            currPos++
            s1 = [s1.charCodeAt(0), s2.charCodeAt(0)]
          } else {
            currPos = s0
            s0 = FAILED;
          }
        }
      } else {
        s0 = [s1.charCodeAt(0)]
      }
    } else {
      currPos = s0
      s0 = currPos;
      s1 = parseBackSlash();


      if (s1 !== FAILED) {
        //first thing update s0
        s0 = currPos;
        //d,s,w,D,S,W
        if (input.charCodeAt(currPos) === ("d").charCodeAt(0)) {
          s2 = digits//\b
          currPos++
        } else {
          s2 = FAILED

          {
            setFail(digitsClass)
          }
        }

        if (s2 !== FAILED) {
          s1 = setDigitsAntiRange() //array
          s0 = s1
        } else {
          currPos = s0
          s0 = FAILED
        }

        if (s0 === FAILED) {
          s0 = currPos
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
            s1 = setSpacesAntiRange();//array
            s0 = s1;
          } else {
            currPos = s0;
            s0 = FAILED;
          }

          if (s0 === FAILED) {
            s0 = currPos
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
              s1 = setWordAntiRange() //array
              s0 = s1;
            } else {
              currPos = s0;
              s0 = FAILED;
            }

            if (s0 === FAILED) {
              s0 = currPos
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
                s1 = setNonDigitsAntiRange();//array
                s0 = s1;
              } else {
                currPos = s0;
                s0 = FAILED;
              }

              if (s0 === FAILED) {
                s0 = currPos
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
                  s1 = setNonSpacesAntiRange();//array
                  s0 = s1;
                } else {
                  currPos = s0;
                  s0 = FAILED;
                }

                if (s0 === FAILED) {
                  s0 = currPos
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
                    s1 = setNonWordAntiRange() //array
                    s0 = s1;
                  } else {
                    currPos = s0;
                    s0 = FAILED;
                  }

                  if (s0 === FAILED) {
                    currPos = s0
                    s0 = FAILED
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
    }

    return s0

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
        setFail(backslashLiteral);
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
        s0 = currPos
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
          s0 = currPos
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
            s0 = currPos
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
              s0 = currPos
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
                s0 = currPos
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
                  s0 = currPos
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
                    s0 = currPos
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
                      s0 = currPos
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
                        s0 = currPos
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
                          s0 = currPos
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
                            s0 = currPos
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
                              s0 = currPos
                              s2 = input.charCodeAt(currPos);
                              currPos++;
                              if (s2 !== NaN) {
                                s1 = setLiteral(s2)
                                s0 = s1
                              } else {
                                currPos = s0
                                s0 = FAILED
                                //broken
                                return s0
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


    //every non metacharacter {}[]()/$|*+?
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

  function parseSpaces() {
    var s0, s1;
    s0 = [];

    if (spaces.test(input.charAt(currPos))) {
      s1 = input.charAt(currPos);
      currPos++;
    } else {
      s1 = FAILED;

      {
        setFail(spacesClass);
      }
    }

    while (s1 !== FAILED) {
      s0.push(s1);

      if (spaces.test(input.charAt(currPos))) {
        s1 = input.charAt(currPos);
        currPos++;
      } else {
        s1 = FAILED;

        {
          setFail(spacesClass);
        }
      }
    }

    return s0;
  }

  var n = nodes;
  peg$result = startRuleFunction();

  if (peg$result !== FAILED && currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== FAILED && currPos < input.length) {
      setFail(endExpectation());
    }

    throw buildStructuredError(maxFailExpectedArray, maxFailPos < input.length ? input.charAt(maxFailPos) : null, maxFailPos < input.length ? computeLocation(maxFailPos, maxFailPos + 1) : computeLocation(maxFailPos, maxFailPos));
  }
}

var grammar = {
  SyntaxError: SyntaxErrorObject,
  parse: parseFuntion
};

/**
 * Processes a list of statements into a symbol table
 */

class SymbolTable {
  constructor(statements, externalSymbols = {}) {
    this.variables = {};
    this.definitions = {};
    this.symbols = {};
    this.main = null;
    this.size = 0;
    this.addExternalSymbols(externalSymbols);
    this.process(statements);
  }

  addExternalSymbols(externalSymbols) {
    for (var key in externalSymbols) {
      // this.variables[key] = new Literal(externalSymbols[key]);
      this.symbols[key] = externalSymbols[key];
      this.size++;
    }
  }

  process(statements) {
    for (var statement of statements) {
      if (statement instanceof Assignment) {
        if (statement.variable instanceof Definition) {
          this.definitions[statement.variable.name] = this.processExpression(statement.expression);
        } else {
          this.variables[statement.variable.name] = this.processExpression(statement.expression);
        }
        // if (statement.expression instanceof Literal) {
        //   this.symbols[statement.variable.name] = statement.expression.value;
        //   this.size++;
        // }
      }
    }

    console.log(Object.keys(this.variables))
    for (const variableName of Object.keys(this.variables)) {
      const newTokenizer = new Concatenation(this.variables[variableName], new Tag(variableName))
      if (!this.main) {
        this.main = newTokenizer
      } else {
        this.main = new Alternation(this.main, newTokenizer)
      }
    }
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
    } // Replace definitions references with their values

    if (expr instanceof Definition) {
      var value = this.definitions[expr.name];
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

function buildDFA(root, lenSymbols, Symbols) {
  root = new Concatenation(root, END_MARKER);
  root.calcFollowpos();

  var failState = new State(new Set(), lenSymbols);
  var initialState = new State(root.firstpos, lenSymbols);
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


    s.marked = true; // for each input symbol 

    for (const a in Symbols) {
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
        dstates.push(new State(u, lenSymbols));
        ux = dstates.length - 1;
      }
      s.transitions[Symbols[a]] = ux;
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
        state = self.stateTable[state][c.charCodeAt(0)];

        if (state === FAIL_STATE) {
          // yield the last match if any
          if (startRun != null && lastAccepting == str.length - 1) {
            return [startRun, self.tags[lastState]];
          } // reset the state as if we started over from the initial state


          state = self.stateTable[INITIAL_STATE][c.charCodeAt(0)];
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
  console.log(symbolTable)
  var states = buildDFA(symbolTable.main, symbolTable.size, symbolTable.symbols);
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
