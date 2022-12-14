import tsj from 'ts-json-schema-generator';
import fs from 'fs/promises';
import { join } from 'path';
import glob from 'glob-all';
import { resolve } from 'path';

const __dirname = resolve();
const SRCDIR = `${__dirname}/src/types`;
const DSTDIR = `${__dirname}/src/types/validator`;

async function run() {
  await generateGlobalTypes();
  await generateSpecificTypes();
}

async function generateSpecificTypes() {
  const files = glob.sync(['src/**/*.type.ts']);
  console.log('files: ', files);
  for (const file of files) {
    const typeFilename = file.split('/').pop();
    const typeName = typeFilename.replace('.type.ts', '');
    const validationFilename = `${typeName}.validator.ts`;
    const validationFile = file.replace(typeFilename, validationFilename);
    const validationFnName = `is${typeName}`;
    const config = {
      path: file,
      tsconfig: `${__dirname}/tsconfig.json`,
      type: '*', // Or <type-name> if you want to generate schema for that one type only,
      name: typeName,
      fnName: validationFnName,
      output: validationFile,
      additionalProperties: true,
      relativePath: './',
      importName: `${typeName}.type`,
      importVarName: {
        pre: '{ ',
        post: ' }',
      },
    };
    await genFile(config);
  }
}

async function generateGlobalTypes() {
  const files = await fs.readdir(SRCDIR);
  await fs.mkdir(DSTDIR, { recursive: true });
  const typeFiles = files.filter((f) => f.endsWith('.ts'));

  for (const file of typeFiles) {
    console.log(`Generating validator for ${file}`);
    const typeName = file.replace('.ts', '');
    const fnName = `is${typeName}`;
    const config = {
      path: `${SRCDIR}/${file}`,
      tsconfig: `${__dirname}/tsconfig.json`,
      type: '*', // Or <type-name> if you want to generate schema for that one type only,
      name: typeName,
      fnName,
      output: join(DSTDIR, fnName + '.ts'),
      additionalProperties: true,
      relativePath: '../',
      importName: typeName,
      importVarName: {
        pre: '{',
        post: '}',
      },
    };
    await genFile(config);
  }
}

async function genFile(config) {
  const schema = tsj.createGenerator(config).createSchema(config.type);
  const schemaString = JSON.stringify(schema, null, 2);

  const fileContents = `
  // THIS FILE IS AUTO-GENERATED
  // DO NOT EDIT THIS FILE DIRECTLY
  
  import Ajv from "ajv";
  import addFormats from "ajv-formats";
  import ${config.importVarName.pre}${config.name}${config.importVarName.post} from "${config.relativePath}${config.importName}";
  
  const ajv = new Ajv();
  addFormats(ajv, ["date-time"]);
  const validate = ajv.compile(
    ${schemaString}
  );
  
  export function ${config.fnName}(value: unknown): value is ${config.name} {
    const isValid = validate(value);

    if (process.env.NODE_ENV === "development" && !isValid) {
      console.log(validate.errors?.map((e) => e.instancePath + ' ' + e.message).join(', ') || '');
    }

    return isValid;
  }
  `;
  await fs.writeFile(config.output, fileContents);
}

/*

const config = {
    path: `${__dirname}/../src/types/DiscordAccount.ts`,
    tsconfig: `${__dirname}/../tsconfig.json`,
    type: "*", // Or <type-name> if you want to generate schema for that one type only
};

const output_path = "./test.ts";

const schema = tsj.createGenerator(config).createSchema(config.type);
const schemaString = JSON.stringify(schema, null, 2);

const fileContents = `
// THIS FILE IS AUTO-GENERATED
// DO NOT EDIT THIS FILE DIRECTLY

import Ajv from "ajv";
import DiscordAccount from "./src/types/DiscordAccount";

const ajv = new Ajv();
const validate = ajv.compile(
  ${schemaString}
);

export function isDiscordAccount(value: unknown): value is DiscordAccount {
  return validate(value);
}
`;

fs.writeFile(output_path, fileContents, (err) => {
    if (err) throw err;
    console.log("Schema generated!");
});
*/

run();
