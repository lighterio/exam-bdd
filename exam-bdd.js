'use strict'
/* global it describe */

var mock = global.mock = global.mock || require('exam/lib/mock')
var unmock = global.unmock = mock.unmock
var log = require('../lib/log')
var lazy = require('lazy.js')

var verboseFlag = '-v'
var isVerbose = lazy(process.argv)
  .some(function (a) { return a === verboseFlag })

var self = module.exports = {
  feature: function (description, fn) {
    describe('Feature: ' + description, function () {
      fn.apply(self, [])
    })
  },
  scenario: function (description, fn) {
    var context = createTestContext({
      description: description
    })
    context.publicScenario = createPublicScenario(context)
    fn.apply(context.publicScenario, [])
    executeContext(context)
  }
}

global.feature = self.feature
global.scenario = self.scenario

function createPublicScenario (context) {
  var publicScenario = {
    mock: function mock (lib, options) { mockInContext(context, lib, options) },
    given: function given (description, fn) {
      var prefix = publicScenario.given.prefix || 'Given'
      if (context.whens.length || context.thens.length) {
        throw new Error('Givens must come before whens and thens.')
      }
      description = ['  ', prefix, ' ', description].join('')
      context.givens.push({ text: description, fn: fn })
      publicScenario.given.prefix = '  And'
      publicScenario.and = publicScenario.given
      publicScenario.but = function () {
        publicScenario.given.prefix = '  But'
        return publicScenario.given.apply(this, arguments)
      }
      publicScenario.with = function () {
        publicScenario.given.prefix = '  With'
        return publicScenario.given.apply(this, arguments)
      }
      return publicScenario
    },
    when: function when (description, fn) {
      var prefix = publicScenario.when.prefix || 'When'
      if (context.thens.length) {
        throw new Error('Whens must come before thens.')
      }
      description = ['  ', prefix, ' ', description].join('')
      delete publicScenario.given
      publicScenario.when.prefix = '  And'
      publicScenario.and = publicScenario.when
      publicScenario.but = function () {
        publicScenario.when.prefix = '  But'
        return publicScenario.then.apply(this, arguments)
      }
      context.whens.push({ text: description, fn: fn })
      return publicScenario
    },
    then: function then (description, fn) {
      var prefix = publicScenario.then.prefix || 'Then'
      description = ['  ', prefix, ' ', description].join('')
      delete publicScenario.given
      delete publicScenario.when
      publicScenario.then.prefix = '  And'
      publicScenario.and = publicScenario.then
      publicScenario.but = function () {
        publicScenario.then.prefix = '  But'
        return publicScenario.then.apply(this, arguments)
      }
      context.thens.push({ text: description, fn: fn })
      return publicScenario
    },
    before: function (fn) {
      context.setup.push(fn)
    },
    after: function (fn) {
      context.teardown.push(fn)
    }
  }
  return publicScenario
}

function mockInContext (context, lib, options) {
  mock(lib, options)
  context.teardown.push(function () {
    unmock(lib)
  })
}

function createTestContext (scenario) {
  return {
    scenario: scenario,
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
  if (isVerbose) {
    addItemTextToArray(context.givens, text)
    addItemTextToArray(context.whens, text)
    addItemTextToArray(context.thens, text)
  }
  text = text.join('\n       ')
  it(text, function (done) {
    executeNext(context, function () {
      var errorCount = context.errors.length
      if (errorCount) {
        done(context.errors[0])
        for (var i = 1; i < errorCount; i++) {
          log.error(context.errors[i])
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
              return done()
            }
          }
          executeNext(context, done)
        }
        return next.apply(context.publicScenario, [doneMethod])
      }
      next.apply(context.publicScenario)
    } catch (err) {
      context.errors.push(err)
      if (breakOnError) {
        return done()
      }
    }
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
