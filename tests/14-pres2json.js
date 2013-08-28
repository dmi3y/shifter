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
    test = {
        'comment': {
            pres: '# <<<comment = test \n key = value',
            json: '{key:"value"}'
        },

        'complex value': {
            pres: 'key = 12\\\\v$a\\nl$+u=e\\t\\ ',
            json: '{key:"12\\\\v$a\\nl$+u=e\\t\\ "}'
        },
        
        'heredoc': {
            pres: '\n   \n\n  \ndochere = <<<heredoc \n = test \n  # heredoc comment \n'+
                          '   \\# not a comment \n key = value \n    heredoc;\n # heredoc trailing comment',
            json: '{dochere:" = test \\n   \\# not a comment \\n key = value "}'
        }
    },
    waste = {
        'illigal key': '# <<<comment = test \n k!ey = value \n value = key',
        'empty key': '# <<<comment = test \n  = value\\\n value = key',
        'illigal value': '# <<<comment = test \n key = value\\\n value = key',
        'broken heredoc': 'abc = <<<herebrok \n test \n key = value\\\n value = key'
    };

function accept(it) {
    var
        context = {
            'topic': function() {
                return parser(test[it].pres);
            },
            'should parse it': function(jsonFromParser) {
                assert.equal(test[it].json, jsonFromParser);
            }
        };
    return context;
}

function decline(it) {
    var
        context = {
            'topic': function() {
                parser(waste[it], this.callback);
            }
        };
        context['should return "' + it + '" status'] = function(declineReason, val) {
            assert.equal(declineReason, it);
        };
    return context;
}

tests = {
    'parsePresToJson should': {
        'topic': function() {
            parser = pres2json.parsePresToJson || null;
            return parser;
        },
        'be a function': function(parser) {
            assert.isFunction(parser);
        },
        'accept YRB with comment': accept('comment'),
        'accept YRB with complex value': accept('complex value'),
        'accept YRB with heredoc': accept('heredoc'),
        'decline YRB with illigal key': decline('illigal key'),
        'decline YRB with empty key': decline('empty key'),
        'decline YRB with illigal value': decline('illigal value'),
        'decline YRB with bloken heredoc': decline('broken heredoc')
    }
};

vows.describe('pres to json direct parser').addBatch(tests).export(module);
