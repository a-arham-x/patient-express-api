const {Client} = require("@elastic/elasticsearch");

const client = new Client({node: process.env.ES_HOST
})

async function searchLogs(){
    const { body } = await client.search({
        index: 'patient_logs', 
        body: {
            query: {
              match_all: {}, 
            },
          },
        size: 10000
      })
      
      return body.hits.hits;
}

module.exports = searchLogs;