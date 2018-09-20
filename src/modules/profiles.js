const { get, set } = require('lodash')

class ProfileResolver {
    constructor(chluApiClient) {
        this.chluApiClient = chluApiClient
        this.timeout = 3000
    }

    async getProfile(url, timeout = this.timeout) {
        // TODO: configurable timeouts
        // TODO: logs
        try {
            const response = await this.chluApiClient.api.axios.get(url, { timeout })
            const data = response.data
            // TODO: detect if it's a profile before returning
            if (data.profile) return data.profile
            return data
        } catch (error) {
            return null
        }
    }

    async resolveAuthorProfile(reviewRecord, timeout) {
        const url = get(reviewRecord, 'author.platform_url')
        if (url) {
            const profile = await this.getProfile(url, timeout)
            set(reviewRecord, 'author.profile', profile)
        }
        return reviewRecord
    }

    async resolveSubjectProfile(reviewRecord, timeout) {
        const url = get(reviewRecord, 'popr.marketplace_vendor_url') || get(reviewRecord, 'subject.url')
        if (url) {
            const profile = await this.getProfile(url, timeout)
            set(reviewRecord, 'subject.profile', profile)
        }
        return reviewRecord
    }

    async resolveProfiles(reviewRecords, timeout) {
        let list = Array.isArray(reviewRecords) ? reviewRecords : [reviewRecords]
        const resolver = async r => {
            await Promise.all([
                this.resolveAuthorProfile(get(r, 'reviewRecord', r), timeout),
                this.resolveSubjectProfile(get(r, 'reviewRecord', r), timeout)
            ])
            return r
        }
        list = await Promise.all(list.map(resolver))
        return reviewRecords
    }
}

module.exports = ProfileResolver