import parseLinkHeader from 'parse-link-header'
import { AclParser } from 'solid-acl-parser'
import { createAclDocProxy } from '../AclDocProxy'

class AclApi {
  constructor (fetch, options) {
    this.fetch = fetch
    this.options = options
    this.parser = null
    this.aclUrl = undefined
  }

  /**
   * @param {string} fileUrl
   * @returns {AclDocProxy}
   */
  async loadFromFileUrl (fileUrl) {
    this.aclUrl = await this.fetchAclUrl(fileUrl)
    const response = await this.fetch(this.aclUrl, { method: 'GET' })
    const turtle = await response.text()

    this.parser = new AclParser({ fileUrl, aclUrl: this.aclUrl })
    const parsedDoc = await this.parser.turtleToAclDoc(turtle)
    const proxyDoc = createAclDocProxy(parsedDoc, this.saveDoc.bind(this))

    return proxyDoc
  }

  /**
   * @param {string} fileUrl
   * @returns {string} aclUrl retrieved from the link header
   */
  async fetchAclUrl (fileUrl) {
    const response = await this.fetch(fileUrl, { method: 'OPTIONS' })
    return AclApi.getAclUrlFromResponse(response)
  }

  /**
   * @param {AclDoc} doc
   * @returns {Promise<doc>}
   */
  async saveDoc (doc) {
    const turtle = await this.parser.aclDocToTurtle(doc)
    return this.fetch(this.aclUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/turtle'
      },
      body: turtle
    })
  }

  /**
   * @param {Response} response
   * @returns {string}
   */
  static getAclUrlFromResponse (response) {
    const { headers } = response
    const parsed = parseLinkHeader(headers.get('link'))
    if (!parsed['.acl']) {
      throw new Error("Couldn't retrieve the acl location from the link header")
    }
    return parsed['.acl'].url
  }
}

export default AclApi
