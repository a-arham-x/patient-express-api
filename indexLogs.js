const {Client} = require("@elastic/elasticsearch");

const client = new Client({node: 'http://localhost:9200',
headers: {
    'Content-Type': 'application/json'
  }
})

async function indexLog(message, result, timestamp, request_type, success, errors, server_error){
    const log = [{ message, result, timestamp, request_type, success }];
    if (errors!=null){
        log[0].errors = errors;
    }
    if (server_error!=null){
        log[0].server_error = server_error
    }

    await client.bulk({
        index: 'patient_logs', 
        body: log.flatMap(doc => [{ index: { _index: 'patient_logs' } }, doc]),
    })
}

module.exports = indexLog;