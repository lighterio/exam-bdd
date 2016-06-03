'use strict'
/* global it describe */

var baseMock = require('exam/lib/mock')
var baseUnmock = baseMock.unmock
var priorMocksProperty = '_EXAM_MOCKED_PROPERTIES'

var verboseFlag = '-v'
var isVerbose

;(function (args) {
  isVerbose = false
  for (var i = 0; i < args.length; i++) {
    if (args[i] === verboseFlag) {
      isVerbose = true
      break
    }
  }
})(process.argv)

var self = module.exports = {
  isVerbose: isVerbose,

  feature: function (description, fn) {
    describe('Feature: ' + description, function () {
      fn.apply(self, [])
    })
  },

  scenario: function (description, fn) {
    var context = createTestContext({
      description: description
    })
    var scenario = context.publicScenario = createScenario(context)
    context.scenarioContext = {
      mock: scenario.mock,
      unmock: scenario.unmock,
      after: scenario.after
    }
    try {
      fn.apply(context.publicScenario, [])
    } catch (err) {
      context.setup.push(function () { throw err })
    }
    executeContext(context)
  }
}

global.feature = self.feature
global.scenario = self.scenario

function createScenario (context) {
  var scenario = {
    mock: function mock (lib, libContext, options) {
      return mockInContext(context, lib, libContext, options)
    },
    unmock: function unmock (lib) {
      var index
      var teardown = context.teardown
      for (var i = 0, count = teardown.length; i < count; i++) {
        if (teardown[i].lib === lib) {
          teardown[i]()
          index = i
          break
        }
      }
      if (index) {
        teardown.splice(index, 1)
      }
    },
    given: function given (description, fn) {
      var prefix = scenario.given.prefix || 'Given'
      if (context.whens.length || context.thens.length) {
        throw new Error('Givens must come before whens and thens.')
      }
      description = ['  ', prefix, ' ', description].join('')
      context.givens.push({ text: description, fn: fn })
      scenario.given.prefix = '  And'
      scenario.and = scenario.given
      scenario.but = function () {
        scenario.given.prefix = '  But'
        return scenario.given.apply(this, arguments)
      }
      scenario.with = function () {
        scenario.given.prefix = '  With'
        return scenario.given.apply(this, arguments)
      }
      return scenario
    },
    when: function when (description, fn) {
      var prefix = scenario.when.prefix || 'When'
      if (context.thens.length) {
        throw new Error('Whens must come before thens.')
      }
      description = ['  ', prefix, ' ', description].join('')
      delete scenario.given
      scenario.when.prefix = '  And'
      scenario.and = scenario.when
      scenario.but = function () {
        scenario.when.prefix = '  But'
        return scenario.then.apply(this, arguments)
      }
      context.whens.push({ text: description, fn: fn })
      scenario.then = then
      delete scenario.given
      return scenario
    },
    before: function (fn) {
      context.setup.push(fn)
    },
    after: function (fn) {
      context.teardown.push(fn)
    }
  }
  function then (description, fn) {
    var prefix = scenario.then.prefix || 'Then'
    description = ['  ', prefix, ' ', description].join('')
    delete scenario.given
    delete scenario.when
    scenario.then.prefix = '  And'
    scenario.and = scenario.then
    scenario.but = function () {
      scenario.then.prefix = '  But'
      return scenario.then.apply(this, arguments)
    }
    context.thens.push({ text: description, fn: fn })
    delete scenario.when
    return scenario
  }
  scenario.mock.track = function () {
    return this.apply(undefined, arguments)
  }
  return scenario
}

function mockInContext (context, lib, libContext, options) {
  var unmockLib = function () {
    unmock(lib)
  }
  unmockLib.lib = lib
  context.teardown.push(unmockLib)
  if (!options) {
    options = libContext
    libContext = undefined
  }
  if (options === context.publicScenario.mock.track) {
    // This will force all functions to be mocked and tracked.
    options = lib
  }
  var mockOptions = {}
  for (var key in options) {
    ;(function () {
      var value = options[key]
      if (typeof value !== 'function') {
        mockOptions[key] = value
        return
      }
      var originalImplementation = lib[key]
      var base = function () {
        return originalImplementation.apply(lib, arguments)
      }
      var info
      var implementation = mockOptions[key] = function () {
        info.count++
        info.calls.push(Array.prototype.slice.call(arguments))
        // Call the mock function with `this` set to the base implementation
        return value.apply(base, arguments)
      }
      info = libContext ? libContext[key] || (libContext[key] = {}) : implementation
      info.count = 0
      info.calls = []
    })()
  }
  return mock(lib, mockOptions)
}

function mock (lib, options) {
  var mocks = lib[priorMocksProperty]
  if (!mocks) {
    Object.defineProperty(lib, priorMocksProperty, {
      enumerable: false,
      configurable: true, // Without this, the property cannot be deleted.
      value: []
    })
    mocks = lib[priorMocksProperty]
  }
  mocks.push(options)
  if (mocks.length === 1) {
    return baseMock(lib, options)
  }
  options = mergeOptions(mocks)
  baseUnmock(lib)
  return baseMock(lib, options)
}

function unmock (lib) {
  baseUnmock(lib)
  var mocks = lib[priorMocksProperty]
  if (!mocks) {
    return
  }
  mocks.splice(mocks.length - 1, 1)
  if (!mocks.length) {
    delete lib[priorMocksProperty]
    return
  }
  // re-mock it to the previously mocked state
  baseMock(lib, mergeOptions(lib[priorMocksProperty]))
}

function mergeOptions (optionsArray) {
  var mergedOptions = {}
  for (var i = 0, count = optionsArray.length; i < count; i++) {
    var options = optionsArray[i]
    for (var key in options) {
      mergedOptions[key] = options[key]
    }
  }
  return mergedOptions
}

function createTestContext (scenario) {
  return {
    scenario: scenario,
    scenarioContext: {},
    givens: [],
    whens: [],
    thens: [],
    setup: [],
    teardown: [],
    errors: []
  }
}

function executeContext (context) {
  var text = [
    'Scenario: ' + context.scenario.description
  ]
  if (self.isVerbose) {
    addItemTextToArray(context.givens, text)
    addItemTextToArray(context.whens, text)
    addItemTextToArray(context.thens, text)
  }
  text = text.join('\n       ')
  it(text, function (done) {
    if (!context.thens.length) {
      context.givens = []
      context.whens = []
      context.setup = []
      // ensure that teardown occurs so that we don't leave anything half-mocked
      executeNext(context, function () {})
      return done(new Error('A scenario must have at least one test ("then" clause).'))
    }
    executeNext(context, function () {
      var errorCount = context.errors.length
      if (errorCount) {
        done(context.errors[0])
        for (var i = 1; i < errorCount; i++) {
          console.error(context.errors[i])
        }
        return
      }
      done()
    })
  })
}

function executeNext (context, done) {
  if (context.setup.length) {
    return executeNow(context.setup.shift(), true)
  }
  if (context.givens.length) {
    return executeNow(context.givens.shift().fn, true)
  }
  if (context.whens.length) {
    return executeNow(context.whens.shift().fn, true)
  }
  if (context.thens.length) {
    return executeNow(context.thens.shift().fn, false)
  }
  if (context.teardown.length) {
    return executeNow(context.teardown.shift(), false)
  }
  return done()
  function executeNow (next, breakOnError) {
    if (!next) {
      return executeNext(context, done)
    }
    try {
      if (next.length) {
        var doneMethod = function (err) {
          if (err) {
            context.errors.push(err)
            if (breakOnError) {
              return executeCleanup()
            }
          }
          executeNext(context, done)
        }
        return next.apply(context.scenarioContext, [doneMethod])
      }
      next.apply(context.scenarioContext)
    } catch (err) {
      context.errors.push(err)
      if (breakOnError) {
        return executeCleanup()
      }
    }
    executeNext(context, done)
  }
  function executeCleanup () {
    context.setup = []
    context.givens = []
    context.whens = []
    context.thens = []
    executeNext(context, done)
  }
}

function addItemTextToArray (items, array) {
  for (var i = 0; i < items.length; i++) {
    var text = items[i].text
    if (text) {
      array.push(items[i].text)
    }
  }
}
