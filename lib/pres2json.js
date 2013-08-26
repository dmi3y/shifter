/* jshint evil: true */

/**
 * Purpose of this file to make shifter understand YRB(.pres)
 * format for building language bundles, http://yuilibrary.com/yui/docs/intl/#yrb
 *
 * A long long time ago, when all programmers wore beards... okay that's another story:)...
 *
 * Eventually this functionality already supported into the old ant based build,
 * https://github.com/yui/builder/blob/master/componentbuild/lib/yrb2json/yrb2json.js
 * but at the moment when I realized it (@lapshukov) I already wrote some own stuff.
 * So just reusing some parts of that file.
 * Thanks to YUI team and Norbert Lindenberg paticulary.
 *
 * Probably someone could pick up the old script and make tweaks around it to fit nodejs enviroment.
 * Bottom line, diversity is good.
 */

'use strict';
/*jshint expr: true*/

var
    log = require('./log'),
    doValidation = true,
    callingVowBack = function() { return true; },

    /**
     * shared data for validator
     *
     * el {String} full line from file
     * ix {Int} current line number
     * len {Int} total numbers of lines
     */
    el, ix, len,

    markToken = '<<<', markComment = '#',

    unique = {},

    /**
     * Container for validation methods
     *
     * @type {Object}
     */
    validatePres = {
        token: function (token) {
            validatePres.line(token);
        },
        endToken: function(endToken, startToken) {
            var
                tokenLineEnd = endToken.slice(startToken.length),
                hasInvalidEnding = (tokenLineEnd.length === 1) && !(/;/).test(tokenLineEnd) || tokenLineEnd.length > 1;

            if ( hasInvalidEnding ) {
                log.warn('Token "' + startToken + '" on line: ' + ix+
                    ' has invalid ending "' + tokenLineEnd+
                    '". Expected nothing or semicolon.');
            }
        },
        key: function (key) {
            !key && log.error('Empty key on line: ' + ix+
                ' ("' + el + '").');
            validatePres.evalTest(key, '!#value');
            unique[key] > -1?
                log.warn('Key "' + key + '" on line: ' + ix+
                    ' is not unique.' +
                    ' There at least one same on line: ' + unique[key]):
                unique[key] = ix;
        },
        value: function (value) {
            validatePres.line(value);
            validatePres.evalTest('"!#key"', value);
        },
        hereDocLine: function (str, token) {
            if ( ix >= len) {
                log.error('Reached end of file but no closing token "' + token + '"');
            }
            if (str.trim().indexOf(markToken) === 0) {
                log.warn('Heredoc line "' + str + " on line: " + ix+
                    ' has heredoc start mark. Possibly missed end of token for'+
                    ' "' + token + '".');
            }
            validatePres.line(str);

        },
        comment: function(str){
            validatePres.line(str);
        },
        line: function (str) {
            var
                escapeSequense,
                hasCarageReturn = /\\r/.test(str),
                hasIlligalEscapeSequense = ('\\n' + str).match(/\\./g).some(function(es) {
                    escapeSequense = es;
                    return !(/\\\\|\\n|\\t|\\ |\\#|\\r/).test(es);
                });
            if ( hasCarageReturn || hasIlligalEscapeSequense ) {
                log.warn('Entry "' + str + '" on line: ' + ix+
                    (hasIlligalEscapeSequense? '. Has illigal escape sequense "' + escapeSequense + '"': '')+
                    (hasCarageReturn? '. Has carage return': '') + '.');
            }
        },
        evalTest: function (key, value) {
            var
                testObjStr = '{' + key + ': "' + value + '" }',
                entry = key === '"!#key"'? value: key;
            try {
                (new Function('return ' + testObjStr))();
            } catch (e) {
                if( callingVowBack('parsing failed') ) {
                    log.error('Entry "' + entry + '" on line: ' + ix+
                    ' will not work for intl module javasctip object notation format.'+
                    ' Raw message output is: ' + e.name + ': ' + e.message);
                }
            }
        }
    };

/**
 * Parsing YRB(.pres) file content string to a la Json format
 * http://yuilibrary.com/yui/docs/intl/#yrb
 *
 * @param  {String} presStr   YRB formatted string
 * @return {String} buffer    Json parsed string from YRB
 */
exports.parsePresToJson = function (presStr, callback) {
    var
        buffer,
        key,
        value,
        token,
        line,
        buff = [];
        
    callingVowBack = callback || callingVowBack;

    buffer = presStr.split(/\r\n|\n|\r/);
    el = undefined; ix = 0; len = buffer.length;

    for (;ix < len;) {
        el = buffer[ix++];
        line = [];

        el = el.trim();
        if (el && el.indexOf(markComment) !== 0) {
            key = el.split('=', 1).pop().trim();
            doValidation && validatePres.key(key);
            line.push(key);

            value = el.slice( el.indexOf('=') + 1 );
            value = value.trim() + (/\\\s+$/.test(value)? ' ': '');

            if ( value.indexOf(markToken) === 0 ) {
                token = value.replace(markToken, '').trim();
                value = [];
                while ( buffer[ix].trim().indexOf(token) !== 0 || ix < len ) {
                    el = buffer[ix++];
                    doValidation && validatePres.hereDocLine(el);
                    if (el.indexOf(markComment) !== 0) {
                        value.push(el);
                    } else {
                        doValidation && validatePres.comment(el);
                    }
                }
                doValidation && validatePres.endToken(buffer[ix++], token);
                value = value.join('\\n');
            }
            doValidation && validatePres.value(value);
            line.push('"' + value + '"');

            buff.push(line.join(':'));
        } else {
            el && doValidation && validatePres.comment(el);
        }
    }
    callingVowBack('looks good');
    buffer = '{' + buff.join(',') + '}';
    return buffer;
};