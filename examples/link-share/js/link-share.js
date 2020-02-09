console.assert(typeof SolidAclUtils !== 'undefined', 'SolidAclUtils not loaded')
const { AclApi, Permissions, Agents } = SolidAclUtils
const { READ, WRITE, APPEND, CONTROL } = Permissions

const prefixes = {
    vcard: 'http://www.w3.org/2006/vcard/ns#'
}
const objects = {
    group: `${prefixes.vcard}Group`,
    hasMember: `${prefixes.vcard}hasMember`
}
const defaultGroupFileTurtle = Object.entries(prefixes)
    .map(([prefix, value]) => `@prefix ${prefix}: <${value}>.`)
    .join('\n')

/**
 * (optionally authenticated) fetch method similar to window.fetch
 * @callback fetch
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */

/** @typedef {"test"} Permission */
/** @typedef {Permission|Permission[]} Permissions */

class SolidLinkSharer {
    /**
     * @param {fetch} fetch
     * @param {string} groupFileUrl url of the file where groups should be stored
     * @todo make groupFileUrl default to the meta file (e.g. .../share/me.ext.meta)
     */
    constructor (fetch, groupFileUrl) {
        this.fetch = fetch
        this.groupFileUrl = groupFileUrl
    }

    /**
     * Create a link for sharing a file/folder with other solid users
     * @param {string} fileUrl 
     * @param {Permissions} permissions 
     * @param {string} [groupId] 
     */
    async createLink (fileUrl, permissions, groupId = uuidv4()) {
        await this.addGroupId(groupId)
        await this.giveGroupPermissions(fileUrl, permissions, groupId)

        return groupId
    }

    /**
     * @param {string} groupId 
     * @details Requires READ+WRITE+CONTROL permissions
     */
    async addGroupId (groupId) {
        await this.ensureGroupFileExists()
        await this.append(this.groupFileUrl, `<#${groupId}> a <${objects.group}>`)
    }

    async ensureGroupFileExists () {
        const res = await this.fetch(this.groupFileUrl, { method: 'HEAD' })
        if (!res.ok) {
            if (res.status === 404) {
                return this.initGroupFile()
            }
            throw new Error(`Unexpected response: ${res.status} ${res.url}`)
        }
    }

    async initGroupFile () {
        const res = await this.fetch(this.groupFileUrl, {
            method: 'PUT',
            headers: {
                link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
                'Content-Type': 'text/turtle'
            },
            body: defaultGroupFileTurtle
        })
        if (!res.ok) {
            throw new Error(`Unexpected response: ${res.status} ${res.url}`)
        }
        await this.initGroupFilePermissions()
        return res
    }

    async initGroupFilePermissions () {
        const aclApi = new AclApi(this.fetch, { autoSave: true })
        const acl = await aclApi.loadFromFileUrl(this.groupFileUrl)
        await acl.addRule(APPEND, Agents.AUTHENTICATED)
    }

    async giveGroupPermissions (fileUrl, permissions, groupId) {
        const agents = new Agents()
        agents.addGroup(`${this.groupFileUrl}#${groupId}`)

        const aclApi = new AclApi(this.fetch, { autoSave: true })
        const acl = await aclApi.loadFromFileUrl(fileUrl)
        await acl.addRule(permissions, agents)
    }

    async addWebIdToGroup (groupId, webId) {
        await this.append(this.groupFileUrl, `<#${groupId}> ${objects.hasMember} <${webId}>`)
    }

    async append (fileUrl, turtle) {
        const res = await this.fetch(fileUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/sparql-update'
            },
            body: `INSERT DATA { ${turtle} }`
        })
        if (!res.ok) {
            throw new Error(`Error while appending: ${res.status} ${res.statusText} ${res.url}`)
        }
    }
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}
