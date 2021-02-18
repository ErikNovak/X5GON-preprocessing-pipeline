// configurations
const { default: config } = require("../dist/config/config");

const productionMode = config.isProduction;

module.exports = {
    general: {
        heartbeat: 2000,
        pass_binary_messages: true
    },
    spouts: [
        {
            name: "kafka.material.update",
            type: "inproc",
            working_dir: "./components/spouts",
            cmd: "kafka_spout.js",
            init: {
                kafka: {
                    host: config.kafka.host,
                    topic: "UPDATE_MATERIAL_CONTENT",
                    clientId: "UPDATE_MATERIAL_CONTENT",
                    groupId: `${config.kafka.groupId}_UPDATE_MATERIAL_CONTENT`,
                    high_water: 100,
                    low_water: 10,
                    fromBeginning: true
                }
            }
        }
    ],
    bolts: [
    /** **************************************
     * Storing OER materials into database
     */

        {
            name: "store.pg.material.update",
            type: "inproc",
            working_dir: "./components/bolts",
            cmd: "pg_store_update_complete_bolt.js",
            inputs: [
                {
                    source: "kafka.material.update"
                }
            ],
            init: {
                pg: config.pg,
            }
        },

        // LOGGING STATE OF MATERIAL PROCESS
        ...(productionMode
            ? [
                {
                    name: "log.material.process.update.stored",
                    type: "inproc",
                    working_dir: "./components/bolts",
                    cmd: "pg_logging_bolt.js",
                    inputs: [
                        {
                            source: "store.pg.material.update"
                        }
                    ],
                    init: {
                        pg: config.pg,
                        postgres_table: "material_update_queue",
                        postgres_primary_id: "material_id",
                        message_primary_id: "material_id",
                        postgres_method: "update",
                        postgres_literal_attrs: {
                            status: "[STORE] material stored inside the database. Updating the search index"
                        },
                        document_error_path: "message"
                    }
                }
            ]
            : []),

        // update elasticsearch index
        {
            name: "store.pg.material.elasticsearch",
            type: "inproc",
            working_dir: "./components/bolts",
            cmd: "es_update_bolt.js",
            inputs: [
                {
                    source: productionMode
                        ? "log.material.process.update.stored"
                        : "store.pg.material.update"
                }
            ],
            init: {
                elasticsearch: config.elasticsearch,
                pg: config.pg,
                final_bolt: !productionMode
            }
        },

        // LOGGING STATE OF MATERIAL PROCESS
        ...(productionMode
            ? [
                {
                    name: "log.material.process.update.finished",
                    type: "inproc",
                    working_dir: "./components/bolts",
                    cmd: "pg_logging_bolt.js",
                    inputs: [
                        {
                            source: "store.pg.material.elasticsearch"
                        }
                    ],
                    init: {
                        pg: config.pg,
                        postgres_table: "material_update_queue",
                        postgres_primary_id: "material_id",
                        message_primary_id: "material_id",
                        postgres_method: "update",
                        postgres_time_attrs: {
                            end_process_time: true
                        },
                        postgres_literal_attrs: {
                            status: "[STORE] material updated"
                        },
                        document_error_path: "message",
                        final_bolt: true
                    }
                }
            ]
            : [])
    ],
    variables: {}
};
