/** ******************************************************************
 * PostgresQL storage process for materials
 * This component receives the verified OER material object and
 * stores it into postgresQL database.
 */

// interfaces
import * as Interfaces from "../../Interfaces";

// modules
import BasicBolt from "./basic_bolt";
import PostgreSQL from "../../library/postgresQL";


class IPGStoreNewIncompleteBolt extends BasicBolt {

    private _pg: PostgreSQL;
    private _finalBolt: boolean;

    constructor() {
        super();
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    async init(name: string, config: Interfaces.IStoreConfig, context: any) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[IPGStoreNewIncompleteBolt ${this._name}]`;

        // create the postgres connection
        this._pg = new PostgreSQL(config.pg);

        this._finalBolt = config.final_bolt || false;
    }

    heartbeat() {
        // do something if needed
    }

    async shutdown() {
        // close connection to postgres database
        await this._pg.close();
    }

    async receive(message: any, stream_id: string) {
        // get sent values
        const {
            oer_materials_partial
        } = message;

        try {
            await this._pg.upsert(oer_materials_partial, { materialurl: null }, "oer_materials_partial");
            return this._finalBolt ? null : await this._onEmit(message, stream_id);
        } catch (error) {
            // TODO: handle the error
            return this._finalBolt ? null : await this._onEmit(message, stream_id);
        }
    }
}

// create a new instance of the bolt
const create = () => new IPGStoreNewIncompleteBolt();

export { create };
