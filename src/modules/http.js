const axios = require('axios')
const { get } = require('lodash')

class APIClient {

    constructor(queryApiUrl, publishApiUrl) {
        const subpath = '/api/v1'
        this.queryApiUrl = queryApiUrl + subpath
        this.publishApiUrl = publishApiUrl + subpath
        this.axios = axios.create()
    }

    async readReviewRecord(multihash, options = {}) {
        const response = await this.axios.get(`${this.queryApiUrl}/reviews/${multihash}`, {
            params: {
                getLatestVersion: get(options, 'getLatestVersion', true)
            }
        })
        return response.data
    }

    async storeReviewRecord(reviewRecord, opt = {}) {
        const options = Object.assign({}, {
            publish: true
        }, opt)
        const response = await this.axios.post(`${this.publishApiUrl}/reviews`, reviewRecord, {
            params: {
                publish: get(options, 'publish', true),
                bitcoinTransactionHash: get(options, 'bitcoinTransactionHash', null)
            }
        })
        return response.data

    }

    async getReviewsByDID(didId, offset = 0, limit = 0) {
        const response = await this.axios.get(`${this.queryApiUrl}/dids/${didId}/reviews/about`, {
            params: { limit, offset }
        })
        return response.data
    }

    async getDID(didId) {
        const response = await this.axios.get(`${this.queryApiUrl}/dids/${didId}`)
        return response.data
    }

    async getPoPR(multihash) {
        const response = await this.axios.get(`${this.queryApiUrl}/poprs/${multihash}`)
        return response.data
    }

    async publishDID(publicDidDocument, signature) {
        const response = await this.axios.post(`${this.publishApiUrl}/dids`, { publicDidDocument, signature })
        return response.data
    }

}

module.exports = APIClient