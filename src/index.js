const EventEmitter = require('events')
const DID = require('./modules/did')
const APIClient = require('./modules/http')
const Persistence = require('./modules/persistence')
const Vendor = require('chlu-ipfs-support/src/modules/vendor')
const ReviewRecords = require('chlu-ipfs-support/src/modules/reviewrecords')
const Protobuf = require('chlu-ipfs-support/src/modules/protobuf')
const Logger = require('chlu-ipfs-support/src/utils/logger')
const Storage = require('chlu-ipfs-support/src/utils/storage')
const { get } = require('lodash')
const path = require('path')


class ChluAPIClient {

    constructor(options = {}) {
        const defaultDirectory = path.join(get(process, 'env.HOME', ''), 'chlu-api-client')
        this.directory = options.directory || defaultDirectory
        this.enablePersistence = get(options, 'enablePersistence', true)
        // Some of the Chlu full node modules are necessary here too
        this.storage = Storage
        this.logger = options.logger || Logger
        this.events = new EventEmitter()
        this.persistence = new Persistence(this)
        this.protobuf = new Protobuf(this)
        this.reviewRecords = new ReviewRecords(this)
        this.vendor = new Vendor(this)
        // Some are specific versions for the api client
        this.didIpfsHelper = new DID(this)
        this.api = new APIClient(
            options.queryApiUrl || '/',
            options.publishApiUrl || '/'
        )
    }

    async start() {
        await this.persistence.loadPersistedData()
        // TODO: call API to verify health, Chlu Network and other information
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
        const result = await this.reviewRecords.prepareReviewRecord(reviewRecord, bitcoinTransactionHash, false)
        return await this.api.storeReviewRecord(result.reviewRecord, options)
    }

    async getReviewsByDID(didId, offset, limit) {
        return await this.api.getReviewsByDID(didId, offset, limit)
    }

    async getDID(didId) {
        return await this.didIpfsHelper.getDID(didId)
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
    
    async registerToMarketplace(url) {
        return await this.vendor.registerToMarketplace(url)
    }

}

module.exports = ChluAPIClient