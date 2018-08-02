const sinon = require('sinon')
const expect = require('chai').expect
const ChluAPIClient = require('../src')
const logger = require('chlu-ipfs-support/tests/utils/logger');

describe('HTTP Client', () => {

    let chluApiClient, api

    beforeEach(() => {
        chluApiClient = new ChluAPIClient({
            queryApiUrl: 'https://test.query.chlu.io',
            publishApiUrl: 'https://test.publish.chlu.io',
            enablePersistence: false,
            logger: logger('HTTP Test')
        })
        api = chluApiClient.api
    })

    it('getPublisherDID', async () => {
        api.axios = {
            get: sinon.stub().resolves({
                data: { did: 'example' }
            })
        }
        let response = await api.getPublisherDID()
        expect(response).to.deep.equal('example')
        expect(api.axios.get.args[0][0]).to.equal('https://test.publish.chlu.io/api/v1/id')
    })

    it('readReviewRecord', async () => {
        api.axios = {
            get: sinon.stub().resolves({
                data: { hello: 'world' }
            })
        }
        let response = await api.readReviewRecord('abc', { getLatestVersion: false })
        expect(response).to.deep.equal({ hello: 'world' })
        expect(api.axios.get.args[0][0]).to.equal('https://test.query.chlu.io/api/v1/reviews/abc')
        expect(api.axios.get.args[0][1]).to.deep.equal({
            params: {
                getLatestVersion: false
            }
        })
        response = await api.readReviewRecord('abc')
        expect(api.axios.get.args[1][1]).to.deep.equal({
            params: {
                getLatestVersion: true
            }
        })
    })

    it('storeReviewRecord', async () => {
        api.axios = {
            post: sinon.stub().resolves({
                data: { hello: 'world' }
            })
        }
        const reviewRecord = { multihash: 'abc' }
        let response = await api.storeReviewRecord(reviewRecord, { publish: false, bitcoinTransactionHash: 'abc' })
        expect(response).to.deep.equal({ hello: 'world' })
        expect(api.axios.post.args[0][0]).to.equal('https://test.publish.chlu.io/api/v1/reviews')
        expect(api.axios.post.args[0][1]).to.deep.equal(reviewRecord)
        expect(api.axios.post.args[0][2]).to.deep.equal({
            params: {
                bitcoinTransactionHash: 'abc',
                expectedMultihash: '',
                publish: false
            }
        })
        response = await api.storeReviewRecord(reviewRecord)
        expect(api.axios.post.args[1][1]).to.deep.equal(reviewRecord)
        expect(api.axios.post.args[1][2]).to.deep.equal({
            params: {
                bitcoinTransactionHash: '',
                expectedMultihash: '',
                publish: true
            }
        })
    })

    it('getReviewsAboutDID', async () => {
        api.axios = {
            get: sinon.stub().resolves({
                data: { hello: 'world' }
            })
        }
        let response = await api.getReviewsAboutDID('abc')
        expect(response).to.deep.equal({ hello: 'world' })
        expect(api.axios.get.args[0][0]).to.equal('https://test.query.chlu.io/api/v1/dids/abc/reviews/about')
        expect(api.axios.get.args[0][1]).to.deep.equal({
            params: {
                limit: 0,
                offset: 0
            }
        })
        response = await api.getReviewsAboutDID('abc', 100, 20)
        expect(api.axios.get.args[1][1]).to.deep.equal({
            params: {
                limit: 20,
                offset: 100
            }
        })
    })

    it('getReviewsWrittenByDID', async () => {
        api.axios = {
            get: sinon.stub().resolves({
                data: { hello: 'world' }
            })
        }
        let response = await api.getReviewsWrittenByDID('abc')
        expect(response).to.deep.equal({ hello: 'world' })
        expect(api.axios.get.args[0][0]).to.equal('https://test.query.chlu.io/api/v1/dids/abc/reviews/writtenby')
        expect(api.axios.get.args[0][1]).to.deep.equal({
            params: {
                limit: 0,
                offset: 0
            }
        })
        response = await api.getReviewsWrittenByDID('abc', 100, 20)
        expect(api.axios.get.args[1][1]).to.deep.equal({
            params: {
                limit: 20,
                offset: 100
            }
        })
    })

    it('getDID', async () => {
        api.axios = {
            get: sinon.stub().resolves({
                data: { hello: 'world' }
            })
        }
        let response = await api.getDID('abc')
        expect(response).to.deep.equal({ hello: 'world' })
        expect(api.axios.get.calledWith('https://test.query.chlu.io/api/v1/dids/abc')).to.be.true
    })

    it('publishDID', async () => {
        api.axios = {
            post: sinon.stub().resolves({
                data: { hello: 'world' }
            })
        }
        const signature = {
            signatureValue: 'test'
        }
        const publicDidDocument = {
            my: 'document'
        }
        let response = await api.publishDID(publicDidDocument, signature)
        expect(response).to.deep.equal({ hello: 'world' })
        expect(api.axios.post.args[0][0]).to.equal('https://test.publish.chlu.io/api/v1/dids')
        expect(api.axios.post.args[0][1]).to.deep.equal({
            signature, publicDidDocument
        })
    })
})