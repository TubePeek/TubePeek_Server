
function getDevDbConfig() {
    return {
        client: 'pg',
        connection: {
            host : '127.0.0.1',
            user : 'postgres',
            password : 'asdffdsa',
            database : 'tubepeekdb'
        }
    };
}

function getAmazonEc2DbConfig() {
    return getDevDbConfig();
}

module.exports = {
    AmazonEc2: getAmazonEc2DbConfig(),
    development: getDevDbConfig()
}
