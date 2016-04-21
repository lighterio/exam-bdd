'use strict'
/* global describe scenario */

require('../exam-bdd')
var assert = require('assert')

describe('BDD', function () {
  scenario('with only a then, the test fails', function () {
    itShouldThrow.apply(this, [])
    this.then('method does not exist', function () {})
  })

  scenario('without a when, the test fails', function () {
    itShouldThrow.apply(this, [])
    this
      .given('some setup', function () {})
      .then('method does not exist', function () {})
  })

  scenario('without a then, the test fails', function () {
    itShouldThrow.apply(this, [])
    this
      .given('some setup', function () {})
      .when('some action', function () {})
  })

  scenario('when a then throws, the test fails', function () {
    itShouldThrow.apply(this, [])
    this
      .when('some action', function () {})
      .then('a test fails', function () { throw new Error('fail') })
  })

  scenario('given a valid when and a passing then, the test succeeds', function () {
    this
      .when('valid', function () {})
      .then('succeeds', function () {})
  })

  scenario('given context in setup, context is available in actions and tests', function () {
    this
      .given('context', function () { this.foo = 'bar' })
      .when('use context', function () { this.foo.toString() })
      .then('test context', function () { assert(this.foo === 'bar') })
  })

  scenario('mocked objects are unmocked after successful tests', function () {
    var obj = {
      foo: function () { return 'bar' }
    }
    var scenario = this
    this
      .given('a mocked object', () => {
        // first allow the mock to be torn down
        this.mock(obj, { foo: function () { return 'baz' } })
        // then check to be sure it worked
        scenario.after(() => {
          assert(obj.foo() === 'bar')
        })
      })
      .when('mocked function is called', () => {
        this.result = obj.foo()
      })
      .then('we get the mocked result', () => {
        assert(this.result === 'baz')
      })
  })
})

function itShouldThrow () {
  var shouldHaveThrown = new Error('should have thrown')
  var baseIt = global.it
  this.mock(global, {
    it: function (description, fn) {
      if (fn.length) {
        return fn(function (err) {
          if (err instanceof Error) {
            return baseIt(description, function () {})
          }
          baseIt(description, function () { throw shouldHaveThrown })
        })
      }
      try {
        fn()
        baseIt(description, function () { throw shouldHaveThrown })
      } catch (err) {
        baseIt(description, function () {})
      }
    }
  })
}
