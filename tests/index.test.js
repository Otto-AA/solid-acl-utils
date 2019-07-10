import SolidAclUtils from '../src/index'

describe('SolidAclUtils', () => {
  test('exports work', () => {
    const classes = Object.values(SolidAclUtils)
    for (const c of classes) {
      expect(typeof c).toBe('function')
      expect(c).toHaveProperty('name')
    }
  })
})
