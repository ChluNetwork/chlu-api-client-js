const expect = require('chai').expect;
const sinon = require('sinon');

const ChluAPIClient = require('../src');
const logger = require('chlu-ipfs-support/tests/utils/logger');
const ChluDID = require('chlu-did/src');

const directory = '/tmp/chlu-test-' + Date.now() + Math.random();

describe('Persistence module', () => {

    let api;

    beforeEach(() => {
        api = new ChluAPIClient({
            directory,
            logger: logger('Customer')
        });
    });

    it('saves and loads in this environment', async () => {
        const data = { hello: 'world' };
        await api.storage.save(api.directory, data, api.type);
        const loaded = await api.storage.load(api.directory, api.type);
        expect(loaded).to.deep.equal(data);
    });

    it('saves DID', async () => {
        api.did.publish = sinon.stub().resolves()
        await api.did.generate();
        const publicDidDocument = api.did.publicDidDocument
        const privateKeyBase58 = api.did.privateKeyBase58
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        expect(api.storage.save.args[0][1].did).to.deep.equal({ publicDidDocument, privateKeyBase58 });
    });

    it('loads DID', async () => {
        const DID = new ChluDID()
        const did = await DID.generateDID()
        const data = { did };
        api.storage.load = sinon.stub().resolves(data);
        api.did.import = sinon.stub().resolves()
        await api.persistence.loadPersistedData();
        expect(api.storage.load.calledWith(api.directory)).to.be.true;
        expect(api.did.import.calledWith(did)).to.be.true;
    });
    
    it('skips loading if disabled', async () => {
        api = new ChluAPIClient({
            directory,
            logger: logger('Customer'),
            cache: { enabled: false },
            enablePersistence: false
        });
        api.storage.load = sinon.stub().resolves({});
        await api.persistence.loadPersistedData();
        expect(api.storage.load.called).to.be.false;
    });
    
    it('skips saving if disabled', async () => {
        api = new ChluAPIClient({
            directory,
            logger: logger('Customer'),
            cache: { enabled: false },
            enablePersistence: false
        });
        api.storage.save = sinon.stub().resolves();
        await api.persistence.persistData();
        expect(api.storage.save.called).to.be.false;
    });
});