const expect = require('chai').expect;
const sinon = require('sinon')

const ChluAPIClient = require('../src');
const logger = require('chlu-ipfs-support/tests/utils/logger');
const cryptoUtils = require('chlu-ipfs-support/tests/utils/crypto')
const { getFakeReviewRecord } = require('chlu-ipfs-support/tests/utils/protobuf');
const { getDAGNodeMultihash, createDAGNode } = require('chlu-ipfs-support/src/utils/ipfs')

describe('DID Module (API Client Version)', () => {
    let chluApiClient, exampleDID, exampleDIDID, makeDID

    beforeEach(async () => {
        chluApiClient = new ChluAPIClient({
            enablePersistence: false,
            logger: logger('DID Test')
        });
        const utils = cryptoUtils(chluApiClient)
        makeDID = utils.makeDID
        exampleDID = await makeDID()
        exampleDIDID = exampleDID.publicDidDocument.id
        const didMap = {
            [exampleDIDID]: exampleDID.publicDidDocument
        }
        // Stub HTTP API 
        chluApiClient.api = {
            publishDID: sinon.stub().callsFake(doc => {
                didMap[doc.id] = doc
            }),
            getDID: sinon.stub().callsFake(id => didMap[id] || null)
        }
    });

    afterEach(() => {
        chluApiClient = null;
    });


    it('signs and verifies Review Records', async () => {
        await chluApiClient.didIpfsHelper.start()
        async function verifyRR(rr) {
            const hashed = await chluApiClient.reviewRecords.hashReviewRecord(rr);
            const issuer = await chluApiClient.didIpfsHelper.verifyMultihash(
                hashed.issuer,
                hashed.hash,
                hashed.issuer_signature
            );
            const customer = await chluApiClient.didIpfsHelper.verifyMultihash(
                hashed.customer_signature.creator,
                hashed.hash,
                hashed.customer_signature
            )
            expect(hashed.issuer).to.equal(chluApiClient.didIpfsHelper.didId)
            expect(hashed.customer_signature.creator).to.equal(chluApiClient.didIpfsHelper.didId)
            return issuer && customer
        }
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord = await chluApiClient.didIpfsHelper.signReviewRecord(reviewRecord);
        const verification = await verifyRR(reviewRecord);
        expect(verification).to.be.true;
        // Test failure case: change a field and validate again
        reviewRecord.review.text = 'Hellooooo';
        const verificationToFail = await verifyRR(reviewRecord);
        expect(verificationToFail).to.be.false;
        // TODO: sign them with another DID to force them through the DID API Call
    });

    it('retrieves DID by ID', async () => {
        const did = await chluApiClient.didIpfsHelper.getDID(exampleDIDID);
        expect(did).to.deep.equal(exampleDID.publicDidDocument);
    });

    it('publishes signed DID Public Document', async () => {
        await chluApiClient.didIpfsHelper.generate()
        await chluApiClient.didIpfsHelper.publish() 
        const [ publicDidDocument, signature ] = chluApiClient.api.publishDID.args[0]
        expect(publicDidDocument.id).to.equal(chluApiClient.didIpfsHelper.didId)
        const multihash = getDAGNodeMultihash(await createDAGNode(Buffer.from(JSON.stringify(publicDidDocument))))
        const valid = await chluApiClient.didIpfsHelper.verifyMultihash(publicDidDocument.id, multihash, signature)
        expect(valid).to.be.true
    });

    it('generates DID', async () => {
        expect(chluApiClient.didIpfsHelper.didId).to.be.null
        expect(chluApiClient.didIpfsHelper.publicDidDocument).to.be.null
        expect(chluApiClient.didIpfsHelper.privateKeyBase58).to.be.null
        await chluApiClient.didIpfsHelper.start()
        expect(chluApiClient.didIpfsHelper.didId).to.match(/^did:chlu:/)
        expect(chluApiClient.didIpfsHelper.publicDidDocument).to.be.an('object')
        expect(chluApiClient.didIpfsHelper.privateKeyBase58).to.be.a('string')
        expect(chluApiClient.didIpfsHelper.publicDidDocument.id).to.equal(chluApiClient.didIpfsHelper.didId)
    });

    it('imports DID', async () => {
        expect(chluApiClient.didIpfsHelper.didId).to.be.null
        expect(chluApiClient.didIpfsHelper.publicDidDocument).to.be.null
        expect(chluApiClient.didIpfsHelper.privateKeyBase58).to.be.null
        const did = await makeDID()
        await chluApiClient.didIpfsHelper.import(did)
        expect(chluApiClient.didIpfsHelper.didId).to.match(/^did:chlu:/)
        expect(chluApiClient.didIpfsHelper.publicDidDocument).to.be.an('object')
        expect(chluApiClient.didIpfsHelper.privateKeyBase58).to.be.a('string')
        expect(chluApiClient.didIpfsHelper.publicDidDocument.id).to.equal(chluApiClient.didIpfsHelper.didId)
    });

    it('exports DID', async () => {
        await chluApiClient.didIpfsHelper.generate()
        expect(chluApiClient.didIpfsHelper.didId).to.match(/^did:chlu:/)
        expect(chluApiClient.didIpfsHelper.publicDidDocument).to.be.an('object')
        expect(chluApiClient.didIpfsHelper.privateKeyBase58).to.be.a('string')
        expect(chluApiClient.didIpfsHelper.publicDidDocument.id).to.equal(chluApiClient.didIpfsHelper.didId)
        const did = await chluApiClient.didIpfsHelper.export()
        expect(chluApiClient.didIpfsHelper.publicDidDocument).to.deep.equal(did.publicDidDocument)
        expect(chluApiClient.didIpfsHelper.privateKeyBase58).to.deep.equal(did.privateKeyBase58)
    });
});