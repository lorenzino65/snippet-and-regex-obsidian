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
  CachedMetadata
} from "obsidian";
import * as fs from 'fs/promises';
const Path = require('path');
import { readdir } from 'fs/promises';
import compile from 'dfa/compile';

export function getSnippets(snippetsDir, snippets, context) {

  getYaml(snippetsDir).then(yaml =>
    formatSnippets(yaml.snippets)
  )


  // for (let [startIndex, endIndex, tag] of stateMachine.match([0, 1, 2, 3, 0, 4, 6])) {
  //   console.log('match:', startIndex, endIndex, tag);
  // }

}



async function getYaml(snippetsDir) {
  // this.app.vault.configDir
  // Get document, or throw exception on error.FileSystemAdapter.getBasePath()
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
              if (cache.frontmatter !== undefined && cache.frontmatter.type !== undefined) {
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
