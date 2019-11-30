import SolidAclParser from 'solid-acl-parser'
import AclApi from '../src/AclApi'
import { resolve } from 'url';

const { AclDoc, Permissions, Agents } = SolidAclParser
const { READ, WRITE, APPEND, CONTROL } = Permissions

const webId = 'https://example.solid.community/profile/card#me'
const samplePublicFileUrl = 'https://alice.databox.me/profile/card'
const samplePublicAclContent = `
@prefix   acl:  <http://www.w3.org/ns/auth/acl#>.
@prefix  foaf:  <http://xmlns.com/foaf/0.1/>.

<#authorization2>
    a               acl:Authorization;
    acl:agentClass  foaf:Agent;                               # everyone
    acl:mode        acl:Read;                                 # has Read-only access
    acl:accessTo    <${samplePublicFileUrl}>.  # to the public profile`
const samplePublicAclDoc = new AclDoc({ accessTo: samplePublicFileUrl })
samplePublicAclDoc.addRule(READ, Agents.PUBLIC, { subjectId: `${samplePublicFileUrl}.acl#authorization2` })

const sampleDefaultFileUrl = 'https://example.solid.community/public/test/index.html'
const sampleDefaultAclContent = `
# ACL resource for the public folder
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

# The owner has all permissions
<#owner>
    a acl:Authorization;
    acl:agent <${webId}>;
    acl:accessTo <./>;
    acl:defaultForNew <./>;
    acl:mode acl:Read, acl:Write, acl:Control.

# The public has read permissions
<#public>
    a acl:Authorization;
    acl:agentClass foaf:Agent;
    acl:accessTo <./>;
    acl:defaultForNew <./>;
    acl:mode acl:Read.
`
const sampleDefaultFileDoc = new AclDoc({ accessTo: sampleDefaultFileUrl })
sampleDefaultFileDoc.addRule([READ, WRITE, CONTROL], webId, { subjectId: '#owner' })
sampleDefaultFileDoc.addRule(READ, Agents.PUBLIC, { subjectId: '#public' })

describe('AclApi.getAclUrlFromResponse', () => {
  const fileUrl = 'https://solid.example.org/foo/file.ttl'
  const sampleAclLinks = [
    './public/file.ttl.acl',
    './public/file.acl',
    './public/.acl',
    './public/unusual'
  ]

  test('returns acl link if valid link header is provided', () => {
    for (const aclLink of sampleAclLinks) {
      const headers = {
        get: (header) => header === 'link' ? `<${aclLink}>; rel="acl"` : null
      }
      const response = {
        headers,
        url: fileUrl
      }
      const parsedAclLink = AclApi.getAclUrlFromResponse(response)
      expect(parsedAclLink).toBe(resolve(fileUrl, aclLink))
    }
  })
  test('throws error if no link header is provided', () => {
    const headers = {
      get: () => null
    }
    const response = { headers }
    expect(() => AclApi.getAclUrlFromResponse(response)).toThrowError(/link header/)
  })
})

describe('saveDoc', () => {
  test('throws error if not initialized', () => {
    const aclApi = new AclApi(() => {})
    expect(aclApi.saveDoc()).rejects.toBeDefined()
  })
  test('calls fetch method with parsed turtle', async () => {
    const aclUrl = './file.acl'
    const fetch = jest.fn()
    fetch.mockResolvedValue({ ok: true })
    const aclDocToTurtle = jest.fn()
    aclDocToTurtle.mockResolvedValue('turtle content')
    const doc = { test: true }

    const aclApi = new AclApi(fetch)
    aclApi.aclUrl = aclUrl
    aclApi.parser = { aclDocToTurtle }

    expect(await aclApi.saveDoc(doc)).toEqual({ ok: true })
    expect(aclDocToTurtle.mock.calls[0][0]).toBe(doc)
    expect(fetch.mock.calls[0][0]).toBe(aclUrl)
    const { method, headers, body } = fetch.mock.calls[0][1]
    expect(method).toBe('PUT')
    expect(headers).toHaveProperty('Content-Type', 'text/turtle')
    expect(body).toBe('turtle content')
  })
  test.todo('throws error if PUT fails')
})

describe('fetchAclUrl', () => {
  test('calls fetch and returns acl url from response', async () => {
    const fetch = jest.fn()
    const fileUrl = 'https://example.org/public/file.ttl'
    const expectedAclUrl = './file.ttl.acl'
    fetch.mockResolvedValue({
      url: fileUrl,
      headers: {
        get: (name) => name === 'link' ? `<${expectedAclUrl}>; rel="acl"` : null
      }
    })

    const aclApi = new AclApi(fetch)
    const aclUrl = await aclApi.fetchAclUrl(fileUrl)

    expect(aclUrl).toBe(resolve(fileUrl, expectedAclUrl))
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(fileUrl, { method: 'OPTIONS' })
  })
  test('works if fetch rejects with 404', async () => {
    const fetch = jest.fn()
    const fileUrl = 'https://example.org/public/file.ttl'
    const expectedAclUrl = './file.ttl.acl'
    fetch.mockRejectedValue({
      status: 404,
      url: fileUrl,
      headers: {
        get: (name) => name === 'link' ? `<${expectedAclUrl}>; rel="acl"` : null
      }
    })

    const aclApi = new AclApi(fetch)
    const aclUrl = await aclApi.fetchAclUrl(fileUrl)

    expect(aclUrl).toBe(resolve(fileUrl, expectedAclUrl))
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(fileUrl, { method: 'OPTIONS' })
  })
})

describe('loadFromFileUrl', () => {
  test('fetches turtle from acl file and parses it into a proxyDoc', async () => {
    const expectedAclUrl = `${samplePublicFileUrl}.acl`
    const fileResponse = {
      url: samplePublicFileUrl,
      ok: true,
      headers: {
        get: (name) => name === 'link' ? `<${expectedAclUrl}>; rel="acl"` : null
      }
    }
    const aclResponse = {
      ok: true,
      text: () => samplePublicAclContent
    }
    const fetch = jest.fn()
    fetch.mockResolvedValueOnce(fileResponse)
      .mockResolvedValueOnce(aclResponse)

    const saveDoc = jest.fn()
    saveDoc.mockResolvedValue('mocked resolve value')

    const aclApi = new AclApi(fetch, { autoSave: true })
    aclApi.saveDoc = saveDoc
    const proxyDoc = await aclApi.loadFromFileUrl(samplePublicFileUrl)

    expect(proxyDoc).toEqual(samplePublicAclDoc)
    expect(typeof proxyDoc.saveToPod).toBe('function')
    expect(proxyDoc.hasRule(READ, Agents.PUBLIC)).toBe(true)
    expect(saveDoc).toHaveBeenCalledTimes(0)
    await expect(proxyDoc.deleteAgents(Agents.PUBLIC)).resolves.toBe(proxyDoc)
    expect(saveDoc).toHaveBeenCalled()
    const saveDocArg = saveDoc.mock.calls[0][0]
    expect(saveDocArg instanceof AclDoc).toBe(true)
    expect(saveDocArg.hasRule(READ, Agents.PUBLIC)).toBe(false)
    expect(proxyDoc.hasRule(READ, Agents.PUBLIC)).toBe(false)
  })

  test('fetches and loads default acl file', async () => {
    const expectedAclUrls = [
      `${sampleDefaultFileUrl}.acl`,
      `${getParent(sampleDefaultFileUrl)}.acl`,
      `${getParent(getParent(sampleDefaultFileUrl))}.acl`
    ]
    const fileResponses = expectedAclUrls.map(aclUrl => {
      return {
        url: sampleDefaultFileUrl,
        ok: true,
        headers: {
          get: (name) => name === 'link' ? `<${aclUrl}>; rel="acl"` : null
        }
      }
    })
    const notFoundResponse = {
      ok: false,
      status: 404
    }
    const aclResponse = {
      ok: true,
      text: () => Promise.resolve(sampleDefaultAclContent)
    }
    
    const fetch = jest.fn()
    fetch.mockResolvedValueOnce(fileResponses[0])
      .mockResolvedValueOnce(notFoundResponse)
      .mockResolvedValueOnce(fileResponses[1])
      .mockResolvedValueOnce(notFoundResponse)
      .mockResolvedValueOnce(fileResponses[2])
      .mockResolvedValueOnce(aclResponse)
    
    const aclApi = new AclApi(fetch, { autoSave: true })
    const proxyDoc = await aclApi.loadFromFileUrl(sampleDefaultFileUrl)

    expect(Object.entries(proxyDoc.rules)).toHaveLength(2)
    expect(proxyDoc.equals(sampleDefaultFileDoc)).toBe(true)
    expect(fetch).toHaveBeenNthCalledWith(1, sampleDefaultFileUrl, expect.any(Object))
    expect(fetch).toHaveBeenNthCalledWith(2, expectedAclUrls[0], expect.any(Object))
    expect(fetch).toHaveBeenNthCalledWith(3, getParent(sampleDefaultFileUrl), expect.any(Object))
    expect(fetch).toHaveBeenNthCalledWith(4, expectedAclUrls[1], expect.any(Object))
    expect(fetch).toHaveBeenNthCalledWith(5, getParent(getParent(sampleDefaultFileUrl)), expect.any(Object))
    expect(fetch).toHaveBeenNthCalledWith(6, expectedAclUrls[2], expect.any(Object))
  })
})

// Url of the parent folder with the / at the end
function getParent (url) {
  return url.substring(0, url.slice(0, -1).lastIndexOf('/') + 1)
}