const EventEmitter = require('events')
const DIDIPFSHelper = require('./modules/didIpfsHelper')
const APIClient = require('./modules/http')
const Persistence = require('./modules/persistence')
const Vendor = require('./modules/vendor')
const ReviewRecords = require('chlu-ipfs-support/src/modules/reviewrecords')
const Protobuf = require('chlu-ipfs-support/src/modules/protobuf')
const Logger = require('chlu-ipfs-support/src/utils/logger')
const Storage = require('chlu-ipfs-support/src/utils/storage')
const constants = require('chlu-ipfs-support/src/constants')
const { get } = require('lodash')
const path = require('path')


class ChluAPIClient {

    constructor(options = {}) {
        const defaultDirectory = path.join(get(process, 'env.HOME', ''), 'chlu-api-client')
        this.directory = options.directory || defaultDirectory
        this.enablePersistence = get(options, 'enablePersistence', true)
        this.network = get(options, 'network', constants.networks.experimental)
        // Some of the Chlu full node modules are necessary here too
        this.storage = Storage
        this.logger = options.logger || Logger
        this.events = new EventEmitter()
        this.persistence = new Persistence(this)
        this.protobuf = new Protobuf(this)
        this.reviewRecords = new ReviewRecords(this)
        this.vendor = new Vendor(this)
        // Some are specific versions for the api client
        this.didIpfsHelper = new DIDIPFSHelper(this)
        this.api = new APIClient(
            options.queryApiUrl || '/',
            options.publishApiUrl || '/'
        )
    }

    async start() {
        await this.persistence.loadPersistedData()
        await this.didIpfsHelper.start()
    }

    async stop() {
        await this.persistence.persistData()
    }

    async readReviewRecord(multihash, options) {
        return await this.api.readReviewRecord(multihash, options)
    }

    async storeReviewRecord(reviewRecord, options = {}) {
        // prepare the review record
        // this will sign it as both customer and issuer. The server can then replace the issuer signature with its own
        // the 'validate' option is forced to false because the API Client cannot validate.
        const bitcoinTransactionHash = get(options, 'bitcoinTransactionHash', null)

        reviewRecord.issuer = await this.api.getPublisherDID() // Authorize server to issue review
        const result = await this.reviewRecords.prepareReviewRecord(reviewRecord, bitcoinTransactionHash, false, true, false)

        return await this.api.storeReviewRecord(result.reviewRecord, Object.assign({
            expectedMultihash: result.multihash
        }, options))
    }

    async getReviewsWrittenByDID(didId, offset, limit) {
        return await this.api.getReviewsWrittenByDID(didId, offset, limit)
    }

    async getReviewsAboutDID(didId, offset, limit) {
        return await this.api.getReviewsAboutDID(didId, offset, limit)
    }

    async getDID(didId, waitUntilPresent = false) {
        return await this.didIpfsHelper.getDID(didId, waitUntilPresent)
    }

    async getPoPR(multihash) {
        return await this.api.getPoPR(multihash)
    }

    async generateNewDID(publish, waitForReplication) {
        return await this.didIpfsHelper.generate(publish, waitForReplication)
    }

    async exportDID() {
        return await this.didIpfsHelper.export()
    }
    
    async importDID(did, publish, waitForReplication) {
        return await this.didIpfsHelper.import(did, publish, waitForReplication)
    }

    /**
     * Register to a Chlu Marketplace using your DID. The process is non-interactive.
     *
     * @param {string} url URL to a reachable service that implements the Chlu Marketplace HTTP API
     * @memberof ChluAPIClient
     */
    async registerToMarketplace(url) {
        return await this.vendor.registerToMarketplace(url)
    }

    /**
     * Update your vendor profile in a Chlu Marketplace using your DID
     *
     * @param {string} url URL to a reachable service that implements the Chlu Marketplace HTTP API
     * @param {object} profile your new profile
     * @memberof ChluAPIClient
     */
    async updateVendorProfile(url, profile) {
        return await this.vendor.updateProfile(url, profile)
    }

}

module.exports = ChluAPIClient