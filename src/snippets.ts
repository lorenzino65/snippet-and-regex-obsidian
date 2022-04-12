const yaml = require('js-yaml');
import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  FileSystemAdapter,
  CachedMetadata,
  TAbstractFile
} from "obsidian";
import * as fs from 'fs/promises';
const Path = require('path');
import { readdir } from 'fs/promises';
import compile from 'dfa/compile';

const Ascii10 = Object.fromEntries({
  *[Symbol.iterator]() {
    for (let index = 0; index < 256; index++) {
      yield [String.fromCharCode(index), index]
    }
  }
})


export function getSnippets(snippetsDir, snippets, context) {

  getYaml(snippetsDir).then(yaml =>
    formatSnippets(yaml.snippets)
  )




  this.app.vault.read(this.app.vault.getAbstractFileByPath('snippets/hangul.machine')).then(file => {

    const stateMachine = compile(file, Ascii10);
    // find matches
    const [startIndex, tag] = stateMachine.match("012345")
    console.log('match:', startIndex, tag);

  })
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
              if (cache !== undefined && cache.frontmatter !== undefined && cache.frontmatter.type !== undefined) {
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
async function formatSnippets(snippetsFile) {
  // const snippets; // {}
  // const efficientSnippets; // all trigger transformed into regex, and response with type
  await snippetsFile.forEach(file => {
    console.log(file.data)
    console.log(file[Symbol.for("file")])
  });

  return snippetsFile;
}
