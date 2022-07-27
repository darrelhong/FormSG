import mongoose, { ClientSession } from 'mongoose'
import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import { WorkspaceDto } from 'shared/types/workspace'

import { createLoggerWithLabel } from '../../config/logger'
import { getWorkspaceModel } from '../../models/workspace.server.model'
import { transformMongoError } from '../../utils/handle-mongo-error'
import { DatabaseError, DatabaseValidationError } from '../core/core.errors'
import * as AdminFormService from '../form/admin-form/admin-form.service'

import {
  ForbiddenWorkspaceError,
  WorkspaceNotFoundError,
} from './workspace.errors'

const logger = createLoggerWithLabel(module)
const WorkspaceModel = getWorkspaceModel(mongoose)

export const getWorkspaces = (
  userId: string,
): ResultAsync<WorkspaceDto[], DatabaseError> => {
  return ResultAsync.fromPromise(
    WorkspaceModel.getWorkspaces(userId),
    (error) => {
      logger.error({
        message: 'Database error when retrieving workspaces',
        meta: {
          action: 'getWorkspaces',
          userId,
        },
        error,
      })
      return transformMongoError(error)
    },
  )
}

export const createWorkspace = (
  userId: string,
  title: string,
): ResultAsync<WorkspaceDto, DatabaseError | DatabaseValidationError> => {
  return ResultAsync.fromPromise(
    WorkspaceModel.createWorkspace(title, userId),
    (error) => {
      logger.error({
        message: 'Database error when creating workspace',
        meta: {
          action: 'createWorkspace',
          userId,
          title,
        },
        error,
      })
      return transformMongoError(error)
    },
  )
}

export const updateWorkspaceTitle = ({
  workspaceId,
  title,
  userId,
}: {
  workspaceId: string
  title: string
  userId: string
}): ResultAsync<WorkspaceDto, DatabaseError | WorkspaceNotFoundError> => {
  return ResultAsync.fromPromise(
    WorkspaceModel.updateWorkspaceTitle({ title, workspaceId, admin: userId }),
    (error) => {
      logger.error({
        message: 'Database error when updating workspace title',
        meta: {
          action: 'updateWorkspaceTitle',
          workspaceId,
          title,
          userId,
        },
        error,
      })
      return transformMongoError(error)
    },
  ).andThen((updatedWorkspace) =>
    updatedWorkspace
      ? okAsync(updatedWorkspace)
      : errAsync(new WorkspaceNotFoundError()),
  )
}

export const deleteWorkspace = ({
  workspaceId,
  userId,
  shouldDeleteForms,
}: {
  workspaceId: string
  userId: string
  shouldDeleteForms: boolean
}): ResultAsync<void, DatabaseError> => {
  return ResultAsync.fromPromise(
    WorkspaceModel.startSession().then((session: ClientSession) =>
      session
        .withTransaction(() =>
          deleteWorkspaceTransaction({
            workspaceId,
            userId,
            shouldDeleteForms,
            session,
          }),
        )
        .then(() => session.endSession()),
    ),
    (error) => {
      logger.error({
        message:
          'Database error when deleting workspace, rolling back transaction',
        meta: {
          action: 'deleteWorkspace',
          workspaceId,
          userId,
          shouldDeleteForms,
        },
        error,
      })
      return transformMongoError(error)
    },
  )
}

const deleteWorkspaceTransaction = async ({
  workspaceId,
  userId,
  shouldDeleteForms,
  session,
}: {
  workspaceId: string
  userId: string
  shouldDeleteForms: boolean
  session: ClientSession
}): Promise<void> => {
  const workspaceToDelete = await WorkspaceModel.findOne({
    _id: workspaceId,
    admin: userId,
  })

  await WorkspaceModel.deleteWorkspace({
    workspaceId,
    admin: userId,
    session,
  })

  if (shouldDeleteForms && workspaceToDelete?.formIds) {
    await AdminFormService.archiveForms({
      formIds: workspaceToDelete?.formIds,
      userId,
      session,
    })
  }
}

export const getForms = (
  workspaceId: string,
): ResultAsync<any, DatabaseError> => {
  return okAsync({ workspaceId: workspaceId })
}

export const deleteForms = (
  workspaceId: string,
  formIds: string[],
): ResultAsync<any, DatabaseError> => {
  return okAsync({ workspaceId: workspaceId, formIds: formIds })
}

export const moveForms = ({
  userId,
  sourceWorkspaceId,
  destWorkspaceId,
  formIds,
}: {
  userId: string
  sourceWorkspaceId: string
  destWorkspaceId: string
  formIds: string[]
}): ResultAsync<WorkspaceDto | null, DatabaseError> => {
  return ResultAsync.fromPromise(
    WorkspaceModel.startSession()
      .then((session: ClientSession) =>
        session
          .withTransaction(() =>
            moveFormsTransaction({
              userId,
              sourceWorkspaceId,
              destWorkspaceId,
              formIds,
              session,
            }),
          )
          .then(() => session.endSession()),
      )
      .then(() => WorkspaceModel.getWorkspace(destWorkspaceId, userId)),
    (error) => {
      logger.error({
        message:
          'Database error when moving forms to another workspace, rolling back transaction',
        meta: {
          action: 'moveForms',
          userId,
          sourceWorkspaceId,
          destWorkspaceId,
          formIds,
        },
        error,
      })
      return transformMongoError(error)
    },
  )
}

const moveFormsTransaction = async ({
  userId,
  sourceWorkspaceId,
  destWorkspaceId,
  formIds,
  session,
}: {
  userId: string
  sourceWorkspaceId: string
  destWorkspaceId: string
  formIds: string[]
  session: ClientSession
}): Promise<void> => {
  // Forms could be from multiple different workspaces, or have no workspaces yet
  if (sourceWorkspaceId === '') {
    await WorkspaceModel.removeFormIdsFromAllWorkspaces({
      admin: userId,
      formIds,
      session,
    })
  } else {
    await WorkspaceModel.removeFormIdsFromWorkspace({
      admin: userId,
      workspaceId: sourceWorkspaceId,
      formIds,
      session,
    })
  }

  await WorkspaceModel.addFormIdsToWorkspace({
    admin: userId,
    workspaceId: destWorkspaceId,
    formIds,
    session,
  })
}

export const verifyWorkspaceAdmin = (
  workspaceId: string,
  userId: string,
): ResultAsync<true, DatabaseError | ForbiddenWorkspaceError> => {
  return ResultAsync.fromPromise(
    WorkspaceModel.exists({ _id: workspaceId, admin: userId }),
    (error) => {
      logger.error({
        message: 'Database error when checking if user is workspace admin',
        meta: {
          action: 'verifyWorkspaceAdmin',
          workspaceId,
          userId,
        },
        error,
      })
      return transformMongoError(error)
    },
  ).andThen((isUserWorkspaceAdmin) =>
    isUserWorkspaceAdmin
      ? okAsync(true as const)
      : errAsync(new ForbiddenWorkspaceError()),
  )
}

export const checkWorkspaceExists = (
  workspaceId: string,
): ResultAsync<true, DatabaseError | WorkspaceNotFoundError> => {
  return ResultAsync.fromPromise(
    WorkspaceModel.exists({ _id: workspaceId }),
    (error) => {
      logger.error({
        message: 'Database error when checking if workspace exists',
        meta: {
          action: 'doesWorkspaceExist',
          workspaceId,
        },
        error,
      })
      return transformMongoError(error)
    },
  ).andThen((doesWorkspaceExist) =>
    doesWorkspaceExist
      ? okAsync(true as const)
      : errAsync(new WorkspaceNotFoundError()),
  )
}
