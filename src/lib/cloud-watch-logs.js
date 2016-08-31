'use strict';

var aws = require('aws-sdk');
var awsCloudWatchLogs = new aws.CloudWatchLogs({ apiVersion: '2014-03-28' });
var logger = require('./logger');
var pub = {};

pub.describeLogGroups = function describeLogGroups(prefix, nextToken, callback) {
    var params = {};
    if (prefix) {
        params.logGroupNamePrefix = prefix.trim();
    }
    if (nextToken) {
        params.nextToken = nextToken;
    }
    awsCloudWatchLogs.describeLogGroups(params, function (error, response) {
        if (error) {
            logger('Error: describeLogGroups', error, params);
            return callback(error);
        }
        callback(null, { logGroups: response.logGroups, nextToken: response.nextToken });
    });
};

pub.deleteLogGroup = function deleteLogGroup(logGroup, callback) {
    var params = {
        logGroupName: logGroup.logGroupName
    };
    awsCloudWatchLogs.deleteLogGroup(params, function (error) {
        if (error) {
            logger('Error: deleteLogGroup', error, params);
        }
        callback();
    });
};

pub.describeSubscriptionFilters = function describeSubscriptionFilters(logGroup, callback) {
    var params = {
        logGroupName: logGroup.logGroupName,
        limit: 1
    };
    awsCloudWatchLogs.describeSubscriptionFilters(params, function (error, response) {
        if (error) {
            logger('Error: describeSubscriptionFilters', error, params);
        }
        callback(error, response);
    });
};

pub.getLatestLogStreamUsage = function getLatestLogStreamUsage(logGroup, callback) {
    var params = {
        logGroupName: logGroup.logGroupName,
        descending: true,
        limit: 1,
        orderBy: 'LastEventTime'
    };
    awsCloudWatchLogs.describeLogStreams(params, function (error, response) {
        if (error && error.code !== 'ResourceNotFoundException') {
            logger('Error: describeLogStreams', error, params);
            return callback(error);
        } else if (!response || response.logStreams.length === 0) {
            return callback(undefined, 0);
        }

        // Log streams can exist without an event in which case we fallback to the creation time instead
        // However, if we get the creation time we ensure that it is  at least 10 minutes old
        // This to ensure that a stream that was just created and is about to receive logs isn't considered inactive
        var lastEventTimestamp = Date.now();
        if (response.logStreams[0].lastEventTimestamp) {
            lastEventTimestamp = response.logStreams[0].lastEventTimestamp;
        } else if (response.logStreams[0].creationTime < Date.now() - 600000) {
            lastEventTimestamp = response.logStreams[0].creationTime;
        }
        return callback(undefined, lastEventTimestamp);
    });
};

module.exports = pub;
