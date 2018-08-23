
const expect = require('chai').expect;
const sinon = require('sinon')

const ChluAPIClient = require('../src');
const logger = require('chlu-ipfs-support/tests/utils/logger');

describe('Vendor Module', () => {
    let chluApiClient, didId, publicDidDocument

    beforeEach(async () => {
        chluApiClient = new ChluAPIClient({
            enablePersistence: false,
            cache: { enabled: false },
            logger: logger('Vendor')
        });
        chluApiClient.didIpfsHelper.publish = sinon.stub().resolves()
        chluApiClient.didIpfsHelper.signMultihash = sinon.stub().resolves({ signatureValue: 'test' })
        // TODO: test getInfo as well
        chluApiClient.api.getMarketplaceInfo = sinon.stub().resolves({ network: 'experimental' })
        await chluApiClient.didIpfsHelper.start()
        didId = chluApiClient.didIpfsHelper.didId
        publicDidDocument = chluApiClient.didIpfsHelper.publicDidDocument
    });

    afterEach(() => {
        chluApiClient = null;
    });


    it('performs a full signup of the vendor to the marketplace', async () => {
        chluApiClient.api.getVendorData = sinon.stub().resolves({ data: {} })
        chluApiClient.api.signupToMarketplace = sinon.stub().resolves({
            data: { 
                vDidId: didId,
                vSignature: null,
                vmPubKeyMultihash: 'multihash'
            }
        })
        chluApiClient.api.sendVendorSignature = sinon.stub().resolves()
        const url = 'http://localhost:12345'
        await chluApiClient.vendor.registerToMarketplace(url)
        expect(chluApiClient.api.getVendorData.calledWith(url, didId)).to.be.true
        expect(chluApiClient.api.signupToMarketplace.calledWith(url, didId)).to.be.true
        const signature = await chluApiClient.didIpfsHelper.signMultihash.returnValues[0]
        expect(chluApiClient.api.sendVendorSignature.calledWith(url, publicDidDocument, signature)).to.be.true
    });

    it('submits the signature if the vendor is signed up but the sig is missing', async () => {
        chluApiClient.api.getVendorData = sinon.stub().resolves({ vDidId: didId })
        chluApiClient.api.signupToMarketplace = sinon.stub().resolves()
        chluApiClient.api.sendVendorSignature = sinon.stub().resolves()
        const url = 'http://localhost:12345'
        await chluApiClient.vendor.registerToMarketplace(url)
        expect(chluApiClient.api.getVendorData.calledWith(url, didId)).to.be.true
        expect(chluApiClient.api.signupToMarketplace.called).to.be.false
        const signature = await chluApiClient.didIpfsHelper.signMultihash.returnValues[0]
        expect(chluApiClient.api.sendVendorSignature.calledWith(url, publicDidDocument, signature)).to.be.true
    });

    it('does nothing if the vendor is already fully signed up', async () => {
        chluApiClient.api.getVendorData = sinon.stub().resolves({ vDidId: didId, vSignature: 'test' })
        chluApiClient.api.signupToMarketplace = sinon.stub().resolves()
        chluApiClient.api.sendVendorSignature = sinon.stub().resolves()
        const url = 'http://localhost:12345'
        await chluApiClient.vendor.registerToMarketplace(url)
        expect(chluApiClient.api.getVendorData.calledWith(url, didId)).to.be.true
        expect(chluApiClient.api.signupToMarketplace.called).to.be.false
        expect(chluApiClient.api.sendVendorSignature.called).to.be.false
    });

    it('updates the vendor profile', async () => {
        chluApiClient.api.sendVendorProfile = sinon.stub().resolves()
        const url = 'http://localhost:12345'
        const profile = { name: 'Developer' }
        await chluApiClient.vendor.updateProfile(url, profile)
        const signature = await chluApiClient.didIpfsHelper.signMultihash.returnValues[0]
        expect(chluApiClient.api.sendVendorProfile.calledWith(url, publicDidDocument, profile, signature)).to.be.true
    })
});