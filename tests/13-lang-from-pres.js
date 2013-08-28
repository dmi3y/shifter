var vows = require('vows'),
    assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    Stack = require('../lib/stack').Stack,
    shifter = require('../lib'),
    base = path.join(__dirname, 'assets/lang-from-pres/'),
    crypto = require('crypto'),
    buildBase = path.join(base, 'build'),
    buildXBase = path.join(base, 'build-expected'),
    srcBase = path.join(base, 'src/translator'),
    rimraf = require('rimraf'),
    buildPaths = {}, tests,
    results = {
        pre: {},
        post: {}
    },
    stack = new Stack(),
    logFileShaSum = function(file, buildPath, state) {
        fs.readFile(path.join(buildPath, 'translator', 'lang', file), stack.add(function(err, data) {
            var shasum = crypto.createHash('sha1'), d;
            shasum.update(data);
            d = shasum.digest('hex');
            results[state][file] = d;
        }));
    },
    loopThroughTheLangs = function(state){
        var buildPath = buildPaths[state];
        fs.readdir(path.join(buildPath, 'translator', 'lang'), stack.add(function(err, files) {
            files.forEach(function(file) {
                logFileShaSum(file, buildPath, state);
            });
        }));
    };

buildPaths.pre = buildXBase;
buildPaths.post = buildBase;
loopThroughTheLangs('pre');

process.env.SHIFTER_COMPRESSOR_TASKS = 1;
    var context = {};

function getContext() {
    context.topic =function() {
        var self = this;

        innerStack = new Stack();

        loopThroughTheLangs('post');

        stack.done(function() {
            innerStack.done(function() {
                self.callback(null, results);
            });
        });
    };
    context['should generate same number of files'] = function(err, results) {
        assert.equal(results.pre.length, results.post.length);
    };
    return context;
}
function placeInContext(ixh) {
    context[ixh + ' should match expected'] = function(err, results) {
        assert.equal(results.pre[ixh], results.post[ixh]);
    };
}
stack.done(function() {
    for ( var ixh in results.pre ) {
        placeInContext(ixh);
    }
});

tests = {
    'clean build': {
        topic: function() {
            rimraf(path.join(buildBase), this.callback);
        },
        'should not have build dir and': {
            topic: function() {
                var self = this;
                fs.stat(path.join(buildBase), function(err) {
                    self.callback(null, err);
                });
            },
            'should not have build': function(err, stat) {
                assert.isNotNull(stat);
                assert.equal(stat.code, 'ENOENT');
            },
            'should build module translator and': {
                topic: function() {
                    var self = this,
                        _exit = process.exit,
                        code;

                    process.exit = function(c) {
                        code = c;
                    };

                    shifter.add({
                        silent: true,
                        cwd: srcBase,
                        'global-config': false,
                        'lint-stderr': true,
                        csslint: false,
                        fail: true,
                        'cache': false
                    }, function() {
                        process.exit = _exit;
                        self.callback(null, {
                            code: code
                        });
                    });
                },
                'should create build translator/lang': {
                    topic: function() {
                    var self = this;
                    fs.stat(path.join(buildBase, 'translator', 'lang'), self.callback);
                    },
                    'should create build/translator/lang': function(err, stat) {
                        assert.isNull(err);
                        assert.isTrue(stat.isDirectory());
                    },
                    'should produce same files': getContext()
                }
            }
        }
    }
}; vows.describe('building module with YRB(.pres) lang files').addBatch(tests).export(module);
