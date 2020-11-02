// JSONs
import * as mimetypes from "../../config/mimetypes.json";
// modules
import BasicBolt from "./basic_bolt";
import * as Interfaces from "../../Interfaces";


class MsgRedirectBolt extends BasicBolt {

    private _lastUpdated: string;

    constructor() {
        super();
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    async init(name: string, config: any, context: any) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[MsgRedirectBolt ${this._name}]`;
        this._lastUpdated = config.last_updated;
    }

    heartbeat() {
        // do something if needed
    }

    async shutdown() {
        // shutdown component
    }

    async receive(material: Interfaces.IMessage, stream_id: string) {
        const {
            mimetype,
            retrieved_date
        } = material;

        const date = new Date(retrieved_date);
        // check if the video and audio materials were retrieved before 2019-07-01
        const limitDate = new Date(this._lastUpdated);
        if (date >= limitDate) {
            stream_id = "updated";
        } else if (mimetypes.video.includes(mimetype)) {
            stream_id = "video";
        } else if (mimetypes.audio.includes(mimetype)) {
            stream_id = "audio";
        } else if (mimetypes.text.includes(mimetype)) {
            stream_id = "text";
        } else {
            stream_id = "unknown";
        }
        // redirect the material
        return await this._onEmit(material, stream_id);
    }
}
// create a new instance of the bolt
const create = () => new MsgRedirectBolt();

export { create };
