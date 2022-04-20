// const yaml = require('js-yaml');
import {
  CachedMetadata,
  FileSystemAdapter,
  Stat,
  Vault
} from "obsidian";
// import * as fs from 'fs/promises';
const Path = require('path');
import { readdir } from 'fs/promises';
import compile from 'dfa/compile';
import StateMachine from 'dfa';

const Ascii10 = Object.fromEntries({
  *[Symbol.iterator]() {
    for (let index = 0; index < 256; index++) {
      yield [String.fromCharCode(index), index]
    }
  }
})


export async function getSnippets(snippetsDir: string) {

  const vault = this.app.vault

  const localSnippets = getLocalSnippets(vault)

  if (localSnippets !== null) {
    return localSnippets
  }



  return await createSnippets(snippetsDir)
  //now we look at the context
  // this.app.vault.read(this.app.vault.getAbstractFileByPath('snippets/hangul.machine')).then(file => {
  // })
}
export async function createSnippets(snippetsDir: string) {
  const vault = this.app.vault
  const yaml = await getYaml(snippetsDir)
  console.log(yaml);
  console.log("yaml");

  return getNewSnippets(JSON.parse(JSON.stringify(yaml.snippets)), vault)
}
export async function getNewSnippets(yamlSnippets, vault: Vault, newContext: { positions: string[] } = { positions: [] }) {

  const snippets = await formatSnippets(yamlSnippets, newContext.positions) //create copy and not just pass pointer
  if (snippets.hasOwnProperty("error")) {
    return snippets
  }
  //contextCondition before, than check for properties
  //result is a statemachine for matching and a table for results and context\
  // or create a state machine for every context and than load and unload on memory the right one 
  //always a table for context so fuck meeee
  try {
    snippets.stateMachine = compile(snippets.expressionsText, Ascii10);
  } catch (error) {
    console.log(error)
    return { error }
  }
  delete snippets.expressionsText

  saveLocalSnippets(vault, snippets)
  //put this to a file and be happy
  //send somewhere a good statemachine
  return snippets
}

async function saveLocalSnippets(vault: Vault, snippets): Promise<void> {
  if (! await vault.adapter.exists(Path.join(vault.configDir, "plugins", "My-Plugin", "data"))) {
    await vault.createFolder(Path.join(vault.configDir, "plugins", "My-Plugin", "data"))
  }
  if (! await vault.adapter.exists(Path.join(vault.configDir, "plugins", "My-Plugin", "data", "stateMachine"))) {
    await vault.create(Path.join(vault.configDir, "plugins", "My-Plugin", "data", "stateMachine"), JSON.stringify(snippets.stateMachine))
  } else {
    await vault.adapter.write(Path.join(vault.configDir, "plugins", "My-Plugin", "data", "stateMachine"), JSON.stringify(snippets.stateMachine))
  }
  if (! await vault.adapter.exists(Path.join(vault.configDir, "plugins", "My-Plugin", "data", "snippetsData"))) {
    await vault.create(Path.join(vault.configDir, "plugins", "My-Plugin", "data", "snippetsData"), JSON.stringify(snippets.stateMachine))
  } else {
    await vault.adapter.write(Path.join(vault.configDir, "plugins", "My-Plugin", "data", "snippetsData"), JSON.stringify(snippets.stateMachine))
  }
}


async function getLocalSnippets(vault: Vault) {
  const localStateMachine = new StateMachine(JSON.parse(await getLocalFile(vault, "stateMachine")))
  if (localStateMachine === null) {
    return null
  }
  const snippetsData = JSON.parse(await getLocalFile(vault, "snippetsData"))
  if (snippetsData === null) {
    return null
  }
  return { stateMachine: localStateMachine, snippetsData }
}

function getLocalFile(vault: Vault, name: string): Promise<string | null> {
  try {
    return vault.adapter.read(Path.join(vault.configDir, "plugins", "My-Plugin", "data", name))
  } catch (e) {
    return null
  }
}

async function getYaml(snippetsDir) {
  // this.app.vault.configDir
  const dir = snippetsDir

  const vaultDir = this.app.vault.adapter.basePath;

  const recursiveDir = async (path: string, yaml: { snippets: [], context: [] } = { snippets: [], context: [] }) => {
    const promisedFiles = readdir(Path.join(vaultDir, path), { withFileTypes: true });

    return promisedFiles.then(async files => {
      return Promise.all(files.map((file) => {
        if (file.isDirectory()) {
          return Promise.resolve(recursiveDir(Path.join(path, file.name), yaml))
        }
        else if (file.isFile()) {
          return new Promise((resolve, reject) => {
            try {
              const cache: CachedMetadata = this.app.metadataCache.getCache(Path.join(path, file.name))
              if (cache !== null && cache.frontmatter !== undefined && cache.frontmatter.type !== undefined) {
                try {
                  yaml[cache.frontmatter.type].push({ data: cache.frontmatter[cache.frontmatter.type], [Symbol.for("file")]: Path.join(path, file.name) })
                }
                catch (e) {
                  // do nothing little shit
                }
              }
              resolve("append success");
            }
            catch (e) {
              reject(e)
            }
          })
        }
      })).then(promises => {
        return yaml
      })
    })
  }
  return recursiveDir(dir)
}
async function formatSnippets(snippetsData, contextPositions: string[] = []) {
  // const snippets; // {}
  // const efficientSnippets; // all trigger transformed into regex, and response with type
  let snippetsFile = "##\n";//starting immediatly with variables
  await snippetsData.forEach(async file => {
    // Voglio stringa del tipo:  Nome /expr|exp2|.../
    try {
      if (!file.data[Object.keys(file.data)[0]].hasOwnProperty("trigger")) {
        console.log("failed")
        throw new Error("Missing trigger property");
      }
      const snippetsName = Object.keys(file.data)

      snippetsName.forEach(snippetName => {
        const expressionsData = file.data[snippetName].trigger;
        const expressions = fromDataToExpression(expressionsData)
        snippetsFile = snippetsFile.concat(snippetName, " /", expressions, "/\n")
      });

    } catch (e) {
      console.log(e)
      return { error: "CompilingExpr Error in: ".concat(file[Symbol.for("file")], " possible: ", e.message) }
    }

  });
  const formatted: { expressionsText: string, snippetsData: { fullWord: Record<string, { context: number, response: any[] | string }>, partWord: Record<string, { context: number, response: any[] | string }> }, stateMachine?: StateMachine } = { expressionsText: "", snippetsData: { fullWord: {}, partWord: {} } }
  formatted.expressionsText = snippetsFile
  // add snippetsFile to snippetData, and than compile table of context, and word
  // .word missing than false
  // .context missing than Default
  await snippetsData.forEach(async file => {
    try {
      const snippetsName = Object.keys(file.data)

      snippetsName.forEach(snippetName => {
        if (!file.data[Object.keys(file.data)[0]].hasOwnProperty("trigger")) {
          throw new Error("Missing trigger property");
        }
        const expressionsData = file.data[snippetName].trigger;
        if (!file.data[Object.keys(file.data)[0]].hasOwnProperty("response")) {
          throw new Error("Missing response property");
        }
        const responseData = file.data[snippetName].response;

        // {context:context, response:{non so}} and put in word true or false
        const result: { context: number, response: any[] | string } = { context: 0, response: responseData }
        if (expressionsData.hasOwnProperty("context")) {
          const contextPos = contextPositions.findIndex(expressionsData.context)
          if (contextPos === -1)
            throw new Error("Context doesn't exist: ".concat(expressionsData.context));
          result.context = contextPos
        }

        if (expressionsData.hasOwnProperty("word")) {
          if (expressionsData.word) {
            formatted.snippetsData.fullWord[snippetName] = result
          } else {
            formatted.snippetsData.partWord[snippetName] = result
          }
        }
      })

    } catch (e) {
      console.log(e)
      return { error: "CompilingExpr Error in: ".concat(file[Symbol.for("file")], " possible: ", e.message) }
    }
  })

  console.log(formatted)
  return formatted;
}

function fromDataToExpression(exprData) {
  if (Array.isArray(exprData.value)) {
    return exprData.value.reduce((result, condition) => {
      return result.concat("|", condition)
    })
  } else {
    return exprData.value
  }
}