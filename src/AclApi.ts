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

const ETAG = 'ETag'
const IF_MATCH = 'If-Match'
const CONTENT_TYPE = 'Content-Type'

class AclApi {
  private readonly fetch: (url: RequestInfo, options: RequestInit) => Promise<Response>
  private readonly options: AclDocProxyOptions
  private _parser?: AclParser
  private _aclUrl?: string
  private _fileUrl?: string
  private eTag: string | null
  
  constructor (fetch: Fetch, options: AclApiOptions = { autoSave: true }) {
    this.fetch = fetch
    this.options = options
    this.eTag = null
  }

  async loadFromFileUrl (fileUrl: string) {
    this.fileUrl = fileUrl
    this.aclUrl = await this.fetchAclUrl(fileUrl)
    try {
      const turtle = await this.fetchAclAndStoreEtag(this.aclUrl)
      return this.loadFromTurtle(turtle)
    } catch (err) {
      if (err.status !== 404) {
        throw err
      }
      return this.loadDefaultsFor(this.fileUrl)
    }
  }

  async loadDefaultsFor(fileUrl: string): Promise<AclDocProxy> {
    const parentUrl = getParent(fileUrl)
    const parentAclUrl = await this.fetchAclUrl(parentUrl)
    try {
      const turtle = await this.fetchAcl(parentAclUrl)
      return this.loadDefaultsFromTurtle(turtle, parentUrl, parentAclUrl)
    } catch (err) {
      if (err.status !== 404) {
        throw err
      }
      return this.loadDefaultsFor(parentUrl)
    }
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
        [CONTENT_TYPE]: 'text/turtle',
        ...(this.eTag && { [IF_MATCH]: this.eTag }) // Check that the acl file hasn't been modified
      },
      body: turtle
    })

    if (!response.ok) {
      console.error(response)
      if (response.status === 416) {
        throw new Error('Error while trying to save the acl file: The file has been changed by another program')
      }
      throw new Error(`Error while trying to save the acl file: ${response.status} - ${response.statusText}`)
    }

    this.eTag = response.headers.get(ETAG)

    return response
  }

  // Makes a head request and stores the etag if available. On success returns turtle
  async fetchAclAndStoreEtag (aclUrl: string): Promise<string> {
    const response = await this.fetch(aclUrl, { method: 'GET' })
    if (!response.ok) {
      throw response
    }
    this.eTag = response.headers.get(ETAG)

    return response.text()
  }

  async fetchAcl (aclUrl: string): Promise<string> {
    const response = await this.fetch(aclUrl, { method: 'GET' })
    if (!response.ok) {
      throw response
    }

    return response.text()
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
