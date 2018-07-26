
class Persistence {

    constructor(chluApiClient){
        this.chluApiClient = chluApiClient;
    }

    async persistData() {
        if (this.chluApiClient.enablePersistence) {
            const data = {};
            if (this.chluApiClient.did.isPresent()) {
                // save DID
                data.did = this.chluApiClient.did.export()
            }
            this.chluApiClient.logger.debug('Saving persisted data');
            try {
                await this.chluApiClient.storage.save(this.chluApiClient.directory, data);
            } catch (error) {
                this.chluApiClient.logger.error('Could not write data: ' + error.message || error);
            }
            this.chluApiClient.events.emit('persistence/saved');
            this.chluApiClient.logger.debug('Saved persisted data');
        } else {
            this.chluApiClient.logger.debug('Not persisting data, persistence disabled');
        }
    }

    async loadPersistedData() {
        if (this.chluApiClient.enablePersistence) {
            this.chluApiClient.logger.debug('Loading persisted data');
            const data = await this.chluApiClient.storage.load(this.chluApiClient.directory);
            if (data.did) {
                // Don't publish. If it's in persisted data, it was published before
                await this.chluApiClient.did.import(data.did, false);
            }
            this.chluApiClient.events.emit('persistence/loaded');
            this.chluApiClient.logger.debug('Loaded persisted data');
        } else {
            this.chluApiClient.logger.debug('Not loading persisted data, persistence disabled');
        }
    }

}

module.exports = Persistence;