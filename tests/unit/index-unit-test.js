'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var sinon = require('sinon');

describe('UNIT tests for index', function () {
    var subject;
    var describeLogGroupsStub;
    var deleteLogGroupStub;
    var shouldGroupBeDeletedStub;
    var event;

    before(function () {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });

        describeLogGroupsStub = sinon.stub();
        deleteLogGroupStub = sinon.stub();
        shouldGroupBeDeletedStub = sinon.stub();

        var cloudWatchLogsMock = {
            describeLogGroups: describeLogGroupsStub,
            deleteLogGroup: deleteLogGroupStub
        };

        mockery.registerMock('./lib/cloud-watch-logs', cloudWatchLogsMock);
        mockery.registerMock('./lib/should-group-be-deleted', shouldGroupBeDeletedStub);
        subject = require('../../src/index');
    });
    beforeEach(function () {
        describeLogGroupsStub.reset().resetBehavior();
        describeLogGroupsStub.yields(null, { logGroups: [{}] });
        deleteLogGroupStub.reset().resetBehavior();
        deleteLogGroupStub.yields();
        shouldGroupBeDeletedStub.reset().resetBehavior();
        shouldGroupBeDeletedStub.yields(null, { doDelete: true });
        event = {
            inclusionPrefixes: '/',
            exclusionPatterns: '',
            minAgeHours: '48',
            lastActivityHours: '8',
            excludeRetention: 'false'
        };
    });
    after(function () {
        mockery.deregisterAll();
        mockery.disable();
    });

    describe('handler', function () {
        it('should succeed', function (done) {
            subject.handler(event, {}, function (error) {
                expect(error).to.equal(null);
                expect(deleteLogGroupStub.calledOnce).to.equal(true);
                done();
            });
        });
        it('should fail due to describe groups error', function (done) {
            describeLogGroupsStub.yields('describeLogGroupsStub');
            subject.handler(event, {}, function (error) {
                expect(error).to.equal('describeLogGroupsStub');
                done();
            });
        });
        it('should not delete group', function (done) {
            shouldGroupBeDeletedStub.yields(null, { doDelete: false });
            subject.handler(event, {}, function (error) {
                expect(error).to.equal(null);
                expect(deleteLogGroupStub.calledOnce).to.equal(false);
                done();
            });
        });
        it('should fail due to delete group error', function (done) {
            deleteLogGroupStub.yields('deleteLogGroupStub');
            subject.handler(event, {}, function (error) {
                expect(error).to.equal('deleteLogGroupStub');
                done();
            });
        });
        it('should fail due to should group be deleted error', function (done) {
            shouldGroupBeDeletedStub.yields('shouldGroupBeDeletedStub');
            subject.handler(event, {}, function (error) {
                expect(error).to.equal('shouldGroupBeDeletedStub');
                done();
            });
        });
        it('should run recursively', function (done) {
            event.exclusionPatterns = '/'; // Branch coverage
            describeLogGroupsStub.onFirstCall().yields(null, { logGroups: [{}], nextToken: 'abc' });
            describeLogGroupsStub.onSecondCall().yields(null, { logGroups: [{}] });
            subject.handler(event, {}, function (error) {
                expect(error).to.equal(null);
                expect(deleteLogGroupStub.calledTwice).to.equal(true);
                done();
            });
        });
    });
});
