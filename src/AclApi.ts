import parseLinkHeader from 'parse-link-header'
import SolidAclParser from 'solid-acl-parser';
import { createAclDocProxy } from './AclDocProxy'
import { AclDocProxyOptions } from './AclDocProxy/AclDocProxyHandler';

const { AclDoc, AclParser } = SolidAclParser
type AclParser = import('solid-acl-parser/types/AclParser').default
type AclDoc = import('solid-acl-parser/types/AclDoc').default

class AclApi {
  private readonly fetch: (url: RequestInfo, options: RequestInit) => Promise<Response>
  private readonly options: AclDocProxyOptions
  private parser: AclParser
  private aclUrl: string
  
  constructor (fetch, options) {
    this.fetch = fetch
    this.options = options
  }

  async loadFromFileUrl (fileUrl: string) {
    this.aclUrl = await this.fetchAclUrl(fileUrl)
    const response = await this.fetch(this.aclUrl, { method: 'GET' })
    const turtle = await response.text()

    this.parser = new AclParser({ fileUrl, aclUrl: this.aclUrl })
    const parsedDoc = await this.parser.turtleToAclDoc(turtle)
    const proxyDoc = createAclDocProxy(parsedDoc, this.saveDoc.bind(this))

    return proxyDoc
  }

  async fetchAclUrl (fileUrl: string) {
    const response = await this.fetch(fileUrl, { method: 'OPTIONS' })
    return AclApi.getAclUrlFromResponse(response)
  }

  async saveDoc (doc: AclDoc) {
    const turtle = await this.parser.aclDocToTurtle(doc) as string // TODO
    return this.fetch(this.aclUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/turtle'
      },
      body: turtle
    })
  }

  static getAclUrlFromResponse (response: Response) {
    const { headers } = response
    const parsed = parseLinkHeader(headers.get('link'))
    if (!parsed['.acl']) {
      throw new Error("Couldn't retrieve the acl location from the link header")
    }
    return parsed['.acl'].url
  }
}

export default AclApi
