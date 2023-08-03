const {Client} = require("@elastic/elasticsearch"); 

const client = new Client({node: `${process.env.ES_HOST}`,
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

    console.log("logging");
    await client.bulk({
        index: 'patient_logs', 
        body: log.flatMap(doc => [{ index: { _index: 'patient_logs' } }, doc]),
    }).catch((err)=>{
        console.log(err)
    })
    console.log("Entering logs")
}

module.exports = indexLog;