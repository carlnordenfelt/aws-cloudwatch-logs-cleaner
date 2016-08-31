'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var sinon = require('sinon');

describe('UNIT tests for cloudWatchLogs', function () {
    var subject;
    var describeLogGroupsStub;
    var describeLogStreamsStub;
    var deleteLogGroupStub;
    var describeSubscriptionFiltersStub;

    before(function () {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });

        describeLogGroupsStub = sinon.stub();
        describeLogStreamsStub = sinon.stub();
        deleteLogGroupStub = sinon.stub();
        describeSubscriptionFiltersStub = sinon.stub();

        var awsSdkStub = {
            CloudWatchLogs: function () {
                this.describeLogGroups = describeLogGroupsStub;
                this.describeLogStreams = describeLogStreamsStub;
                this.deleteLogGroup = deleteLogGroupStub;
                this.describeSubscriptionFilters = describeSubscriptionFiltersStub;
            }
        };

        mockery.registerMock('aws-sdk', awsSdkStub);
        subject = require('../../../src/lib/cloud-watch-logs');
    });
    beforeEach(function () {
        var describeLogGroupResponse = {
            logGroups: [{}],
            nextToken: 'abc'
        };
        describeLogGroupsStub.reset().resetBehavior();
        describeLogGroupsStub.yields(null, describeLogGroupResponse);
        deleteLogGroupStub.reset().resetBehavior();
        deleteLogGroupStub.yields(null);
        describeLogStreamsStub.reset().resetBehavior();
        describeLogStreamsStub.yields(null, { logStreams: [{ lastEventTimestamp: 123 }]});
        describeSubscriptionFiltersStub.reset().resetBehavior();
        describeSubscriptionFiltersStub.yields(null, { subscriptionFilters: [{ }]});
    });
    after(function () {
        mockery.deregisterAll();
        mockery.disable();
    });

    describe('describeLogGroups', function () {
        it('should succeed', function (done) {
            subject.describeLogGroups('pattern', null, function (error, response) {
                expect(error).to.equal(null);
                expect(response.logGroups.length).to.equal(1);
                expect(response.nextToken).to.equal('abc');
                done();
            });
        });
        it('should succeed', function (done) {
            subject.describeLogGroups('', 'abs', function (error, response) {
                expect(error).to.equal(null);
                expect(response.logGroups.length).to.equal(1);
                expect(response.nextToken).to.equal('abc');
                done();
            });
        });
        it('should fail due to aws error', function (done) {
            describeLogGroupsStub.yields('describeLogGroupsStub');
            subject.describeLogGroups('pattern', null, function (error, response) {
                expect(error).to.equal('describeLogGroupsStub');
                expect(response).to.be.undefined;
                done();
            });
        });
    });
    describe('deleteLogGroup', function () {
        it('should succeed', function (done) {
            subject.deleteLogGroup({}, function (error) {
                expect(error).to.equal(undefined);
                done();
            });
        });
        it('should succeed even if there an aws error', function (done) {
            deleteLogGroupStub.yields('deleteLogGroupStub');
            subject.deleteLogGroup({}, function (error) {
                expect(error).to.equal(undefined);
                done();
            });
        });
    });
    describe('describeSubscriptionFilters', function () {
        it('should succeed', function (done) {
            subject.describeSubscriptionFilters({}, function (error, response) {
                expect(error).to.equal(null);
                expect(response.subscriptionFilters.length).to.equal(1);
                done();
            });
        });
        it('should fail', function (done) {
            describeSubscriptionFiltersStub.yields('describeSubscriptionFilters');
            subject.describeSubscriptionFilters({}, function (error) {
                expect(error).to.equal('describeSubscriptionFilters');
                done();
            });
        });
    });
    describe('getLatestLogStreamUsage', function () {
        it('should succeed', function (done) {
            subject.getLatestLogStreamUsage({}, function (error, lastEventTimestamp) {
                expect(error).to.equal(undefined);
                expect(lastEventTimestamp).to.equal(123);
                done();
            });
        });
        it('should fail on aws error', function (done) {
            describeLogStreamsStub.yields('describeLogStreamsStub');
            subject.getLatestLogStreamUsage({}, function (error) {
                expect(error).to.equal('describeLogStreamsStub');
                done();
            });
        });
        it('should succeed if aws error is due to stream not found', function (done) {
            describeLogStreamsStub.yields({ code: 'ResourceNotFoundException' });
            subject.getLatestLogStreamUsage({}, function (error) {
                expect(error).to.equal(undefined);
                done();
            });
        });
        it('should succeed if no log streams are found', function (done) {
            describeLogStreamsStub.yields(null, { logStreams: [] });
            subject.getLatestLogStreamUsage({}, function (error) {
                expect(error).to.equal(undefined);
                done();
            });
        });
        it('should give creationTime instead of last event timestamp', function (done) {
            describeLogStreamsStub.yields(null, { logStreams: [{creationTime: 123 }] });
            subject.getLatestLogStreamUsage({}, function (error, lastEventTimestamp) {
                expect(error).to.equal(undefined);
                expect(lastEventTimestamp).to.equal(123);
                done();
            });
        });
        it('should give Date.now if creationTime is too recent', function (done) {
            var now = Date.now();
            describeLogStreamsStub.yields(null, { logStreams: [{creationTime: now }] });
            subject.getLatestLogStreamUsage({}, function (error, lastEventTimestamp) {
                expect(error).to.equal(undefined);
                expect(lastEventTimestamp >= now).to.equal(true);
                done();
            });
        });
    });
});
