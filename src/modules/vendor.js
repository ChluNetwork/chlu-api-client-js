const { get } = require('lodash')
const { createDAGNode, getDAGNodeMultihash } = require('chlu-ipfs-support/src/utils/ipfs')

class Vendor {
    constructor(chluApiClient) {
        this.chluApiClient = chluApiClient
    }

    async registerToMarketplace(url, profile = null) {
        const didId = this.chluApiClient.didIpfsHelper.didId
        const publicDidDocument = this.chluApiClient.didIpfsHelper.publicDidDocument
        this.chluApiClient.logger.debug(`Registering as Vendor to ${url} using DID ${didId}`)
        // check Marketplace Chlu Network
        const info = await this.chluApiClient.api.getMarketplaceInfo(url)
        const mktNetwork = get(info, 'network', null)
        if (mktNetwork !== this.chluApiClient.network) {
            throw new Error(`Expected Marketplace to run on Chlu Network ${this.chluApiClient.network}, found ${mktNetwork} instead`)
        }
        // Step 0: Make sure DID is published
        await this.chluApiClient.didIpfsHelper.publish()
        // Step 1: Register Vendor
        let vendorData = await this.chluApiClient.api.getVendorData(url, didId)
        if (get(vendorData, 'vDidId', null) === didId) {
            // Already exists
            this.chluApiClient.logger.debug('Vendor already registered')
        } else  {
            // Need to register
            this.chluApiClient.logger.debug('HTTP ===> Register Request for ' + didId)
            vendorData = await this.chluApiClient.api.signupToMarketplace(url, didId)
            this.chluApiClient.logger.debug('<=== HTTP Response:\n' + JSON.stringify(vendorData, null, 2))
        }
        // Step 2: Submit signature
        if (!vendorData.vSignature) {
            const vmPubKeyMultihash = vendorData.vmPubKeyMultihash
            this.chluApiClient.logger.debug(`Sending Vendor Signature for ${vmPubKeyMultihash}, profile: ${JSON.stringify(profile)}`)
            const signature = await this.chluApiClient.didIpfsHelper.signMultihash(vmPubKeyMultihash);
            await this.chluApiClient.api.sendVendorSignature(url, publicDidDocument, signature, profile)
        } else {
            this.chluApiClient.logger.debug('Marketplace/Vendor key already signed')
        }
        // Step 3: (Optional) Submit Profile
        if(profile) await this.updateProfile(url, profile)
        this.chluApiClient.logger.debug('Vendor Signup complete')
    }

    async updateProfile(url, profile = null) {
        const didId = this.chluApiClient.didIpfsHelper.didId
        this.chluApiClient.logger.debug(`Updating Vendor Profile for Marketplace ${url} using DID ${didId}`)
        const multihash = getDAGNodeMultihash(await createDAGNode(Buffer.from(JSON.stringify(profile))))
        const signature = await this.chluApiClient.didIpfsHelper.signMultihash(multihash);
        await this.chluApiClient.api.sendVendorProfile(url, didId, profile, signature)
        this.chluApiClient.logger.debug(`Updating Vendor Profile for Marketplace ${url} using DID ${didId} updated`)
    }
}

module.exports = Vendor