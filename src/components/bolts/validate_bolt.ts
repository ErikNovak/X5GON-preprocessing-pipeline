/** ******************************************************************
 * Validate Message
 * This component validates the material object using the
 * JSON Schema validator component.
 */

// interfaces
import * as Interfaces from "../../Interfaces";

// modules
import BasicBolt from "./basic_bolt";
import * as jsonschema from "jsonschema";
import Validator from "../../library/schema-validator";


class ValidateBolt extends BasicBolt {

    private _validator: Validator;
    private _JSONSchema: jsonschema.Schema;
    private _documentErrorPath: string;

    constructor() {
        super();
        this._name = null;
        this._onEmit = null;
        this._context = null;
    }

    async init(name: string, config: Interfaces.IValidateBoltConfig, context: any) {
        this._name = name;
        this._context = context;
        this._onEmit = config.onEmit;
        this._prefix = `[ValidateBolt ${this._name}]`;

        // initialize validator with
        this._validator = new Validator();
        // the validation schema
        this._JSONSchema = config.json_schema;
        // the path to where to store the error
        this._documentErrorPath = config.document_error_path || "error";
    }

    heartbeat() {
        // do something if needed
    }

    async shutdown() {
        // prepare for graceful shutdown, e.g. save state
    }

    async receive(message: any, stream_id: string) {
        const {
            isValid,
            message: validationMessage
        } = this._validator.validateSchema(message, this._JSONSchema);
        const stream_direction = isValid ? stream_id : "stream_error";
        if (!isValid) {
            // add errors it present
            const errorMessage = `${this._prefix} ${validationMessage}`;
            this.set(message, this._documentErrorPath, errorMessage);
        }
        // continue to the next bolt
        return await this._onEmit(message, stream_direction);
    }
}

// create a new instance of the bolt
const create = () => new ValidateBolt();

export { create };
