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
    rimraf = require('rimraf');

process.env.SHIFTER_COMPRESSOR_TASKS = 1;

var tests = {
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
                    'should produce same files and': {
                        topic: function() {
                            var stack = new Stack(),
                                results = {
                                    pre: [],
                                    post: []
                                },
                                self = this;

                            fs.readdir(path.join(buildBase, 'translator', 'lang'), stack.add(function(err, files) {
                                files.forEach(function(file) {
                                    (function(file) {
                                        fs.readFile(path.join(buildBase, 'translator', 'lang', file), stack.add(function(err, data) {
                                            var shasum = crypto.createHash('sha1'), d;
                                            shasum.update(data);
                                            d = shasum.digest('hex');
                                            results.post[file] = d;
                                        }));
                                    }(file));
                                });
                            }));

                            fs.readdir(path.join(buildXBase, 'translator', 'lang'), stack.add(function(err, files) {
                                files.forEach(function(file) {
                                    (function(file) {
                                        fs.readFile(path.join(buildXBase, 'translator', 'lang', file), stack.add(function(err, data) {
                                            var shasum = crypto.createHash('sha1'), d;
                                            shasum.update(data);
                                            d = shasum.digest('hex');
                                            results.pre[file] = d;
                                        }));
                                    }(file));
                                });
                            }));

                            stack.done(function() {
                                self.callback(null, results);
                            });
                        },
                        'all generated langs should match': function(err, results) {
                            results.pre.forEach(function(el, ix) {
                                assert.equal(el, results.post[ix]);
                            });
                        }
                    }
                }
            }
        }
    }
}; vows.describe('buiding lang files for intl module from YRB(.pres)').addBatch(tests).export(module);