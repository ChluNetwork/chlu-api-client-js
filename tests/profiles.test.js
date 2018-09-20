const expect = require('chai').expect;
const sinon = require('sinon')

const ChluAPIClient = require('../src');
const logger = require('chlu-ipfs-support/tests/utils/logger');
const { getFakeReviewRecord } = require('chlu-ipfs-support/tests/utils/protobuf');

describe('ProfileResolver', () => {

    let chluApiClient

    beforeEach(() => {
        chluApiClient = new ChluAPIClient({
            enablePersistence: false,
            logger: logger('API Test')
        })
        chluApiClient.api.axios = {
            get: sinon.stub().resolves({
                data: {
                    name: 'Test Profile'
                }
            })
        }
    })

    it('fetches a profile from URL', async () => {
        const profile = await chluApiClient.profileResolver.getProfile('http://chlu.io/example/url')
        expect(profile).to.deep.equal({
            name: 'Test Profile'
        })
    })

    it('fetches author and subject profiles from review records', async () => {
        const reviewRecords = [ await getFakeReviewRecord() ]
        reviewRecords[0].popr.marketplace_vendor_url = 'subjecturl'
        reviewRecords[0].author.platform_url = 'authorurl'
        const result = await chluApiClient.profileResolver.resolveProfiles(reviewRecords)
        expect(result[0].author.profile).to.deep.equal({ name: 'Test Profile' })
        expect(result[0].subject.profile).to.deep.equal({ name: 'Test Profile' })
        expect(chluApiClient.api.axios.get.args.map(l => l[0])).to.include('authorurl', 'subjecturl')
    })

})