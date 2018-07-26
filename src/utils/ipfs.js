const DAGNode = require('ipld-dag-pb').DAGNode;

async function createDAGNode(buf) {
    if (!Buffer.isBuffer(buf)) {
        throw new Error('Argument is not a buffer');
    }
    return await new Promise((resolve, reject) => {
        DAGNode.create(buf, [], (err, dagNode) => {
            if (err) reject(err); else resolve(dagNode);
        });
    });
}

module.exports = { createDAGNode }