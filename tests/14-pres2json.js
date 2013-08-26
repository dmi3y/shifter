/**
 * pres2json parser direct test
 */

'use strict';

/*jshint unused: vars */

var
    vows = require('vows'),
    assert = require('assert'),
    pres2json = require('../lib/pres2json'),
    tests, parser,

    testCommentPres = '# <<<comment = test \n key = value',
    testCommentJson = '{key:"value"}',
    testBrokenKey = '# <<<comment = test \n k!ey = value \n value = key';

tests = {
    'should have parsePresToJson': {
        'topic': function() {
            parser = pres2json.parsePresToJson || null;
            return parser;
        },
        'parsePresToJson must be function': function(parser) {
            assert.isFunction(parser);
        },
        'and should parse tests strings like': {
            'topic': function() {
                return parser(testCommentPres);
            },
            'YRB with comment line': function(commentJson){
                assert.equal(testCommentJson, commentJson);
            }
        },
        'and should not parse tests strings like': {
            'topic': function() {
                parser(testBrokenKey, this.callback);
            },
            'YRB with broken key': function(error, value){
                assert.equal(error, 'parsing failed');
            }
        }
    }
};

vows.describe('pres to json direct parser').addBatch(tests).export(module);