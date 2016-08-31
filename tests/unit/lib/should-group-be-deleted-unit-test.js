'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var sinon = require('sinon');

describe('UNIT tests for cloudWatchLogs', function () {
    var subject;
    var getLatestLogStreamUsageStub;
    var describeSubscriptionFiltersStub;

    before(function () {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });

        getLatestLogStreamUsageStub = sinon.stub();
        describeSubscriptionFiltersStub = sinon.stub();

        var cloudWatchLogsMock = {
            getLatestLogStreamUsage: getLatestLogStreamUsageStub,
            describeSubscriptionFilters: describeSubscriptionFiltersStub
        };

        mockery.registerMock('./cloud-watch-logs', cloudWatchLogsMock);
        subject = require('../../../src/lib/should-group-be-deleted');
    });
    var policy;
    var logGroup;
    beforeEach(function () {
        policy = {
            excludeRetention: 'true',
            excludeSubscribed: 'true',
            minAgeHours: 2,
            exclusionPatterns: [
                '^Test',
                '^Name'
            ],
            lastActivityHours: 1
        };
        logGroup = {
            retentionInDays: 1,
            creationTime: Date.now(),
            logGroupName: 'Name'
        };
        getLatestLogStreamUsageStub.reset().resetBehavior();
        getLatestLogStreamUsageStub.yields(null, Date.now());
        describeSubscriptionFiltersStub.reset().resetBehavior();
        describeSubscriptionFiltersStub.yields(null, { subscriptionFilters: [{ }] });
    });
    after(function () {
        mockery.deregisterAll();
        mockery.disable();
    });

    describe('verifyPolicy', function () {
        it('should be deleted', function (done) {
            delete logGroup.retentionInDays;
            logGroup.creationTime = Date.now() - 3 * 60 * 60 * 1000;
            logGroup.logGroupName = 'A name';
            getLatestLogStreamUsageStub.yields(null, Date.now() - 2 * 60 * 60 * 1000);
            describeSubscriptionFiltersStub.yields(null, { subscriptionFilters: [] });
            subject(policy, logGroup, function (error, shouldBeDeleted) {
                expect(error).to.equal(null);
                expect(shouldBeDeleted.doDelete).to.equal(true);
                done();
            });
        });
        it('should be deleted (coverage)', function (done) {
            delete policy.lastActivityHours;
            delete logGroup.retentionInDays;
            delete policy.excludeSubscribed;
            logGroup.creationTime = Date.now() - 3 * 60 * 60 * 1000;
            logGroup.logGroupName = 'A name';
            subject(policy, logGroup, function (error, shouldBeDeleted) {
                expect(error).to.equal(null);
                expect(shouldBeDeleted.doDelete).to.equal(true);
                done();
            });
        });
        it('should not be deleted (retention)', function (done) {
            subject(policy, logGroup, function (error, shouldBeDeleted) {
                expect(error).to.equal(null);
                expect(shouldBeDeleted.doDelete).to.equal(false);
                expect(shouldBeDeleted.reason).to.equal('retention');
                done();
            });
        });
        it('should not be deleted (recentlyCreated)', function (done) {
            delete policy.excludeRetention;
            subject(policy, logGroup, function (error, shouldBeDeleted) {
                expect(error).to.equal(null);
                expect(shouldBeDeleted.doDelete).to.equal(false);
                expect(shouldBeDeleted.reason).to.equal('recently created');
                done();
            });
        });
        it('should not be deleted (exclusion)', function (done) {
            delete policy.excludeRetention;
            delete policy.minAgeHours;
            subject(policy, logGroup, function (error, shouldBeDeleted) {
                expect(error).to.equal(null);
                expect(shouldBeDeleted.doDelete).to.equal(false);
                expect(shouldBeDeleted.reason).to.equal('exclude pattern match');
                done();
            });
        });
        it('should not be deleted (lastActivity)', function (done) {
            delete policy.excludeRetention;
            delete policy.minAgeHours;
            delete policy.exclusionPatterns;
            subject(policy, logGroup, function (error, shouldBeDeleted) {
                expect(error).to.equal(null);
                expect(shouldBeDeleted.doDelete).to.equal(false);
                expect(shouldBeDeleted.reason).to.equal('recent activity');
                done();
            });
        });
        it('should fail on activity aws error', function (done) {
            delete policy.excludeRetention;
            delete policy.minAgeHours;
            delete policy.exclusionPatterns;
            getLatestLogStreamUsageStub.yields('getLastLogStreamUsageStub');
            subject(policy, logGroup, function (error, _shouldBeDeleted) {
                expect(error).to.equal('getLastLogStreamUsageStub');
                done();
            });
        });
        it('should not be deleted (subscribed)', function (done) {
            delete policy.excludeRetention;
            delete policy.minAgeHours;
            delete policy.exclusionPatterns;
            delete policy.lastActivityHours;
            subject(policy, logGroup, function (error, shouldBeDeleted) {
                expect(error).to.equal(null);
                expect(shouldBeDeleted.doDelete).to.equal(false);
                expect(shouldBeDeleted.reason).to.equal('has subscriptions');
                done();
            });
        });
        it('should fail on activity aws error', function (done) {
            delete policy.excludeRetention;
            delete policy.minAgeHours;
            delete policy.exclusionPatterns;
            delete policy.lastActivityHours;
            describeSubscriptionFiltersStub.yields('describeSubscriptionFiltersStub');
            subject(policy, logGroup, function (error, _shouldBeDeleted) {
                expect(error).to.equal('describeSubscriptionFiltersStub');
                done();
            });
        });
    });
});
