import { AclDoc, Agents, Permissions } from 'solid-acl-parser'
import AclDocProxyHandler from '../src/AclDocProxy/AclDocProxyHandler'

const { _SAVE_DOC_KEY } = AclDocProxyHandler
const { READ, WRITE } = Permissions
const webId = 'https://solid.example.org/profile/card#me'

/** @type {AclDoc} */
let doc

beforeEach(() => {
  doc = new AclDoc({ accessTo: './file.ext' })
})

describe('AclDocProxyHandler with resolving saveDoc and options.autoSave', () => {
  let proxyDoc
  const saveDoc = jest.fn((doc) => Promise.resolve())

  beforeEach(() => {
    saveDoc.mockClear()
    const proxyHandler = new AclDocProxyHandler({ saveDoc }, { autoSave: true })
    proxyDoc = new Proxy(doc, proxyHandler)
    proxyHandler.setProxyDoc(proxyDoc)
  })

  describe('proxies', () => {
    test('proxyDoc.addRule returns a Promise', () => {
      expect(proxyDoc.addRule([READ, WRITE], webId)).toEqual(expect.any(Promise))
    })
    test('proxyDoc.addRule calls the mock function with the proxy', async () => {
      const returnValue = await proxyDoc.addRule([READ, WRITE], webId)
      const arg = saveDoc.mock.calls[0][0]

      expect(arg).toBe(doc)
      expect(arg).toEqual(doc)
      expect(returnValue).toEqual(proxyDoc)
      expect(arg.hasRule([READ, WRITE], webId)).toBe(true)
    })
    test('proxyDoc.deleteRule', async () => {
      await proxyDoc.addRule(READ, webId)
      const returnValue = await proxyDoc.deleteRule(READ, webId)
      const arg = saveDoc.mock.calls[1][0]

      expect(arg).toEqual(returnValue)
      expect(arg.hasRule(READ, webId)).toBe(false)
    })
    test('proxyDoc.deleteBySubjectId', async () => {
      await proxyDoc.addRule(READ, webId, { subjectId: '#test' })
      await proxyDoc.deleteBySubjectId('#test')
      const arg = saveDoc.mock.calls[1][0]

      expect(arg.hasRule(READ, webId)).toBe(false)
    })
    test('proxyDoc.deleteAgents', async () => {
      await proxyDoc.addRule(READ, webId)
      await proxyDoc.deleteAgents(webId)
      const arg = saveDoc.mock.calls[1][0]

      expect(arg.hasRule(READ, webId)).toBe(false)
    })
    test('proxyDoc.deletePermissions', async () => {
      await proxyDoc.addRule(READ, webId)
      await proxyDoc.addRule(WRITE, webId)
      await proxyDoc.deletePermissions(READ, WRITE)
      const arg = saveDoc.mock.calls[2][0]

      expect(arg.hasRule(READ, webId)).toBe(false)
      expect(arg.hasRule(WRITE, webId)).toBe(false)
    })
    test('proxyDoc.addOther', async () => {
      const pseudoQuad = 'test'
      await proxyDoc.addOther(pseudoQuad)
      const arg = saveDoc.mock.calls[0][0]

      expect(arg.otherQuads[0]).toBe(pseudoQuad)
    })
    test(`proxyDoc.${_SAVE_DOC_KEY}`, async () => {
      await proxyDoc.addRule(READ, webId)
      await proxyDoc[_SAVE_DOC_KEY]()
      const arg = saveDoc.mock.calls[1][0]

      // Calls the saveDoc mock with the non-proxy AclDoc
      expect(arg).toBe(doc)
    })
  })
  describe('untouched methods', () => {
    test(`proxyDoc.hasRule returns a boolean and doesn't call the saveDoc mock`, () => {
      expect(proxyDoc.hasRule(READ, webId)).toEqual(expect.any(Boolean))
      expect(saveDoc.mock.calls).toHaveLength(0)
    })
    test('proxyDoc.getRuleBySubjectId', () => {
      expect(proxyDoc.getRuleBySubjectId('inexistent')).toBe(undefined)
    })
    test('proxyDoc.getPermissionsFor', () => {
      expect(proxyDoc.getPermissionsFor('inexistent').equals(Permissions.from())).toBe(true)
    })
    test('proxyDoc.getAgentsWith', () => {
      expect(proxyDoc.getAgentsWith(READ).equals(Agents.from())).toBe(true)
    })
    test('proxyDoc.minimizeRules', () => {
      expect(proxyDoc.minimizeRules()).toBe(proxyDoc)
    })
    test('proxyDoc.equals', () => {
      expect(proxyDoc.equals(proxyDoc)).toBe(true)
    })
  })
})

describe('AclDocProxyHandler with rejecting saveDoc and options.autoSave', () => {
  let proxyDoc
  const mockError = new Error('Mock error')
  const saveDoc = jest.fn((doc) => Promise.reject(mockError))

  beforeEach(() => {
    saveDoc.mockClear()
    const proxyHandler = new AclDocProxyHandler({ saveDoc }, { autoSave: true })
    proxyDoc = new Proxy(doc, proxyHandler)
    proxyHandler.setProxyDoc(proxyDoc)
  })

  describe('proxies', () => {
    test('proxyDoc.addRule rejects with mockError', () => {
      expect(proxyDoc.addRule(READ, webId)).rejects.toBe(mockError)
    })
  })
  describe('untouched methods', () => {
    test(`proxyDoc.hasRule returns Boolean and doesn't throw`, () => {
      expect(proxyDoc.hasRule(READ, webId)).toEqual(expect.any(Boolean))
    })
  })
})

describe('AclDocProxyHandler with resolving saveDoc and options.autoSave=false', () => {
  let proxyDoc
  const saveDoc = jest.fn((doc) => Promise.resolve())

  beforeEach(() => {
    saveDoc.mockClear()
    const proxyHandler = new AclDocProxyHandler({ saveDoc }, { autoSave: false })
    proxyDoc = new Proxy(doc, proxyHandler)
    proxyHandler.setProxyDoc(proxyDoc)
  })

  describe('proxies', () => {
    test('proxyDoc.addRule returns the proxy', () => {
      const returnValue = proxyDoc.addRule(READ, webId)
      expect(returnValue).toBe(proxyDoc)
      expect(saveDoc.mock.calls).toHaveLength(0)
    })
  })
  describe('untouched methods', () => {
    test(`proxyDoc.hasRule returns Boolean and doesn't throw`, () => {
      expect(proxyDoc.hasRule(READ, webId)).toEqual(expect.any(Boolean))
    })
  })
})

describe('AclDocProxyHandler with resolving saveDoc and options.autoSave=false', () => {
  let proxyDoc
  const mockError = new Error('Mock error')
  const saveDoc = jest.fn((doc) => Promise.reject(mockError))

  beforeEach(() => {
    saveDoc.mockClear()
    const proxyHandler = new AclDocProxyHandler({ saveDoc }, { autoSave: false })
    proxyDoc = new Proxy(doc, proxyHandler)
    proxyHandler.setProxyDoc(proxyDoc)
  })

  describe('proxies', () => {
    test('proxyDoc.addRule returns the proxy', () => {
      const returnValue = proxyDoc.addRule(READ, webId)
      expect(returnValue).toBe(proxyDoc)
      expect(saveDoc.mock.calls).toHaveLength(0)
    })
  })
  describe('untouched methods', () => {
    test(`proxyDoc.hasRule returns Boolean and doesn't throw`, () => {
      expect(proxyDoc.hasRule(READ, webId)).toEqual(expect.any(Boolean))
    })
  })
})
