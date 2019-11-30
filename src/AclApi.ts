import url from 'url'
import parseLinkHeader from 'parse-link-header'
import SolidAclParser from 'solid-acl-parser'
import { createAclDocProxy } from './AclDocProxy'
import { AclDocProxy } from './AclDocProxy/AclDocProxy'
import { AclDocProxyOptions } from './AclDocProxy/AclDocProxyHandler';

const { AclDoc, AclParser } = SolidAclParser
type AclParser = import('solid-acl-parser/types/AclParser').default
type AclDoc = import('solid-acl-parser/types/AclDoc').default

type Fetch = (url: RequestInfo, options: RequestInit) => Promise<Response>
interface AclApiOptions {
  autoSave: boolean
}

class AclApi {
  private readonly fetch: (url: RequestInfo, options: RequestInit) => Promise<Response>
  private readonly options: AclDocProxyOptions
  private _parser?: AclParser
  private _aclUrl?: string
  private _fileUrl?: string
  
  constructor (fetch: Fetch, options: AclApiOptions = { autoSave: true }) {
    this.fetch = fetch
    this.options = options
  }

  async loadFromFileUrl (fileUrl: string) {
    this.fileUrl = fileUrl
    this.aclUrl = await this.fetchAclUrl(fileUrl)
    const response = await this.fetch(this.aclUrl, { method: 'GET' })
    if (!response.ok && response.status !== 404) {
      throw new Error('Unexpected response when trying to fetch acl file. Please make sure you have the correct permissions')
    }

    return response.ok ? this.loadFromTurtle(await response.text()) : this.loadDefaultsFor(this.fileUrl)
  }

  async loadDefaultsFor(fileUrl: string): Promise<AclDocProxy> {
    const parentUrl = getParent(fileUrl)
    const parentAclUrl = await this.fetchAclUrl(parentUrl)
    const response = await this.fetch(parentAclUrl, { method: 'GET' })
    if (!response.ok && response.status !== 404) {
      throw new Error('Unexpected response when trying to fetch acl file. Please make sure you have the correct permissions')
    }
    if (!response.ok) {
      return this.loadDefaultsFor(parentUrl)
    }

    return this.loadDefaultsFromTurtle(await response.text(), parentUrl, parentAclUrl)
  }

  async loadFromTurtle(turtle: string) {
    const parsedDoc = await this.parser.turtleToAclDoc(turtle)
    return createAclDocProxy(parsedDoc, this.saveDoc.bind(this))
  }

  async loadDefaultsFromTurtle(turtle: string, defaultFileUrl: string, defaultAclUrl: string) {
    const defaultParser = new AclParser({ fileUrl: defaultFileUrl, aclUrl: defaultAclUrl })
    const parsedDoc = await defaultParser.turtleToAclDoc(turtle)
    const defaultDoc = new AclDoc({ accessTo: this.fileUrl })

    for (const [subjectId, rule] of Object.entries(parsedDoc.rules)) {
      if (rule.default || rule.defaultForNew) {
        const newRule = rule.clone()
        newRule.accessTo = this.fileUrl
        newRule.default = undefined
        newRule.defaultForNew = undefined
        const newSubjectId = subjectId.includes('#') ? subjectId.substr(subjectId.lastIndexOf('#')) : subjectId
        defaultDoc.addRule(newRule, undefined, { subjectId: newSubjectId })
      }
    }

    return createAclDocProxy(defaultDoc, this.saveDoc.bind(this))
  }

  async fetchAclUrl (fileUrl: string) {
    const response = await this.fetch(fileUrl, { method: 'OPTIONS' })
      .catch(err => {
        if (err && err.status && err.status === 404) {
          return err
        }
        throw err
      })

    return AclApi.getAclUrlFromResponse(response)
  }

  async saveDoc (doc: AclDoc) {
    const turtle = await this.parser.aclDocToTurtle(doc)
    const response = await this.fetch(this.aclUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/turtle'
      },
      body: turtle
    })
    if (!response.ok) {
      console.error(response)
      throw new Error(`Error while trying to save the acl file: ${response.status} - ${response.statusText}`)
    }
    return response
  }

  static getAclUrlFromResponse (response: Response): string {
    const { headers } = response
    const parsed = parseLinkHeader(headers.get('link') || '')
    if (!parsed || !parsed.acl) {
      throw new Error("Couldn't retrieve the acl location from the link header")
    }
    const aclUrl = url.resolve(response.url, parsed.acl.url)
    return aclUrl
  }

  get parser () {
    if (!this._parser) {
      this._parser = new AclParser({ fileUrl: this.fileUrl, aclUrl: this.aclUrl })
    }
    return this._parser
  }

  set parser (parser: AclParser) {
    this._parser = parser
  }

  get fileUrl () {
    if (!this._fileUrl) {
      throw new Error('tried to get fileUrl before it was set')
    }
    return this._fileUrl
  }

  set fileUrl (fileUrl: string) {
    this._fileUrl = fileUrl
  }

  get aclUrl () {
    if (!this._aclUrl) {
      throw new Error('tried to get aclUrl before it was set')
    }
    return this._aclUrl
  }

  set aclUrl (aclUrl: string) {
    this._aclUrl = aclUrl
  }
}

// Url of the parent folder with the / at the end
function getParent (url: string) {
  return url.substring(0, url.slice(0, -1).lastIndexOf('/') + 1)
}

export default AclApi
