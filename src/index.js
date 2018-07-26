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

class ChluAPIClient {

    constructor(options = {}) {
        this.url = options.url || '/'
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
        this.did = new DID(this)
        this.api = new APIClient(this)
    }

    async start() {
        await this.persistence.loadPersistedData()
        // TODO: call API to verify health, Chlu Network and other information
        await this.did.start()
    }

    async stop() {
        await this.persistence.persistData()
    }

    async readReviewRecord(multihash, options) {
        return await this.api.readReviewRecord(multihash, options)
    }

    async storeReviewRecord(reviewRecord, options) {
        // TODO: sign/prepare the review record
        return await this.api.storeReviewRecord(reviewRecord, options)
    }

    async getReviewsByDID(didId, offset, limit) {
        return await this.api.getReviewsByDID(didId, offset, limit)
    }

    async getDID(didId) {
        return await this.did.getDID(didId)
    }

    async getPoPR(multihash) {
        return await this.api.getPoPR(multihash)
    }

}

module.exports = ChluAPIClient