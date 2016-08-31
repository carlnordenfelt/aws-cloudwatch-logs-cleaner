'use strict';
/* eslint no-console: 0 */
module.exports = function (message, attachement) {
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'TEST') {
        console.log(message, attachement);
    }
};
