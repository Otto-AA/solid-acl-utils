import SolidAclParser from 'solid-acl-parser'
import { createAclDocProxy } from '../src/AclDocProxy'

const { AclDoc, Agents, Permissions } = SolidAclParser
const { READ, WRITE } = Permissions

/** @type {AclDoc} */
let sampleDoc
const webId = 'https://solid.example.org/profile/card#me'

beforeEach(() => {
  sampleDoc = new AclDoc({ accessTo: './file.ttl' })
  sampleDoc.addRule([READ, WRITE], webId)
})

describe('createAclDocProxy', () => {
  test('throws error if no saveDoc parameter is passed', () => {
    expect(() => createAclDocProxy(sampleDoc)).toThrowError()
  })
  test('creates proxyDoc which equals the original doc', () => {
    const proxyDoc = createAclDocProxy(sampleDoc, () => {})
    expect(proxyDoc).toEqual(sampleDoc)
    expect(proxyDoc).not.toBe(sampleDoc)
    expect(proxyDoc).toBeInstanceOf(AclDoc)
    expect(typeof proxyDoc.saveToPod).toBe('function')
  })
  test('calling saveToPod calls the saveDoc function parameter', async () => {
    const saveDoc = jest.fn()
    saveDoc.mockResolvedValue()

    const proxyDoc = createAclDocProxy(sampleDoc, saveDoc)
    expect(await proxyDoc.saveToPod()).toBe(proxyDoc)
    expect(saveDoc).toHaveBeenCalledWith(sampleDoc)
  })
  test('wraps modifying methods to call saveDoc if autoSave=true', () => {
    const saveDoc = jest.fn()
    saveDoc.mockResolvedValue()

    const proxyDoc = createAclDocProxy(sampleDoc, saveDoc, { autoSave: true })
    expect(proxyDoc.saveToPod()).resolves.toBe(proxyDoc)
    expect(proxyDoc.addRule()).resolves.toBe(proxyDoc)
    expect(proxyDoc.deleteRule()).resolves.toBe(proxyDoc)
    expect(proxyDoc.deleteBySubjectId()).resolves.toBe(proxyDoc)
    expect(proxyDoc.deletePermissions()).resolves.toBe(proxyDoc)
    expect(proxyDoc.deleteAgents()).resolves.toBe(proxyDoc)
    expect(proxyDoc.addOther()).resolves.toBe(proxyDoc)

    expect(proxyDoc.hasRule()).toBe(true)
    expect(proxyDoc.equals(proxyDoc)).toBe(true)
    expect(proxyDoc.getAgentsWith()).toBeInstanceOf(Agents)
    expect(proxyDoc.getPermissionsFor()).toBeInstanceOf(Permissions)
    expect(proxyDoc.getRuleBySubjectId('')).toBe(undefined)
    expect(proxyDoc.minimizeRules()).toBe(proxyDoc)
    expect(proxyDoc.otherQuads).toHaveLength(0)
    expect(proxyDoc.rules).toMatchObject({})

    expect(saveDoc).toHaveBeenCalledTimes(7)
    expect(saveDoc).toHaveBeenCalledWith(sampleDoc)
  })
  test('only calls saveDoc with saveToPod when autoSave=false', () => {
    const saveDoc = jest.fn()
    saveDoc.mockResolvedValue()

    const proxyDoc = createAclDocProxy(sampleDoc, saveDoc, { autoSave: false })
    expect(proxyDoc.saveToPod()).resolves.toBe(proxyDoc)

    expect(proxyDoc.addRule()).toBe(proxyDoc)
    expect(proxyDoc.deleteRule()).toBe(proxyDoc)
    expect(proxyDoc.deleteBySubjectId()).toBe(proxyDoc)
    expect(proxyDoc.deletePermissions()).toBe(proxyDoc)
    expect(proxyDoc.deleteAgents()).toBe(proxyDoc)
    expect(proxyDoc.addOther()).toBe(proxyDoc)

    expect(proxyDoc.hasRule()).toBe(true)
    expect(proxyDoc.equals(proxyDoc)).toBe(true)
    expect(proxyDoc.getAgentsWith()).toBeInstanceOf(Agents)
    expect(proxyDoc.getPermissionsFor()).toBeInstanceOf(Permissions)
    expect(proxyDoc.getRuleBySubjectId('')).toBe(undefined)
    expect(proxyDoc.minimizeRules()).toBe(proxyDoc)
    expect(proxyDoc.otherQuads).toHaveLength(0)
    expect(proxyDoc.rules).toMatchObject({})

    expect(saveDoc).toHaveBeenCalledTimes(1)
    expect(saveDoc).toHaveBeenCalledWith(sampleDoc)
  })
})
