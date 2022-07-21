/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ObjectId } from 'bson-ext'
import mongoose from 'mongoose'
import { FormId, UserId } from 'shared/types'
import { WorkspaceDto, WorkspaceId } from 'shared/types/workspace'

import { getWorkspaceModel } from 'src/app/models/workspace.server.model'
import * as WorkspaceService from 'src/app/modules/workspace/workspace.service'
import { formatErrorRecoveryMessage } from 'src/app/utils/handle-mongo-error'

import dbHandler from 'tests/unit/backend/helpers/jest-db'

import { DatabaseError, DatabaseValidationError } from '../../core/core.errors'
import {
  ForbiddenWorkspaceError,
  WorkspaceNotFoundError,
} from '../workspace.errors'

const WorkspaceModel = getWorkspaceModel(mongoose)

describe('workspace.service', () => {
  beforeAll(() => dbHandler.connect())
  afterAll(() => dbHandler.closeDatabase())
  afterEach(async () => {
    await dbHandler.clearDatabase()
  })
  beforeEach(async () => {
    jest.clearAllMocks()
  })

  describe('getWorkspaces', () => {
    it('should return an array of workspaces that belong to the user', async () => {
      const mockWorkspaces = [
        {
          admin: 'user' as UserId,
          title: 'workspace1',
          formIds: [] as FormId[],
        },
      ] as WorkspaceDto[]
      const mockUserId = 'mockUserId'
      const getSpy = jest
        .spyOn(WorkspaceModel, 'getWorkspaces')
        .mockResolvedValueOnce(mockWorkspaces)
      const actual = await WorkspaceService.getWorkspaces(mockUserId)

      expect(getSpy).toHaveBeenCalledWith(mockUserId)
      expect(actual.isOk()).toEqual(true)
      expect(actual._unsafeUnwrap()).toEqual(mockWorkspaces)
    })

    it('should return DatabaseError when error occurs whilst querying the database', async () => {
      const mockUserId = 'mockUserId'
      const mockErrorMessage = 'some error'

      const getSpy = jest
        .spyOn(WorkspaceModel, 'getWorkspaces')
        .mockRejectedValueOnce(new Error(mockErrorMessage))
      const actual = await WorkspaceService.getWorkspaces(mockUserId)

      expect(getSpy).toHaveBeenCalledWith(mockUserId)
      expect(actual.isErr()).toEqual(true)
      expect(actual._unsafeUnwrapErr()).toEqual(
        new DatabaseError(formatErrorRecoveryMessage(mockErrorMessage)),
      )
    })
  })

  describe('createWorkspace', () => {
    it('should successfully create workspace', async () => {
      const mockWorkspace = {
        _id: 'workspaceId' as WorkspaceId,
        admin: 'user' as UserId,
        title: 'workspace1',
        formIds: [] as FormId[],
      }

      const createSpy = jest
        .spyOn(WorkspaceModel, 'createWorkspace')
        .mockResolvedValueOnce(mockWorkspace)
      const actual = await WorkspaceService.createWorkspace(
        mockWorkspace.admin,
        mockWorkspace.title,
      )

      expect(createSpy).toHaveBeenCalledWith(
        mockWorkspace.title,
        mockWorkspace.admin,
      )
      expect(actual.isOk()).toEqual(true)
      expect(actual._unsafeUnwrap()).toEqual(mockWorkspace)
    })

    it('should return DatabaseValidationError on invalid title whilst creating form', async () => {
      const mockTitle = 'mockTitle'
      const mockUserId = 'mockUserId'

      const createSpy = jest
        .spyOn(WorkspaceModel, 'createWorkspace')
        // @ts-ignore
        .mockRejectedValueOnce(new mongoose.Error.ValidationError())

      const actual = await WorkspaceService.createWorkspace(
        mockUserId,
        mockTitle,
      )

      expect(createSpy).toHaveBeenCalledWith(mockTitle, mockUserId)
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(DatabaseValidationError)
    })

    it('should return DatabaseError when error occurs whilst creating workspace', async () => {
      const mockTitle = 'mockTitle'
      const mockUserId = 'mockUserId'
      const mockErrorMessage = 'some error'

      const createSpy = jest
        .spyOn(WorkspaceModel, 'createWorkspace')
        .mockRejectedValueOnce(new Error(mockErrorMessage))
      const actual = await WorkspaceService.createWorkspace(
        mockUserId,
        mockTitle,
      )

      expect(createSpy).toHaveBeenCalledWith(mockTitle, mockUserId)
      expect(actual.isErr()).toEqual(true)
      expect(actual._unsafeUnwrapErr()).toEqual(
        new DatabaseError(formatErrorRecoveryMessage(mockErrorMessage)),
      )
    })
  })

  describe('updateWorkspaceTitle', () => {
    const mockWorkspace = {
      _id: 'workspaceId' as WorkspaceId,
      admin: 'user' as UserId,
      title: 'workspace1',
      formIds: [] as FormId[],
    }

    it('should successfully update workspace title', async () => {
      const updateSpy = jest
        .spyOn(WorkspaceModel, 'updateWorkspaceTitle')
        .mockResolvedValueOnce(mockWorkspace)
      const actual = await WorkspaceService.updateWorkspaceTitle({
        workspaceId: mockWorkspace._id,
        title: mockWorkspace.title,
        userId: mockWorkspace.admin,
      })

      expect(updateSpy).toHaveBeenCalledWith({
        workspaceId: mockWorkspace._id,
        title: mockWorkspace.title,
        admin: mockWorkspace.admin,
      })
      expect(actual.isOk()).toEqual(true)
      expect(actual._unsafeUnwrap()).toEqual(mockWorkspace)
    })

    it('should return DatabaseValidationError on invalid title whilst creating form', async () => {
      const updateSpy = jest
        .spyOn(WorkspaceModel, 'updateWorkspaceTitle')
        // @ts-ignore
        .mockRejectedValueOnce(new mongoose.Error.ValidationError())

      const actual = await WorkspaceService.updateWorkspaceTitle({
        workspaceId: mockWorkspace._id,
        title: mockWorkspace.title,
        userId: mockWorkspace.admin,
      })

      expect(updateSpy).toHaveBeenCalledWith({
        workspaceId: mockWorkspace._id,
        title: mockWorkspace.title,
        admin: mockWorkspace.admin,
      })
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(DatabaseValidationError)
    })

    it('should return WorkspaceNotFoundError on invalid workspaceId', async () => {
      const updateSpy = jest
        .spyOn(WorkspaceModel, 'updateWorkspaceTitle')
        .mockResolvedValueOnce(null)

      const actual = await WorkspaceService.updateWorkspaceTitle({
        workspaceId: mockWorkspace._id,
        title: mockWorkspace.title,
        userId: mockWorkspace.admin,
      })

      expect(updateSpy).toHaveBeenCalledWith({
        workspaceId: mockWorkspace._id,
        title: mockWorkspace.title,
        admin: mockWorkspace.admin,
      })
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(WorkspaceNotFoundError)
    })

    it('should return DatabaseError when error occurs whilst creating workspace', async () => {
      const mockErrorMessage = 'some error'

      const updateSpy = jest
        .spyOn(WorkspaceModel, 'updateWorkspaceTitle')
        .mockRejectedValueOnce(new Error(mockErrorMessage))
      const actual = await WorkspaceService.updateWorkspaceTitle({
        workspaceId: mockWorkspace._id,
        title: mockWorkspace.title,
        userId: mockWorkspace.admin,
      })

      expect(updateSpy).toHaveBeenCalledWith({
        workspaceId: mockWorkspace._id,
        title: mockWorkspace.title,
        admin: mockWorkspace.admin,
      })
      expect(actual.isErr()).toEqual(true)
      expect(actual._unsafeUnwrapErr()).toEqual(
        new DatabaseError(formatErrorRecoveryMessage(mockErrorMessage)),
      )
    })
  })

  describe('verifyWorkspaceAdmin', () => {
    const mockWorkspaceId = new ObjectId()
    const mockAdmin = new ObjectId()

    it('should return true when user is workspace admin', async () => {
      await WorkspaceModel.create({
        _id: mockWorkspaceId,
        title: 'Workspace1',
        formIds: [],
        admin: mockAdmin,
      })

      const actual = await WorkspaceService.verifyWorkspaceAdmin(
        mockWorkspaceId.toHexString(),
        mockAdmin.toHexString(),
      )

      expect(actual.isOk()).toEqual(true)
      expect(actual._unsafeUnwrap()).toEqual(true)
    })

    it('should return false when user is not workspace admin', async () => {
      const mockNotAdmin = new ObjectId()
      await WorkspaceModel.create({
        _id: mockWorkspaceId,
        title: 'Workspace1',
        formIds: [],
        admin: mockAdmin,
      })
      const actual = await WorkspaceService.verifyWorkspaceAdmin(
        mockWorkspaceId.toHexString(),
        mockNotAdmin.toHexString(),
      )

      expect(actual.isErr()).toEqual(true)
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenWorkspaceError)
    })
  })

  describe('checkWorkspaceExists', () => {
    const mockWorkspaceId = new ObjectId()
    it('should return true when workspace exists in the database', async () => {
      await WorkspaceModel.create({
        _id: mockWorkspaceId,
        title: 'Workspace1',
        formIds: [],
        admin: new ObjectId(),
      })

      const actual = await WorkspaceService.checkWorkspaceExists(
        mockWorkspaceId.toHexString(),
      )

      expect(actual.isOk()).toEqual(true)
      expect(actual._unsafeUnwrap()).toEqual(true)
    })

    it('should return false when user is not workspace admin', async () => {
      await WorkspaceModel.create({
        _id: mockWorkspaceId,
        title: 'Workspace1',
        formIds: [],
        admin: new ObjectId(),
      })
      const actual = await WorkspaceService.checkWorkspaceExists(
        new ObjectId().toHexString(),
      )

      expect(actual.isErr()).toEqual(true)
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(WorkspaceNotFoundError)
    })
  })
})