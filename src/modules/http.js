const axios = require('axios')
const { get } = require('lodash')

class APIClient {

    constructor(queryApiUrl, publishApiUrl) {
        const subpath = '/api/v1'
        this.queryApiUrl = queryApiUrl + subpath
        this.publishApiUrl = publishApiUrl + subpath
        this.axios = axios.create()
    }

    async getPublisherDID() {
        const response = await this.axios.get(`${this.publishApiUrl}/id`)
        const did = get(response, 'data.did', null)
        return did
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
                bitcoinTransactionHash: get(options, 'bitcoinTransactionHash', ''),
                expectedMultihash: get(options, 'expectedMultihash', '')
            }
        })
        return response.data

    }

    async getReviewsWrittenByDID(didId, offset = 0, limit = 0) {
        const response = await this.axios.get(`${this.queryApiUrl}/dids/${didId}/reviews/writtenby`, {
            params: { limit, offset }
        })
        return response.data
    }

    async getReviewsAboutDID(didId, offset = 0, limit = 0) {
        const response = await this.axios.get(`${this.queryApiUrl}/dids/${didId}/reviews/about`, {
            params: { limit, offset }
        })
        return response.data
    }

    async getDID(didId, waitUntilPresent = false) {
        const response = await this.axios.get(`${this.queryApiUrl}/dids/${didId}`, {
            params: {
                waitUntilPresent: Boolean(waitUntilPresent)
            }
        })
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

    async sendVendorProfile(url, publicDidDocument, profile, signature) {
        const didId = publicDidDocument.id
        const response = await this.axios.post(`${url}/vendors/${didId}/profile`, { profile, signature, publicDidDocument })
        return response.data
    }

    async getMarketplaceInfo(url) {
        const response = await this.axios.get(`${url}/.well-known`)
        return response.data
    }

    async getVendorData(url, didId) {
        try {
            const response = await this.axios.get(`${url}/vendors/${didId}`)
            return response.data
        } catch (error) {
            return { data: {} }
        }
    }

    async signupToMarketplace(url, didId) {
        const response = await this.axios.post(`${url}/vendors`, { didId });
        return response.data
    }

    async sendVendorSignature(url, publicDidDocument, signature, profile = null) {
        const body = profile ? { signature, publicDidDocument, profile } : { signature, publicDidDocument }
        const didId = publicDidDocument.id
        const response = await this.axios.post(`${url}/vendors/${didId}/signature`, body);
        return response.data
    }

}

module.exports = APIClient