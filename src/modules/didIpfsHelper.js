const ChluDID = require('chlu-did/src')
const { getDigestFromMultihash, getDAGNodeMultihash, createDAGNode } = require('chlu-ipfs-support/src/utils/ipfs')
const { isObject, isString } = require('lodash')

class ChluIPFSDID {

    static isDIDID(didId) {
        return typeof didId === 'string' && didId.indexOf('did:') === 0
    }

    constructor(chluIpfs) {
        this.chluIpfs = chluIpfs 
        // ChluDID instance
        this.chluDID = new ChluDID()
        // Well Known DIDs
        // used for hardcoded DIDs in tests
        // and will also be used for stuff like official Chlu trusted DIDs
        this.wellKnownDIDs = {}
        this.didId = null
        this.publicDidDocument = null
        this.privateKeyBase58 = null
    }

    async start() {
        if (!this.isPresent()) {
            // Generate a DID & Publish
            await this.generate();
        }
        await this.publish()
    }

    async generate(publish, waitForReplication) {
        this.chluIpfs.logger.debug('Generating DID ...')
        const did = await this.chluDID.generateDID()
        this.chluIpfs.logger.debug(`Generated DID ${did.publicDidDocument.id}`)
        return await this.import(did, publish, waitForReplication)
    }

    async import(did, publish = true, waitForReplication = false) {
        this.chluIpfs.logger.debug(`Importing DID ${did.publicDidDocument.id}, publish: ${publish ? 'yes' : 'no'}`)
        this.publicDidDocument = did.publicDidDocument
        this.didId = this.publicDidDocument.id
        this.privateKeyBase58 = did.privateKeyBase58
        await this.chluIpfs.persistence.persistData()
        if (publish) await this.publish(null, waitForReplication)
        this.chluIpfs.logger.debug(`Importing DID ${did.publicDidDocument.id} DONE`)
    }

    export() {
        return {
            publicDidDocument: this.publicDidDocument,
            privateKeyBase58: this.privateKeyBase58
        }
    }

    isPresent() {
        return (
            isObject(this.publicDidDocument)
            && isString(this.didId)
            && isString(this.privateKeyBase58)
        )
    }

    async sign(data, privateKeyBase58) {
        return this.chluDID.sign(privateKeyBase58 || this.privateKeyBase58, data)
    }

    async verify(didId, data, signature, waitUntilPresent = false) {
        if (!didId) throw new Error('Missing DID ID')
        const didDocument = await this.getDID(didId, waitUntilPresent)
        if (!didDocument) {
            throw new Error(`Cannot verify signature by ${didId}: DID Document not found`)
        }
        return await this.chluDID.verify(didDocument, data, signature)
    }

    async signMultihash(multihash, did = null) {
        if (!did) did = {
            privateKeyBase58: this.privateKeyBase58,
            publicDidDocument: this.publicDidDocument
        }
        const data = getDigestFromMultihash(multihash)
        const result = await this.sign(data, did.privateKeyBase58)
        // TODO: Review this!
        return {
            type: 'did:chlu',
            created: 0, // TODO: add timestamps
            nonce: '',
            creator: did.publicDidDocument.id,
            signatureValue: result.signature
        }
    }

    async verifyMultihash(didId, multihash, signature, waitUntilPresent) {
        this.chluIpfs.logger.debug(`Verifying signature by ${didId} on ${multihash}: ${signature.signatureValue}`);
        if (signature.type !== 'did:chlu') {
            throw new Error('Unhandled signature type')
        }
        if (didId !== signature.creator) {
            throw new Error(`Expected data to be signed by ${didId}, found ${signature.creator} instead`)
        }
        const data = getDigestFromMultihash(multihash)
        const result = await this.verify(signature.creator, data, signature.signatureValue, waitUntilPresent) 
        this.chluIpfs.logger.debug(`Verified signature by ${signature.creator} on ${multihash}: ${signature.signatureValue} => ${result}`);
        return result
    }

    async signReviewRecord(obj, asIssuer = true, asCustomer = true) {
        if (asIssuer) {
            obj.issuer = this.didId
        }
        // TODO: write customer did id ? where ?
        // IMPORTANT: the fields must change before the hashing
        obj = await this.chluIpfs.reviewRecords.hashReviewRecord(obj);
        const signature = await this.signMultihash(obj.hash);
        if (asIssuer) {
            obj.issuer_signature = signature
        }
        if (asCustomer) {
            obj.customer_signature = signature
        }
        return obj;
    }

    async publish(did, waitForReplication = true) {
        let publicDidDocument
        if (did) { 
            publicDidDocument = did.publicDidDocument
        } else {
            publicDidDocument = this.publicDidDocument
        }
        this.chluIpfs.logger.debug(`Publishing DID ${publicDidDocument.id}, waitForReplication: ${waitForReplication ? 'yes' : 'no'}`)
        // TODO: pass custom full did and use it to sign
        const dagNode = await createDAGNode(Buffer.from(JSON.stringify(publicDidDocument)))
        const multihash = getDAGNodeMultihash(dagNode)
        const signature = await this.signMultihash(multihash, did)
        await this.chluIpfs.api.publishDID(publicDidDocument, signature)
        this.chluIpfs.logger.debug(`Publish DID ${publicDidDocument.id} DONE`)
    }

    async getDID(didId, waitUntilPresent = false) {
        this.chluIpfs.logger.debug(`GetDID ${didId} => ...`)
        if (didId === this.didId) {
            this.chluIpfs.logger.debug(`GetDID ${didId}: this is my DID, returning in memory copy`)
            return this.publicDidDocument
        }
        const wellKnown = this.getWellKnownDID(didId)
        if (wellKnown) {
            this.chluIpfs.logger.debug(`GetDID ${didId}: this is a well known DID, returning in memory copy`)
            return wellKnown
        }
        this.chluIpfs.logger.debug(`GetDID ${didId}: calling API ${waitUntilPresent ? ', Waiting until present' : ''}`)
        const data = await this.chluIpfs.api.getDID(didId, waitUntilPresent)
        this.chluIpfs.logger.debug(`GetDID ${didId} => ${JSON.stringify(data)}`)
        return data
    }

    getWellKnownDID(didId) {
        return this.wellKnownDIDs[didId] || null
    }
}

module.exports = ChluIPFSDID