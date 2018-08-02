const expect = require('chai').expect;
const sinon = require('sinon')

const ChluAPIClient = require('../src');
const logger = require('chlu-ipfs-support/tests/utils/logger');
const { getFakeReviewRecord } = require('chlu-ipfs-support/tests/utils/protobuf');

describe('API Client', () => {

    let chluApiClient

    beforeEach(() => {
        chluApiClient = new ChluAPIClient({
            enablePersistence: false,
            logger: logger('API Test')
        })
    })

    it('correctly signs review records when posting them', async () => {
        chluApiClient.api.getPublisherDID = sinon.stub().resolves('did:chlu:publisher')
        chluApiClient.api.publishDID = sinon.stub().resolves()
        chluApiClient.api.storeReviewRecord = sinon.stub().resolves({ ok: true })
        sinon.spy(chluApiClient.reviewRecords, 'prepareReviewRecord')
        await chluApiClient.start() // starts DID module, required for this test
        const reviewRecord = await getFakeReviewRecord()
        const result = await chluApiClient.storeReviewRecord(reviewRecord)
        expect(result).to.deep.equal({ ok: true })
        expect(chluApiClient.reviewRecords.prepareReviewRecord.calledWith(reviewRecord, null, false)).to.be.true
        const sentReviewRecord = chluApiClient.api.storeReviewRecord.args[0][0]
        // check sig
        const didId = chluApiClient.didIpfsHelper.didId
        const valid = await chluApiClient.didIpfsHelper.verifyMultihash(didId, sentReviewRecord.hash, sentReviewRecord.customer_signature)
        expect(valid).to.be.true
    })

})