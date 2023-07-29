const {Client} = require("@elastic/elasticsearch");

const client = new Client({node: 'http://localhost:9200'
})

async function searchLogs(){
    const { body } = await client.search({
        index: 'patient_logs', 
        body: {
            query: {
              match_all: {}, 
            },
          },
      });
      
      return body.hits.hits;
}

module.exports = searchLogs;