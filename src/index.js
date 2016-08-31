'use strict';

var cloudWatchLogs = require('./lib/cloud-watch-logs');
var shouldGroupBeDeleted = require('./lib/should-group-be-deleted');
var async = require('async');
var logger = require('./lib/logger');

var TIMEOUT_BETWEEN_GROUPS_MS = 500;
/* istanbul ignore next */
if (process.env.NODE_ENV === 'TEST') {
    TIMEOUT_BETWEEN_GROUPS_MS = 1;
}

var deletedLogGroups;
var skippedLogGroups;
exports.handler = function (event, _context, callback) {
    var rules = processEvent(event);
    deletedLogGroups = [];
    skippedLogGroups = [];
    logger('Processing Logs based on ruleset', rules);
    async.mapSeries(rules.inclusionPrefixes, function (logGroupNamePrefix, asyncCallback) {
        processLogPrefix(rules, logGroupNamePrefix, null, asyncCallback);
    }, function (error) {
        if (error) {
            logger('An error occurred', error);
        }
        logger('Deleted log groups', deletedLogGroups);
        logger('Skipped log groups', skippedLogGroups);
        callback(error);
    });
};

function processLogPrefix(rules, logGroupNamePrefix, nextToken, callback) {
    cloudWatchLogs.describeLogGroups(logGroupNamePrefix, nextToken, function (describeError, response) {
        if (describeError) {
            return callback(describeError);
        }

        async.mapSeries(response.logGroups, function (logGroup, next) {
            // Delay callback slightly to avoid API Throttling
            setTimeout(function () {
                shouldGroupBeDeleted(rules, logGroup, function (deleteError, shouldBeDeleted) {
                    if (deleteError) {
                        return next(deleteError);
                    } else if (!shouldBeDeleted.doDelete) {
                        skippedLogGroups.push({ logGroup: logGroup.logGroupName, reason: shouldBeDeleted.reason });
                        return next();
                    }
                    deletedLogGroups.push(logGroup.logGroupName);
                    cloudWatchLogs.deleteLogGroup(logGroup, next);
                });
            }, TIMEOUT_BETWEEN_GROUPS_MS);
        }, function (error) {
            if (error) {
                return callback(error);
            }
            if (response.nextToken) {
                return processLogPrefix(rules, logGroupNamePrefix, response.nextToken, callback);
            }
            callback();
        });
    });
}

function processEvent(event) {
    var rules = {
        inclusionPrefixes: event.inclusionPrefixes.split(','),
        exclusionPatterns: event.exclusionPatterns.split(','),
        minAgeHours: event.minAgeHours,
        lastActivityHours: event.lastActivityHours,
        excludeRetention: event.excludeRetention,
        excludeSubscribed: event.excludeSubscribed
    };
    // If no exclusion patterns are given there will be an empty pattern in the array which can be safely removed
    if (rules.exclusionPatterns.length === 1 && !rules.exclusionPatterns[0]) {
        rules.exclusionPatterns = [];
    }
    return rules;
}
