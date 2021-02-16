// global configuration
const { default: config } = require("../dist/config/config");

const formatMessages = require("../dist/components/utils/format-materials");

const productionMode = config.isProduction;

// topology definition
module.exports = {
  general: {
    heartbeat: 2000,
    pass_binary_messages: true,
  },
  spouts: [
    {
      name: "input.kafka.video",
      type: "inproc",
      working_dir: "./components/spouts",
      cmd: "kafka_spout.js",
      init: {
        kafka: {
          host: config.kafka.host,
          topic: "PREPROC_MATERIAL_VIDEO_TRANSLATION",
          clientId: "PREPROC_MATERIAL_VIDEO_TRANSLATION",
          groupId: `${config.kafka.groupId}_PREPROC_MATERIAL_VIDEO_TRANSLATION`,
          high_water: 5,
          low_water: 0,
        },
      },
    },
  ],
  bolts: [
    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: "log.material.process.started",
            type: "inproc",
            working_dir: "./components/bolts",
            cmd: "pg_logging_bolt.js",
            inputs: [
              {
                source: "input.kafka.video",
              },
            ],
            init: {
              pg: config.pg,
              postgres_table: "material_process_queue",
              postgres_primary_id: "material_url",
              message_primary_id: "material_url",
              postgres_method: "update",
              postgres_time_attrs: {
                start_process_time: true,
              },
              postgres_literal_attrs: {
                status:
                  "[VIDEO][0/4] material processing started -> transforming format",
              },
              document_error_path: "message",
            },
          },
        ]
      : []),

    {
      name: "transform.material",
      working_dir: ".",
      type: "sys",
      cmd: "transform",
      inputs: [
        {
          source: productionMode
            ? "log.material.process.started"
            : "input.kafka.video",
        },
      ],
      init: {
        output_template: {
          title: "title",
          description: "description",
          provider_uri: "provider_uri",
          material_url: "material_url",
          author: "author",
          language: "language",
          type: "type.ext",
          mimetype: "type.mime",
          creation_date: "date_created",
          retrieved_date: "retrieved_date",
          provider: { token: "provider_token" },
          license: "license",
          material_metadata: {
            metadata: "material_metadata.metadata",
            raw_text: "material_metadata.raw_text",
            wikipedia_concepts: {},
          },
        },
      },
    },

    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: "log.material.process.formatting",
            type: "inproc",
            working_dir: "./components/bolts",
            cmd: "pg_logging_bolt.js",
            inputs: [
              {
                source: "transform.material",
              },
            ],
            init: {
              pg: config.pg,
              postgres_table: "material_process_queue",
              postgres_primary_id: "material_url",
              message_primary_id: "material_url",
              postgres_method: "update",
              postgres_literal_attrs: {
                status:
                  "[VIDEO][1/4] material object schema transformed -> retrieving transcriptions and translations",
              },
              document_error_path: "message",
            },
          },
        ]
      : []),

    {
      name: "extract.video.ttp",
      type: "inproc",
      working_dir: "./components/bolts",
      cmd: "video_ttp_bolt.js",
      inputs: [
        {
          source: productionMode
            ? "log.material.process.formatting"
            : "transform.material",
        },
      ],
      init: {
        ttp: {
          user: config.ttp.user,
          token: config.ttp.token,
        },
        document_language_path: "language",
        document_location_path: "material_url",
        document_authors_path: "author",
        document_title_path: "title",
        document_text_path: "material_metadata.raw_text",
        document_transcriptions_path: "material_metadata.transcriptions",
        ttp_id_path: "material_metadata.ttp_id",
        document_error_path: "message",
      },
    },

    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: "log.material.process.extract.video.ttp",
            type: "inproc",
            working_dir: "./components/bolts",
            cmd: "pg_logging_bolt.js",
            inputs: [
              {
                source: "extract.video.ttp",
              },
            ],
            init: {
              pg: config.pg,
              postgres_table: "material_process_queue",
              postgres_primary_id: "material_url",
              message_primary_id: "material_url",
              postgres_method: "update",
              postgres_literal_attrs: {
                status:
                  "[VIDEO][2/4] material transcriptions and translations retrieved -> retrieving wikipedia concepts",
              },
              document_error_path: "message",
            },
          },
        ]
      : []),

    {
      name: "extract.wikipedia",
      type: "inproc",
      working_dir: "./components/bolts",
      cmd: "wikipedia_bolt.js",
      inputs: [
        {
          source: productionMode
            ? "log.material.process.extract.video.ttp"
            : "extract.video.ttp",
        },
      ],
      init: {
        wikifier: {
          user_key: config.wikifier.userKey,
          wikifier_url: config.wikifier.wikifierURL,
          max_length: 20000,
        },
        document_text_path: "material_metadata.raw_text",
        wikipedia_concept_path: "material_metadata.wikipedia_concepts",
        document_error_path: "message",
      },
    },

    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: "log.material.process.extract.wikipedia",
            type: "inproc",
            working_dir: "./components/bolts",
            cmd: "pg_logging_bolt.js",
            inputs: [
              {
                source: "extract.wikipedia",
              },
            ],
            init: {
              pg: config.pg,
              postgres_table: "material_process_queue",
              postgres_primary_id: "material_url",
              message_primary_id: "material_url",
              postgres_method: "update",
              postgres_literal_attrs: {
                status: "[VIDEO][3/4] material wikified -> validating material",
              },
              document_error_path: "message",
            },
          },
        ]
      : []),

    {
      name: "message.validate",
      type: "inproc",
      working_dir: "./components/bolts",
      cmd: "validate_bolt.js",
      inputs: [
        {
          source: productionMode
            ? "log.material.process.extract.wikipedia"
            : "extract.wikipedia",
        },
      ],
      init: {
        json_schema: require("../schemas/material"),
        document_error_path: "message",
      },
    },

    // LOGGING STATE OF MATERIAL PROCESS
    ...(productionMode
      ? [
          {
            name: "log.material.process.message.validate",
            type: "inproc",
            working_dir: "./components/bolts",
            cmd: "pg_logging_bolt.js",
            inputs: [
              {
                source: "message.validate",
              },
            ],
            init: {
              pg: config.pg,
              postgres_table: "material_process_queue",
              postgres_primary_id: "material_url",
              message_primary_id: "material_url",
              postgres_method: "update",
              postgres_literal_attrs: {
                status:
                  "[VIDEO][4/4] material validated -> Storing the material",
              },
              document_error_path: "message",
            },
          },
        ]
      : []),

    /** **************************************
     * Send the completely processed materials
     * to kafka distribution
     */

    {
      name: "kafka.material.complete",
      type: "inproc",
      working_dir: "./components/bolts",
      cmd: "kafka_bolt.js",
      inputs: [
        {
          source: productionMode
            ? "log.material.process.message.validate"
            : "message.validate",
        },
      ],
      init: {
        kafka: {
          host: config.kafka.host,
          topic: "STORE_MATERIAL_COMPLETE",
          clientId: "STORE_MATERIAL_COMPLETE",
        },
        format_message: formatMessages.formatMaterialComplete,
      },
    },

    /** **************************************
     * Send the partially processed materials
     * to kafka distribution
     */

    {
      name: "kafka.material.partial",
      type: "inproc",
      working_dir: "./components/bolts",
      cmd: "kafka_bolt.js",
      inputs: [
        ...(productionMode
          ? [
              {
                source: "log.material.process.started",
                stream_id: "stream_error",
              },
            ]
          : []),
        ...(productionMode
          ? [
              {
                source: "log.material.process.formatting",
                stream_id: "stream_error",
              },
            ]
          : []),
        {
          source: "extract.video.ttp",
          stream_id: "stream_error",
        },
        ...(productionMode
          ? [
              {
                source: "log.material.process.extract.video.ttp",
                stream_id: "stream_error",
              },
            ]
          : []),
        {
          source: "extract.wikipedia",
          stream_id: "stream_error",
        },
        ...(productionMode
          ? [
              {
                source: "log.material.process.extract.wikipedia",
                stream_id: "stream_error",
              },
            ]
          : []),
        {
          source: "message.validate",
          stream_id: "stream_error",
        },
      ],
      init: {
        kafka: {
          host: config.kafka.host,
          topic: "STORE_MATERIAL_INCOMPLETE",
          clientId: "STORE_MATERIAL_INCOMPLETE",
        },
        format_message: formatMessages.formatMaterialPartial,
      },
    },
  ],
  variables: {},
};
