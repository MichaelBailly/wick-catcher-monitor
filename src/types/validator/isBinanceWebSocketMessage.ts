
  // THIS FILE IS AUTO-GENERATED
  // DO NOT EDIT THIS FILE DIRECTLY
  
  import Ajv from "ajv";
  import addFormats from "ajv-formats";
  import BinanceWebSocketMessage from "../BinanceWebSocketMessage";
  
  const ajv = new Ajv();
  addFormats(ajv, ["date-time"]);
  const validate = ajv.compile(
    {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {}
}
  );
  
  export function isBinanceWebSocketMessage(value: unknown): value is BinanceWebSocketMessage {
    const isValid = validate(value);

    if (process.env.NODE_ENV === "development" && !isValid) {
      console.log(validate.errors?.map((e) => e.instancePath + ' ' + e.message).join(', ') || '');
    }

    return isValid;
  }
  