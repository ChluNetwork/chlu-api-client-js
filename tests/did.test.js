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
        await chluApiClient.did.start()
        async function verifyRR(rr) {
            const hashed = await chluApiClient.reviewRecords.hashReviewRecord(rr);
            const issuer = await chluApiClient.did.verifyMultihash(
                hashed.issuer,
                hashed.hash,
                hashed.issuer_signature
            );
            const customer = await chluApiClient.did.verifyMultihash(
                hashed.customer_signature.creator,
                hashed.hash,
                hashed.customer_signature
            )
            expect(hashed.issuer).to.equal(chluApiClient.did.didId)
            expect(hashed.customer_signature.creator).to.equal(chluApiClient.did.didId)
            return issuer && customer
        }
        let reviewRecord = await getFakeReviewRecord();
        reviewRecord = await chluApiClient.did.signReviewRecord(reviewRecord);
        const verification = await verifyRR(reviewRecord);
        expect(verification).to.be.true;
        // Test failure case: change a field and validate again
        reviewRecord.review.text = 'Hellooooo';
        const verificationToFail = await verifyRR(reviewRecord);
        expect(verificationToFail).to.be.false;
        // TODO: sign them with another DID to force them through the DID API Call
    });

    it('retrieves DID by ID', async () => {
        const did = await chluApiClient.did.getDID(exampleDIDID);
        expect(did).to.deep.equal(exampleDID.publicDidDocument);
    });

    it('publishes signed DID Public Document', async () => {
        await chluApiClient.did.generate()
        await chluApiClient.did.publish() 
        const [ publicDidDocument, signature ] = chluApiClient.api.publishDID.args[0]
        expect(publicDidDocument.id).to.equal(chluApiClient.did.didId)
        const multihash = getDAGNodeMultihash(await createDAGNode(Buffer.from(JSON.stringify(publicDidDocument))))
        const valid = await chluApiClient.did.verifyMultihash(publicDidDocument.id, multihash, signature)
        expect(valid).to.be.true
    });

    it('generates DID', async () => {
        expect(chluApiClient.did.didId).to.be.null
        expect(chluApiClient.did.publicDidDocument).to.be.null
        expect(chluApiClient.did.privateKeyBase58).to.be.null
        await chluApiClient.did.start()
        expect(chluApiClient.did.didId).to.match(/^did:chlu:/)
        expect(chluApiClient.did.publicDidDocument).to.be.an('object')
        expect(chluApiClient.did.privateKeyBase58).to.be.a('string')
        expect(chluApiClient.did.publicDidDocument.id).to.equal(chluApiClient.did.didId)
    });

    it('imports DID', async () => {
        expect(chluApiClient.did.didId).to.be.null
        expect(chluApiClient.did.publicDidDocument).to.be.null
        expect(chluApiClient.did.privateKeyBase58).to.be.null
        const did = await makeDID()
        await chluApiClient.did.import(did)
        expect(chluApiClient.did.didId).to.match(/^did:chlu:/)
        expect(chluApiClient.did.publicDidDocument).to.be.an('object')
        expect(chluApiClient.did.privateKeyBase58).to.be.a('string')
        expect(chluApiClient.did.publicDidDocument.id).to.equal(chluApiClient.did.didId)
    });

    it('exports DID', async () => {
        await chluApiClient.did.generate()
        expect(chluApiClient.did.didId).to.match(/^did:chlu:/)
        expect(chluApiClient.did.publicDidDocument).to.be.an('object')
        expect(chluApiClient.did.privateKeyBase58).to.be.a('string')
        expect(chluApiClient.did.publicDidDocument.id).to.equal(chluApiClient.did.didId)
        const did = await chluApiClient.did.export()
        expect(chluApiClient.did.publicDidDocument).to.deep.equal(did.publicDidDocument)
        expect(chluApiClient.did.privateKeyBase58).to.deep.equal(did.privateKeyBase58)
    });
});