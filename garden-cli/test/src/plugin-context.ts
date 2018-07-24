import { expect } from "chai"
import { PluginContext } from "../../src/plugin-context"
import { expectError } from "../helpers"
import { getNames } from "../../src/util/util"
import { Garden } from "../../src/garden"
import { makeTestGardenA } from "../helpers"
import { ModuleVersion } from "../../src/vcs/base"
import * as td from "testdouble"

describe("PluginContext", () => {
  let garden: Garden
  let ctx: PluginContext

  beforeEach(async () => {
    garden = await makeTestGardenA()
    ctx = garden.pluginContext
  })

  describe("setConfig", () => {
    it("should set a valid key in the 'project' namespace", async () => {
      const key = ["project", "my", "variable"]
      const value = "myvalue"

      await ctx.setConfig({ key, value })
      expect(await ctx.getConfig({ key })).to.eql({ value })
    })

    it("should throw with an invalid namespace in the key", async () => {
      const key = ["bla", "my", "variable"]
      const value = "myvalue"

      await expectError(async () => await ctx.setConfig({ key, value }), "parameter")
    })

    it("should throw with malformatted key", async () => {
      const key = ["project", "!4215"]
      const value = "myvalue"

      await expectError(async () => await ctx.setConfig({ key, value }), "parameter")
    })
  })

  describe("getConfig", () => {
    it("should get a valid key in the 'project' namespace", async () => {
      const key = ["project", "my", "variable"]
      const value = "myvalue"

      await ctx.setConfig({ key, value })
      expect(await ctx.getConfig({ key })).to.eql({ value })
    })

    it("should throw with an invalid namespace in the key", async () => {
      const key = ["bla", "my", "variable"]

      await expectError(async () => await ctx.getConfig({ key }), "parameter")
    })

    it("should throw with malformatted key", async () => {
      const key = ["project", "!4215"]

      await expectError(async () => await ctx.getConfig({ key }), "parameter")
    })
  })

  describe("deleteConfig", () => {
    it("should delete a valid key in the 'project' namespace", async () => {
      const key = ["project", "my", "variable"]
      const value = "myvalue"

      await ctx.setConfig({ key, value })
      expect(await ctx.deleteConfig({ key })).to.eql({ found: true })
    })

    it("should return {found:false} if key does not exist", async () => {
      const key = ["project", "my", "variable"]

      expect(await ctx.deleteConfig({ key })).to.eql({ found: false })
    })

    it("should throw with an invalid namespace in the key", async () => {
      const key = ["bla", "my", "variable"]

      await expectError(async () => await ctx.deleteConfig({ key }), "parameter")
    })

    it("should throw with malformatted key", async () => {
      const key = ["project", "!4215"]

      await expectError(async () => await ctx.deleteConfig({ key }), "parameter")
    })
  })

  describe("resolveModuleDependencies", () => {
    it("should resolve build dependencies", async () => {
      const modules = await ctx.resolveModuleDependencies(["module-c"], [])
      expect(getNames(modules)).to.eql(["module-a", "module-b", "module-c"])
    })

    it("should resolve service dependencies", async () => {
      const modules = await ctx.resolveModuleDependencies([], ["service-b"])
      expect(getNames(modules)).to.eql(["module-a", "module-b"])
    })

    it("should combine module and service dependencies", async () => {
      const modules = await ctx.resolveModuleDependencies(["module-b"], ["service-c"])
      expect(getNames(modules)).to.eql(["module-a", "module-b", "module-c"])
    })
  })

  describe("resolveVersion", () => {
    it("should return result from cache if available", async () => {
      const module = await ctx.getModule("module-a")
      const version: ModuleVersion = {
        versionString: "banana",
        dirtyTimestamp: 987654321,
        dependencyVersions: {},
      }
      garden.cache.set(["moduleVersions", module.name], version, module.getCacheContext())

      const result = await ctx.resolveVersion("module-a", [])

      expect(result).to.eql(version)
    })

    it("should otherwise return version from VCS handler", async () => {
      const resolve = td.replace(garden.vcs, "resolveVersion")
      const version: ModuleVersion = {
        versionString: "banana",
        dirtyTimestamp: 987654321,
        dependencyVersions: {},
      }

      td.when(resolve(), { ignoreExtraArgs: true }).thenResolve(version)

      const result = await ctx.resolveVersion("module-b", [])

      expect(result).to.eql(version)
    })

    it("should ignore cache if force=true", async () => {
      const module = await ctx.getModule("module-a")
      const version: ModuleVersion = {
        versionString: "banana",
        dirtyTimestamp: 987654321,
        dependencyVersions: {},
      }
      garden.cache.set(["moduleVersions", module.name], version, module.getCacheContext())

      const result = await ctx.resolveVersion("module-a", [], true)

      expect(result).to.not.eql(version)
    })
  })
})