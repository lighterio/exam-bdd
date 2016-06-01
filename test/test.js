'use strict'
/* global describe scenario */

require('../exam-bdd').isVerbose = true
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
      .given('a mocked object', function () {
        // first allow the mock to be torn down
        this.mock(obj, { foo: function () { return 'baz' } })
        // then check to be sure it worked
        scenario.after(function () {
          assert(obj.foo() === 'bar')
        })
      })
      .when('mocked function is called', function () {
        this.result = obj.foo()
      })
      .then('we get the mocked result', function () {
        assert(this.result === 'baz')
      })
  })

  scenario('mocked fields that are not functions work as expected', function () {
    var lib = {
      foo: 'bar'
    }
    this
      .given('a mocked field that is not a function', function () {
        this.mock(lib, { foo: 'baz' })
      })
      .when('the field is accessed', function () {
        this.result = lib.foo
      })
      .then('the result is the mocked value', function () {
        assert(this.result === 'baz')
      })
  })

  scenario('mocked functions are provided the base implementation as `this`', function () {
    var lib = {
      foo: function (arg1, arg2) {
        return arg1 + ' ' + arg2
      }
    }
    this
      .given('a mocked function', function () {
        this.mock(lib, {
          foo: function (arg1, arg2) {
            return this(arg1, arg2) + ' mocked'
          }
        })
      })
      .when('the mocked function is called', function () {
        this.result = lib.foo('bar', 'baz')
      })
      .then('the base implementation was called', function () {
        assert(this.result === 'bar baz mocked')
      })
  })

  scenario('mocked functions are implicitly tracked', function () {
    var lib = {
      foo: function (arg1, arg2) {
        return arg1 + ' ' + arg2
      }
    }
    this
      .given('a library with a mocked function', function () {
        this.mock(lib, { foo: this.mock.track })
      })
      .when('the mocked function is called', function () {
        this.result = lib.foo('bar', 'baz')
      })
      .then('the tracked implementation was called', function () {
        assert(this.result === 'bar baz')
      })
      .and('the mocked function has a call count of 1', function () {
        assert(lib.foo.count === 1)
      })
      .and('the mocked function has one call', function () {
        assert(lib.foo.calls && (lib.foo.calls.length === 1))
      })
      .and('the mocked function has the arguments for the call', function () {
        var call = lib.foo.calls[0]
        assert(call[0] === 'bar' && call[1] === 'baz')
      })
  })

  scenario('mocked functions are explicitly tracked', function () {
    var lib = {
      foo: function (arg1, arg2) {
        return arg1 + ' ' + arg2
      }
    }
    var libContext = {}
    this
      .given('a library with a mocked function', function () {
        this.mock(lib, libContext, { foo: this.mock.track })
      })
      .when('the mocked function is called', function () {
        this.result = lib.foo('bar', 'baz')
      })
      .then('the tracked implementation was called', function () {
        assert(this.result === 'bar baz')
      })
      .and('the mocked function context has a call count of 1', function () {
        assert(libContext.foo.count === 1)
      })
      .and('the mocked function context has one call', function () {
        assert(libContext.foo.calls && (libContext.foo.calls.length === 1))
      })
      .and('the mocked function context has the arguments for the call', function () {
        var call = libContext.foo.calls[0]
        assert(call[0] === 'bar' && call[1] === 'baz')
      })
  })

  scenario('all functions are mocked when `this.mock.track` is supplied in place of options', function () {
    var lib = {
      foo: function (arg1, arg2) {
        return arg1 + ' ' + arg2
      },
      bar: function (arg) {
        return arg + 1
      }
    }
    this
      .given('a library with two functions mocked with `this.mock.track`', function () {
        this.mock(lib, this.mock.track)
      })
      .when('the first mocked function is called', function () {
        this.first = lib.foo('bar', 'baz')
      })
      .and('the second mocked function is called', function () {
        this.second = lib.bar(3)
      })
      .then('the original implementations were called', function () {
        assert.equal(this.first, 'bar baz')
        assert.equal(this.second, 4)
      })
      .and('the calls were tracked', function () {
        assert(lib.foo.count === 1)
        assert(lib.bar.count === 1)
      })
  })

  scenario('an object can be unmocked', function () {
    var lib = {
      foo: function (arg1) {
        return arg1
      }
    }
    this
      .given('a mocked object', function () {
        this.mock(lib, { foo: function () { return 'baz' } })
      })
      .when('the object is unmocked', function () {
        this.unmock(lib)
      })
      .and('the unmocked function is called', function () {
        this.result = lib.foo('bar')
      })
      .then('we get the unmocked result', function () {
        assert(this.result === 'bar')
      })
  })

  scenario('a twice-mocked object can be unmocked once', function () {
    var lib = {
      foo: function (arg1) {
        return arg1
      }
    }
    this
      .given('a mocked object', function () {
        this.mock(lib, { foo: function () { return 'baz' } })
      })
      .when('the object is mocked again', function () {
        this.mock(lib, { foo: function () { return 'bazzz' } })
      })
      .and('the object is unmocked', function () {
        this.unmock(lib)
      })
      .and('the unmocked function is called', function () {
        this.result = lib.foo('bar')
      })
      .then('we get the unmocked result', function () {
        assert.equal(this.result, 'baz')
      })
  })

  scenario('a twice-mocked object can be unmocked twice', function () {
    var lib = {
      foo: function (arg1) {
        return arg1
      }
    }
    this
      .given('a mocked object', function () {
        this.mock(lib, { foo: function () { return 'baz' } })
      })
      .when('the object is mocked again', function () {
        this.mock(lib, { foo: function () { return 'bazzz' } })
      })
      .and('the object is unmocked twice', function () {
        this.unmock(lib)
        this.unmock(lib)
      })
      .and('the unmocked function is called', function () {
        this.result = lib.foo('bar')
      })
      .then('we get the unmocked result', function () {
        assert(this.result === 'bar')
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
