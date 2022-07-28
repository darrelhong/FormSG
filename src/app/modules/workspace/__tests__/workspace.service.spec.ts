/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ObjectId } from 'bson-ext'
import mongoose from 'mongoose'
import { FormId, FormStatus, UserId } from 'shared/types'
import { WorkspaceDto, WorkspaceId } from 'shared/types/workspace'

import getFormModel from 'src/app/models/form.server.model'
import { getWorkspaceModel } from 'src/app/models/workspace.server.model'
import * as AdminFormService from 'src/app/modules/form/admin-form/admin-form.service'
import * as WorkspaceService from 'src/app/modules/workspace/workspace.service'
import { formatErrorRecoveryMessage } from 'src/app/utils/handle-mongo-error'

import dbHandler from 'tests/unit/backend/helpers/jest-db'

import { DatabaseError, DatabaseValidationError } from '../../core/core.errors'
import {
  ForbiddenWorkspaceError,
  WorkspaceNotFoundError,
} from '../workspace.errors'

const WorkspaceModel = getWorkspaceModel(mongoose)
const FormModel = getFormModel(mongoose)

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

  describe('deleteWorkspace', () => {
    const mockFormId = new ObjectId()
    const mockWorkspace = {
      _id: new ObjectId(),
      admin: new ObjectId(),
      title: 'workspace1',
      formIds: [mockFormId],
      count: 0,
    }

    it('should return undefined when successfully deleted workspace', async () => {
      jest.spyOn(WorkspaceModel, 'deleteWorkspace').mockResolvedValueOnce(true)

      const actual = await WorkspaceService.deleteWorkspace({
        workspaceId: mockWorkspace._id.toHexString(),
        userId: mockWorkspace.admin.toHexString(),
        shouldDeleteForms: false,
      })

      expect(actual.isOk()).toEqual(true)
      expect(actual._unsafeUnwrap()).toEqual(undefined)
    })

    it('should return undefined when failed to delete workspace', async () => {
      jest.spyOn(WorkspaceModel, 'deleteWorkspace').mockResolvedValueOnce(false)

      const actual = await WorkspaceService.deleteWorkspace({
        workspaceId: mockWorkspace._id.toHexString(),
        userId: mockWorkspace.admin.toHexString(),
        shouldDeleteForms: false,
      })

      expect(actual.isOk()).toEqual(true)
      expect(actual._unsafeUnwrap()).toEqual(undefined)
    })

    it('should not archive forms in the workspace when shouldDeleteForms is false', async () => {
      await dbHandler.insertEncryptForm({
        formId: mockFormId,
        userId: mockWorkspace.admin,
      })
      const createdWorkspace = await WorkspaceModel.create(mockWorkspace)

      jest
        .spyOn(WorkspaceModel, 'findOne')
        .mockResolvedValueOnce(createdWorkspace)
      jest.spyOn(WorkspaceModel, 'deleteWorkspace').mockResolvedValueOnce(true)

      const actual = await WorkspaceService.deleteWorkspace({
        workspaceId: mockWorkspace._id.toHexString(),
        userId: mockWorkspace.admin.toHexString(),
        shouldDeleteForms: false,
      })
      const doesFormExist = await FormModel.exists({ _id: mockFormId })
      const isFormArchived = await FormModel.exists({
        _id: mockFormId,
        status: FormStatus.Archived,
      })

      expect(actual.isOk()).toEqual(true)
      expect(actual._unsafeUnwrap()).toEqual(undefined)
      expect(doesFormExist).toEqual(true)
      expect(isFormArchived).toEqual(false)
    })

    it('should archive forms in the workspace when shouldDeleteForms is true', async () => {
      await dbHandler.insertEncryptForm({
        formId: mockFormId,
        userId: mockWorkspace.admin,
      })
      const createdWorkspace = await WorkspaceModel.create(mockWorkspace)

      jest
        .spyOn(WorkspaceModel, 'findOne')
        .mockResolvedValueOnce(createdWorkspace)
      jest.spyOn(WorkspaceModel, 'deleteWorkspace').mockResolvedValueOnce(true)

      const actual = await WorkspaceService.deleteWorkspace({
        workspaceId: mockWorkspace._id.toHexString(),
        userId: mockWorkspace.admin.toHexString(),
        shouldDeleteForms: true,
      })
      const doesFormExist = await FormModel.exists({ _id: mockFormId })
      const isFormArchived = await FormModel.exists({
        _id: mockFormId,
        status: FormStatus.Archived,
      })

      expect(actual.isOk()).toEqual(true)
      expect(actual._unsafeUnwrap()).toEqual(undefined)
      expect(doesFormExist).toEqual(true)
      expect(isFormArchived).toEqual(true)
    })

    it('should not archive forms or delete workspace when transaction fails at workspace deletion', async () => {
      const mockErrorMessage = 'some error'
      await dbHandler.insertEncryptForm({
        formId: mockFormId,
        userId: mockWorkspace.admin,
      })
      const createdWorkspace = await WorkspaceModel.create(mockWorkspace)

      jest
        .spyOn(WorkspaceModel, 'findOne')
        .mockResolvedValueOnce(createdWorkspace)
      jest
        .spyOn(WorkspaceModel, 'deleteWorkspace')
        .mockRejectedValueOnce(new Error(mockErrorMessage))

      const actual = await WorkspaceService.deleteWorkspace({
        workspaceId: mockWorkspace._id.toHexString(),
        userId: mockWorkspace.admin.toHexString(),
        shouldDeleteForms: true,
      })
      const doesFormExist = await FormModel.exists({ _id: mockFormId })
      const isFormArchived = await FormModel.exists({
        _id: mockFormId,
        status: FormStatus.Archived,
      })
      const doesWorkspaceExist = await WorkspaceModel.exists({
        _id: mockWorkspace._id,
      })

      expect(actual.isErr()).toEqual(true)
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(DatabaseError)
      expect(doesWorkspaceExist).toEqual(true)
      expect(doesFormExist).toEqual(true)
      expect(isFormArchived).toEqual(false)
    })

    it('should not archive forms or delete workspace when transaction fails at forms deletion', async () => {
      const mockErrorMessage = 'some error'
      await dbHandler.insertEncryptForm({
        formId: mockFormId,
        userId: mockWorkspace.admin,
      })
      const createdWorkspace = await WorkspaceModel.create(mockWorkspace)

      jest
        .spyOn(WorkspaceModel, 'findOne')
        .mockResolvedValueOnce(createdWorkspace)
      jest
        .spyOn(AdminFormService, 'archiveForms')
        .mockRejectedValueOnce(new Error(mockErrorMessage))

      const actual = await WorkspaceService.deleteWorkspace({
        workspaceId: mockWorkspace._id.toHexString(),
        userId: mockWorkspace.admin.toHexString(),
        shouldDeleteForms: true,
      })
      const doesFormExist = await FormModel.exists({ _id: mockFormId })
      const isFormArchived = await FormModel.exists({
        _id: mockFormId,
        status: FormStatus.Archived,
      })
      const doesWorkspaceExist = await WorkspaceModel.exists({
        _id: mockWorkspace._id,
      })

      expect(actual.isErr()).toEqual(true)
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(DatabaseError)
      expect(doesWorkspaceExist).toEqual(true)
      expect(doesFormExist).toEqual(true)
      expect(isFormArchived).toEqual(false)
    })

    it('should return DatabaseError when error occurs whilst creating workspace', async () => {
      const mockErrorMessage = 'some error'

      jest
        .spyOn(WorkspaceModel, 'deleteWorkspace')
        .mockRejectedValueOnce(new Error(mockErrorMessage))

      const actual = await WorkspaceService.deleteWorkspace({
        workspaceId: mockWorkspace._id.toHexString(),
        userId: mockWorkspace.admin.toHexString(),
        shouldDeleteForms: false,
      })

      expect(actual.isErr()).toEqual(true)
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(DatabaseError)
    })
  })

  describe('moveForms', () => {
    const mockAdmin = new ObjectId().toHexString()
    const mockFormId1 = new ObjectId().toHexString()
    const mockFormId2 = new ObjectId().toHexString()
    const mockWorkspace1 = {
      _id: new ObjectId(),
      admin: mockAdmin,
      title: 'workspace1',
      formIds: [mockFormId1],
    }
    const mockWorkspace2 = {
      _id: new ObjectId(),
      admin: mockAdmin,
      title: 'workspace2',
      formIds: [],
    }

    beforeEach(async () => {
      await WorkspaceModel.create(mockWorkspace1)
      await WorkspaceModel.create(mockWorkspace2)
      jest
        .spyOn(WorkspaceModel, 'removeFormIdsFromAllWorkspaces')
        .mockImplementationOnce(({ admin, formIds }) =>
          WorkspaceModel.removeFormIdsFromAllWorkspaces({
            admin,
            formIds,
          }),
        )
      jest
        .spyOn(WorkspaceModel, 'removeFormIdsFromWorkspace')
        .mockImplementationOnce(({ admin, workspaceId, formIds }) =>
          WorkspaceModel.removeFormIdsFromWorkspace({
            admin,
            workspaceId,
            formIds,
          }),
        )
      jest
        .spyOn(WorkspaceModel, 'addFormIdsToWorkspace')
        .mockImplementationOnce(({ admin, workspaceId, formIds }) =>
          WorkspaceModel.addFormIdsToWorkspace({
            admin,
            workspaceId,
            formIds,
          }),
        )
    })

    afterEach(async () => {
      await dbHandler.clearDatabase()
    })

    it('should return destination workspace when successfully moved forms', async () => {
      const actual = await WorkspaceService.moveForms({
        userId: mockAdmin,
        sourceWorkspaceId: '',
        destWorkspaceId: mockWorkspace1._id.toHexString(),
        formIds: [mockFormId1, mockFormId2],
      })

      const expected = await WorkspaceModel.findById(mockWorkspace1._id)

      expect(actual.isOk()).toBeTrue()
      expect(actual._unsafeUnwrap()).toEqual(expected)
    })

    it('should remove formIds from source workspace when successfully moved forms', async () => {
      const actual = await WorkspaceService.moveForms({
        userId: mockAdmin,
        sourceWorkspaceId: mockWorkspace1._id.toHexString(),
        destWorkspaceId: mockWorkspace2._id.toHexString(),
        formIds: [mockFormId1],
      })

      const expected = await WorkspaceModel.findById(mockWorkspace2._id)

      const sourceWorkspace = await WorkspaceModel.findOne({
        _id: mockWorkspace1._id,
      })
      const isFormIdPresent = sourceWorkspace?.formIds.includes(mockFormId1)

      expect(actual.isOk()).toBeTrue()
      expect(actual._unsafeUnwrap()).toEqual(expected)
      expect(isFormIdPresent).toBeFalse()
    })

    it('should have formIds in destination workspace when successfully moved forms', async () => {
      const actual = await WorkspaceService.moveForms({
        userId: mockAdmin,
        sourceWorkspaceId: mockWorkspace1._id.toHexString(),
        destWorkspaceId: mockWorkspace2._id.toHexString(),
        formIds: [mockFormId1],
      })

      const expected = await WorkspaceModel.findById(mockWorkspace2._id)

      const destWorkspace = await WorkspaceModel.findOne({
        _id: mockWorkspace2._id,
      })
      const isFormIdPresent = destWorkspace?.formIds.includes(mockFormId1)

      expect(actual.isOk()).toBeTrue()
      expect(actual._unsafeUnwrap()).toEqual(expected)
      expect(isFormIdPresent).toBeTrue()
    })

    it('should have formIds in destination workspace when successfully moved forms from all workspaces', async () => {
      const actual = await WorkspaceService.moveForms({
        userId: mockAdmin,
        sourceWorkspaceId: '',
        destWorkspaceId: mockWorkspace2._id.toHexString(),
        formIds: [mockFormId1, mockFormId2],
      })

      const expected = await WorkspaceModel.findById(mockWorkspace2._id)

      const workspace1 = await WorkspaceModel.findOne({
        _id: mockWorkspace1._id,
      })
      const destWorkspace = await WorkspaceModel.findOne({
        _id: mockWorkspace2._id,
      })
      const destFormIds = destWorkspace?.formIds

      const isFormIdPresentInWorkspace1 =
        workspace1?.formIds.includes(mockFormId1)

      expect(actual.isOk()).toBeTrue()
      expect(actual._unsafeUnwrap()).toEqual(expected)
      expect(destFormIds?.includes(mockFormId1)).toBeTrue()
      expect(destFormIds?.includes(mockFormId2)).toBeTrue()
      expect(isFormIdPresentInWorkspace1).toBeFalse()
    })

    it('should not move formIds when transaction fails at removing formIds from source workspace', async () => {
      jest.clearAllMocks()
      jest
        .spyOn(WorkspaceModel, 'removeFormIdsFromWorkspace')
        .mockRejectedValueOnce(new Error())

      const actual = await WorkspaceService.moveForms({
        userId: mockAdmin,
        sourceWorkspaceId: mockWorkspace1._id.toHexString(),
        destWorkspaceId: mockWorkspace2._id.toHexString(),
        formIds: [mockFormId1],
      })

      const sourceWorkspace = await WorkspaceModel.findOne({
        _id: mockWorkspace1._id,
      })
      const isFormIdPresent = sourceWorkspace?.formIds.includes(mockFormId1)

      expect(actual.isErr()).toBeTrue()
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(DatabaseError)
      expect(isFormIdPresent).toBeTrue()
    })

    it('should not move formIds when transaction fails at adding formIds from destination workspace', async () => {
      jest.clearAllMocks()
      jest
        .spyOn(WorkspaceModel, 'removeFormIdsFromWorkspace')
        .mockRejectedValueOnce(new Error())

      const actual = await WorkspaceService.moveForms({
        userId: mockAdmin,
        sourceWorkspaceId: mockWorkspace1._id.toHexString(),
        destWorkspaceId: mockWorkspace2._id.toHexString(),
        formIds: [mockFormId1],
      })

      const destWorkspace = await WorkspaceModel.findOne({
        _id: mockWorkspace2._id,
      })
      const isFormIdPresent = destWorkspace?.formIds.includes(mockFormId1)

      expect(actual.isErr()).toBeTrue()
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(DatabaseError)
      expect(isFormIdPresent).toBeFalse()
    })

    it('should return DatabaseError when error occurs whilst moving forms', async () => {
      jest.clearAllMocks()
      jest
        .spyOn(WorkspaceModel, 'removeFormIdsFromWorkspace')
        .mockRejectedValueOnce(new Error())

      const actual = await WorkspaceService.moveForms({
        userId: mockAdmin,
        sourceWorkspaceId: mockWorkspace1._id.toHexString(),
        destWorkspaceId: mockWorkspace2._id.toHexString(),
        formIds: [mockFormId1],
      })

      expect(actual.isErr()).toBeTrue()
      expect(actual._unsafeUnwrapErr()).toBeInstanceOf(DatabaseError)
    })
  })
})
