'use strict';

var cloudWatchLogs = require('./cloud-watch-logs');

module.exports = function verifyPolicy(policy, logGroup, callback) {
    var response = {
        doDelete: true,
        reason: undefined
    };
    if (hasRetentionFilter(policy, logGroup)) {
        response.doDelete = false;
        response.reason = 'retention';
        return callback(null, response);
    } else if (isRecentlyCreated(policy, logGroup)) {
        response.doDelete = false;
        response.reason = 'recently created';
        return callback(null, response);
    } else if (matchesExcludePattern(policy, logGroup)) {
        response.doDelete = false;
        response.reason = 'exclude pattern match';
        return callback(null, response);
    }

    hasRecentActivity(policy, logGroup, function (error, hasActivity) {
        if (error) {
            return callback(error);
        }
        if (hasActivity) {
            response.doDelete = false;
            response.reason = 'recent activity';
            return callback(null, response);
        }
        hasSubscriptions(policy, logGroup, function (error, hasSubscriptions) {
            if (error) {
                return callback(error);
            }
            if (hasSubscriptions) {
                response.doDelete = false;
                response.reason = 'has subscriptions';
                return callback(null, response);
            }
            callback(null, response);
        });
    });
};

// Exclude group if retentionFilter is true and the group has a retention configured
function hasRetentionFilter(policy, logGroup) {
    return policy.excludeRetention === 'true' && logGroup.retentionInDays;
}

// Exclude group if it is younger than the policy.minAge
function isRecentlyCreated(policy, logGroup) {
    return policy.minAgeHours
        && logGroup.creationTime > Date.now() - hoursToMillis(policy.minAgeHours);
}

// Exclude groups that match at least one of the exclude patterns
function matchesExcludePattern(policy, logGroup) {
    if (policy.exclusionPatterns && policy.exclusionPatterns.length > 0) {
        for (var i = 0; i < policy.exclusionPatterns.length; i++) {
            var pattern = new RegExp(policy.exclusionPatterns[i].trim());
            if (pattern.test(logGroup.logGroupName)) {
                return true;
            }
        }
    }
    return false;
}

// Check last activity on log group
function hasRecentActivity(policy, logGroup, callback) {
    if (!policy.lastActivityHours) {
        return callback(null, false);
    }
    cloudWatchLogs.getLatestLogStreamUsage(logGroup, function (error, lastEventTimeStamp) {
        if (error) {
            return callback(error);
        } else if (lastEventTimeStamp > Date.now() - hoursToMillis(policy.lastActivityHours)) {
            return callback(null, true);
        }
        return callback(null, false);
    });
}

// Check log group for subscriptions
function hasSubscriptions(policy, logGroup, callback) {
    if (policy.excludeSubscribed !== 'true') {
        return callback(null, false);
    }
    cloudWatchLogs.describeSubscriptionFilters(logGroup, function (error, response) {
        if (error) {
            return callback(error);
        }
        return callback(null, response.subscriptionFilters.length > 0);
    });
}

function hoursToMillis(hours) {
    return hours * 60 * 60 * 1000;
}
